/**
 * 공통 테이블 관련 타입 정의
 * Table 컴포넌트들의 중복 타입을 통합
 */

// ============================================================================
// 컬럼 정의
// ============================================================================

export type ColumnAlignment = 'left' | 'center' | 'right';

export interface ColumnDefinition<T = unknown> {
	key: keyof T | string;
	label: string;
	sortable: boolean;
	width: string;
	align: ColumnAlignment;
}

// ============================================================================
// 이벤트 타입
// ============================================================================

export type SortDirection = 'asc' | 'desc' | null;

export interface SortEvent {
	column: string;
	direction: SortDirection;
}

export interface PageChangeEvent {
	page: number;
}

export interface EntryClickEvent<T> {
	entry: T;
}

// ============================================================================
// 공통 Props 인터페이스
// ============================================================================

export interface TableProps<T> {
	entries?: T[];
	loading?: boolean;
	searchQuery?: string;
	totalCount?: number;
	currentPage?: number;
	totalPages?: number;
	pageSize?: number;
	sortColumn?: string; // 단일 정렬 (하위 호환성)
	sortDirection?: 'asc' | 'desc'; // 단일 정렬 (하위 호환성)
	sortConfig?: Record<string, SortDirection>; // 다중 정렬
	searchField?: string;
	selectedFilename?: string;
	onsort: (detail: SortEvent) => void;
	onpagechange: (detail: PageChangeEvent) => void;
	onentryclick?: (detail: EntryClickEvent<T>) => void;
}

// ============================================================================
// 페이지네이션 유틸리티
// ============================================================================

export interface PaginationConfig {
	currentPage: number;
	totalPages: number;
	maxVisiblePages?: number;
}

export function getVisiblePageNumbers(config: PaginationConfig): number[] {
	const { currentPage, totalPages, maxVisiblePages = 5 } = config;

	if (totalPages <= maxVisiblePages) {
		return Array.from({ length: totalPages }, (_, i) => i + 1);
	}

	const half = Math.floor(maxVisiblePages / 2);
	let start = Math.max(1, currentPage - half);
	const end = Math.min(totalPages, start + maxVisiblePages - 1);

	if (end - start + 1 < maxVisiblePages) {
		start = Math.max(1, end - maxVisiblePages + 1);
	}

	return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

// ============================================================================
// 테이블 기본값
// ============================================================================

export const TABLE_DEFAULTS = {
	pageSize: 20,
	sortDirection: 'asc' as const,
	searchField: 'all',
	maxVisiblePages: 5
} as const;
