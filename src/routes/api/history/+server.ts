import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse, HistoryData, HistoryLogEntry } from '$lib/types/vocabulary.js';
import { loadHistoryData, addHistoryLog } from '$lib/utils/history-handler.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * 히스토리 데이터 조회 API
 * GET /api/history
 */
export async function GET({ url }: RequestEvent) {
	try {
		// 쿼리 파라미터 추출 (향후 페이지네이션이나 필터링 확장 가능)
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const offset = parseInt(url.searchParams.get('offset') || '0');
		const filename = url.searchParams.get('filename') || undefined;

		// 파라미터 유효성 검증
		if (limit < 1 || limit > 200) {
			return json(
				{
					success: false,
					error: '잘못된 limit 파라미터입니다. (1 <= limit <= 200)',
					message: 'Invalid limit parameter'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		if (offset < 0) {
			return json(
				{
					success: false,
					error: '잘못된 offset 파라미터입니다. (offset >= 0)',
					message: 'Invalid offset parameter'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 히스토리 데이터 로드
		let historyData: HistoryData;
		try {
			historyData = await loadHistoryData(filename);
		} catch (loadError) {
			return json(
				{
					success: false,
					error: loadError instanceof Error ? loadError.message : '히스토리 데이터 로드 실패',
					message: 'History data loading failed'
				} as ApiResponse,
				{ status: 500 }
			);
		}

		// 페이지네이션 적용 (향후 확장을 위해)
		const paginatedLogs = historyData.logs.slice(offset, offset + limit);

		// 성공 응답
		const responseData = {
			logs: paginatedLogs,
			pagination: {
				offset,
				limit,
				totalCount: historyData.totalCount,
				hasMore: offset + limit < historyData.totalCount
			},
			lastUpdated: historyData.lastUpdated
		};

		return json(
			{
				success: true,
				data: responseData,
				message: 'History data retrieved successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('히스토리 데이터 조회 중 오류:', error);

		return json(
			{
				success: false,
				error: '서버에서 히스토리 데이터 조회 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 새로운 히스토리 로그 추가 API
 * POST /api/history
 */
export async function POST({ request }: RequestEvent) {
	try {
		const logData: Partial<HistoryLogEntry> = await request.json();

		// 필수 필드 검증
		if (!logData.action || !logData.targetId || !logData.targetName) {
			return json(
				{
					success: false,
					error: 'action, targetId, targetName은 필수 항목입니다.',
					message: 'Missing required fields'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// action 타입 검증
		if (!['add', 'update', 'delete'].includes(logData.action)) {
			return json(
				{
					success: false,
					error: 'action은 add, update, delete 중 하나여야 합니다.',
					message: 'Invalid action type'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 히스토리 로그 엔트리 생성
		const newLogEntry: HistoryLogEntry = {
			id: uuidv4(),
			action: logData.action as 'add' | 'update' | 'delete',
			targetId: logData.targetId,
			targetName: logData.targetName,
			timestamp: new Date().toISOString(),
			filename: logData.filename, // 파일명 저장
			details: logData.details || undefined
		};

		// 히스토리 로그 추가
		let updatedHistoryData: HistoryData;
		try {
			updatedHistoryData = await addHistoryLog(newLogEntry);
		} catch (addError) {
			return json(
				{
					success: false,
					error: addError instanceof Error ? addError.message : '히스토리 로그 추가 실패',
					message: 'Failed to add history log'
				} as ApiResponse,
				{ status: 500 }
			);
		}

		return json(
			{
				success: true,
				data: {
					addedLog: newLogEntry,
					totalCount: updatedHistoryData.totalCount
				},
				message: '히스토리 로그가 성공적으로 추가되었습니다.'
			} as ApiResponse,
			{ status: 201 }
		);
	} catch (error) {
		console.error('히스토리 로그 추가 중 오류:', error);

		// JSON 파싱 오류 처리
		if (error instanceof SyntaxError) {
			return json(
				{
					success: false,
					error: '요청 데이터 형식이 올바르지 않습니다.',
					message: 'Invalid JSON format'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		return json(
			{
				success: false,
				error: '서버에서 히스토리 로그 추가 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}
