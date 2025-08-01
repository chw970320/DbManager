import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse, UploadResult, VocabularyData } from '$lib/types/vocabulary.js';
import { validateXlsxFile } from '$lib/utils/validation.js';
import { parseXlsxToJson } from '$lib/utils/xlsx-parser.js';
import { mergeVocabularyData } from '$lib/utils/file-handler.js';
import { clearHistoryData, addHistoryLog } from '$lib/utils/history-handler.js';

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

		// FormData 파싱
		const formData = await request.formData();
		const file = formData.get('file') as File;

		// 파일 존재 확인
		if (!file) {
			return json(
				{
					success: false,
					error: '업로드할 파일이 없습니다.',
					message: 'No file uploaded'
				} as ApiResponse,
				{ status: 400 }
			);
		}

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

		// xlsx 파일 파싱
		let parsedEntries;
		try {
			parsedEntries = parseXlsxToJson(buffer);
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

		// 기존 데이터와 병합 (replace 옵션 확인)
		const replaceExisting = formData.get('replace') === 'true';
		let finalData: VocabularyData;

		try {
			finalData = await mergeVocabularyData(parsedEntries, replaceExisting);
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

		// 단어집이 교체되는 경우 히스토리도 초기화
		if (replaceExisting) {
			try {
				await clearHistoryData(true); // 백업 생성 후 초기화
			} catch (historyError) {
				console.warn('히스토리 초기화 실패:', historyError);
				// 히스토리 초기화 실패는 전체 업로드를 실패시키지 않음
			}
		}

		// 업로드 성공 히스토리 로그 추가 (병합 모드일 때만)
		if (!replaceExisting) {
			try {
				await addHistoryLog({
					id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					action: 'UPLOAD_MERGE',
					targetId: 'vocabulary_file',
					targetName: `${file.name} (${parsedEntries.length}개 단어)`,
					timestamp: new Date().toISOString(),
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
