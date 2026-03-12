import { json, type RequestEvent } from '@sveltejs/kit';
import { getDataSourceEntry } from '$lib/registry/data-source-registry';
import { listDataSourceProfileTargets } from '$lib/utils/data-source-profiling';

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function getErrorMessage(error: unknown, fallback: string): string {
	return error instanceof Error && error.message ? error.message : fallback;
}

function getErrorStatus(message: string): number {
	if (message.includes('찾을 수 없습니다.')) {
		return 404;
	}

	return 500;
}

export async function GET({ url }: RequestEvent) {
	const dataSourceId = url.searchParams.get('dataSourceId');

	if (!isNonEmptyString(dataSourceId)) {
		return json({ success: false, error: '필수 입력(dataSourceId)이 누락되었습니다.' }, { status: 400 });
	}

	const entry = await getDataSourceEntry(dataSourceId.trim());
	if (!entry) {
		return json({ success: false, error: '데이터 소스를 찾을 수 없습니다.' }, { status: 404 });
	}

	try {
		const data = await listDataSourceProfileTargets(entry);
		return json({ success: true, data }, { status: 200 });
	} catch (error) {
		const message = getErrorMessage(error, '프로파일링 대상을 불러오는 중 오류가 발생했습니다.');
		return json({ success: false, error: message }, { status: getErrorStatus(message) });
	}
}
