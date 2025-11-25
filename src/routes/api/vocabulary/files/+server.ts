import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '$lib/types/vocabulary.js';
import { listVocabularyFiles } from '$lib/utils/file-handler.js';

/**
 * 사용 가능한 단어집 파일 목록 조회 API
 * GET /api/vocabulary/files
 */
export async function GET({}: RequestEvent) {
	try {
		const files = await listVocabularyFiles();

		return json(
			{
				success: true,
				data: files,
				message: 'Vocabulary files retrieved successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('단어집 파일 목록 조회 중 오류:', error);

		return json(
			{
				success: false,
				error: '서버에서 파일 목록 조회 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}
