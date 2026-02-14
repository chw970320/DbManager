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

/**
 * ERD 생성 API
 * GET /api/erd/generate
 */

import { generateERDData } from '$lib/utils/erd-generator.js';
import type { ERDFilterOptions } from '$lib/utils/erd-filter.js';
import type { MappingContext } from '$lib/types/erd-mapping.js';

/**
 * 모든 파일에서 데이터 로드 (레지스트리 기반 파일 탐색)
 */
async function loadAllDataFromFirstFiles(): Promise<MappingContext> {
	// 각 타입의 첫 번째 파일 가져오기
	const databaseFiles = await listFiles('database');
	const entityFiles = await listFiles('entity');
	const attributeFiles = await listFiles('attribute');
	const tableFiles = await listFiles('table');
	const columnFiles = await listFiles('column');
	const domainFiles = await listFiles('domain');
	const vocabFiles = await listFiles('vocabulary');

	// 첫 번째 파일에서 데이터 로드 (없으면 빈 배열)
	const databases =
		databaseFiles.length > 0 ? (await loadData('database', databaseFiles[0])).entries : [];
	const entities = entityFiles.length > 0 ? (await loadData('entity', entityFiles[0])).entries : [];
	const attributes =
		attributeFiles.length > 0 ? (await loadData('attribute', attributeFiles[0])).entries : [];
	const tables = tableFiles.length > 0 ? (await loadData('table', tableFiles[0])).entries : [];
	const columns = columnFiles.length > 0 ? (await loadData('column', columnFiles[0])).entries : [];
	const domains = domainFiles.length > 0 ? (await loadData('domain', domainFiles[0])).entries : [];

	// 단어집 데이터 로드 (도메인 매핑용)
	let vocabularyMap:
		| Map<string, { standardName: string; abbreviation: string; domainCategory?: string }>
		| undefined;
	try {
		if (vocabFiles.length > 0) {
			const vocabData = await getCachedData('vocabulary', vocabFiles[0]);
			if (vocabData) {
				vocabularyMap = new Map();
				for (const entry of vocabData.entries) {
					const key = entry.standardName?.toLowerCase().trim() || '';
					if (key) {
						vocabularyMap.set(key, {
							standardName: entry.standardName,
							abbreviation: entry.abbreviation,
							domainCategory: entry.domainCategory
						});
					}
					const abbrevKey = entry.abbreviation?.toLowerCase().trim() || '';
					if (abbrevKey && abbrevKey !== key) {
						vocabularyMap.set(abbrevKey, {
							standardName: entry.standardName,
							abbreviation: entry.abbreviation,
							domainCategory: entry.domainCategory
						});
					}
				}
			}
		}
	} catch (error) {
		console.warn('단어집 데이터 로드 실패 (도메인 매핑은 제외됩니다):', error);
	}

	return {
		databases,
		entities,
		attributes,
		tables,
		columns,
		domains,
		vocabularyMap
	};
}

/**
 * ERD 생성 API
 * GET /api/erd/generate
 */
export async function GET({ url }: RequestEvent) {
	try {
		// 쿼리 파라미터에서 파일명들 가져오기 (선택적)
		const databaseFile = url.searchParams.get('databaseFile') || undefined;
		const entityFile = url.searchParams.get('entityFile') || undefined;
		const attributeFile = url.searchParams.get('attributeFile') || undefined;
		const tableFile = url.searchParams.get('tableFile') || undefined;
		const columnFile = url.searchParams.get('columnFile') || undefined;
		const domainFile = url.searchParams.get('domainFile') || undefined;

		let context: MappingContext;

		// 특정 파일이 지정된 경우 해당 파일 사용, 아니면 첫 번째 파일 사용
		if (databaseFile || entityFile || attributeFile || tableFile || columnFile || domainFile) {
			const databases = databaseFile ? (await loadData('database', databaseFile)).entries : [];
			const entities = entityFile ? (await loadData('entity', entityFile)).entries : [];
			const attributes = attributeFile
				? (await loadData('attribute', attributeFile)).entries
				: [];
			const tables = tableFile ? (await loadData('table', tableFile)).entries : [];
			const columns = columnFile ? (await loadData('column', columnFile)).entries : [];
			const domains = domainFile ? (await loadData('domain', domainFile)).entries : [];

			// 단어집 데이터 로드
			let vocabularyMap:
				| Map<string, { standardName: string; abbreviation: string; domainCategory?: string }>
				| undefined;
			try {
				const vocabFiles = await listFiles('vocabulary');
				if (vocabFiles.length > 0) {
					const vocabData = await getCachedData('vocabulary', vocabFiles[0]);
					if (vocabData) {
						vocabularyMap = new Map();
						for (const entry of vocabData.entries) {
							const key = entry.standardName?.toLowerCase().trim() || '';
							if (key) {
								vocabularyMap.set(key, {
									standardName: entry.standardName,
									abbreviation: entry.abbreviation,
									domainCategory: entry.domainCategory
								});
							}
							const abbrevKey = entry.abbreviation?.toLowerCase().trim() || '';
							if (abbrevKey && abbrevKey !== key) {
								vocabularyMap.set(abbrevKey, {
									standardName: entry.standardName,
									abbreviation: entry.abbreviation,
									domainCategory: entry.domainCategory
								});
							}
						}
					}
				}
			} catch (error) {
				console.warn('단어집 데이터 로드 실패:', error);
			}

			context = {
				databases,
				entities,
				attributes,
				tables,
				columns,
				domains,
				vocabularyMap
			};
		} else {
			// 모든 데이터 로드 (첫 번째 파일)
			context = await loadAllDataFromFirstFiles();
		}

		// 필터 옵션 파라미터 파싱
		const tableIdsParam = url.searchParams.get('tableIds');
		const includeRelatedParam = url.searchParams.get('includeRelated');

		const filterOptions: ERDFilterOptions | undefined =
			tableIdsParam && tableIdsParam.trim() !== ''
				? {
						tableIds: tableIdsParam
							.split(',')
							.map((id) => id.trim())
							.filter((id) => id.length > 0),
						includeRelated: includeRelatedParam !== 'false'
					}
				: undefined;

		// ERD 데이터 생성
		const erdData = generateERDData(context, filterOptions);

		return json(
			{
				success: true,
				data: erdData,
				message: 'ERD 생성 완료'
			} as DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('ERD 생성 오류:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'ERD 생성 중 오류가 발생했습니다.'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}

