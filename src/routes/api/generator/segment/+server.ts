import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '$lib/types/vocabulary.js';
import { loadVocabularyData } from '$lib/utils/file-handler.js';

// --- 캐시 ---
let dictionaryCache: { ko: Set<string>; en: Set<string> } | null = null;

async function getDictionary() {
    if (dictionaryCache) {
        return dictionaryCache;
    }
    try {
        const vocabularyData = await loadVocabularyData();
        const ko = new Set(vocabularyData.entries.map((e) => e.standardName.toLowerCase()));
        const en = new Set(vocabularyData.entries.map((e) => e.abbreviation.toLowerCase()));
        dictionaryCache = { ko, en };
        
        return dictionaryCache;
    } catch (error) {
        console.error('사전 캐시 초기화 오류:', error);
        return null;
    }
}

/**
 * 단일 단어를 분해하는 함수
 */
function segmentPart(originalPart: string, wordSet: Set<string>): string[] {
    const s = originalPart.toLowerCase();
    const n = s.length;
    const dp: string[][] = Array(n + 1)
        .fill(null)
        .map(() => []);
    dp[0] = ['']; // Base case

    for (let i = 1; i <= n; i++) {
        for (let j = 0; j < i; j++) {
            const sub = s.substring(j, i);
            if (wordSet.has(sub) && dp[j].length > 0) {
                for (const prev of dp[j]) {
                    dp[i].push((prev ? prev + '_' : '') + sub);
                }
            }
        }
    }

    // 원본 대소문자에 맞춰 결과 복원
    const results = dp[n].map((result) => {
        let originalIndex = 0;
        return result
            .split('_')
            .map((part) => {
                const originalSlice = originalPart.substring(originalIndex, originalIndex + part.length);
                originalIndex += part.length;
                return originalSlice;
            })
            .join('_');
    });

    // 매칭되는 조합이 없으면 ##으로 표시
    return results.length > 0 ? results : ['##'];
}

/**
 * 지능형 단어 조합 분석 API (Word Segmentation)
 * POST /api/generator/segment
 */
export async function POST({ request }: RequestEvent) {
    try {
        const { term, direction = 'ko-to-en' } = await request.json();

        if (!term || typeof term !== 'string') {
            return json({ success: false, error: '분석할 단어를 제공해야 합니다.' }, { status: 400 });
        }

        const dictionary = await getDictionary();
        if (!dictionary) {
            return json({ success: false, error: '사전을 불러올 수 없습니다.' }, { status: 500 });
        }

        const wordSet = direction === 'ko-to-en' ? dictionary.ko : dictionary.en;

        // 공백으로 단어를 분리
        const termParts = term.split(' ').filter(p => p.length > 0);

        // 각 단어를 분해 (매칭되지 않는 단어는 ##으로 표시)
        const segmentedParts = termParts.map(part => segmentPart(part, wordSet));

        // 분해된 조합들의 모든 경우의 수를 계산 (Cartesian Product)
        const finalResult = segmentedParts.reduce((acc, current) => {
            if (acc.length === 0) return current;
            const res: string[] = [];
            for (const a of acc) {
                for (const c of current) {
                    res.push(a + '_' + c);
                }
            }
            return res;
        }, [] as string[]);

        return json({
            success: true,
            segments: finalResult
        });

    } catch (error) {
        console.error('단어 조합 분석 중 오류:', error);
        return json(
            { success: false, error: '서버에서 분석 중 오류가 발생했습니다.' } as ApiResponse,
            { status: 500 }
        );
    }
} 