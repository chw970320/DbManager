import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse, TerminologyEntry } from '../../../../lib/types/terminology.js';
import { loadTerminologyData } from '../../../../lib/utils/file-handler.js';

/**
 * 중복된 용어 조회 API
 * GET /api/terminology/duplicates
 */
export async function GET({ url }: RequestEvent) {
    try {
        const terminologyData = await loadTerminologyData();
        const entries = terminologyData.entries;

        const duplicates: Record<string, TerminologyEntry[]> = {};
        const seen: Record<string, Record<string, TerminologyEntry>> = {
            standardName: {},
            abbreviation: {},
            englishName: {}
        };

        const checkAndAddDuplicate = (
            field: keyof typeof seen,
            entry: TerminologyEntry
        ) => {
            const value = (entry[field as keyof TerminologyEntry] as string).toLowerCase();
            if (seen[field][value]) {
                const key = `${field}:${value}`;
                if (!duplicates[key]) {
                    duplicates[key] = [seen[field][value]];
                }
                duplicates[key].push(entry);
            } else {
                seen[field][value] = entry;
            }
        };

        for (const entry of entries) {
            checkAndAddDuplicate('standardName', entry);
            checkAndAddDuplicate('abbreviation', entry);
            checkAndAddDuplicate('englishName', entry);
        }

        // 중복된 그룹만 최종 결과로 변환
        const duplicateGroups = Object.values(duplicates).filter(group => group.length > 1);

        const responseData = {
            duplicateCount: duplicateGroups.length,
            duplicates: duplicateGroups
        }

        return json(
            {
                success: true,
                data: responseData,
                message: '중복 용어 조회가 완료되었습니다.'
            } as ApiResponse,
            { status: 200 }
        );
    } catch (error) {
        console.error('중복 용어 조회 중 오류:', error);
        return json(
            {
                success: false,
                error: '서버에서 중복 용어 조회 중 오류가 발생했습니다.',
                message: 'Internal server error'
            } as ApiResponse,
            { status: 500 }
        );
    }
} 