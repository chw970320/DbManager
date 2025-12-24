import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse, VocabularyEntry } from '$lib/types/vocabulary.js';
import { loadVocabularyData, listVocabularyFiles } from '$lib/utils/file-handler.js';

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
 * 금칙어 및 이음동의어 확인 및 추천
 */
async function checkForbiddenWordsAndSynonyms(
	term: string,
	direction: 'ko-to-en' | 'en-to-ko'
): Promise<{
	isForbidden: boolean;
	isSynonym: boolean;
	recommendations: string[];
}> {
	try {
		// 모든 단어집 파일 로드
		const allVocabularyFiles = await listVocabularyFiles();
		const allVocabularyEntries: VocabularyEntry[] = [];
		for (const file of allVocabularyFiles) {
			try {
				const fileData = await loadVocabularyData(file);
				allVocabularyEntries.push(...fileData.entries);
			} catch (error) {
				console.warn(`단어집 파일 ${file} 로드 실패:`, error);
			}
		}

		const termLower = term.trim().toLowerCase();
		const recommendations: string[] = [];

		// 금칙어 확인 (표준단어명에 대해서만)
		const allForbiddenWords = new Set<string>();
		for (const entry of allVocabularyEntries) {
			if (entry.forbiddenWords && Array.isArray(entry.forbiddenWords)) {
				for (const word of entry.forbiddenWords) {
					if (typeof word === 'string' && word.trim()) {
						allForbiddenWords.add(word.trim().toLowerCase());
					}
				}
			}
		}

		const isForbidden = allForbiddenWords.has(termLower);

		// 이음동의어 확인 (표준단어명에 대해서만)
		const allSynonyms = new Set<string>();
		for (const entry of allVocabularyEntries) {
			if (entry.synonyms && Array.isArray(entry.synonyms)) {
				for (const synonym of entry.synonyms) {
					if (typeof synonym === 'string' && synonym.trim()) {
						allSynonyms.add(synonym.trim().toLowerCase());
					}
				}
			}
		}

		const isSynonym = allSynonyms.has(termLower);

		// 금칙어 또는 이음동의어인 경우, 해당 단어를 포함하는 표준단어명 추천
		if (isForbidden || isSynonym) {
			for (const entry of allVocabularyEntries) {
				if (entry.standardName && entry.standardName.toLowerCase().includes(termLower)) {
					recommendations.push(entry.standardName);
				}
			}
		}

		return {
			isForbidden,
			isSynonym,
			recommendations: [...new Set(recommendations)]
		};
	} catch (error) {
		console.warn('금칙어 및 이음동의어 확인 중 오류:', error);
		return { isForbidden: false, isSynonym: false, recommendations: [] };
	}
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

		// 금칙어 및 이음동의어 확인 (한영 변환 방향일 때만)
		let forbiddenWordInfo: {
			isForbidden: boolean;
			isSynonym: boolean;
			recommendations: string[];
		} | null = null;

		if (direction === 'ko-to-en') {
			forbiddenWordInfo = await checkForbiddenWordsAndSynonyms(term, direction);
		}

		const dictionary = await getDictionary();
		if (!dictionary) {
			return json({ success: false, error: '사전을 불러올 수 없습니다.' }, { status: 500 });
		}

		const wordSet = direction === 'ko-to-en' ? dictionary.ko : dictionary.en;

		// 공백 및 언더바로 단어를 분리
		const termParts = term.split(/[\s_]+/).filter((p) => p.length > 0);

		// 각 단어를 분해 (매칭되지 않는 단어는 ##으로 표시)
		const segmentedParts = termParts.map((part) => segmentPart(part, wordSet));

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
			segments: finalResult,
			forbiddenWordInfo: forbiddenWordInfo || undefined
		});
	} catch (error) {
		console.error('단어 조합 분석 중 오류:', error);
		return json({ success: false, error: '서버에서 분석 중 오류가 발생했습니다.' } as ApiResponse, {
			status: 500
		});
	}
}
