import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '$lib/types/vocabulary';
import { isValidDataType } from '$lib/types/base';
import { restoreUploadHistoryEntry } from '$lib/registry/upload-history-registry';

export async function POST({ request }: RequestEvent) {
	try {
		const body = (await request.json()) as { dataType?: string; id?: string };
		const dataType = body.dataType || '';
		const id = body.id || '';

		if (!isValidDataType(dataType) || !id.trim()) {
			return json(
				{
					success: false,
					error: '복원할 dataType과 id가 필요합니다.',
					message: 'Missing restore parameters'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		const entry = await restoreUploadHistoryEntry(dataType, id);
		return json(
			{
				success: true,
				data: {
					entry
				},
				message: 'Upload history restored successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : '업로드 이력 복원 중 오류가 발생했습니다.';
		return json(
			{
				success: false,
				error: message,
				message: 'Failed to restore upload history'
			} as ApiResponse,
			{ status: message.includes('찾을 수 없습니다') ? 404 : 500 }
		);
	}
}
