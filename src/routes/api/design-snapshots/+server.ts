import { json, type RequestEvent } from '@sveltejs/kit';
import {
	createDesignSnapshot,
	deleteDesignSnapshot,
	listDesignSnapshotSummaries
} from '$lib/registry/design-snapshot-registry';
import { loadSharedFileMappingRegistryData } from '$lib/registry/shared-file-mapping-registry';

function getErrorMessage(error: unknown, fallback: string): string {
	return error instanceof Error && error.message ? error.message : fallback;
}

function getErrorStatus(message: string): number {
	if (message.includes('찾을 수 없습니다.')) {
		return 404;
	}

	if (message.includes('필수') || message.includes('올바르지')) {
		return 400;
	}

	return 500;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

export async function GET() {
	try {
		const [snapshots, bundles] = await Promise.all([
			listDesignSnapshotSummaries(),
			loadSharedFileMappingRegistryData()
		]);

		return json(
			{
				success: true,
				data: {
					snapshots,
					bundles: bundles.bundles
				}
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('스냅샷 목록 조회 오류:', error);
		return json(
			{
				success: false,
				error: '스냅샷 목록을 불러오는 중 오류가 발생했습니다.'
			},
			{ status: 500 }
		);
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const payload = await request.json();
		const created = await createDesignSnapshot(payload);
		return json({ success: true, data: created }, { status: 201 });
	} catch (error) {
		const message = getErrorMessage(error, '스냅샷 생성에 실패했습니다.');
		return json({ success: false, error: message }, { status: getErrorStatus(message) });
	}
}

export async function DELETE({ request }: RequestEvent) {
	try {
		const payload = (await request.json()) as { id?: string };
		if (!isNonEmptyString(payload?.id)) {
			return json({ success: false, error: '필수 입력(id)이 누락되었습니다.' }, { status: 400 });
		}

		const deleted = await deleteDesignSnapshot(payload.id);
		return json({ success: true, data: deleted }, { status: 200 });
	} catch (error) {
		const message = getErrorMessage(error, '스냅샷 삭제에 실패했습니다.');
		return json({ success: false, error: message }, { status: getErrorStatus(message) });
	}
}
