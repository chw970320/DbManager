<script lang="ts">
	// @ts-nocheck
	import type { TableEntry } from '$lib/types/database-design.js';
	import { getHighlightedSegments } from '$lib/utils/text-highlight';
	import { createEventDispatcher } from 'svelte';
	import ColumnFilter from './ColumnFilter.svelte';
	import EmptyState from './EmptyState.svelte';
	import HighlightedText from './HighlightedText.svelte';
	import Skeleton from './Skeleton.svelte';
	import TablePagination from './TablePagination.svelte';

	type SortEvent = { column: string; direction: 'asc' | 'desc' | null };
	type PageChangeEvent = { page: number };
	type EntryClickEvent = { entry: TableEntry };
	type FilterEvent = { column: string; value: string | null };

	let props = $props<{
		entries?: TableEntry[];
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
	let displayedCount = $derived(totalCount > 0 ? totalCount : entries.length);

	function handleRowClick(entry: TableEntry, event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.tagName === 'BUTTON' || target.closest('button')) return;
		if (props.onentryclick) props.onentryclick({ entry });
		dispatch('entryclick', { entry });
	}

	type ColumnAlignment = 'left' | 'center' | 'right';
	const columns: Array<{
		key: string;
		label: string;
		sortable: boolean;
		filterable: boolean;
		width: string;
		align: ColumnAlignment;
	}> = [
		{
			key: 'physicalDbName',
			label: '물리DB명',
			sortable: true,
			filterable: true,
			width: 'min-w-[150px]',
			align: 'left'
		},
		{
			key: 'tableOwner',
			label: '테이블소유자',
			sortable: true,
			filterable: true,
			width: 'min-w-[120px]',
			align: 'left'
		},
		{
			key: 'schemaName',
			label: '스키마명',
			sortable: true,
			filterable: true,
			width: 'min-w-[120px]',
			align: 'left'
		},
		{
			key: 'tableEnglishName',
			label: '테이블영문명',
			sortable: true,
			filterable: true,
			width: 'min-w-[150px]',
			align: 'left'
		},
		{
			key: 'tableKoreanName',
			label: '테이블한글명',
			sortable: true,
			filterable: true,
			width: 'min-w-[150px]',
			align: 'left'
		},
		{
			key: 'tableType',
			label: '테이블유형',
			sortable: false,
			filterable: true,
			width: 'min-w-[100px]',
			align: 'center'
		},
		{
			key: 'relatedEntityName',
			label: '관련엔터티명',
			sortable: true,
			filterable: true,
			width: 'min-w-[150px]',
			align: 'left'
		},
		{
			key: 'subjectArea',
			label: '주제영역',
			sortable: true,
			filterable: true,
			width: 'min-w-[120px]',
			align: 'left'
		},
		{
			key: 'businessClassification',
			label: '업무분류체계',
			sortable: false,
			filterable: true,
			width: 'min-w-[150px]',
			align: 'left'
		},
		{
			key: 'publicFlag',
			label: '공개여부',
			sortable: false,
			filterable: true,
			width: 'min-w-[100px]',
			align: 'center'
		},
		{
			key: 'nonPublicReason',
			label: '비공개사유',
			sortable: false,
			filterable: false,
			width: 'min-w-[200px]',
			align: 'left'
		},
		{
			key: 'tableDescription',
			label: '테이블설명',
			sortable: false,
			filterable: false,
			width: 'min-w-[200px]',
			align: 'left'
		},
		{
			key: 'retentionPeriod',
			label: '보존기간',
			sortable: false,
			filterable: false,
			width: 'min-w-[100px]',
			align: 'left'
		},
		{
			key: 'tableVolume',
			label: '테이블볼륨',
			sortable: false,
			filterable: false,
			width: 'min-w-[100px]',
			align: 'center'
		},
		{
			key: 'occurrenceCycle',
			label: '발생주기',
			sortable: false,
			filterable: false,
			width: 'min-w-[100px]',
			align: 'left'
		},
		{
			key: 'openDataList',
			label: '개방데이터목록',
			sortable: false,
			filterable: false,
			width: 'min-w-[200px]',
			align: 'left'
		}
	];

	let openFilterColumn = $state<string | null>(null);

	function getUniqueValues(columnKey: string): string[] {
		const values = new Set<string>();
		entries.forEach((entry: TableEntry) => {
			const value = entry[columnKey as keyof TableEntry];
			if (value !== null && value !== undefined && value !== '') values.add(String(value));
		});
		return Array.from(values).sort();
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

	function formatFieldValue(entry: TableEntry, columnKey: string): string {
		const value = entry[columnKey as keyof TableEntry];
		if (value === null || value === undefined || value === '') return '-';
		return String(value);
	}
</script>

<!-- 테이블 정의서 테이블 컴포넌트 -->
<div class="max-w-full rounded-lg border border-border bg-surface shadow-md">
	<!-- 테이블 헤더 -->
	<div class="border-b border-border px-6 py-4">
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-medium text-content">
				테이블 정의서 목록
				{#if displayedCount > 0}
					<span class="ml-2 text-sm font-normal text-content-muted">
						총 {displayedCount.toLocaleString()}개 항목
					</span>
				{/if}
			</h3>

			<div class="flex items-center gap-4">
				{#if searchQuery}
					<div class="text-sm text-content-muted">
						<span class="font-medium">"{searchQuery}"</span> 검색 결과
					</div>
				{/if}
				{#if hasActiveFilters && onClearAllFilters}
					<button
						type="button"
						onclick={() => onClearAllFilters?.()}
						class="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-content-secondary transition-colors hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-1"
						title="모든 필터 초기화"
					>
						<svg
							class="h-4 w-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
						필터 초기화
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- 테이블 컨테이너 -->
	<div class="overflow-x-auto px-1 pb-6">
		<table
			class="min-w-full table-auto divide-y divide-border"
			aria-label="테이블 정의서 목록"
			aria-busy={loading}
		>
			<caption class="sr-only">
				{loading
					? '테이블 정의서 목록을 불러오는 중입니다.'
					: `테이블 정의서 ${displayedCount.toLocaleString()}개 항목`}
			</caption>
			<thead class="overflow-visible bg-surface-muted">
				<tr>
					{#each columns as column (column.key)}
						<th
							scope="col"
							class="relative text-nowrap px-6 py-3 text-xs font-medium uppercase tracking-wider text-content-secondary {column.width} whitespace-normal {column.align ===
							'center'
								? 'text-center'
								: column.align === 'right'
									? 'text-right'
									: 'text-left'} {column.sortable
								? 'cursor-pointer hover:bg-surface-raised'
								: ''} {column.filterable ? 'overflow-visible' : ''}"
							class:bg-surface-raised={getSortDirection(column.key) !== null}
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
									<svg
										class="h-4 w-4 {colSortDir !== null
											? 'text-content-secondary'
											: 'text-content-secondary'}"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										{#if colSortDir === 'asc'}
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M5 15l7-7 7 7"
											/>
										{:else if colSortDir === 'desc'}
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 9l-7 7-7-7"
											/>
										{:else}
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M8 9l4-4 4 4m0 6l-4 4-4-4"
											/>
										{/if}
									</svg>
								{/if}
								{#if column.filterable}
									<ColumnFilter
										columnKey={column.key}
										columnLabel={column.label}
										currentValue={activeFilters[column.key] || null}
										options={filterOptions[column.key] || getUniqueValues(column.key)}
										isOpen={openFilterColumn === column.key}
										onOpen={(key) => {
											openFilterColumn = key;
										}}
										onClose={() => {
											openFilterColumn = null;
										}}
										onApply={(value) => handleFilter(column.key, value)}
									/>
								{/if}
							</div>
						</th>
					{/each}
				</tr>
			</thead>

			<tbody class="divide-y divide-border bg-surface">
				{#if loading}
					{#each Array(pageSize) as _, i (i)}
						<tr aria-hidden="true">
							{#each columns as column, columnIndex (column.key)}
								<td class="whitespace-nowrap px-6 py-4">
									<Skeleton
										width={columnIndex % 3 === 0
											? '75%'
											: column.align === 'center'
												? '50%'
												: '66%'}
										height="1rem"
										class="max-w-full"
									/>
								</td>
							{/each}
						</tr>
					{/each}
				{:else if entries.length === 0}
					<tr>
						<td colspan={columns.length} class="px-6 py-12 text-center">
							<EmptyState
								icon={searchQuery ? 'search' : 'file'}
								title={searchQuery ? '검색 결과가 없습니다' : '표시할 데이터가 없습니다'}
								description={searchQuery
									? '다른 검색어를 시도해보세요.'
									: '먼저 파일을 업로드하여 테이블 정의서를 등록해주세요.'}
							/>
						</td>
					</tr>
				{:else}
					{#each entries as entry (entry.id)}
						<tr
							class="cursor-pointer border-t border-border transition-colors hover:bg-surface-muted/70"
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
								{@const highlightedSegments = getHighlightedSegments(
									formattedValue === '-' ? '' : formattedValue,
									searchQuery,
									searchField === 'all' || searchField === column.key
								)}
								<td
									class="whitespace-normal break-words px-6 py-4 text-sm text-content-secondary {column.align ===
									'center'
										? 'text-center'
										: column.align === 'right'
											? 'text-right'
											: 'text-left'}"
								>
									<p class="break-words px-2 py-1">
										<HighlightedText segments={highlightedSegments} />
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
	<TablePagination {currentPage} {totalPages} {loading} {onpagechange} />
</div>
