import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse, TerminologyData } from '$lib/types/terminology.js';
import { loadTerminologyData } from '$lib/utils/file-handler.js';

let terminologyCache: TerminologyData | null = null;
let koToEnMap: Map<string, string[]> = new Map(); // 여러 결과를 위해 배열로 변경
let enToKoMap: Map<string, string[]> = new Map(); // 여러 결과를 위해 배열로 변경

async function initializeCache() {
    if (terminologyCache) return;

    try {
        terminologyCache = await loadTerminologyData();
        koToEnMap.clear();
        enToKoMap.clear();

        for (const entry of terminologyCache.entries) {
            const koKey = entry.standardName.toLowerCase();
            const enKey = entry.abbreviation.toLowerCase();

            // 동음이의어 처리: 배열에 추가
            if (!koToEnMap.has(koKey)) {
                koToEnMap.set(koKey, []);
            }
            koToEnMap.get(koKey)!.push(entry.abbreviation);

            if (!enToKoMap.has(enKey)) {
                enToKoMap.set(enKey, []);
            }
            enToKoMap.get(enKey)!.push(entry.standardName);
        }
        console.log('단어집 캐시 초기화 완료 (동음이의어 지원)');
    } catch (error) {
        console.error('단어집 캐시 초기화 중 오류:', error);
        terminologyCache = null; // 오류 발생 시 캐시 비우기
    }
}

/**
 * 단어 변환 생성 API
 * POST /api/generator
 */
export async function POST({ request }: RequestEvent) {
    try {
        await initializeCache();

        if (!terminologyCache) {
            return json(
                {
                    success: false,
                    error: '단어집 데이터를 불러올 수 없습니다.',
                    message: 'Failed to load terminology data'
                } as ApiResponse,
                { status: 500 }
            );
        }

        const { term, direction = 'ko-to-en' } = await request.json();

        if (!term || typeof term !== 'string') {
            return json(
                { success: false, error: '변환할 단어를 제공해야 합니다.', message: 'Missing term' } as ApiResponse,
                { status: 400 }
            );
        }

        const sourceMap = direction === 'ko-to-en' ? koToEnMap : enToKoMap;

        // 스페이스 또는 언더스코어로 분리 (스페이스 우선)
        const separator = term.includes(' ') ? ' ' : '_';
        const terms = term.split(separator);

        // 각 단어에 대해 가능한 모든 변환 결과를 가져옴
        const termOptions = terms.map((t) => {
            const trimmedTerm = t.trim();
            const results = sourceMap.get(trimmedTerm.toLowerCase());
            return results && results.length > 0 ? results : ['##'];
        });

        // 모든 조합의 경우의 수를 계산 (Cartesian Product)
        function cartesianProduct(arrays: string[][]): string[][] {
            return arrays.reduce<string[][]>((acc, curr) => {
                const result: string[][] = [];
                for (const a of acc) {
                    for (const c of curr) {
                        result.push([...a, c]);
                    }
                }
                return result;
            }, [[]]);
        }

        const combinations = cartesianProduct(termOptions);
        const results = combinations.map(combo => combo.join(separator));

        return json({
            success: true,
            results: results, // 단일 result에서 복수 results로 변경
            hasMultiple: results.length > 1 // 동음이의어 여부 표시
        });
    } catch (error) {
        console.error('단어 변환 중 오류:', error);
        return json(
            {
                success: false,
                error: '서버에서 단어 변환 중 오류가 발생했습니다.',
                message: 'Internal server error'
            } as ApiResponse,
            { status: 500 }
        );
    }
}

// 파일 변경을 감지하고 캐시를 무효화하는 로직 추가 (선택적 고급 기능)
// 예를 들어, fs.watch를 사용하거나, 특정 API 호출 시 캐시를 리셋할 수 있습니다. 