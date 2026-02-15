import { json, type RequestEvent } from '@sveltejs/kit';
import {
	loadData,
	saveData,
	mergeData,
	listFiles,
	createFile,
	renameFile,
	deleteFile,
	loadVocabularyData,
	saveVocabularyData,
	mergeVocabularyData,
	listVocabularyFiles,
	createVocabularyFile,
	renameVocabularyFile,
	deleteVocabularyFile,
	loadDomainData,
	saveDomainData,
	mergeDomainData,
	listDomainFiles,
	createDomainFile,
	renameDomainFile,
	deleteDomainFile,
	loadTermData,
	saveTermData,
	mergeTermData,
	listTermFiles,
	createTermFile,
	renameTermFile,
	deleteTermFile,
	loadDatabaseData,
	saveDatabaseData,
	mergeDatabaseData,
	listDatabaseFiles,
	createDatabaseFile,
	renameDatabaseFile,
	deleteDatabaseFile,
	loadEntityData,
	saveEntityData,
	mergeEntityData,
	listEntityFiles,
	createEntityFile,
	renameEntityFile,
	deleteEntityFile,
	loadAttributeData,
	saveAttributeData,
	mergeAttributeData,
	listAttributeFiles,
	createAttributeFile,
	renameAttributeFile,
	deleteAttributeFile,
	loadTableData,
	saveTableData,
	mergeTableData,
	listTableFiles,
	createTableFile,
	renameTableFile,
	deleteTableFile,
	loadColumnData,
	saveColumnData,
	mergeColumnData,
	listColumnFiles,
	createColumnFile,
	renameColumnFile,
	deleteColumnFile,
	loadForbiddenWords
} from '$lib/registry/data-registry';
import {
	getCachedData,
	getCachedVocabularyData,
	getCachedDomainData,
	getCachedTermData,
	invalidateCache,
	invalidateDataCache,
	invalidateAllCaches
} from '$lib/registry/cache-registry';

import { resolveRelatedFilenames } from '$lib/registry/mapping-registry';
import { normalizeKey } from '$lib/utils/mapping-key.js';
import type { ApiResponse, VocabularyEntry, VocabularyData } from '$lib/types/vocabulary.js';
import type { DomainEntry } from '$lib/types/domain.js';

type SyncRequest = {
	vocabularyFilename?: string;
	domainFilename?: string;
	apply?: boolean;
};

export async function POST({ request, url }: RequestEvent) {
	try {
		const { vocabularyFilename, domainFilename, apply: applyFromBody }: SyncRequest =
			await request.json();
		const applyQuery = url.searchParams.get('apply');
		const apply =
			typeof applyFromBody === 'boolean'
				? applyFromBody
				: applyQuery === null
					? true
					: !['false', '0', 'no'].includes(applyQuery.toLowerCase());

		const vocabFile = vocabularyFilename || 'vocabulary.json';

		// 단어집 로드
		const vocabularyData = await loadData('vocabulary', vocabFile) as VocabularyData;

		// 3단계 폴백으로 도메인 파일 해석
		const fileMappingOverride: Partial<Record<string, string>> = {};
		if (vocabularyData.mapping?.domain) fileMappingOverride.domain = vocabularyData.mapping.domain;
		const relatedFiles = await resolveRelatedFilenames('vocabulary', vocabFile, fileMappingOverride as Partial<Record<DataType, string>>);
		const domainFile = domainFilename || relatedFiles.get('domain') || 'domain.json';

		// 도메인 데이터 로드
		const domainData = await loadData('domain', domainFile);
		const domainMap = new Map<string, string>(); // key: domainCategory(lower/trim) -> domainGroup
		domainData.entries.forEach((entry: DomainEntry) => {
			if (entry.domainCategory && entry.domainGroup) {
				domainMap.set(normalizeKey(entry.domainCategory), entry.domainGroup);
			}
		});

		let updated = 0;
		let matched = 0;
		let unmatched = 0;
		const changes: Array<{
			id: string;
			standardName: string;
			domainCategory?: string;
			owner: 'vocabulary/sync-domain';
			reason: string;
			before: { domainGroup?: string; isDomainCategoryMapped?: boolean };
			after: { domainGroup?: string; isDomainCategoryMapped?: boolean };
		}> = [];

		const now = new Date().toISOString();

		const mappedEntries: VocabularyEntry[] = vocabularyData.entries.map((entry) => {
			// 도메인 분류명이 없으면 매핑 불가
			if (!entry.domainCategory) {
				unmatched += 1;
				return { ...entry, isDomainCategoryMapped: false };
			}
			const key = normalizeKey(entry.domainCategory);
			const mappedGroup = domainMap.get(key);
			if (mappedGroup) {
				matched += 1;
				const shouldUpdateGroup = entry.domainGroup !== mappedGroup;
				const shouldUpdateFlag = entry.isDomainCategoryMapped !== true;
				if (shouldUpdateGroup || shouldUpdateFlag) {
					updated += 1;
					changes.push({
						id: entry.id,
						standardName: entry.standardName,
						domainCategory: entry.domainCategory,
						owner: 'vocabulary/sync-domain',
						reason: 'domainCategory 기준으로 domainGroup과 매핑 상태를 보정했습니다.',
						before: {
							domainGroup: entry.domainGroup,
							isDomainCategoryMapped: entry.isDomainCategoryMapped
						},
						after: {
							domainGroup: mappedGroup,
							isDomainCategoryMapped: true
						}
					});
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

		// 적용 모드일 때만 저장 (mapping.domain만 사용, mappedDomainFile은 deprecated)
		if (apply) {
			const finalData: VocabularyData = {
				...vocabularyData,
				entries: mappedEntries,
				mapping: {
					domain: domainFile
				},
				lastUpdated: new Date().toISOString()
			};
			await saveData('vocabulary', finalData, vocabFile);
			invalidateDataCache('vocabulary', vocabFile);
		}

		return json(
			{
				success: true,
				data: {
					mode: apply ? 'apply' : 'preview',
					applied: apply,
					vocabularyFilename: vocabFile,
					domainFilename: domainFile,
					updated,
					matched,
					unmatched,
					total: vocabularyData.entries.length,
					changes: changes.slice(0, 100)
				},
				message: apply
					? '도메인 매핑 동기화가 완료되었습니다.'
					: '도메인 매핑 동기화 미리보기 결과입니다.'
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

