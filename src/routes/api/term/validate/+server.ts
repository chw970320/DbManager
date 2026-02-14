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
import {
	validateTermNameSuffix,
	validateTermUniqueness,
	validateTermNameUniqueness,
	validateTermNameMapping,
	validateColumnNameMapping,
	validateTermColumnOrderMapping
} from '$lib/utils/validation.js';

/**
 * 우선순위에 따라 오류 정렬
 */
const ERROR_PRIORITY: Record<ValidationErrorType, number> = {
	TERM_NAME_LENGTH: 1,
	TERM_NAME_DUPLICATE: 2,
	TERM_UNIQUENESS: 3,
	TERM_NAME_MAPPING: 4,
	COLUMN_NAME_MAPPING: 5,
	TERM_COLUMN_ORDER_MISMATCH: 6,
	TERM_NAME_SUFFIX: 7,
	DOMAIN_NAME_MAPPING: 8
};

function sortErrorsByPriority(errors: ValidationError[]): ValidationError[] {
	return [...errors].sort((a, b) => {
		const priorityA = ERROR_PRIORITY[a.type] || 999;
		const priorityB = ERROR_PRIORITY[b.type] || 999;
		return priorityA - priorityB;
	});
}

/**
 * 용어 validation API
 * POST /api/term/validate
 *
 * 클라이언트에서 전송 전에 validation을 수행하기 위한 엔드포인트
 * validate-all API와 동일한 수준의 검증을 수행합니다.
 */
