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
import { validateDesignRelations } from '$lib/utils/design-relation-validator.js';
import {
	getAnyExplicitDefinitionFile,
	loadDesignRelationContext
} from '$lib/utils/design-relation-context.js';
import type { ERDFilterOptions } from '$lib/utils/erd-filter.js';

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

		const hasExplicitFile = getAnyExplicitDefinitionFile({
			databaseFile,
			entityFile,
			attributeFile,
			tableFile,
			columnFile,
			domainFile
		});
		const { context } = await loadDesignRelationContext({
			databaseFile,
			entityFile,
			attributeFile,
			tableFile,
			columnFile,
			domainFile,
			includeDomain: true,
			includeVocabularyMap: true,
			fallbackToFirstWhenMissing: !hasExplicitFile
		});

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
		const relationValidation = validateDesignRelations(context);

		return json(
			{
				success: true,
				data: {
					...erdData,
					relationValidation
				},
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

