<script lang="ts">
	// @ts-nocheck
	import type { DatabaseEntry } from '$lib/types/database-design.js';
	import { createEventDispatcher } from 'svelte';
	import ColumnFilter from './ColumnFilter.svelte';

	type SortEvent = {
		column: string;
		direction: 'asc' | 'desc' | null;
	};

	type PageChangeEvent = {
		page: number;
	};

	type EntryClickEvent = {
		entry: DatabaseEntry;
	};

	type FilterEvent = {
		column: string;
		value: string | null;
	};

	// 컴포넌트 속성
	let props = $props<{
		entries?: DatabaseEntry[];
		loading?: boolean;
		searchQuery?: string;
		totalCount?: number;
		currentPage?: number;
		totalPages?: number;
		pageSize?: number;
		sortConfig?: Record<string, 'asc' | 'desc' | null>;
		searchField?: string;
		_selectedFilename?: string;
		activeFilters?: Record<string, string | null>;
		filterOptions?: Record<string, string[]>;
		onsort: (detail: SortEvent) => void;
		onpagechange: (detail: PageChangeEvent) => void;
		onfilter?: (detail: FilterEvent) => void;
		onentryclick?: (detail: EntryClickEvent) => void;
		onClearAllFilters?: () => void;
	}>();

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		entryclick: EntryClickEvent;
		filter: FilterEvent;
	}>();

	// Default values using derived state
	let entries = $derived(props.entries ?? []);
	let loading = $derived(props.loading ?? false);
	let searchQuery = $derived(props.searchQuery ?? '');
	let totalCount = $derived(props.totalCount ?? 0);
	let currentPage = $derived(props.currentPage ?? 1);
	let totalPages = $derived(props.totalPages ?? 1);
	let pageSize = $derived(props.pageSize ?? 20);
	let sortConfig = $derived(props.sortConfig ?? {});
	let searchField = $derived(props.searchField ?? 'all');
	let activeFilters = $derived(props.activeFilters ?? {});
	let filterOptions = $derived(props.filterOptions ?? {});
	let onsort = $derived(props.onsort);
	let onpagechange = $derived(props.onpagechange);
	let onfilter = $derived(props.onfilter);
	let onClearAllFilters = $derived(props.onClearAllFilters);

	// 활성 필터가 있는지 확인
	let hasActiveFilters = $derived(Object.keys(activeFilters).length > 0);

	// 행 클릭 핸들러
	function handleRowClick(entry: DatabaseEntry, event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.tagName === 'BUTTON' || target.closest('button')) {
			return;
		}

		if (props.onentryclick) {
			props.onentryclick({ entry });
		}
		dispatch('entryclick', { entry });
	}

	// 테이블 컬럼 정의
	type ColumnAlignment = 'left' | 'center' | 'right';
	const columns: Array<{
		key: string;
		label: string;
		sortable: boolean;
		filterable: boolean;
		filterType?: 'text' | 'select';
		filterOptions?: string[];
		width: string;
		align: ColumnAlignment;
	}> = [
		{
			key: 'organizationName',
			label: '기관명',
			sortable: true,
			filterable: true,
			filterType: 'text',
			width: 'min-w-[120px]',
			align: 'left'
		},
		{
			key: 'departmentName',
			label: '부서명',
			sortable: true,
			filterable: true,
			filterType: 'text',
			width: 'min-w-[120px]',
			align: 'left'
		},
		{
			key: 'appliedTask',
			label: '적용업무',
			sortable: true,
			filterable: true,
			filterType: 'text',
			width: 'min-w-[120px]',
			align: 'left'
		},
		{
			key: 'logicalDbName',
			label: '논리DB명',
			sortable: true,
			filterable: true,
			filterType: 'text',
			width: 'min-w-[150px]',
			align: 'left'
		},
		{
			key: 'physicalDbName',
			label: '물리DB명',
			sortable: true,
			filterable: true,
			filterType: 'text',
			width: 'min-w-[150px]',
			align: 'left'
		},
		{
			key: 'dbmsInfo',
			label: 'DBMS정보',
			sortable: false,
			filterable: true,
			filterType: 'select',
			width: 'min-w-[120px]',
			align: 'left'
		},
		{
			key: 'buildDate',
			label: '구축일자',
			sortable: true,
			filterable: false,
			width: 'min-w-[100px]',
			align: 'center'
		},
		{
			key: 'dbDescription',
			label: 'DB설명',
			sortable: false,
			filterable: false,
			width: 'min-w-[200px]',
			align: 'left'
		}
	];

	// 파생 상태 (페이지네이션)
	let displayedPages = $derived(getPageNumbers());

	// 열린 필터 추적 (하나만 열리도록)
	let openFilterColumn = $state<string | null>(null);

	/**
	 * 컬럼별 고유값 목록 추출
	 */
	function getUniqueValues(columnKey: string): string[] {
		const values = new Set<string>();
		entries.forEach((entry: DatabaseEntry) => {
			const value = entry[columnKey as keyof DatabaseEntry];
			if (value !== null && value !== undefined && value !== '') {
				values.add(String(value));
			}
		});
		return Array.from(values).sort();
	}

	/**
	 * 페이지 번호 배열 생성
	 */
	function getPageNumbers(): number[] {
		const maxVisiblePages = 5;
		const pages: number[] = [];

		if (totalPages <= maxVisiblePages) {
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			const start = Math.max(1, currentPage - 2);
			const end = Math.min(totalPages, start + maxVisiblePages - 1);
			const adjustedStart = Math.max(1, end - maxVisiblePages + 1);

			for (let i = adjustedStart; i <= end; i++) {
				pages.push(i);
			}
		}

		return pages;
	}

	/**
	 * 정렬 핸들러 (3단계 순환: null → asc → desc → null)
	 */
	function handleSort(column: string) {
		const currentDirection = sortConfig[column] ?? null;
		let newDirection: 'asc' | 'desc' | null;

		if (currentDirection === null) {
			newDirection = 'asc';
		} else if (currentDirection === 'asc') {
			newDirection = 'desc';
		} else {
			newDirection = null;
		}

		onsort({ column, direction: newDirection });
	}

	/**
	 * 필터 핸들러
	 */
	function handleFilter(column: string, value: string | null) {
		if (onfilter) {
			onfilter({ column, value });
		}
		dispatch('filter', { column, value });
		openFilterColumn = null;
	}

	/**
	 * 필터 토글 핸들러
	 */
	function toggleFilter(column: string) {
		openFilterColumn = openFilterColumn === column ? null : column;
	}

	/**
	 * 페이지 변경 핸들러
	 */
	function handlePageChange(page: number) {
		if (page >= 1 && page <= totalPages) {
			onpagechange({ page });
		}
	}

	/**
	 * 정렬 아이콘 표시
	 */
	function getSortIcon(column: string): string {
		const direction = sortConfig[column];
		if (direction === 'asc') return '↑';
		if (direction === 'desc') return '↓';
		return '';
	}

	/**
	 * 정렬 우선순위 표시
	 */
	function getSortOrder(column: string): number | null {
		const sortedColumns = Object.entries(sortConfig).filter(([, dir]) => dir !== null);
		const index = sortedColumns.findIndex(([key]) => key === column);
		return index >= 0 ? index + 1 : null;
	}

	/**
	 * 검색어 하이라이트
	 */
	function highlightText(text: string | undefined | null, query: string): string {
		if (!text) return '';
		if (!query) return text;

		const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
		return text.replace(regex, '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>');
	}
