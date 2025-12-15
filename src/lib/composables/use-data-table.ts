/**
 * 공통 데이터 테이블 상태 관리 훅
 * browse 페이지들의 중복 상태 관리 패턴 통합
 */

import type { SortEvent, PageChangeEvent, TABLE_DEFAULTS } from '$lib/types/table';
import type { EntityType } from '$lib/utils/api-client';

// ============================================================================
// 타입 정의
// ============================================================================

export interface DataTableState<T> {
	entries: T[];
	loading: boolean;
	searchQuery: string;
	searchField: string;
	currentPage: number;
	totalPages: number;
	totalCount: number;
	pageSize: number;
	sortColumn: string;
	sortDirection: 'asc' | 'desc';
	selectedFilename: string;
	error: string | null;
}

export interface DataTableConfig {
	type: EntityType;
	defaultFilename: string;
	defaultSortColumn: string;
	defaultPageSize?: number;
}

// ============================================================================
// 초기 상태 생성
// ============================================================================

export function createInitialState<T>(config: DataTableConfig): DataTableState<T> {
	return {
		entries: [],
		loading: false,
		searchQuery: '',
		searchField: 'all',
		currentPage: 1,
		totalPages: 1,
		totalCount: 0,
		pageSize: config.defaultPageSize ?? 20,
		sortColumn: config.defaultSortColumn,
		sortDirection: 'asc',
		selectedFilename: config.defaultFilename,
		error: null
	};
}

// ============================================================================
// URL 검색 파라미터 생성
// ============================================================================

export function buildSearchParams(state: DataTableState<unknown>): URLSearchParams {
	const params = new URLSearchParams();

	params.set('filename', state.selectedFilename);
	params.set('page', state.currentPage.toString());
	params.set('limit', state.pageSize.toString());

	if (state.searchQuery) {
		params.set('search', state.searchQuery);
		params.set('searchField', state.searchField);
	}

	if (state.sortColumn) {
		params.set('sortBy', state.sortColumn);
		params.set('sortOrder', state.sortDirection);
	}

	return params;
}

// ============================================================================
// 이벤트 핸들러 생성
// ============================================================================

export function createSortHandler<T>(
	state: DataTableState<T>,
	onStateChange: (newState: Partial<DataTableState<T>>) => void
) {
	return (event: SortEvent) => {
		const newDirection =
			state.sortColumn === event.column && state.sortDirection === 'asc' ? 'desc' : 'asc';

		onStateChange({
			sortColumn: event.column,
			sortDirection: newDirection,
			currentPage: 1
		});
	};
}

export function createPageChangeHandler<T>(
	onStateChange: (newState: Partial<DataTableState<T>>) => void
) {
	return (event: PageChangeEvent) => {
		onStateChange({
			currentPage: event.page
		});
	};
}

export function createSearchHandler<T>(
	onStateChange: (newState: Partial<DataTableState<T>>) => void
) {
	return (query: string, field?: string) => {
		onStateChange({
			searchQuery: query,
			searchField: field ?? 'all',
			currentPage: 1
		});
	};
}

// ============================================================================
// API 응답 처리
// ============================================================================

export interface ApiDataResponse<T> {
	success: boolean;
	data?: {
		entries: T[];
		pagination: {
			currentPage: number;
			totalPages: number;
			totalCount: number;
			pageSize: number;
		};
	};
	error?: string;
}

export function processApiResponse<T>(
	response: ApiDataResponse<T>,
	currentState: DataTableState<T>
): Partial<DataTableState<T>> {
	if (response.success && response.data) {
		return {
			entries: response.data.entries,
			currentPage: response.data.pagination.currentPage,
			totalPages: response.data.pagination.totalPages,
			totalCount: response.data.pagination.totalCount,
			pageSize: response.data.pagination.pageSize,
			loading: false,
			error: null
		};
	}

	return {
		entries: [],
		loading: false,
		error: response.error ?? '데이터를 불러오는데 실패했습니다.'
	};
}
