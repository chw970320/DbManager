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
 * 용어 파일 매핑 정보 조회 API
 * GET /api/term/files/mapping?filename=term.json
 */
export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'term.json';

		// 3단계 폴백으로 매핑 해석 (레지스트리 우선, 파일 폴백)
		const termData = await loadData('term', filename);
		const fileMappingOverride: Partial<Record<DataType, string>> = {};
		if (termData.mapping?.vocabulary) fileMappingOverride.vocabulary = termData.mapping.vocabulary;
		if (termData.mapping?.domain) fileMappingOverride.domain = termData.mapping.domain;
		const relatedFiles = await resolveRelatedFilenames('term', filename, fileMappingOverride);

		return json(
			{
				success: true,
				data: {
					mapping: {
						vocabulary: relatedFiles.get('vocabulary') || 'vocabulary.json',
						domain: relatedFiles.get('domain') || 'domain.json'
					}
				},
				message: 'Term mapping retrieved successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 조회 중 오류가 발생했습니다.',
				message: 'Failed to retrieve term mapping'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 용어 파일 매핑 정보 저장 API
 * PUT /api/term/files/mapping
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

		if (!mapping || !mapping.vocabulary || !mapping.domain) {
			return json(
				{
					success: false,
					error: '매핑 정보가 올바르지 않습니다. vocabulary와 domain이 필요합니다.',
					message: 'Invalid mapping data'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 1. 파일 내 mapping 필드 업데이트 (하위 호환)
		const termData = await loadData('term', filename);
		termData.mapping = {
			vocabulary: mapping.vocabulary,
			domain: mapping.domain
		};
		await saveData('term', termData, filename);

		// 2. 레지스트리 듀얼 라이트 (best-effort)
		// term은 vocabulary와 domain 두 매핑 타겟이 있음
		try {
			const existingMappings = await getMappingsFor('term', filename);

			// vocabulary 매핑 갱신
			const vocabMapping = existingMappings.find((m) => m.relatedType === 'vocabulary');
			if (vocabMapping) {
				await updateMapping(vocabMapping.relation.id, {
					targetFilename: mapping.vocabulary
				});
			} else {
				await addMapping({
					sourceType: 'term',
					sourceFilename: filename,
					targetType: 'vocabulary',
					targetFilename: mapping.vocabulary,
					mappingKey: 'termName_parts→standardName',
					cardinality: 'N:N',
					description: '용어집 → 단어집 매핑'
				});
			}

			// domain 매핑 갱신
			const domainMapping = existingMappings.find((m) => m.relatedType === 'domain');
			if (domainMapping) {
				await updateMapping(domainMapping.relation.id, {
					targetFilename: mapping.domain
				});
			} else {
				await addMapping({
					sourceType: 'term',
					sourceFilename: filename,
					targetType: 'domain',
					targetFilename: mapping.domain,
					mappingKey: 'domainName→standardDomainName',
					cardinality: 'N:1',
					description: '용어집 → 도메인 매핑'
				});
			}
		} catch (registryError) {
			console.warn('[듀얼 라이트] 레지스트리 갱신 실패 (파일 저장은 완료):', registryError);
		}

		return json(
			{
				success: true,
				data: {
					mapping: termData.mapping
				},
				message: 'Term mapping saved successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 저장 중 오류가 발생했습니다.',
				message: 'Failed to save term mapping'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

