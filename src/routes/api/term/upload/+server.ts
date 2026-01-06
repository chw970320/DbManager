import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '$lib/types/vocabulary.js';
import type { TermData, TermEntry } from '$lib/types/term.js';
import { loadTermData, mergeTermData, listTermFiles } from '$lib/utils/file-handler.js';
import {
	validateXlsxFile,
	validateTermNameSuffix,
	validateTermNameUniqueness,
	validateTermNameMapping,
	validateColumnNameMapping,
	validateDomainNameMapping
} from '$lib/utils/validation.js';
import { parseTermXlsxToJson } from '$lib/utils/xlsx-parser.js';
import { addHistoryLog } from '$lib/utils/history-handler.js';
import { v4 as uuidv4 } from 'uuid';
import {
	getRequiredFile,
	getOptionalString,
	getOptionalBoolean,
	FormDataValidationError
} from '$lib/utils/type-guards.js';
import { getCachedVocabularyData, getCachedDomainData, invalidateCache } from '$lib/utils/cache.js';

/**
 * 용어 업로드 정보 조회 API
 * GET /api/term/upload
 */
export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'term.json';
		const currentStore = await loadTermData(filename);
		return json({
			success: true,
			data: {
				supportedFormats: ['.xlsx', '.xls'],
				maxFileSize: '10MB',
				requiredColumns: ['용어명', '컬럼명', '도메인'],
				optionalColumns: [],
				endpoint: '/api/term/upload',
				method: 'POST',
				currentDataCount: currentStore.totalCount,
				lastUpdated: currentStore.lastUpdated
			}
		});
	} catch (error) {
		console.error('용어 업로드 정보 조회 중 오류:', error);
		return json(
			{
				success: false,
				error: '업로드 정보 조회에 실패했습니다.',
				message: 'Failed to retrieve upload info'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 용어 매핑 로직
 * 용어명과 컬럼명은 언더스코어로 연결된 형태를 분리해서 각각 단어집에서 찾음
 * 도메인명은 도메인 데이터에서 찾음
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
 * 용어 파일 업로드 처리 API
 * POST /api/term/upload
 */
export async function POST({ request }: RequestEvent) {
	try {
		// Content-Type 확인
		const contentType = request.headers.get('content-type');
		if (!contentType?.includes('multipart/form-data')) {
			return json(
				{
					success: false,
					error: '파일 업로드는 multipart/form-data 형식이어야 합니다.',
					message: 'Invalid content type'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// FormData 파싱 및 안전한 추출
		const formData = await request.formData();
		const file = getRequiredFile(formData, 'file');
		const vocabularyFilename = getOptionalString(formData, 'vocabularyFilename', 'vocabulary.json');
		const domainFilename = getOptionalString(formData, 'domainFilename', 'domain.json');

		// 파일 유효성 검증
		try {
			validateXlsxFile(file);
		} catch (validationError) {
			return json(
				{
					success: false,
					error: validationError instanceof Error ? validationError.message : '파일 검증 실패',
					message: 'File validation failed'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 파일을 Buffer로 변환
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// 기존 데이터와 병합 (replace 옵션 확인)
		const replaceExisting = getOptionalBoolean(formData, 'replace');
		const filename = getOptionalString(formData, 'filename', 'term.json');
		// validation 옵션 확인 (기본값: true - 검증 교체 모드)
		const performValidation = getOptionalBoolean(formData, 'validation', true);

		// 용어 파일의 매핑 정보 로드
		const termData = await loadTermData(filename);
		const mapping = termData.mapping || {
			vocabulary: vocabularyFilename,
			domain: domainFilename
		};

		// xlsx 파일 파싱
		let parsedEntries: Omit<
			TermEntry,
			'id' | 'isMappedTerm' | 'isMappedColumn' | 'isMappedDomain' | 'createdAt' | 'updatedAt'
		>[];
		try {
			parsedEntries = parseTermXlsxToJson(buffer, !replaceExisting);
		} catch (parseError) {
			return json(
				{
					success: false,
					error: parseError instanceof Error ? parseError.message : 'Excel 파일 파싱 실패',
					message: 'Excel parsing failed'
				} as ApiResponse,
				{ status: 422 }
			);
		}

		if (parsedEntries.length === 0) {
			return json(
				{
					success: false,
					error: '파일에서 유효한 용어 데이터를 찾을 수 없습니다.',
					message: 'No valid term data found'
				} as ApiResponse,
				{ status: 422 }
			);
		}

		// 캐시를 사용한 데이터 로드 (N+1 문제 방지)
		const vocabularyData = await getCachedVocabularyData(mapping.vocabulary);
		const domainData = await getCachedDomainData(mapping.domain);

		// 단어집 맵 생성 (standardName과 abbreviation 모두 포함)
		const vocabularyMap = new Map<string, { standardName: string; abbreviation: string }>();
		vocabularyData.entries.forEach((entry) => {
			const standardNameKey = entry.standardName.trim().toLowerCase();
			const abbreviationKey = entry.abbreviation.trim().toLowerCase();
			vocabularyMap.set(standardNameKey, {
				standardName: entry.standardName,
				abbreviation: entry.abbreviation
			});
			vocabularyMap.set(abbreviationKey, {
				standardName: entry.standardName,
				abbreviation: entry.abbreviation
			});
		});

		// 도메인 맵 생성 (standardDomainName)
		const domainMap = new Map<string, string>();
		domainData.entries.forEach((entry) => {
			const key = entry.standardDomainName.trim().toLowerCase();
			domainMap.set(key, entry.standardDomainName);
		});

		// 검증 교체 모드일 때만 validation 수행
		if (performValidation) {
			// 용어명 접미사 및 유일성 validation
			try {
				// 모든 용어 파일 로드
				const allTermFiles = await listTermFiles();
				const allTermEntries: TermEntry[] = [];
				for (const file of allTermFiles) {
					try {
						const fileData = await loadTermData(file);
						// 교체 모드가 아닌 경우 현재 파일의 기존 엔트리는 제외
						if (!replaceExisting && file === filename) {
							continue;
						}
						allTermEntries.push(...fileData.entries);
					} catch (error) {
						console.warn(`용어 파일 ${file} 로드 실패:`, error);
					}
				}

				// 각 엔트리에 대해 validation 수행
				const validationErrors: string[] = [];
				for (const entry of parsedEntries) {
					// 1. 용어명 접미사 validation
					const suffixValidationError = validateTermNameSuffix(
						entry.termName,
						vocabularyData.entries
					);
					if (suffixValidationError) {
						validationErrors.push(`${entry.termName}: ${suffixValidationError}`);
					}

					// 2. 용어명 매핑 validation (모든 부분이 단어집에 식별되는지)
					const termMappingError = validateTermNameMapping(entry.termName, vocabularyData.entries);
					if (termMappingError) {
						validationErrors.push(`${entry.termName}: ${termMappingError}`);
					}

					// 3. 컬럼명 매핑 validation (모든 부분이 영문약어로 식별되는지)
					const columnMappingError = validateColumnNameMapping(
						entry.columnName,
						vocabularyData.entries
					);
					if (columnMappingError) {
						validationErrors.push(
							`${entry.termName} (컬럼명: ${entry.columnName}): ${columnMappingError}`
						);
					}

					// 4. 도메인명 매핑 validation
					const domainMappingError = validateDomainNameMapping(
						entry.domainName,
						domainData.entries
					);
					if (domainMappingError) {
						validationErrors.push(
							`${entry.termName} (도메인명: ${entry.domainName}): ${domainMappingError}`
						);
					}

					// 5. 용어명 유일성 validation
					const uniquenessError = validateTermNameUniqueness(entry.termName, allTermEntries);
					if (uniquenessError) {
						validationErrors.push(`${entry.termName}: ${uniquenessError}`);
					}
				}

				if (validationErrors.length > 0) {
					return json(
						{
							success: false,
							error: `다음 용어들이 유효하지 않거나 중복됩니다:\n${validationErrors.join('\n')}`,
							message: 'Term validation failed in upload'
						} as ApiResponse,
						{ status: 400 }
					);
				}
			} catch (validationError) {
				console.warn('용어명 validation 확인 중 오류 (계속 진행):', validationError);
			}
		}

		// 매핑 확인 및 TermEntry 생성
		const now = new Date().toISOString();
		const termEntries: TermEntry[] = parsedEntries.map((entry) => {
			const mapping = checkTermMapping(
				entry.termName,
				entry.columnName,
				entry.domainName,
				vocabularyMap,
				domainMap
			);

			return {
				id: uuidv4(),
				termName: entry.termName,
				columnName: entry.columnName,
				domainName: entry.domainName,
				isMappedTerm: mapping.isMappedTerm,
				isMappedColumn: mapping.isMappedColumn,
				isMappedDomain: mapping.isMappedDomain,
				unmappedTermParts:
					mapping.unmappedTermParts.length > 0 ? mapping.unmappedTermParts : undefined,
				unmappedColumnParts:
					mapping.unmappedColumnParts.length > 0 ? mapping.unmappedColumnParts : undefined,
				createdAt: now,
				updatedAt: now
			};
		});

		let finalData: TermData;

		try {
			finalData = await mergeTermData(termEntries, replaceExisting, filename);
		} catch (mergeError) {
			return json(
				{
					success: false,
					error: mergeError instanceof Error ? mergeError.message : '데이터 병합 실패',
					message: 'Data merge failed'
				} as ApiResponse,
				{ status: 500 }
			);
		}

		// 업로드 성공 히스토리 로그 추가 (병합 모드일 때만)
		if (!replaceExisting) {
			try {
				await addHistoryLog(
					{
						id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
						action: 'UPLOAD_MERGE',
						targetId: 'term_file',
						targetName: `${file.name} (${termEntries.length}개 용어)`,
						timestamp: new Date().toISOString(),
						details: {
							fileName: file.name,
							fileSize: file.size,
							processedCount: termEntries.length,
							replaceMode: replaceExisting
						}
					},
					'term'
				);
			} catch (historyError) {
				console.warn('업로드 히스토리 로그 추가 실패:', historyError);
				// 히스토리 로그 실패는 전체 업로드를 실패시키지 않음
			}
		}

		// 성공 응답
		const responseData = {
			uploadedCount: termEntries.length,
			totalCount: finalData.totalCount,
			lastUpdated: finalData.lastUpdated,
			replaceMode: replaceExisting,
			message: `용어 데이터 업로드 완료: ${termEntries.length}개 항목`
		};

		return json(
			{
				success: true,
				data: responseData,
				message: 'Term data uploaded successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('용어 파일 업로드 중 오류:', error);

		// FormData 검증 에러 처리
		if (error instanceof FormDataValidationError) {
			return json(
				{
					success: false,
					error: error.message,
					message: 'FormData validation failed'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		return json(
			{
				success: false,
				error: '서버에서 파일 업로드 처리 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}
