import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse, VocabularyEntry } from '../../../../lib/types/vocabulary.js';
import { loadVocabularyData } from '../../../../lib/utils/file-handler.js';
import { getDuplicateGroups } from '../../../../lib/utils/duplicate-handler.js';

/**
 * 중복된 단어 조회 API
 * GET /api/vocabulary/duplicates
 */
export async function GET({ url }: RequestEvent) {
    try {
        const vocabularyData = await loadVocabularyData();
        const entries = vocabularyData.entries;

        // 새로운 유틸리티 함수를 사용하여 중복된 그룹 조회
        const duplicateGroups = getDuplicateGroups(entries);

        const responseData = {
            duplicateCount: duplicateGroups.length,
            duplicates: duplicateGroups
        }

        return json(
            {
                success: true,
                data: responseData,
                message: '중복 단어 조회가 완료되었습니다.'
            } as ApiResponse,
            { status: 200 }
        );
    } catch (error) {
        console.error('중복 단어 조회 중 오류:', error);
        return json(
            {
                success: false,
                error: '서버에서 중복 단어 조회 중 오류가 발생했습니다.',
                message: 'Internal server error'
            } as ApiResponse,
            { status: 500 }
        );
    }
} 