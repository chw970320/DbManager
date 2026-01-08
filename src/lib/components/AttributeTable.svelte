<script lang="ts">
	// @ts-nocheck
	import type { AttributeEntry } from '$lib/types/database-design.js';
	import { createEventDispatcher } from 'svelte';
	import ColumnFilter from './ColumnFilter.svelte';

	type SortEvent = { column: string; direction: 'asc' | 'desc' | null };
	type PageChangeEvent = { page: number };
	type EntryClickEvent = { entry: AttributeEntry };
	type FilterEvent = { column: string; value: string | null };

	let props = $props<{
		entries?: AttributeEntry[]; loading?: boolean; searchQuery?: string; totalCount?: number;
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

	function handleRowClick(entry: AttributeEntry, event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.tagName === 'BUTTON' || target.closest('button')) return;
		if (props.onentryclick) props.onentryclick({ entry });
		dispatch('entryclick', { entry });
	}

	type ColumnAlignment = 'left' | 'center' | 'right';
	const columns: Array<{ key: string; label: string; sortable: boolean; filterable: boolean; filterType?: 'text' | 'select'; width: string; align: ColumnAlignment }> = [
		{ key: 'schemaName', label: '스키마명', sortable: true, filterable: true, filterType: 'text', width: 'min-w-[120px]', align: 'left' },
		{ key: 'entityName', label: '엔터티명', sortable: true, filterable: true, filterType: 'text', width: 'min-w-[150px]', align: 'left' },
		{ key: 'attributeName', label: '속성명', sortable: true, filterable: true, filterType: 'text', width: 'min-w-[150px]', align: 'left' },
		{ key: 'attributeType', label: '속성유형', sortable: false, filterable: true, filterType: 'select', width: 'min-w-[100px]', align: 'left' },
		{ key: 'requiredInput', label: '필수입력여부', sortable: false, filterable: true, filterType: 'select', width: 'min-w-[100px]', align: 'center' },
		{ key: 'identifierFlag', label: '식별자여부', sortable: false, filterable: true, filterType: 'select', width: 'min-w-[100px]', align: 'center' },
		{ key: 'refEntityName', label: '참조엔터티명', sortable: true, filterable: true, filterType: 'text', width: 'min-w-[150px]', align: 'left' },
		{ key: 'attributeDescription', label: '속성설명', sortable: false, filterable: false, width: 'min-w-[200px]', align: 'left' }
	];

	let displayedPages = $derived(getPageNumbers());
	let openFilterColumn = $state<string | null>(null);

	function getUniqueValues(columnKey: string): string[] {
		const values = new Set<string>();
		entries.forEach((entry: AttributeEntry) => { const value = entry[columnKey as keyof AttributeEntry]; if (value !== null && value !== undefined && value !== '') values.add(String(value)); });
		return Array.from(values).sort();
	}

	function getPageNumbers(): number[] {
		const maxVisiblePages = 5; const pages: number[] = [];
		if (totalPages <= maxVisiblePages) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
		else { const start = Math.max(1, currentPage - 2); const end = Math.min(totalPages, start + maxVisiblePages - 1); const adjustedStart = Math.max(1, end - maxVisiblePages + 1); for (let i = adjustedStart; i <= end; i++) pages.push(i); }
		return pages;
	}

	function handleSort(column: string) { const currentDirection = sortConfig[column] ?? null; let newDirection: 'asc' | 'desc' | null; if (currentDirection === null) newDirection = 'asc'; else if (currentDirection === 'asc') newDirection = 'desc'; else newDirection = null; onsort({ column, direction: newDirection }); }
	function handleFilter(column: string, value: string | null) { if (onfilter) onfilter({ column, value }); dispatch('filter', { column, value }); openFilterColumn = null; }
	function handlePageChange(page: number) { if (page >= 1 && page <= totalPages) onpagechange({ page }); }
	function getSortIcon(column: string): string { const direction = sortConfig[column]; if (direction === 'asc') return '↑'; if (direction === 'desc') return '↓'; return ''; }
	function getSortOrder(column: string): number | null { const sortedColumns = Object.entries(sortConfig).filter(([, dir]) => dir !== null); const index = sortedColumns.findIndex(([key]) => key === column); return index >= 0 ? index + 1 : null; }
	function highlightText(text: string | undefined | null, query: string): string { if (!text) return ''; if (!query) return text; const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'); return text.replace(regex, '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>'); }
</script>

<div class="w-full">
	{#if hasActiveFilters || Object.keys(sortConfig).length > 0}
		<div class="mb-4 flex items-center justify-between">
			<div class="flex flex-wrap gap-2">{#each Object.entries(activeFilters) as [column, value] (column)}{#if value}<span class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">{columns.find((c) => c.key === column)?.label}: {value}<button onclick={() => handleFilter(column, null)} class="ml-1 hover:text-blue-600" aria-label="필터 제거">×</button></span>{/if}{/each}</div>
			<button onclick={() => onClearAllFilters?.()} class="text-sm text-gray-500 hover:text-gray-700">모든 필터/정렬 초기화</button>
		</div>
	{/if}

	<div class="overflow-x-auto">
		<table class="min-w-full divide-y divide-gray-200">
			<thead class="bg-gray-50">
				<tr>
					{#each columns as column (column.key)}
						<th class="group px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 {column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'} {column.width}">
							<div class="flex items-center gap-2">
								{#if column.sortable}<button onclick={() => handleSort(column.key)} class="flex items-center gap-1 hover:text-gray-900">{column.label}<span class="text-blue-600">{getSortIcon(column.key)}</span>{#if getSortOrder(column.key)}<span class="text-xs text-gray-400">({getSortOrder(column.key)})</span>{/if}</button>{:else}<span>{column.label}</span>{/if}
								{#if column.filterable}<ColumnFilter columnKey={column.key} columnLabel={column.label} filterType="select" currentValue={activeFilters[column.key] || null} options={filterOptions[column.key] || getUniqueValues(column.key)} isOpen={openFilterColumn === column.key} onOpen={(key) => { openFilterColumn = key; }} onClose={() => { openFilterColumn = null; }} onApply={(value) => handleFilter(column.key, value)} onClear={() => handleFilter(column.key, null)} />{/if}
							</div>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200 bg-white">
				{#if loading}<tr><td colspan={columns.length} class="px-4 py-8 text-center text-gray-500"><div class="flex items-center justify-center gap-2"><svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>로딩 중...</span></div></td></tr>
				{:else if entries.length === 0}<tr><td colspan={columns.length} class="px-4 py-8 text-center text-gray-500"><div class="flex flex-col items-center gap-2"><svg class="h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg><p class="text-lg font-medium">데이터가 없습니다</p><p class="text-sm">새 속성 정의서를 추가해주세요.</p></div></td></tr>
				{:else}
					{#each entries as entry (entry.id)}
						<tr onclick={(e) => handleRowClick(entry, e)} class="cursor-pointer transition-colors hover:bg-blue-50">
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{@html highlightText(entry.schemaName || '', searchField === 'all' || searchField === 'schemaName' ? searchQuery : '')}</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{@html highlightText(entry.entityName || '', searchField === 'all' || searchField === 'entityName' ? searchQuery : '')}</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{@html highlightText(entry.attributeName || '', searchField === 'all' || searchField === 'attributeName' ? searchQuery : '')}</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{entry.attributeType || '-'}</td>
							<td class="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-600">{entry.requiredInput || '-'}</td>
							<td class="whitespace-nowrap px-4 py-3 text-center text-sm text-gray-600">{entry.identifierFlag || '-'}</td>
							<td class="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{entry.refEntityName || '-'}</td>
							<td class="max-w-[300px] truncate px-4 py-3 text-sm text-gray-600" title={entry.attributeDescription || ''}>{entry.attributeDescription || '-'}</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	{#if totalPages > 1}
		<div class="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
			<div class="text-sm text-gray-700">전체 <span class="font-medium">{totalCount.toLocaleString()}</span>건 중 <span class="font-medium">{((currentPage - 1) * pageSize + 1).toLocaleString()}</span> - <span class="font-medium">{Math.min(currentPage * pageSize, totalCount).toLocaleString()}</span>건</div>
			<nav class="flex items-center gap-1">
				<button onclick={() => handlePageChange(1)} disabled={currentPage === 1} class="rounded px-2 py-1 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50" aria-label="첫 페이지">««</button>
				<button onclick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} class="rounded px-2 py-1 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50" aria-label="이전 페이지">«</button>
				{#each displayedPages as page (page)}<button onclick={() => handlePageChange(page)} class="rounded px-3 py-1 text-sm {currentPage === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}">{page}</button>{/each}
				<button onclick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} class="rounded px-2 py-1 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50" aria-label="다음 페이지">»</button>
				<button onclick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} class="rounded px-2 py-1 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50" aria-label="마지막 페이지">»»</button>
			</nav>
		</div>
	{/if}
</div>

