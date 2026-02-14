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

import {
	resolveRelatedFilenames,
	getMappingsFor,
	updateMapping,
	addMapping
} from '$lib/registry/mapping-registry';
import type { DataType } from '$lib/types/base';

/**
 * 단어집 파일 매핑 정보 조회 API
 * GET /api/vocabulary/files/mapping?filename=vocabulary.json
 */
export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'vocabulary.json';

		// 3단계 폴백으로 매핑 해석 (레지스트리 우선, 파일 폴백)
		const vocabularyData = await loadData('vocabulary', filename);
		const fileMappingOverride: Partial<Record<DataType, string>> = {};
		if (vocabularyData.mapping?.domain) fileMappingOverride.domain = vocabularyData.mapping.domain;
		const relatedFiles = await resolveRelatedFilenames('vocabulary', filename, fileMappingOverride);

		return json(
			{
				success: true,
				data: {
					mapping: {
						domain: relatedFiles.get('domain') || 'domain.json'
					}
				},
				message: 'Vocabulary mapping retrieved successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 조회 중 오류가 발생했습니다.',
				message: 'Failed to retrieve vocabulary mapping'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 단어집 파일 매핑 정보 저장 API
 * PUT /api/vocabulary/files/mapping
 *
 * 듀얼 라이트: 파일 내 mapping 필드 + 레지스트리 동시 갱신
 */
export async function PUT({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const { filename, mapping } = body;

		if (!filename) {
			return json(
				{
					success: false,
					error: '파일명이 제공되지 않았습니다.',
					message: 'Filename is required'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		if (!mapping || !mapping.domain) {
			return json(
				{
					success: false,
					error: '매핑 정보가 올바르지 않습니다. domain이 필요합니다.',
					message: 'Invalid mapping data'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 1. 파일 내 mapping 필드 업데이트 (하위 호환)
		const vocabularyData = await loadData('vocabulary', filename);
		vocabularyData.mapping = {
			domain: mapping.domain
		};
		delete vocabularyData.mappedDomainFile;
		await saveData('vocabulary', vocabularyData, filename);

		// 2. 레지스트리 듀얼 라이트 (best-effort)
		try {
			const existingMappings = await getMappingsFor('vocabulary', filename);
			const domainMapping = existingMappings.find((m) => m.relatedType === 'domain');

			if (domainMapping) {
				await updateMapping(domainMapping.relation.id, {
					targetFilename: mapping.domain
				});
			} else {
				await addMapping({
					sourceType: 'vocabulary',
					sourceFilename: filename,
					targetType: 'domain',
					targetFilename: mapping.domain,
					mappingKey: 'domainCategory',
					cardinality: 'N:1',
					description: '단어집 → 도메인 분류 매핑'
				});
			}
		} catch (registryError) {
			console.warn('[듀얼 라이트] 레지스트리 갱신 실패 (파일 저장은 완료):', registryError);
		}

		return json(
			{
				success: true,
				data: {
					mapping: vocabularyData.mapping
				},
				message: 'Vocabulary mapping saved successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 저장 중 오류가 발생했습니다.',
				message: 'Failed to save vocabulary mapping'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

