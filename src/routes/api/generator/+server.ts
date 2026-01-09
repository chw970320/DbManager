import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse, VocabularyData } from '$lib/types/vocabulary.js';
import { loadVocabularyData, loadTermData } from '$lib/utils/file-handler.js';

// 파일별로 캐시 관리
const vocabularyCache: Map<string, VocabularyData> = new Map();
const koToEnMapCache: Map<string, Map<string, string[]>> = new Map();
const enToKoMapCache: Map<string, Map<string, string[]>> = new Map();

// 테스트용 캐시 초기화 함수 (런타임 동작에는 영향 없음)
export function __clearGeneratorCacheForTest() {
	vocabularyCache.clear();
	koToEnMapCache.clear();
	enToKoMapCache.clear();
}

async function initializeCache(filename: string = 'term.json') {
	// 캐시 확인
	if (vocabularyCache.has(filename)) {
		return vocabularyCache.get(filename)!;
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

		// 캐시에 저장
		vocabularyCache.set(filename, vocabularyData);

		// Map 생성 및 캐시
		const koToEnMap = new Map<string, string[]>();
		const enToKoMap = new Map<string, string[]>();

		for (const entry of vocabularyData.entries) {
			const koKey = entry.standardName.toLowerCase();
			const enKey = entry.abbreviation.toLowerCase();

			// Map에 키가 없으면 새 배열 생성
			const koValues = koToEnMap.get(koKey) ?? [];
			koValues.push(entry.abbreviation);
			koToEnMap.set(koKey, koValues);

			const enValues = enToKoMap.get(enKey) ?? [];
			enValues.push(entry.standardName);
			enToKoMap.set(enKey, enValues);
		}

		koToEnMapCache.set(filename, koToEnMap);
		enToKoMapCache.set(filename, enToKoMap);

		return vocabularyData;
	} catch (error) {
		console.error('단어집 캐시 초기화 중 오류:', error);
		return null;
	}
}

export async function POST({ request, url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'term.json';
		const vocabularyData = await initializeCache(filename);

		if (!vocabularyData) {
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
				{
					success: false,
					error: '변환할 단어를 제공해야 합니다.',
					message: 'Missing term'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		const sourceMap =
			direction === 'ko-to-en' ? koToEnMapCache.get(filename)! : enToKoMapCache.get(filename)!;
		const separator = term.includes(' ') ? ' ' : '_';
		const terms = term.split(separator);

		const termOptions = terms.map((t) => {
			const trimmedTerm = t.trim();
			const results = sourceMap.get(trimmedTerm.toLowerCase());
			return results && results.length > 0 ? results : ['##'];
		});

		function cartesianProduct(arrays: string[][]): string[][] {
			return arrays.reduce<string[][]>(
				(acc, curr) => {
					const result: string[][] = [];
					for (const a of acc) {
						for (const c of curr) {
							result.push([...a, c]);
						}
					}
					return result;
				},
				[[]]
			);
		}

		const combinations = cartesianProduct(termOptions);
		const results = combinations.map((combo) => combo.join(separator));

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
