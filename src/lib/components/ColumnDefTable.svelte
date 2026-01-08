<script lang="ts">
	// @ts-nocheck
	import type { ColumnEntry } from '$lib/types/database-design.js';
	import { createEventDispatcher } from 'svelte';
	import ColumnFilter from './ColumnFilter.svelte';

	type SortEvent = { column: string; direction: 'asc' | 'desc' | null };
	type PageChangeEvent = { page: number };
	type EntryClickEvent = { entry: ColumnEntry };
	type FilterEvent = { column: string; value: string | null };

	let props = $props<{
		entries?: ColumnEntry[]; loading?: boolean; searchQuery?: string; totalCount?: number;
		currentPage?: number; totalPages?: number; pageSize?: number;
		sortConfig?: Record<string, 'asc' | 'desc' | null>; searchField?: string; _selectedFilename?: string;
		activeFilters?: Record<string, string | null>; filterOptions?: Record<string, string[]>;
		onsort: (detail: SortEvent) => void; onpagechange: (detail: PageChangeEvent) => void;
		onfilter?: (detail: FilterEvent) => void; onentryclick?: (detail: EntryClickEvent) => void; onClearAllFilters?: () => void;
	}>();

	const dispatch = createEventDispatcher<{ entryclick: EntryClickEvent; filter: FilterEvent }>();

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

	let hasActiveFilters = $derived(Object.keys(activeFilters).length > 0);

	function handleRowClick(entry: ColumnEntry, event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.tagName === 'BUTTON' || target.closest('button')) return;
		if (props.onentryclick) props.onentryclick({ entry });
		dispatch('entryclick', { entry });
	}

	type ColumnAlignment = 'left' | 'center' | 'right';
	const columns: Array<{ key: string; label: string; sortable: boolean; filterable: boolean; filterType?: 'text' | 'select'; width: string; align: ColumnAlignment }> = [
		{ key: 'scopeFlag', label: '사업범위여부', sortable: false, filterable: true, filterType: 'select', width: 'min-w-[100px]', align: 'center' },
		{ key: 'subjectArea', label: '주제영역', sortable: true, filterable: true, filterType: 'text', width: 'min-w-[120px]', align: 'left' },
		{ key: 'schemaName', label: '스키마명', sortable: true, filterable: true, filterType: 'text', width: 'min-w-[120px]', align: 'left' },
		{ key: 'tableEnglishName', label: '테이블영문명', sortable: true, filterable: true, filterType: 'text', width: 'min-w-[150px]', align: 'left' },
		{ key: 'columnEnglishName', label: '컬럼영문명', sortable: true, filterable: true, filterType: 'text', width: 'min-w-[150px]', align: 'left' },
		{ key: 'columnKoreanName', label: '컬럼한글명', sortable: true, filterable: true, filterType: 'text', width: 'min-w-[150px]', align: 'left' },
		{ key: 'relatedEntityName', label: '연관엔터티명', sortable: true, filterable: true, filterType: 'text', width: 'min-w-[150px]', align: 'left' },
		{ key: 'dataType', label: '자료타입', sortable: false, filterable: true, filterType: 'select', width: 'min-w-[100px]', align: 'center' },
		{ key: 'dataLength', label: '자료길이', sortable: false, filterable: false, width: 'min-w-[80px]', align: 'center' },
		{ key: 'dataDecimalLength', label: '자료소수점길이', sortable: false, filterable: false, width: 'min-w-[100px]', align: 'center' },
		{ key: 'dataFormat', label: '자료형식', sortable: false, filterable: false, width: 'min-w-[100px]', align: 'left' },
		{ key: 'notNullFlag', label: 'NOT NULL', sortable: false, filterable: true, filterType: 'select', width: 'min-w-[80px]', align: 'center' },
		{ key: 'pkInfo', label: 'PK', sortable: false, filterable: true, filterType: 'select', width: 'min-w-[60px]', align: 'center' },
		{ key: 'fkInfo', label: 'FK', sortable: false, filterable: true, filterType: 'select', width: 'min-w-[60px]', align: 'center' },
		{ key: 'indexName', label: '인덱스명', sortable: false, filterable: false, width: 'min-w-[100px]', align: 'left' },
		{ key: 'indexOrder', label: '인덱스순번', sortable: false, filterable: false, width: 'min-w-[100px]', align: 'center' },
		{ key: 'akInfo', label: 'AK', sortable: false, filterable: true, filterType: 'select', width: 'min-w-[60px]', align: 'center' },
		{ key: 'constraint', label: '제약조건', sortable: false, filterable: false, width: 'min-w-[150px]', align: 'left' },
		{ key: 'personalInfoFlag', label: '개인정보여부', sortable: false, filterable: true, filterType: 'select', width: 'min-w-[100px]', align: 'center' },
		{ key: 'encryptionFlag', label: '암호화여부', sortable: false, filterable: true, filterType: 'select', width: 'min-w-[100px]', align: 'center' },
		{ key: 'publicFlag', label: '공개/비공개여부', sortable: false, filterable: true, filterType: 'select', width: 'min-w-[120px]', align: 'center' },
		{ key: 'columnDescription', label: '컬럼설명', sortable: false, filterable: false, width: 'min-w-[200px]', align: 'left' }
	];

	let displayedPages = $derived(getPageNumbers());
	let openFilterColumn = $state<string | null>(null);

	function getUniqueValues(columnKey: string): string[] {
		const values = new Set<string>();
		entries.forEach((entry: ColumnEntry) => { const value = entry[columnKey as keyof ColumnEntry]; if (value !== null && value !== undefined && value !== '') values.add(String(value)); });
		return Array.from(values).sort();
	}

	function getPageNumbers(): (number | string)[] {
		const pages: (number | string)[] = [];
		const maxVisible = 7;
		if (totalPages <= maxVisible) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else {
			pages.push(1);
			if (currentPage <= 4) {
				for (let i = 2; i <= 5; i++) pages.push(i);
				pages.push('...');
				pages.push(totalPages);
			} else if (currentPage >= totalPages - 3) {
				pages.push('...');
				for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
			} else {
				pages.push('...');
				for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
				pages.push('...');
				pages.push(totalPages);
			}
		}
		return pages;
	}

	function handleSort(column: string) {
		if (!loading) {
			const currentDirection = sortConfig[column] ?? null;
			let newDirection: 'asc' | 'desc' | null;
			if (currentDirection === null) newDirection = 'asc';
			else if (currentDirection === 'asc') newDirection = 'desc';
			else newDirection = null;
			onsort({ column, direction: newDirection });
		}
	}

	function getSortDirection(column: string): 'asc' | 'desc' | null {
		return sortConfig[column] ?? null;
	}

	function handleFilter(column: string, value: string | null) {
		if (onfilter) onfilter({ column, value });
		dispatch('filter', { column, value });
	}

	function handlePageChange(page: number) {
		if (!loading && page !== currentPage && page >= 1 && page <= totalPages) {
			onpagechange({ page });
		}
	}

	function highlightText(text: string | undefined | null, query: string, columnKey: string): string {
		if (!text) return '-';
		if (!query || (searchField !== 'all' && searchField !== columnKey)) return text;
		const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
		return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
	}

	function formatFieldValue(entry: ColumnEntry, columnKey: string): string {
		const value = entry[columnKey as keyof ColumnEntry];
		if (value === null || value === undefined || value === '') return '-';
		return String(value);
	}
