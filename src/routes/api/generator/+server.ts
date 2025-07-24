import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse, VocabularyData } from '$lib/types/vocabulary.js';
import { loadVocabularyData } from '$lib/utils/file-handler.js';

let vocabularyCache: VocabularyData | null = null;
let koToEnMap: Map<string, string[]> = new Map();
let enToKoMap: Map<string, string[]> = new Map();

async function initializeCache() {
    if (vocabularyCache) return;

    try {
        vocabularyCache = await loadVocabularyData();
        koToEnMap.clear();
        enToKoMap.clear();

        for (const entry of vocabularyCache.entries) {
            const koKey = entry.standardName.toLowerCase();
            const enKey = entry.abbreviation.toLowerCase();

            if (!koToEnMap.has(koKey)) {
                koToEnMap.set(koKey, []);
            }
            koToEnMap.get(koKey)!.push(entry.abbreviation);

            if (!enToKoMap.has(enKey)) {
                enToKoMap.set(enKey, []);
            }
            enToKoMap.get(enKey)!.push(entry.standardName);
        }
        console.log('단어집 캐시 초기화 완료 (동음이의어 지원, vocabulary 기준)');
    } catch (error) {
        console.error('단어집 캐시 초기화 중 오류:', error);
        vocabularyCache = null;
    }
}

export async function POST({ request }: RequestEvent) {
    try {
        await initializeCache();

        if (!vocabularyCache) {
            return json(
                {
                    success: false,
                    error: '단어집 데이터를 불러올 수 없습니다.',
                    message: 'Failed to load vocabulary data'
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
        const separator = term.includes(' ') ? ' ' : '_';
        const terms = term.split(separator);

        const termOptions = terms.map((t) => {
            const trimmedTerm = t.trim();
            const results = sourceMap.get(trimmedTerm.toLowerCase());
            return results && results.length > 0 ? results : ['##'];
        });

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
            results: results,
            hasMultiple: results.length > 1
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