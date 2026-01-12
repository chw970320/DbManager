/**
 * ERD 생성 API
 * GET /api/erd/generate
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import type { DbDesignApiResponse } from '$lib/types/database-design.js';
import {
	loadDatabaseData,
	loadEntityData,
	loadAttributeData,
	loadTableData,
	loadColumnData,
	listDatabaseFiles,
	listEntityFiles,
	listAttributeFiles,
	listTableFiles,
	listColumnFiles
} from '$lib/utils/database-design-handler.js';
import { loadDomainData, listDomainFiles, listVocabularyFiles } from '$lib/utils/file-handler.js';
import { getCachedVocabularyData } from '$lib/utils/cache.js';
import { generateERDData } from '$lib/utils/erd-generator.js';
import type { ERDFilterOptions } from '$lib/utils/erd-filter.js';
import type { MappingContext } from '$lib/types/erd-mapping.js';
import type { VocabularyEntry } from '$lib/types/vocabulary.js';

/**
 * 모든 파일에서 데이터 로드 (첫 번째 파일만 사용)
 */
async function loadAllDataFromFirstFiles(): Promise<MappingContext> {
	// 파일 목록 가져오기
	const databaseFiles = await listDatabaseFiles();
	const entityFiles = await listEntityFiles();
	const attributeFiles = await listAttributeFiles();
	const tableFiles = await listTableFiles();
	const columnFiles = await listColumnFiles();
	const domainFiles = await listDomainFiles();

	// 첫 번째 파일에서 데이터 로드 (없으면 빈 배열)
	const databases =
		databaseFiles.length > 0 ? (await loadDatabaseData(databaseFiles[0])).entries : [];
	const entities = entityFiles.length > 0 ? (await loadEntityData(entityFiles[0])).entries : [];
	const attributes =
		attributeFiles.length > 0 ? (await loadAttributeData(attributeFiles[0])).entries : [];
	const tables = tableFiles.length > 0 ? (await loadTableData(tableFiles[0])).entries : [];
	const columns = columnFiles.length > 0 ? (await loadColumnData(columnFiles[0])).entries : [];
	const domains = domainFiles.length > 0 ? (await loadDomainData(domainFiles[0])).entries : [];

	// 단어집 데이터 로드 (도메인 매핑용)
	let vocabularyMap:
		| Map<string, { standardName: string; abbreviation: string; domainCategory?: string }>
		| undefined;
	try {
		const vocabFiles = await listVocabularyFiles();
		if (vocabFiles.length > 0) {
			const vocabData = await getCachedVocabularyData(vocabFiles[0]);
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
			const databases = databaseFile ? (await loadDatabaseData(databaseFile)).entries : [];
			const entities = entityFile ? (await loadEntityData(entityFile)).entries : [];
			const attributes = attributeFile ? (await loadAttributeData(attributeFile)).entries : [];
			const tables = tableFile ? (await loadTableData(tableFile)).entries : [];
			const columns = columnFile ? (await loadColumnData(columnFile)).entries : [];
			const domains = domainFile ? (await loadDomainData(domainFile)).entries : [];

			// 단어집 데이터 로드
			let vocabularyMap:
				| Map<string, { standardName: string; abbreviation: string; domainCategory?: string }>
				| undefined;
			try {
				const vocabFiles = await listVocabularyFiles();
				if (vocabFiles.length > 0) {
					const vocabData = await getCachedVocabularyData(vocabFiles[0]);
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
