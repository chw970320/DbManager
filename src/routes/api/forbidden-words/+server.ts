import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse, ForbiddenWordsData, ForbiddenWordEntry } from '$lib/types/vocabulary.js';
import { loadForbiddenWordsData, saveForbiddenWordsData } from '$lib/utils/file-handler.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * 금지어 목록 조회 API
 * GET /api/forbidden-words
 */
export async function GET({ url }: RequestEvent) {
	try {
		// 쿼리 파라미터 추출
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '100');
		const sortBy = url.searchParams.get('sortBy') || 'createdAt';
		const sortOrder = url.searchParams.get('sortOrder') || 'desc';
		const scope = url.searchParams.get('scope'); // 'global' or filename

		// 페이지네이션 유효성 검증
		if (page < 1 || limit < 1 || limit > 1000) {
			return json(
				{
					success: false,
					error: '잘못된 페이지네이션 파라미터입니다. (page >= 1, 1 <= limit <= 1000)',
					message: 'Invalid pagination parameters'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 정렬 필드 유효성 검증
		const validSortFields = ['keyword', 'type', 'createdAt'];
		if (!validSortFields.includes(sortBy)) {
			return json(
				{
					success: false,
					error: `지원하지 않는 정렬 필드입니다. 사용 가능: ${validSortFields.join(', ')}`,
					message: 'Invalid sort field'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 데이터 로드
		let forbiddenWordsData: ForbiddenWordsData;
		try {
			forbiddenWordsData = await loadForbiddenWordsData();
		} catch (loadError) {
			return json(
				{
					success: false,
					error: loadError instanceof Error ? loadError.message : '데이터 로드 실패',
					message: 'Data loading failed'
				} as ApiResponse,
				{ status: 500 }
			);
		}

		// 필터링 적용 (scope)
		let filteredEntries = forbiddenWordsData.entries;
		if (scope) {
			if (scope === 'global') {
				filteredEntries = filteredEntries.filter((entry) => !entry.targetFile);
			} else {
				filteredEntries = filteredEntries.filter((entry) => entry.targetFile === scope);
			}
		}

		// 정렬 적용
		const sortedEntries = [...filteredEntries].sort((a, b) => {
			let aVal = a[sortBy as keyof ForbiddenWordEntry];
			let bVal = b[sortBy as keyof ForbiddenWordEntry];

			// undefined 처리
			if (aVal === undefined) aVal = '';
			if (bVal === undefined) bVal = '';

			if (typeof aVal === 'string') aVal = aVal.toLowerCase();
			if (typeof bVal === 'string') bVal = bVal.toLowerCase();

			if (sortOrder === 'desc') {
				return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
			} else {
				return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
			}
		});

		// 페이지네이션 적용
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedEntries = sortedEntries.slice(startIndex, endIndex);

		return json({
			success: true,
			data: {
				entries: paginatedEntries,
				totalCount: filteredEntries.length,
				page,
				limit,
				totalPages: Math.ceil(filteredEntries.length / limit),
				lastUpdated: forbiddenWordsData.lastUpdated
			}
		} as ApiResponse);
	} catch (error) {
		console.error('금지어 조회 중 오류:', error);
		return json(
			{
				success: false,
				error: '서버에서 금지어 조회 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 새로운 금지어 추가 API
 * POST /api/forbidden-words
 */
export async function POST({ request }: RequestEvent) {
	try {
		const { keyword, type, reason, targetFile } = await request.json();

		// 필수 필드 유효성 검사
		if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
			return json(
				{
					success: false,
					error: '키워드는 필수 입력 사항입니다.',
					message: 'Keyword is required'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		if (!type || (type !== 'standardName' && type !== 'abbreviation')) {
			return json(
				{
					success: false,
					error: '타입은 standardName 또는 abbreviation이어야 합니다.',
					message: 'Invalid type'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// reason이 제공된 경우 문자열 타입 검증
		if (reason !== undefined && typeof reason !== 'string') {
			return json(
				{
					success: false,
					error: '사유는 문자열이어야 합니다.',
					message: 'Reason must be a string'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 기존 데이터 로드
		const forbiddenWordsData = await loadForbiddenWordsData();

		// 중복 검사 (keyword와 type의 조합 + targetFile)
		const existingEntry = forbiddenWordsData.entries.find(
			(entry) =>
				entry.keyword.toLowerCase() === keyword.trim().toLowerCase() &&
				entry.type === type &&
				entry.targetFile === targetFile
		);

		if (existingEntry) {
			return json(
				{
					success: false,
					error: `'${keyword}' (${type === 'standardName' ? '표준단어명' : '영문약어'})는 이미 금지어로 등록되어 있습니다.`,
					message: 'Duplicate forbidden word'
				} as ApiResponse,
				{ status: 409 }
			);
		}

		// 새 금지어 엔트리 생성
		const newEntry: ForbiddenWordEntry = {
			id: uuidv4(),
			keyword: keyword.trim(),
			type,
			reason: reason ? reason.trim() : undefined,
			targetFile: targetFile ? targetFile.trim() : undefined,
			createdAt: new Date().toISOString()
		};

		// 데이터에 추가
		forbiddenWordsData.entries.push(newEntry);
		forbiddenWordsData.totalCount = forbiddenWordsData.entries.length;

		// 파일에 저장
		await saveForbiddenWordsData(forbiddenWordsData);

		return json(
			{
				success: true,
				data: {
					entries: [newEntry],
					totalCount: 1,
					page: 1,
					limit: 1,
					totalPages: 1,
					lastUpdated: new Date().toISOString()
				},
				message: '금지어가 성공적으로 추가되었습니다.'
			} as ApiResponse,
			{ status: 201 }
		);
	} catch (error) {
		console.error('금지어 추가 중 오류:', error);
		return json(
			{
				success: false,
				error: '서버에서 금지어 추가 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 기존 금지어 수정 API
 * PUT /api/forbidden-words
 */
export async function PUT({ request }: RequestEvent) {
	try {
		const { id, keyword, type, reason, targetFile } = await request.json();

		// ID 유효성 검사
		if (!id || typeof id !== 'string') {
			return json(
				{
					success: false,
					error: 'ID는 필수 입력 사항입니다.',
					message: 'ID is required'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 필수 필드 유효성 검사
		if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
			return json(
				{
					success: false,
					error: '키워드는 필수 입력 사항입니다.',
					message: 'Keyword is required'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		if (!type || (type !== 'standardName' && type !== 'abbreviation')) {
			return json(
				{
					success: false,
					error: '타입은 standardName 또는 abbreviation이어야 합니다.',
					message: 'Invalid type'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// reason이 제공된 경우 문자열 타입 검증
		if (reason !== undefined && typeof reason !== 'string') {
			return json(
				{
					success: false,
					error: '사유는 문자열이어야 합니다.',
					message: 'Reason must be a string'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 기존 데이터 로드
		const forbiddenWordsData = await loadForbiddenWordsData();

		// 수정할 엔트리 찾기
		const entryIndex = forbiddenWordsData.entries.findIndex((entry) => entry.id === id);
		if (entryIndex === -1) {
			return json(
				{
					success: false,
					error: '해당 ID의 금지어를 찾을 수 없습니다.',
					message: 'Forbidden word not found'
				} as ApiResponse,
				{ status: 404 }
			);
		}

		// 중복 검사 (자기 자신 제외 + targetFile 고려)
		const existingEntry = forbiddenWordsData.entries.find(
			(entry) =>
				entry.id !== id &&
				entry.keyword.toLowerCase() === keyword.trim().toLowerCase() &&
				entry.type === type &&
				entry.targetFile === targetFile
		);

		if (existingEntry) {
			return json(
				{
					success: false,
					error: `'${keyword}' (${type === 'standardName' ? '표준단어명' : '영문약어'})는 이미 금지어로 등록되어 있습니다.`,
					message: 'Duplicate forbidden word'
				} as ApiResponse,
				{ status: 409 }
			);
		}

		// 엔트리 수정
		const updatedEntry: ForbiddenWordEntry = {
			...forbiddenWordsData.entries[entryIndex],
			keyword: keyword.trim(),
			type,
			reason: reason ? reason.trim() : undefined,
			targetFile: targetFile ? targetFile.trim() : undefined
		};

		forbiddenWordsData.entries[entryIndex] = updatedEntry;

		// 파일에 저장
		await saveForbiddenWordsData(forbiddenWordsData);

		return json({
			success: true,
			data: {
				entries: [updatedEntry],
				totalCount: 1,
				page: 1,
				limit: 1,
				totalPages: 1,
				lastUpdated: new Date().toISOString()
			},
			message: '금지어가 성공적으로 수정되었습니다.'
		} as ApiResponse);
	} catch (error) {
		console.error('금지어 수정 중 오류:', error);
		return json(
			{
				success: false,
				error: '서버에서 금지어 수정 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 금지어 삭제 API
 * DELETE /api/forbidden-words
 */
export async function DELETE({ request }: RequestEvent) {
	try {
		const { id } = await request.json();

		// ID 유효성 검사
		if (!id || typeof id !== 'string') {
			return json(
				{
					success: false,
					error: 'ID는 필수 입력 사항입니다.',
					message: 'ID is required'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 기존 데이터 로드
		const forbiddenWordsData = await loadForbiddenWordsData();

		// 삭제할 엔트리 찾기
		const entryIndex = forbiddenWordsData.entries.findIndex((entry) => entry.id === id);
		if (entryIndex === -1) {
			return json(
				{
					success: false,
					error: '해당 ID의 금지어를 찾을 수 없습니다.',
					message: 'Forbidden word not found'
				} as ApiResponse,
				{ status: 404 }
			);
		}

		// 엔트리 삭제
		const deletedEntry = forbiddenWordsData.entries.splice(entryIndex, 1)[0];
		forbiddenWordsData.totalCount = forbiddenWordsData.entries.length;

		// 파일에 저장
		await saveForbiddenWordsData(forbiddenWordsData);

		return json({
			success: true,
			data: {
				entries: [deletedEntry],
				totalCount: 1,
				page: 1,
				limit: 1,
				totalPages: 1,
				lastUpdated: new Date().toISOString()
			},
			message: '금지어가 성공적으로 삭제되었습니다.'
		} as ApiResponse);
	} catch (error) {
		console.error('금지어 삭제 중 오류:', error);
		return json(
			{
				success: false,
				error: '서버에서 금지어 삭제 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}
