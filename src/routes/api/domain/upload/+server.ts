import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '$lib/types/vocabulary.js';
import type { DomainData, DomainEntry } from '$lib/types/domain.js';
import { loadDomainData, mergeDomainData } from '$lib/utils/file-handler.js';
import { validateXlsxFile } from '$lib/utils/validation.js';
import { parseDomainXlsxToJson } from '$lib/utils/xlsx-parser.js';
import { addHistoryLog } from '$lib/utils/history-handler.js';
import {
	getRequiredFile,
	getOptionalString,
	getOptionalBoolean,
	FormDataValidationError
} from '$lib/utils/type-guards.js';

/**
 * 도메인 업로드 정보 조회 API
 * GET /api/domain/upload
 */
export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'domain.json';
		const currentStore = await loadDomainData(filename);
		return json({
			success: true,
			data: {
				supportedFormats: ['.xlsx', '.xls'],
				maxFileSize: '10MB',
				requiredColumns: [
					'도메인그룹',
					'도메인 분류명',
					'표준 도메인명',
					'논리 데이터타입',
					'물리 데이터타입'
				],
				optionalColumns: ['데이터 길이', '소수점자리수', '데이터값', '측정단위', '비고'],
				endpoint: '/api/domain/upload',
				method: 'POST',
				currentDataCount: currentStore.totalCount,
				lastUpdated: currentStore.lastUpdated
			}
		});
	} catch (error) {
		console.error('도메인 업로드 정보 조회 중 오류:', error);
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
 * 도메인 파일 업로드 처리 API
 * POST /api/domain/upload
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
		const filename = getOptionalString(formData, 'filename', 'domain.json');

		// xlsx 파일 파싱 (교체 모드일 때는 파일 내 중복 체크 건너뛰기)
		let parsedEntries: DomainEntry[];
		try {
			parsedEntries = parseDomainXlsxToJson(buffer, !replaceExisting);
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
					error: '파일에서 유효한 도메인 데이터를 찾을 수 없습니다.',
					message: 'No valid domain data found'
				} as ApiResponse,
				{ status: 422 }
			);
		}

		let finalData: DomainData;

		try {
			finalData = await mergeDomainData(parsedEntries, replaceExisting, filename);
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
						targetId: 'domain_file',
						targetName: `${file.name} (${parsedEntries.length}개 도메인)`,
						timestamp: new Date().toISOString(),
						details: {
							fileName: file.name,
							fileSize: file.size,
							processedCount: parsedEntries.length,
							replaceMode: replaceExisting
						}
					},
					'domain'
				);
			} catch (historyError) {
				console.warn('업로드 히스토리 로그 추가 실패:', historyError);
				// 히스토리 로그 실패는 전체 업로드를 실패시키지 않음
			}
		}

		// 성공 응답
		const responseData = {
			uploadedCount: parsedEntries.length,
			totalCount: finalData.totalCount,
			lastUpdated: finalData.lastUpdated,
			replaceMode: replaceExisting,
			message: `도메인 데이터 업로드 완료: ${parsedEntries.length}개 항목`
		};

		return json(
			{
				success: true,
				data: responseData,
				message: 'Domain data uploaded successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('도메인 파일 업로드 중 오류:', error);

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
