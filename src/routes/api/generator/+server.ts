import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse, TerminologyData } from '$lib/types/terminology.js';
import { loadTerminologyData } from '$lib/utils/file-handler.js';

let terminologyCache: TerminologyData | null = null;
let koToEnMap: Map<string, string> = new Map();
let enToKoMap: Map<string, string> = new Map();

async function initializeCache() {
    if (terminologyCache) return;

    try {
        terminologyCache = await loadTerminologyData();
        koToEnMap.clear();
        enToKoMap.clear();

        for (const entry of terminologyCache.entries) {
            koToEnMap.set(entry.standardName.toLowerCase(), entry.abbreviation);
            enToKoMap.set(entry.abbreviation.toLowerCase(), entry.standardName);
        }
        console.log('용어집 캐시 초기화 완료');
    } catch (error) {
        console.error('용어집 캐시 초기화 중 오류:', error);
        terminologyCache = null; // 오류 발생 시 캐시 비우기
    }
}

/**
 * 용어 변환 생성 API
 * POST /api/generator
 */
export async function POST({ request }: RequestEvent) {
    try {
        await initializeCache();

        if (!terminologyCache) {
            return json(
                {
                    success: false,
                    error: '용어집 데이터를 불러올 수 없습니다.',
                    message: 'Failed to load terminology data'
                } as ApiResponse,
                { status: 500 }
            );
        }

        const { term, direction = 'ko-to-en' } = await request.json();

        if (!term || typeof term !== 'string') {
            return json(
                { success: false, error: '변환할 용어를 제공해야 합니다.', message: 'Missing term' } as ApiResponse,
                { status: 400 }
            );
        }

        const sourceMap = direction === 'ko-to-en' ? koToEnMap : enToKoMap;
        const terms = term.split('_');
        const convertedTerms = terms.map((t) => sourceMap.get(t.toLowerCase()) || '##');
        const result = convertedTerms.join('_');

        return json({
            success: true,
            result: result
        });
    } catch (error) {
        console.error('용어 변환 중 오류:', error);
        return json(
            {
                success: false,
                error: '서버에서 용어 변환 중 오류가 발생했습니다.',
                message: 'Internal server error'
            } as ApiResponse,
            { status: 500 }
        );
    }
}

// 파일 변경을 감지하고 캐시를 무효화하는 로직 추가 (선택적 고급 기능)
// 예를 들어, fs.watch를 사용하거나, 특정 API 호출 시 캐시를 리셋할 수 있습니다. 