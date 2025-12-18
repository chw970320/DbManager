/**
 * 공통 API 클라이언트 유틸리티
 * 데이터 로드 패턴 중복 해소
 */

import type { ApiResponse } from '$lib/types/vocabulary';

// ============================================================================
// 타입 정의
// ============================================================================

export interface FetchParams {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: 'asc' | 'desc';
	query?: string;
	field?: string;
	filename?: string;
	[key: string]: string | number | boolean | undefined;
}

export interface PaginationInfo {
	currentPage: number;
	totalPages: number;
	totalCount: number;
	limit: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

export interface DataResponse<T> {
	entries: T[];
	pagination: PaginationInfo;
	sorting?: {
		sortBy: string;
		sortOrder: string;
	};
	search?: {
		query: string;
		field: string;
		isFiltered: boolean;
	};
	lastUpdated?: string;
}

// ============================================================================
// API 클라이언트 함수
// ============================================================================

/**
 * URLSearchParams 생성
 */
function buildSearchParams(params: FetchParams): URLSearchParams {
	const searchParams = new URLSearchParams();

	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== '') {
			searchParams.set(key, String(value));
		}
	});

	return searchParams;
}

/**
 * 제네릭 데이터 조회 함수
 */
export async function fetchData<T>(
	endpoint: string,
	params: FetchParams = {}
): Promise<ApiResponse & { data?: DataResponse<T> }> {
	const searchParams = buildSearchParams(params);
	const url = searchParams.toString() ? `${endpoint}?${searchParams}` : endpoint;

	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
	}

	return response.json();
}

/**
 * 단일 항목 조회
 */
export async function fetchById<T>(
	endpoint: string,
	id: string,
	params: FetchParams = {}
): Promise<ApiResponse & { data?: T }> {
	// 단건 조회는 페이지네이션 메타 정보가 없는 일반 응답을 기대하므로
	// 제네릭 fetchData 대신 직접 구현합니다.
	const searchParams = buildSearchParams(params);
	const url = searchParams.toString()
		? `${endpoint}/${id}?${searchParams.toString()}`
		: `${endpoint}/${id}`;

	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
	}

	return (await response.json()) as ApiResponse & { data?: T };
}

/**
 * 항목 생성
 */
export async function createItem<T>(
	endpoint: string,
	data: Partial<T>,
	params: FetchParams = {}
): Promise<ApiResponse & { data?: T }> {
	const searchParams = buildSearchParams(params);
	const url = searchParams.toString() ? `${endpoint}?${searchParams}` : endpoint;

	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data)
	});

	if (!response.ok) {
		throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
	}

	return response.json();
}

/**
 * 항목 수정
 */
export async function updateItem<T>(
	endpoint: string,
	data: Partial<T> & { id: string },
	params: FetchParams = {}
): Promise<ApiResponse & { data?: T }> {
	const searchParams = buildSearchParams(params);
	const url = searchParams.toString() ? `${endpoint}?${searchParams}` : endpoint;

	const response = await fetch(url, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data)
	});

	if (!response.ok) {
		throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
	}

	return response.json();
}

/**
 * 항목 삭제
 */
export async function deleteItem(
	endpoint: string,
	id: string,
	params: FetchParams = {}
): Promise<ApiResponse> {
	const allParams = { ...params, id };
	const searchParams = buildSearchParams(allParams);

	const response = await fetch(`${endpoint}?${searchParams}`, {
		method: 'DELETE'
	});

	if (!response.ok) {
		throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
	}

	return response.json();
}

// ============================================================================
// 엔티티별 편의 함수
// ============================================================================

/**
 * Vocabulary 데이터 조회
 */
export async function fetchVocabulary(params: FetchParams = {}) {
	return fetchData('/api/vocabulary', {
		page: 1,
		limit: 20,
		sortBy: 'createdAt',
		sortOrder: 'desc',
		filename: 'vocabulary.json',
		...params
	});
}

/**
 * Domain 데이터 조회
 */
export async function fetchDomain(params: FetchParams = {}) {
	return fetchData('/api/domain', {
		page: 1,
		limit: 20,
		sortBy: 'createdAt',
		sortOrder: 'desc',
		filename: 'domain.json',
		...params
	});
}

/**
 * Term 데이터 조회
 */
export async function fetchTerm(params: FetchParams = {}) {
	return fetchData('/api/term', {
		page: 1,
		limit: 20,
		sortBy: 'createdAt',
		sortOrder: 'desc',
		filename: 'term.json',
		...params
	});
}

/**
 * History 데이터 조회
 */
export async function fetchHistory(
	type: 'vocabulary' | 'domain' | 'term' = 'vocabulary',
	params: FetchParams = {}
) {
	return fetchData('/api/history', {
		type,
		limit: 50,
		offset: 0,
		...params
	});
}

// ============================================================================
// 파일 관리 API (FileManager 컴포넌트용)
// ============================================================================

export type EntityType = 'vocabulary' | 'domain' | 'term';

const FILE_API_ENDPOINTS: Record<EntityType, string> = {
	vocabulary: '/api/vocabulary/files',
	domain: '/api/domain/files',
	term: '/api/term/files'
};

/**
 * 파일 목록 조회
 */
export async function fetchFileList(type: EntityType): Promise<ApiResponse & { data?: string[] }> {
	const response = await fetch(FILE_API_ENDPOINTS[type], {
		cache: 'no-store',
		headers: { 'Cache-Control': 'no-cache' }
	});
	return response.json();
}

/**
 * 파일 생성
 */
export async function createFile(type: EntityType, filename: string): Promise<ApiResponse> {
	const response = await fetch(FILE_API_ENDPOINTS[type], {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ filename })
	});
	return response.json();
}

/**
 * 파일 이름 변경
 */
export async function renameFile(
	type: EntityType,
	oldFilename: string,
	newFilename: string
): Promise<ApiResponse> {
	const response = await fetch(FILE_API_ENDPOINTS[type], {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ oldFilename, newFilename })
	});
	return response.json();
}

/**
 * 파일 삭제
 */
export async function deleteFile(type: EntityType, filename: string): Promise<ApiResponse> {
	const params = new URLSearchParams({ filename });
	const response = await fetch(`${FILE_API_ENDPOINTS[type]}?${params}`, {
		method: 'DELETE'
	});
	return response.json();
}