</script>

<!-- 컬럼 정의서 테이블 컴포넌트 -->
<div class="max-w-full rounded-lg border border-gray-300 shadow-md">
	<!-- 테이블 헤더 -->
	<div class="border-b border-gray-200 px-6 py-4">
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-medium text-gray-900">
				컬럼 정의서 목록
				{#if totalCount > 0}
					<span class="ml-2 text-sm font-normal text-gray-500">
						총 {totalCount.toLocaleString()}개 항목
					</span>
				{/if}
			</h3>

			<div class="flex items-center gap-4">
				{#if searchQuery}
					<div class="text-sm text-gray-500">
						<span class="font-medium">"{searchQuery}"</span> 검색 결과
					</div>
				{/if}
				{#if hasActiveFilters && onClearAllFilters}
					<button
						type="button"
						onclick={() => onClearAllFilters?.()}
						class="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
						title="모든 필터 초기화"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
						필터 초기화
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- 테이블 컨테이너 -->
	<div class="overflow-x-auto px-1 pb-6">
		<table class="min-w-full table-auto divide-y divide-gray-200">
			<thead class="overflow-visible bg-gray-100">
				<tr>
					{#each columns as column (column.key)}
						<th
							scope="col"
							class="relative text-nowrap px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-700 {column.width} whitespace-normal {column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'} {column.sortable ? 'cursor-pointer hover:bg-gray-200' : ''} {column.filterable ? 'overflow-visible' : ''}"
							class:bg-gray-200={getSortDirection(column.key) !== null}
							onclick={() => column.sortable && handleSort(column.key)}
							onkeydown={(e) => {
								if ((e.key === 'Enter' || e.key === ' ') && column.sortable) {
									e.preventDefault();
									handleSort(column.key);
								}
							}}
							tabindex={column.sortable ? 0 : -1}
							role={column.sortable ? 'button' : 'columnheader'}
							aria-label={column.sortable ? `${column.label}로 정렬` : column.label}
						>
							<div class="flex items-center justify-center space-x-1">
								<span>{column.label}</span>
								{#if column.sortable}
									{@const colSortDir = getSortDirection(column.key)}
									<svg class="h-4 w-4 {colSortDir !== null ? 'text-gray-600' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										{#if colSortDir === 'asc'}
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
										{:else if colSortDir === 'desc'}
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
										{:else}
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
										{/if}
									</svg>
								{/if}
								{#if column.filterable}
									<ColumnFilter
										columnKey={column.key}
										columnLabel={column.label}
										filterType="select"
										currentValue={activeFilters[column.key] || null}
										options={filterOptions[column.key] || getUniqueValues(column.key)}
										isOpen={openFilterColumn === column.key}
										onOpen={(key) => { openFilterColumn = key; }}
										onClose={() => { openFilterColumn = null; }}
										onApply={(value) => handleFilter(column.key, value)}
										onClear={() => handleFilter(column.key, null)}
									/>
								{/if}
							</div>
						</th>
					{/each}
				</tr>
			</thead>

			<tbody class="divide-y divide-gray-200 bg-white">
				{#if loading}
					{#each Array(pageSize) as _, i (i)}
						<tr class="animate-pulse">
							{#each columns as _ (_.key)}
								<td class="whitespace-nowrap px-6 py-4"><div class="h-4 w-3/4 rounded bg-gray-200"></div></td>
							{/each}
						</tr>
					{/each}
				{:else if entries.length === 0}
					<tr>
						<td colspan={columns.length} class="px-6 py-12 text-center">
							<div class="flex flex-col items-center space-y-3">
								<svg class="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
								</svg>
								<div class="text-gray-500">
									{#if searchQuery}
										<p class="text-lg font-medium">검색 결과가 없습니다</p>
										<p class="text-sm">다른 검색어를 시도해보세요</p>
									{:else}
										<p class="text-lg font-medium">표시할 데이터가 없습니다</p>
										<p class="text-sm">먼저 파일을 업로드하여 컬럼 정의서를 등록해주세요.</p>
									{/if}
								</div>
							</div>
						</td>
					</tr>
				{:else}
					{#each entries as entry (entry.id)}
						<tr
							class="cursor-pointer border-t border-gray-300 transition-colors hover:bg-blue-50"
							onclick={(e: MouseEvent) => handleRowClick(entry, e)}
							role="button"
							tabindex="0"
							onkeydown={(e: KeyboardEvent) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									handleRowClick(entry, e as unknown as MouseEvent);
								}
							}}
							aria-label="항목 클릭하여 상세 정보 보기"
						>
							{#each columns as column (column.key)}
								{@const formattedValue = formatFieldValue(entry, column.key)}
								<td class="whitespace-normal break-words px-6 py-4 text-sm text-gray-700 {column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}">
									<p class="break-words px-2 py-1">
										{@html highlightText(formattedValue === '-' ? '' : formattedValue, searchQuery, column.key) || '-'}
									</p>
								</td>
							{/each}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<!-- 페이지네이션 -->
	{#if totalPages > 1}
		<div class="flex flex-col items-center justify-between space-y-4 border-t border-gray-200 px-6 py-4 md:flex-row md:space-y-0">
			<div class="text-sm text-gray-600">
				총 <span class="font-medium">{totalPages}</span> 페이지 중
				<span class="font-medium">{currentPage}</span> 페이지
			</div>

			<nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
				<button
					onclick={() => handlePageChange(currentPage - 1)}
					disabled={currentPage === 1 || loading}
					class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 transition-colors hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<span class="sr-only">이전</span>
					<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
					</svg>
				</button>

				{#each displayedPages as page, i (typeof page === 'number' ? page : `ellipsis-${i}`)}
					{#if typeof page === 'number'}
						<button
							onclick={() => handlePageChange(page)}
							disabled={loading}
							class="relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 transition-colors focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50 {currentPage === page ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' : 'text-gray-900 hover:bg-gray-50'}"
						>
							{page}
						</button>
					{:else}
						<span class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">...</span>
					{/if}
				{/each}

				<button
					onclick={() => handlePageChange(currentPage + 1)}
					disabled={currentPage === totalPages || loading}
					class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 transition-colors hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<span class="sr-only">다음</span>
					<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
					</svg>
				</button>
			</nav>
		</div>
	{/if}
</div>
