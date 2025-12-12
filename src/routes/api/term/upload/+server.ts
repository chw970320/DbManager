import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '$lib/types/vocabulary.js';
import type { TermData, TermEntry } from '$lib/types/term.js';
import { loadTermData, mergeTermData } from '$lib/utils/file-handler.js';
import { validateXlsxFile } from '$lib/utils/validation.js';
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
				requiredColumns: ['용어명', '칼럼명', '도메인'],
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
 * 용어명과 칼럼명은 언더스코어로 연결된 형태를 분리해서 각각 단어집에서 찾음
 * 도메인명은 도메인 데이터에서 찾음
 */
function checkTermMapping(
	termName: string,
	columnName: string,
	domainName: string,
	vocabularyMap: Map<string, { standardName: string; abbreviation: string }>,
	domainMap: Map<string, string>
): { isMappedTerm: boolean; isMappedColumn: boolean; isMappedDomain: boolean } {
	// 용어명 매핑: 언더스코어로 분리해서 각 단어가 단어집의 standardName에 있는지 확인
	const termParts = termName
		.split('_')
		.map((p) => p.trim().toLowerCase())
		.filter((p) => p.length > 0);
	const isMappedTerm =
		termParts.length > 0 &&
		termParts.every((part) => {
			// 정확히 일치하거나 부분 일치하는지 확인
			for (const [key, value] of vocabularyMap.entries()) {
				if (key === part || value.standardName.toLowerCase() === part) {
					return true;
				}
			}
			return false;
		});

	// 칼럼명 매핑: 언더스코어로 분리해서 각 단어가 단어집의 abbreviation에 있는지 확인
	const columnParts = columnName
		.split('_')
		.map((p) => p.trim().toLowerCase())
		.filter((p) => p.length > 0);
	const isMappedColumn =
		columnParts.length > 0 &&
		columnParts.every((part) => {
			// 정확히 일치하거나 부분 일치하는지 확인
			for (const [key, value] of vocabularyMap.entries()) {
				if (key === part || value.abbreviation.toLowerCase() === part) {
					return true;
				}
			}
			return false;
		});

	// 도메인명 매핑: 도메인의 standardDomainName과 정확히 일치하는지 확인
	const isMappedDomain = domainMap.has(domainName.trim().toLowerCase());

	return { isMappedTerm, isMappedColumn, isMappedDomain };
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
