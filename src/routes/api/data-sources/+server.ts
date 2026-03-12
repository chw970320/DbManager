import { json, type RequestEvent } from '@sveltejs/kit';
import {
	createDataSource,
	deleteDataSource,
	listDataSourceSummaries,
	updateDataSource
} from '$lib/registry/data-source-registry';
import type { DataSourceInput } from '$lib/types/data-source.js';

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function getErrorStatus(message: string): number {
	if (message.includes('찾을 수 없습니다.')) {
		return 404;
	}

	if (message.includes('이미 존재하는 연결 이름입니다.')) {
		return 409;
	}

	if (
		message.includes('필수') ||
		message.includes('지원하지 않는') ||
		message.includes('정수') ||
		message.includes('이상')
	) {
		return 400;
	}

	return 500;
}

function getErrorMessage(error: unknown, fallback: string): string {
	return error instanceof Error && error.message ? error.message : fallback;
}

export async function GET() {
	try {
		const data = await listDataSourceSummaries();
		return json({ success: true, data }, { status: 200 });
	} catch (error) {
		console.error('데이터 소스 목록 조회 오류:', error);
		return json(
			{
				success: false,
				error: '데이터 소스 목록을 불러오는 중 오류가 발생했습니다.'
			},
			{ status: 500 }
		);
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const payload = (await request.json()) as DataSourceInput;
		const created = await createDataSource(payload);
		return json({ success: true, data: created }, { status: 201 });
	} catch (error) {
		const message = getErrorMessage(error, '데이터 소스 저장에 실패했습니다.');
		return json({ success: false, error: message }, { status: getErrorStatus(message) });
	}
}

export async function PUT({ request }: RequestEvent) {
	try {
		const payload = (await request.json()) as DataSourceInput & { id?: string };

		if (!isNonEmptyString(payload?.id)) {
			return json({ success: false, error: '필수 입력(id)이 누락되었습니다.' }, { status: 400 });
		}

		const { id, ...input } = payload;
		const updated = await updateDataSource(id, input);

		return json({ success: true, data: updated }, { status: 200 });
	} catch (error) {
		const message = getErrorMessage(error, '데이터 소스 수정에 실패했습니다.');
		return json({ success: false, error: message }, { status: getErrorStatus(message) });
	}
}

export async function DELETE({ request }: RequestEvent) {
	try {
		const payload = (await request.json()) as { id?: string };

		if (!isNonEmptyString(payload?.id)) {
			return json({ success: false, error: '필수 입력(id)이 누락되었습니다.' }, { status: 400 });
		}

		const deleted = await deleteDataSource(payload.id);
		return json({ success: true, data: deleted }, { status: 200 });
	} catch (error) {
		const message = getErrorMessage(error, '데이터 소스 삭제에 실패했습니다.');
		return json({ success: false, error: message }, { status: getErrorStatus(message) });
	}
}