</script>

<div class="w-full">
	<!-- 필터 초기화 버튼 -->
	{#if hasActiveFilters || Object.keys(sortConfig).length > 0}
		<div class="mb-4 flex items-center justify-between">
			<div class="flex flex-wrap gap-2">
				{#each Object.entries(activeFilters) as [column, value] (column)}
					{#if value}
						<span
							class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
						>
							{columns.find((c) => c.key === column)?.label}: {value}
							<button
								onclick={() => handleFilter(column, null)}
								class="ml-1 hover:text-blue-600"
								aria-label="필터 제거"
							>
								×
							</button>
						</span>
					{/if}
				{/each}
			</div>
			<button
				onclick={() => onClearAllFilters?.()}
				class="text-sm text-gray-500 hover:text-gray-700"
			>
				모든 필터/정렬 초기화
			</button>
		</div>
	{/if}

	<!-- 테이블 -->
	<div class="overflow-x-auto">
		<table class="min-w-full divide-y divide-gray-200">
			<thead class="bg-gray-50">
				<tr>
					{#each columns as column (column.key)}
						<th
							class="group px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 {column.align ===
							'center'
								? 'text-center'
								: column.align === 'right'
									? 'text-right'
									: 'text-left'} {column.width}"
						>
							<div class="flex items-center gap-2">
								{#if column.sortable}
									<button
										onclick={() => handleSort(column.key)}
										class="flex items-center gap-1 hover:text-gray-900"
									>
										{column.label}
										<span class="text-blue-600">{getSortIcon(column.key)}</span>
										{#if getSortOrder(column.key)}
											<span class="text-xs text-gray-400">({getSortOrder(column.key)})</span>
										{/if}
									</button>
								{:else}
									<span>{column.label}</span>
								{/if}

								{#if column.filterable}
									<div class="relative">
										<button
											onclick={() => toggleFilter(column.key)}
											class="rounded p-1 opacity-0 transition-opacity hover:bg-gray-200 group-hover:opacity-100 {activeFilters[
												column.key
											]
												? 'text-blue-600 opacity-100'
												: ''}"
											aria-label="필터"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
												/>
											</svg>
										</button>
										{#if openFilterColumn === column.key}
											<ColumnFilter
												options={column.filterType === 'select'
													? column.filterOptions ||
														filterOptions[column.key] ||
														getUniqueValues(column.key)
													: filterOptions[column.key] || getUniqueValues(column.key)}
												value={activeFilters[column.key] || null}
												type={column.filterType || 'text'}
												onselect={(value) => handleFilter(column.key, value)}
												onclose={() => (openFilterColumn = null)}
											/>
										{/if}
									</div>
								{/if}
							</div>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200 bg-white">
				{#if loading}
					<tr>
						<td colspan={columns.length} class="px-4 py-8 text-center text-gray-500">
							<div class="flex items-center justify-center gap-2">
								<svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								<span>로딩 중...</span>
							</div>
						</td>
					</tr>
				{:else if entries.length === 0}
					<tr>
						<td colspan={columns.length} class="px-4 py-8 text-center text-gray-500">
							<div class="flex flex-col items-center gap-2">
								<svg
									class="h-12 w-12 text-gray-300"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
									/>
								</svg>
								<p class="text-lg font-medium">데이터가 없습니다</p>
								<p class="text-sm">새 데이터베이스 정의서를 추가해주세요.</p>
							</div>
						</td>
					</tr>
				{:else}
					{#each entries as entry (entry.id)}
						<tr
							onclick={(e) => handleRowClick(entry, e)}
							class="cursor-pointer transition-colors hover:bg-blue-50"
						>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
								{@html highlightText(
									entry.organizationName,
									searchField === 'all' || searchField === 'organizationName' ? searchQuery : ''
								)}
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
								{@html highlightText(
									entry.departmentName,
									searchField === 'all' || searchField === 'departmentName' ? searchQuery : ''
								)}
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
								{@html highlightText(
									entry.appliedTask,
									searchField === 'all' || searchField === 'appliedTask' ? searchQuery : ''
								)}
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
								{@html highlightText(
									entry.logicalDbName || '',
									searchField === 'all' || searchField === 'logicalDbName' ? searchQuery : ''
								)}
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
								{@html highlightText(
									entry.physicalDbName || '',
									searchField === 'all' || searchField === 'physicalDbName' ? searchQuery : ''
								)}
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
								{entry.dbmsInfo || '-'}
							</td>
							<td class="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-600">
								{entry.buildDate || '-'}
							</td>
							<td
								class="max-w-[300px] truncate px-4 py-3 text-sm text-gray-600"
								title={entry.dbDescription || ''}
							>
								{entry.dbDescription || '-'}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<!-- 페이지네이션 -->
	{#if totalPages > 1}
		<div class="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
			<div class="text-sm text-gray-700">
				전체 <span class="font-medium">{totalCount.toLocaleString()}</span>건 중
				<span class="font-medium">{((currentPage - 1) * pageSize + 1).toLocaleString()}</span>
				-
				<span class="font-medium"
					>{Math.min(currentPage * pageSize, totalCount).toLocaleString()}</span
				>건
			</div>

			<nav class="flex items-center gap-1">
				<button
					onclick={() => handlePageChange(1)}
					disabled={currentPage === 1}
					class="rounded px-2 py-1 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
					aria-label="첫 페이지"
				>
					««
				</button>
				<button
					onclick={() => handlePageChange(currentPage - 1)}
					disabled={currentPage === 1}
					class="rounded px-2 py-1 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
					aria-label="이전 페이지"
				>
					«
				</button>

				{#each displayedPages as page (page)}
					<button
						onclick={() => handlePageChange(page)}
						class="rounded px-3 py-1 text-sm {currentPage === page
							? 'bg-blue-600 text-white'
							: 'hover:bg-gray-100'}"
					>
						{page}
					</button>
				{/each}

				<button
					onclick={() => handlePageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
					class="rounded px-2 py-1 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
					aria-label="다음 페이지"
				>
					»
				</button>
				<button
					onclick={() => handlePageChange(totalPages)}
					disabled={currentPage === totalPages}
					class="rounded px-2 py-1 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
					aria-label="마지막 페이지"
				>
					»»
				</button>
			</nav>
		</div>
	{/if}
</div>
