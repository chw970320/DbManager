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
import { loadDesignRelationContext } from '$lib/utils/design-relation-context.js';
import { validateLoadedDesignRelationContext } from '$lib/utils/design-relation-service.js';
import {
	getErdFileContextInputFromUrl,
	resolveErdFileContext
} from '$lib/utils/erd-file-context.js';
import type { ERDFilterOptions } from '$lib/utils/erd-filter.js';

function parseListParam(url: URL, ...names: string[]): string[] {
	return names
		.flatMap((name) => url.searchParams.getAll(name))
		.flatMap((value) => value.split(','))
		.map((value) => value.trim())
		.filter(Boolean);
}

function parseBooleanParam(value: string | null, defaultValue: boolean): boolean {
	if (value === null) return defaultValue;
	return !['false', '0', 'no', 'n', 'off'].includes(value.trim().toLowerCase());
}

function createFilterOptions(url: URL): ERDFilterOptions | undefined {
	const tableIds = parseListParam(url, 'tableIds');
	const subjectAreas = parseListParam(url, 'subjectArea', 'subjectAreas');
	const schemas = parseListParam(url, 'schema', 'schemas');
	const tableSearch = (
		url.searchParams.get('q') ||
		url.searchParams.get('tableSearch') ||
		''
	).trim();
	const scopeFlags = parseListParam(url, 'scopeFlag', 'scopeFlags', 'businessScope');
	const includeRelated = parseBooleanParam(url.searchParams.get('includeRelated'), true);
	const includeExternalReferences = parseBooleanParam(
		url.searchParams.get('includeExternalReferences'),
		true
	);
	const hasFilter =
		tableIds.length > 0 ||
		subjectAreas.length > 0 ||
		schemas.length > 0 ||
		tableSearch.length > 0 ||
		scopeFlags.length > 0 ||
		!includeExternalReferences;

	if (!hasFilter) return undefined;

	return {
		tableIds,
		includeRelated,
		subjectAreas,
		schemas,
		tableSearch,
		scopeFlags,
		includeExternalReferences
	};
}

/**
 * ERD 생성 API
 * GET /api/erd/generate
 */
export async function GET({ url }: RequestEvent) {
	try {
		// 쿼리 파라미터에서 파일명들 가져오기 (선택적)
		const fileContext = await resolveErdFileContext(getErdFileContextInputFromUrl(url));
		const {
			databaseFile,
			entityFile,
			attributeFile,
			tableFile,
			columnFile,
			domainFile,
			termFile,
			vocabularyFile
		} = fileContext.files;
		const { context, standardReferences } = await loadDesignRelationContext({
			databaseFile,
			entityFile,
			attributeFile,
			tableFile,
			columnFile,
			domainFile,
			termFile,
			vocabularyFile,
			includeDomain: true,
			includeTerm: Boolean(termFile),
			includeVocabularyMap: true,
			fallbackToFirstWhenMissing: !fileContext.hasExplicitFile
		});

		const filterOptions = createFilterOptions(url);

		// ERD 데이터 생성
		const erdData = generateERDData(context, filterOptions);
		const relationValidation = validateLoadedDesignRelationContext(context, standardReferences);

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
