import { json, type RequestEvent } from '@sveltejs/kit';
import { restoreDesignSnapshot } from '$lib/registry/design-snapshot-registry';

function getErrorMessage(error: unknown, fallback: string): string {
	return error instanceof Error && error.message ? error.message : fallback;
}

function getErrorStatus(message: string): number {
	if (message.includes('찾을 수 없습니다.')) {
		return 404;
	}

	if (message.includes('필수')) {
		return 400;
	}

	return 500;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

export async function POST({ request }: RequestEvent) {
	try {
		const payload = (await request.json()) as { id?: string };
		if (!isNonEmptyString(payload?.id)) {
			return json({ success: false, error: '필수 입력(id)이 누락되었습니다.' }, { status: 400 });
		}

		const restored = await restoreDesignSnapshot(payload.id);
		return json({ success: true, data: restored }, { status: 200 });
	} catch (error) {
		const message = getErrorMessage(error, '스냅샷 복원에 실패했습니다.');
		return json({ success: false, error: message }, { status: getErrorStatus(message) });
	}
}