export async function POST({ request, url }: RequestEvent) {
	try {
		const body = await request.json();
		const { termName, columnName, domainName, entryId } = body;
		const filename = url.searchParams.get('filename') || 'term.json';

		// entryId가 빈 문자열이거나 유효하지 않은 경우 undefined로 처리
		const validEntryId =
			entryId && typeof entryId === 'string' && entryId.trim() !== '' ? entryId.trim() : undefined;

		// 필수 필드 검증
		if (!termName || typeof termName !== 'string' || !termName.trim()) {
			return json(
				{
					success: false,
					error: '용어명이 필요합니다.',
					message: 'Missing termName'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		if (!columnName || typeof columnName !== 'string' || !columnName.trim()) {
			return json(
				{
					success: false,
					error: '컬럼명이 필요합니다.',
					message: 'Missing columnName'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// domainName은 선택적 필드 (용어 변환기에서는 아직 선택하지 않을 수 있음)
		const hasDomainName = domainName && typeof domainName === 'string' && domainName.trim();

		// 0. 용어명이 2단어 이상의 조합인지 확인
		const termParts = termName
			.trim()
			.split('_')
			.map((p: string) => p.trim())
			.filter((p: string) => p.length > 0);
		if (termParts.length < 2) {
			return json(
				{
					success: false,
					error: '용어명은 2단어 이상의 조합이어야 합니다.',
					message: 'Term name must consist of at least 2 words'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 매핑 정보 로드
		let termData;
		try {
			termData = await loadData('term', filename);
		} catch {
			return json(
				{
					success: false,
					error: '용어 파일을 로드할 수 없습니다.',
					message: 'Failed to load term data'
				} as ApiResponse,
				{ status: 500 }
			);
		}

		// 3단계 폴백으로 관련 파일 해석
		const fileMappingOverride: Partial<Record<string, string>> = {};
		if (termData.mapping?.vocabulary) fileMappingOverride.vocabulary = termData.mapping.vocabulary;
		if (termData.mapping?.domain) fileMappingOverride.domain = termData.mapping.domain;
		const relatedFiles = await resolveRelatedFilenames('term', filename, fileMappingOverride as Partial<Record<DataType, string>>);

		// 단어집 데이터 로드
		let vocabularyData;
		try {
			vocabularyData = await getCachedVocabularyData(relatedFiles.get('vocabulary'));
		} catch (vocabError) {
			console.warn('단어집 데이터 로드 실패:', vocabError);
			vocabularyData = { entries: [], lastUpdated: '', totalCount: 0 };
		}

		// 모든 validation 오류를 수집
		const validationErrors: ValidationError[] = [];

		// 1. 용어명 매핑 validation (모든 부분이 단어집에 등록되어 있는지 확인)
		const termMappingError = validateTermNameMapping(termName.trim(), vocabularyData.entries);
		if (termMappingError) {
			validationErrors.push({
				type: 'TERM_NAME_MAPPING',
				message: termMappingError,
				field: 'termName'
			});
		}

		// 2. 컬럼명 매핑 validation (모든 부분이 영문약어로 등록되어 있는지 확인)
		const columnMappingError = validateColumnNameMapping(
			columnName.trim(),
			vocabularyData.entries
		);
		if (columnMappingError) {
			validationErrors.push({
				type: 'COLUMN_NAME_MAPPING',
				message: columnMappingError,
				field: 'columnName'
			});
		}

		// 3. 용어명-컬럼명 순서 일치 validation
		// 용어명 매핑과 컬럼명 매핑이 모두 성공한 경우에만 순서 검증 수행
		if (!termMappingError && !columnMappingError) {
			const orderResult = validateTermColumnOrderMapping(
				termName.trim(),
				columnName.trim(),
				vocabularyData.entries
			);
			if (orderResult.error) {
				validationErrors.push({
					type: 'TERM_COLUMN_ORDER_MISMATCH',
					message: orderResult.error,
					field: 'columnName'
				});
			}
		}

		// 4. 용어명 접미사 validation
		const suffixValidationError = validateTermNameSuffix(termName.trim(), vocabularyData.entries);
		if (suffixValidationError) {
			validationErrors.push({
				type: 'TERM_NAME_SUFFIX',
				message: suffixValidationError,
				field: 'termName'
			});
		}

		// 5. 수정 모드가 아닌 경우에만 중복 검사 수행
		if (!validEntryId) {
			// 모든 용어 파일 로드 (중복 검사에 사용)
			const allTermEntries: TermEntry[] = [];
			try {
				const allTermFiles = await listFiles('term');
				for (const file of allTermFiles) {
					try {
						const fileData = await loadData('term', file);
						allTermEntries.push(...fileData.entries);
					} catch (error) {
						console.warn(`용어 파일 ${file} 로드 실패:`, error);
					}
				}
			} catch (loadError) {
				console.warn('용어 파일 목록 로드 실패:', loadError);
			}

			// 6. 용어명 중복 검사 (이미 등록된 용어명인지 확인)
			if (allTermEntries.length > 0) {
				const termNameUniquenessError = validateTermNameUniqueness(termName.trim(), allTermEntries);
				if (termNameUniquenessError) {
					validationErrors.push({
						type: 'TERM_NAME_DUPLICATE',
						message: termNameUniquenessError,
						field: 'termName'
					});
				}
			}

			// 7. 용어명 유일성 validation (termName, columnName, domainName 조합) - domainName이 제공된 경우에만 수행
			if (hasDomainName && allTermEntries.length > 0) {
				const uniquenessError = validateTermUniqueness(
					termName.trim(),
					columnName.trim(),
					domainName.trim(),
					allTermEntries
				);
				if (uniquenessError) {
					validationErrors.push({
						type: 'TERM_UNIQUENESS',
						message: uniquenessError,
						field: 'termName'
					});
				}
			}
		}

		// validation 오류가 있으면 우선순위대로 정렬하여 반환
		if (validationErrors.length > 0) {
			const sortedErrors = sortErrorsByPriority(validationErrors);
			// 가장 높은 우선순위의 오류 메시지를 메인 error로 사용
			const primaryError = sortedErrors[0];
			// 중복 관련 오류는 409, 나머지는 400
			const statusCode =
				primaryError.type === 'TERM_NAME_DUPLICATE' || primaryError.type === 'TERM_UNIQUENESS'
					? 409
					: 400;

			return json(
				{
					success: false,
					error: primaryError.message,
					message: `Validation failed: ${primaryError.type}`,
					data: {
						errors: sortedErrors,
						errorCount: sortedErrors.length
					}
				} as ApiResponse,
				{ status: statusCode }
			);
		}

		// 모든 validation 통과
		return json(
			{
				success: true,
				message: 'Validation passed'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('Validation 중 오류:', error);
		return json(
			{
				success: false,
				error: 'Validation 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

