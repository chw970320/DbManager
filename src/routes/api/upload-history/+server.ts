import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '$lib/types/vocabulary';
import { isValidDataType } from '$lib/types/base';
import { listUploadHistoryEntries } from '$lib/registry/upload-history-registry';

export async function GET({ url }: RequestEvent) {
	try {
		const dataType = url.searchParams.get('dataType') || '';
		const filename = url.searchParams.get('filename') || '';

		if (!isValidDataType(dataType) || !filename.trim()) {
			return json(
				{
					success: false,
					error: 'dataType과 filename이 올바르게 제공되어야 합니다.',
					message: 'Invalid history query'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		const entries = await listUploadHistoryEntries(dataType, filename);
		return json(
			{
				success: true,
				data: {
					dataType,
					filename,
					entries
				},
				message: 'Upload history retrieved successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '업로드 이력 조회 중 오류가 발생했습니다.',
				message: 'Failed to retrieve upload history'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}
