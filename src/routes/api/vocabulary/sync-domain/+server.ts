import { json, type RequestEvent } from '@sveltejs/kit';
import { loadVocabularyData, saveVocabularyData, loadDomainData } from '$lib/utils/file-handler.js';
import type { ApiResponse, VocabularyEntry, VocabularyData } from '$lib/types/vocabulary.js';
import type { DomainEntry } from '$lib/types/domain.js';

type SyncRequest = {
	vocabularyFilename?: string;
	domainFilename?: string;
};

export async function POST({ request }: RequestEvent) {
	try {
		const { vocabularyFilename, domainFilename }: SyncRequest = await request.json();

		const vocabFile = vocabularyFilename || 'vocabulary.json';
		const domainFile = domainFilename || 'domain.json';

		// 도메인 데이터 로드
		const domainData = await loadDomainData(domainFile);
		const domainMap = new Map<string, string>(); // key: domainCategory(lower/trim) -> domainGroup
		domainData.entries.forEach((entry: DomainEntry) => {
			if (entry.domainCategory && entry.domainGroup) {
				domainMap.set(entry.domainCategory.trim().toLowerCase(), entry.domainGroup);
			}
		});

		// 단어집 로드
		const vocabularyData = await loadVocabularyData(vocabFile);

		let updated = 0;
		let matched = 0;
		let unmatched = 0;

		const now = new Date().toISOString();

		const mappedEntries: VocabularyEntry[] = vocabularyData.entries.map((entry) => {
			// 도메인 분류명이 없으면 매핑 불가
			if (!entry.domainCategory) {
				unmatched += 1;
				return { ...entry, isDomainCategoryMapped: false };
			}
			const key = entry.domainCategory.trim().toLowerCase();
			const mappedGroup = domainMap.get(key);
			if (mappedGroup) {
				matched += 1;
				const shouldUpdateGroup = entry.domainGroup !== mappedGroup;
				const shouldUpdateFlag = entry.isDomainCategoryMapped !== true;
				if (shouldUpdateGroup || shouldUpdateFlag) {
					updated += 1;
					return {
						...entry,
						domainGroup: mappedGroup,
						isDomainCategoryMapped: true,
						updatedAt: entry.updatedAt || now
					};
				}
				return { ...entry, isDomainCategoryMapped: true };
			}
			unmatched += 1;
			return { ...entry, isDomainCategoryMapped: false };
		});

		// 저장
		const finalData: VocabularyData = {
			...vocabularyData,
			entries: mappedEntries,
			mappedDomainFile: domainFile,
			lastUpdated: vocabularyData.lastUpdated
		};
		await saveVocabularyData(finalData, vocabFile);

		return json(
			{
				success: true,
				data: {
					vocabularyFilename: vocabFile,
					domainFilename: domainFile,
					updated,
					matched,
					unmatched,
					total: vocabularyData.entries.length
				},
				message: '도메인 매핑 동기화가 완료되었습니다.'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('도메인 매핑 동기화 오류:', error);
		return json(
			{
				success: false,
				error: '도메인 매핑 동기화 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}
