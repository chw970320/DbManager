import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse, VocabularyEntry } from '$lib/types/vocabulary.js';
import { loadVocabularyData, loadTermData } from '$lib/utils/file-handler.js';

// --- 캐시 ---
// 파일별로 캐시 관리: dictionaryCache[filename] = { ko: Set, en: Set }
const dictionaryCache: Map<string, { ko: Set<string>; en: Set<string> }> = new Map();

async function getDictionary(filename: string = 'term.json') {
	// 캐시 확인
	const cached = dictionaryCache.get(filename);
	if (cached) {
		return cached;
	}

	try {
		// 용어 파일의 매핑 정보 로드
		const termData = await loadTermData(filename);
		const mapping = termData.mapping || {
			vocabulary: 'vocabulary.json',
			domain: 'domain.json'
		};

		// 매핑된 단어집 파일만 로드
		const vocabularyData = await loadVocabularyData(mapping.vocabulary);

		const ko = new Set(vocabularyData.entries.map((e) => e.standardName.toLowerCase()));
		const en = new Set(vocabularyData.entries.map((e) => e.abbreviation.toLowerCase()));
		const dictionary = { ko, en };

		// 캐시에 저장
		dictionaryCache.set(filename, dictionary);

		return dictionary;
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
	direction: 'ko-to-en' | 'en-to-ko',
	vocabularyFilename: string
): Promise<{
	isForbidden: boolean;
	isSynonym: boolean;
	recommendations: string[];
}> {
	try {
		// 매핑된 단어집 파일만 로드
		const vocabularyData = await loadVocabularyData(vocabularyFilename);
		const allVocabularyEntries: VocabularyEntry[] = vocabularyData.entries;

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

		// 금칙어 또는 이음동의어인 경우, 해당 금칙어/이음동의어를 포함하는 표준단어명 추천
		if (isForbidden || isSynonym) {
			// 금칙어나 이음동의어가 포함된 표준단어명 찾기
			for (const entry of allVocabularyEntries) {
				if (!entry.standardName) continue;

				// 표준단어명의 금칙어 목록 확인
				if (entry.forbiddenWords && Array.isArray(entry.forbiddenWords)) {
					for (const forbiddenWord of entry.forbiddenWords) {
						if (
							typeof forbiddenWord === 'string' &&
							forbiddenWord.trim().toLowerCase() === termLower
						) {
							recommendations.push(entry.standardName);
							break;
						}
					}
				}

				// 표준단어명의 이음동의어 목록 확인
				if (entry.synonyms && Array.isArray(entry.synonyms)) {
					for (const synonym of entry.synonyms) {
						if (typeof synonym === 'string' && synonym.trim().toLowerCase() === termLower) {
							recommendations.push(entry.standardName);
							break;
						}
					}
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
export async function POST({ request, url }: RequestEvent) {
	try {
		const { term, direction = 'ko-to-en' } = await request.json();
		const filename = url.searchParams.get('filename') || 'term.json';

		if (!term || typeof term !== 'string') {
			return json({ success: false, error: '분석할 단어를 제공해야 합니다.' }, { status: 400 });
		}

		// 용어 파일의 매핑 정보 로드
		let vocabularyFilename = 'vocabulary.json';
		try {
			const termData = await loadTermData(filename);
			const mapping = termData.mapping || {
				vocabulary: 'vocabulary.json',
				domain: 'domain.json'
			};
			vocabularyFilename = mapping.vocabulary;
		} catch (error) {
			console.warn(`용어 파일 ${filename} 로드 실패, 기본값 사용:`, error);
		}

		// 금칙어 및 이음동의어 확인 (한영 변환 방향일 때만)
		let forbiddenWordInfo: {
			isForbidden: boolean;
			isSynonym: boolean;
			recommendations: string[];
		} | null = null;

		if (direction === 'ko-to-en') {
			forbiddenWordInfo = await checkForbiddenWordsAndSynonyms(term, direction, vocabularyFilename);
		}

		const dictionary = await getDictionary(filename);
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
