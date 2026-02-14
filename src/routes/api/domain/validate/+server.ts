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

import { generateStandardDomainName, validateDomainNameUniqueness } from '$lib/utils/validation.js';

/**
 * 도메인 validation API
 * POST /api/domain/validate
 *
 * 클라이언트에서 전송 전에 validation을 수행하기 위한 엔드포인트
 */
export async function POST({ request, url }: RequestEvent) {
	try {
		const body = await request.json();
		const { domainCategory, physicalDataType, dataLength, decimalPlaces, entryId } = body;
		const filename = url.searchParams.get('filename') || 'domain.json';

		// 필수 필드 검증
		if (!domainCategory || typeof domainCategory !== 'string' || !domainCategory.trim()) {
			return json(
				{
					success: false,
					error: '도메인 분류명이 필요합니다.',
					message: 'Missing domainCategory'
				} as DomainApiResponse,
				{ status: 400 }
			);
		}

		if (!physicalDataType || typeof physicalDataType !== 'string' || !physicalDataType.trim()) {
			return json(
				{
					success: false,
					error: '물리 데이터타입이 필요합니다.',
					message: 'Missing physicalDataType'
				} as DomainApiResponse,
				{ status: 400 }
			);
		}

		// 도메인명 자동 생성
		const generatedDomainName = generateStandardDomainName(
			domainCategory,
			physicalDataType,
			dataLength,
			decimalPlaces
		);

		// 도메인명 유일성 검사 (선택된 파일 기준)
		try {
			const fileData = await loadDomainData(filename);
			const allDomainEntries: DomainEntry[] = entryId
				? fileData.entries.filter((e) => e.id !== entryId)
				: fileData.entries;

			const uniquenessError = validateDomainNameUniqueness(generatedDomainName, allDomainEntries);
			if (uniquenessError) {
				return json(
					{
						success: false,
						error: uniquenessError,
						message: 'Duplicate domain name'
					} as DomainApiResponse,
					{ status: 409 }
				);
			}
		} catch (validationError) {
			console.warn('도메인명 유일성 확인 중 오류:', validationError);
			// validation 실패 시에도 성공으로 반환 (서버에서 다시 검증)
		}

		// 모든 validation 통과
		return json(
			{
				success: true,
				message: 'Validation passed'
			} as DomainApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('Validation 중 오류:', error);
		return json(
			{
				success: false,
				error: 'Validation 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as DomainApiResponse,
			{ status: 500 }
		);
	}
}



