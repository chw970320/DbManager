import { json, type RequestEvent } from '@sveltejs/kit';
import type {
	ApiResponse,
	UploadResult,
	VocabularyData,
	VocabularyEntry
} from '$lib/types/vocabulary.js';
import { validateXlsxFile, validateForbiddenWordsAndSynonyms } from '$lib/utils/validation.js';
import { parseXlsxToJson } from '$lib/utils/xlsx-parser.js';
import {
	mergeVocabularyData,
	loadVocabularyData,
	listVocabularyFiles
} from '$lib/utils/file-handler.js';
import { addHistoryLog } from '$lib/utils/history-handler.js';
import {
	getRequiredFile,
	getOptionalString,
	getOptionalBoolean,
	FormDataValidationError
} from '$lib/utils/type-guards.js';

/**
 * 파일 업로드 및 처리 API
 * POST /api/upload
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
		const filename = getOptionalString(formData, 'filename', 'vocabulary.json');

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
		// validation 옵션 확인 (기본값: true - 검증 교체 모드)
		const performValidation = getOptionalBoolean(formData, 'validation', true);

		// xlsx 파일 파싱 (교체 모드일 때는 파일 내 중복 체크 건너뛰기)
		let parsedEntries: VocabularyEntry[];
		try {
			parsedEntries = parseXlsxToJson(buffer, !replaceExisting);
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

		// 검증 교체 모드일 때만 validation 수행
		if (performValidation) {
			// 모든 단어집 파일 로드하여 금칙어 및 이음동의어 검사
			try {
				const allVocabularyFiles = await listVocabularyFiles();
				const allVocabularyEntries: VocabularyEntry[] = [];
				for (const file of allVocabularyFiles) {
					try {
						const fileData = await loadVocabularyData(file);
						// 교체 모드가 아닌 경우 현재 파일의 기존 엔트리는 제외
						if (!replaceExisting && file === filename) {
							// 병합 모드에서는 현재 파일의 기존 엔트리를 제외하고 검사
							continue;
						}
						allVocabularyEntries.push(...fileData.entries);
					} catch (error) {
						console.warn(`단어집 파일 ${file} 로드 실패:`, error);
					}
				}

				// 업로드된 각 엔트리에 대해 금칙어 및 이음동의어 validation
				const validationErrors: string[] = [];
				for (const entry of parsedEntries) {
					const validationError = validateForbiddenWordsAndSynonyms(
						entry.standardName,
						allVocabularyEntries
					);
					if (validationError) {
						validationErrors.push(`${entry.standardName}: ${validationError}`);
					}
				}

				if (validationErrors.length > 0) {
					return json(
						{
							success: false,
							error: `다음 단어들이 금칙어 또는 이음동의어로 등록되어 있습니다:\n${validationErrors.join('\n')}`,
							message: 'Forbidden words or synonyms detected in upload'
						} as ApiResponse,
						{ status: 400 }
					);
				}
			} catch (validationError) {
				console.warn('금칙어 및 이음동의어 확인 중 오류 (계속 진행):', validationError);
			}
		}

		let finalData: VocabularyData;

		try {
			finalData = await mergeVocabularyData(parsedEntries, replaceExisting, filename);
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

		// 단어집이 교체되는 경우 히스토리도 초기화 (해당 파일에 대해서만?)
		// TODO: 파일별 히스토리 초기화 로직이 필요할 수 있음. 현재는 전체 초기화만 구현되어 있음.
		// 일단 파일별 초기화는 보류하고, 병합 모드 로그만 남김.

		// 업로드 성공 히스토리 로그 추가 (병합 모드일 때만, 교체 모드는 히스토리 초기화)
		if (!replaceExisting) {
			try {
				await addHistoryLog({
					id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					action: 'UPLOAD_MERGE',
					targetId: 'vocabulary_file',
					targetName: `${file.name} (${parsedEntries.length}개 단어)`,
					timestamp: new Date().toISOString(),
					filename: filename, // 대상 파일명 저장
					details: {
						fileName: file.name,
						fileSize: file.size,
						processedCount: parsedEntries.length,
						replaceMode: replaceExisting
					}
				});
			} catch (historyError) {
				console.warn('업로드 히스토리 로그 추가 실패:', historyError);
				// 히스토리 로그 실패는 전체 업로드를 실패시키지 않음
			}
		}

		// 성공 응답
		const uploadResult: UploadResult = {
			success: true,
			message: `${parsedEntries.length}개의 단어가 성공적으로 처리되었습니다.`,
			data: finalData
		};

		return json(
			{
				success: true,
				data: uploadResult,
				message: 'Upload successful'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('파일 업로드 처리 중 오류:', error);

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
				error: '서버에서 파일 처리 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 업로드 상태 및 지원 형식 정보 제공
 * GET /api/upload
 */
export async function GET() {
	return json({
		success: true,
		data: {
			supportedFormats: ['.xlsx', '.xls'],
			maxFileSize: '10MB',
			requiredColumns: ['표준단어명', '영문약어', '영문명'],
			endpoint: '/api/upload',
			method: 'POST'
		},
		message: 'Upload endpoint information'
	} as ApiResponse);
}
