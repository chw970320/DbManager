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

/**
 * 용어 매핑 검증 로직 (업로드 API와 동일)
 */
function checkTermMapping(
	termName: string,
	columnName: string,
	domainName: string,
	vocabularyMap: Map<string, { standardName: string; abbreviation: string }>,
	domainMap: Map<string, string>
): {
	isMappedTerm: boolean;
	isMappedColumn: boolean;
	isMappedDomain: boolean;
	unmappedTermParts: string[];
	unmappedColumnParts: string[];
} {
	// 용어명 매핑: 언더스코어로 분리해서 각 단어가 단어집의 standardName에 있는지 확인
	const termParts = termName
		.split('_')
		.map((p) => p.trim())
		.filter((p) => p.length > 0);
	const unmappedTermParts: string[] = [];
	const isMappedTerm =
		termParts.length > 0 &&
		termParts.every((part) => {
			const partLower = part.toLowerCase();
			// 정확히 일치하거나 부분 일치하는지 확인
			for (const [key, value] of vocabularyMap.entries()) {
				if (key === partLower || value.standardName.toLowerCase() === partLower) {
					return true;
				}
			}
			unmappedTermParts.push(part);
			return false;
		});

	// 컬럼명 매핑: 언더스코어로 분리해서 각 단어가 단어집의 abbreviation에 있는지 확인
	const columnParts = columnName
		.split('_')
		.map((p) => p.trim())
		.filter((p) => p.length > 0);
	const unmappedColumnParts: string[] = [];
	const isMappedColumn =
		columnParts.length > 0 &&
		columnParts.every((part) => {
			const partLower = part.toLowerCase();
			// 정확히 일치하거나 부분 일치하는지 확인
			for (const [key, value] of vocabularyMap.entries()) {
				if (key === partLower || value.abbreviation.toLowerCase() === partLower) {
					return true;
				}
			}
			unmappedColumnParts.push(part);
			return false;
		});

	// 도메인명 매핑: 도메인의 standardDomainName과 정확히 일치하는지 확인
	const isMappedDomain = domainMap.has(domainName.trim().toLowerCase());

	return {
		isMappedTerm,
		isMappedColumn,
		isMappedDomain,
		unmappedTermParts,
		unmappedColumnParts
	};
}

/**
 * 용어 매핑 동기화 API
 * POST /api/term/sync
 */
export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const { filename = 'term.json' } = body;

		// 용어 데이터 로드
		const termData = await loadData('term', filename);

		// 3단계 폴백으로 관련 파일 해석
		const fileMappingOverride: Partial<Record<string, string>> = {};
		if (termData.mapping?.vocabulary) fileMappingOverride.vocabulary = termData.mapping.vocabulary;
		if (termData.mapping?.domain) fileMappingOverride.domain = termData.mapping.domain;
		const relatedFiles = await resolveRelatedFilenames('term', filename, fileMappingOverride as Partial<Record<DataType, string>>);

		// 단어집 및 도메인 데이터 로드
		const vocabularyData = await loadData('vocabulary', relatedFiles.get('vocabulary'));
		const domainData = await loadData('domain', relatedFiles.get('domain'));

		// 단어집 맵 생성
		const vocabularyMap = new Map<string, { standardName: string; abbreviation: string }>();
		vocabularyData.entries.forEach((vocabEntry) => {
			const standardNameKey = vocabEntry.standardName.trim().toLowerCase();
			const abbreviationKey = vocabEntry.abbreviation.trim().toLowerCase();
			vocabularyMap.set(standardNameKey, {
				standardName: vocabEntry.standardName,
				abbreviation: vocabEntry.abbreviation
			});
			vocabularyMap.set(abbreviationKey, {
				standardName: vocabEntry.standardName,
				abbreviation: vocabEntry.abbreviation
			});
		});

		// 도메인 맵 생성
		const domainMap = new Map<string, string>();
		domainData.entries.forEach((domainEntry) => {
			const key = domainEntry.standardDomainName.trim().toLowerCase();
			domainMap.set(key, domainEntry.standardDomainName);
		});

		// 매핑 재검증
		let updated = 0;
		let matchedTerm = 0;
		let matchedColumn = 0;
		let matchedDomain = 0;

		const now = new Date().toISOString();
		const syncedEntries: TermEntry[] = termData.entries.map((entry) => {
			const mappingResult = checkTermMapping(
				entry.termName,
				entry.columnName,
				entry.domainName,
				vocabularyMap,
				domainMap
			);

			// 매핑 상태가 변경되었는지 확인
			const hasChanged =
				entry.isMappedTerm !== mappingResult.isMappedTerm ||
				entry.isMappedColumn !== mappingResult.isMappedColumn ||
				entry.isMappedDomain !== mappingResult.isMappedDomain ||
				JSON.stringify(entry.unmappedTermParts || []) !==
					JSON.stringify(mappingResult.unmappedTermParts) ||
				JSON.stringify(entry.unmappedColumnParts || []) !==
					JSON.stringify(mappingResult.unmappedColumnParts);

			if (hasChanged) {
				updated += 1;
			}

			if (mappingResult.isMappedTerm) matchedTerm += 1;
			if (mappingResult.isMappedColumn) matchedColumn += 1;
			if (mappingResult.isMappedDomain) matchedDomain += 1;

			return {
				...entry,
				isMappedTerm: mappingResult.isMappedTerm,
				isMappedColumn: mappingResult.isMappedColumn,
				isMappedDomain: mappingResult.isMappedDomain,
				unmappedTermParts:
					mappingResult.unmappedTermParts.length > 0 ? mappingResult.unmappedTermParts : undefined,
				unmappedColumnParts:
					mappingResult.unmappedColumnParts.length > 0
						? mappingResult.unmappedColumnParts
						: undefined,
				updatedAt: hasChanged ? now : entry.updatedAt
			};
		});

		// 저장
		const finalData: TermData = {
			...termData,
			entries: syncedEntries,
			lastUpdated: new Date().toISOString()
		};
		await saveData('term', finalData, filename);

		return json(
			{
				success: true,
				data: {
					filename,
					updated,
					matchedTerm,
					matchedColumn,
					matchedDomain,
					total: termData.entries.length
				},
				message: '용어 매핑 동기화가 완료되었습니다.'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('용어 매핑 동기화 오류:', error);
		return json(
			{
				success: false,
				error: '용어 매핑 동기화 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

