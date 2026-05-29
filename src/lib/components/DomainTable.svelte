<script lang="ts">
	import type { DomainEntry } from '$lib/types/domain.js';
	import { getHighlightedSegments } from '$lib/utils/text-highlight';
	import { createEventDispatcher } from 'svelte';
	import ColumnFilter from './ColumnFilter.svelte';
	import EmptyState from './EmptyState.svelte';
	import HighlightedText from './HighlightedText.svelte';
	import Skeleton from './Skeleton.svelte';

	type SortEvent = {
		column: string;
		direction: 'asc' | 'desc' | null;
	};

	type PageChangeEvent = {
		page: number;
	};

	type EntryClickEvent = {
		entry: DomainEntry;
	};

	type FilterEvent = {
		column: string;
		value: string | null;
	};

	// 컴포넌트 속성
	let {
		entries = [] as DomainEntry[],
		loading = false,
		searchQuery = '',
		totalCount = 0,
		currentPage = 1,
		totalPages = 1,
		pageSize = 20,
		sortConfig = {} as Record<string, 'asc' | 'desc' | null>,
		searchField = 'all',
		_selectedFilename = 'domain.json',
		activeFilters = {} as Record<string, string | null>,
		filterOptions = {} as Record<string, string[]>,
		onsort,
		onpagechange,
		onfilter,
		onentryclick,
		onClearAllFilters
	}: {
		entries?: DomainEntry[];
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
	} = $props();

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		entryclick: EntryClickEvent;
		filter: FilterEvent;
	}>();

	// 행 클릭 핸들러
	function handleRowClick(entry: DomainEntry, event: MouseEvent) {
		// 버튼이나 링크 클릭 시에는 이벤트 전파 방지
		const target = event.target as HTMLElement;
		if (target.tagName === 'BUTTON' || target.closest('button')) {
			return;
		}

		if (onentryclick) {
			onentryclick({ entry });
		}
		dispatch('entryclick', { entry });
	}

	// 테이블 컬럼 정의 (사용자 요구사항에 맞게 구성)
	type ColumnAlignment = 'left' | 'center' | 'right';
	const columns: Array<{
		key: string;
		label: string;
		sortable: boolean;
		filterable: boolean;
		filterOptions?: string[];
		width: string;
		align: ColumnAlignment;
	}> = [
		{
			key: 'revision',
			label: '제정차수',
			sortable: false,
			filterable: true,
			width: 'min-w-[100px]',
			align: 'center'
		},
		{
			key: 'domainGroup',
			label: '도메인그룹명',
			sortable: true,
			filterable: true,
			width: 'min-w-[150px]',
			align: 'left' as const
		},
		{
			key: 'domainCategory',
			label: '도메인분류명',
			sortable: true,
			filterable: true,
			width: 'min-w-[150px]',
			align: 'left' as const
		},
		{
			key: 'standardDomainName',
			label: '도메인명',
			sortable: true,
			filterable: true,
			width: 'min-w-[150px]',
			align: 'left'
		},
		{
			key: 'description',
			label: '도메인설명',
			sortable: false,
			filterable: false,
			width: 'min-w-[300px]',
			align: 'left'
		},
		{
			key: 'physicalDataType',
			label: '데이터타입',
			sortable: true,
			filterable: true,
			width: 'min-w-[150px]',
			align: 'left'
		},
		{
			key: 'dataLength',
			label: '데이터길이',
			sortable: false,
			filterable: false,
			width: 'min-w-[100px]',
			align: 'center'
		},
		{
			key: 'decimalPlaces',
			label: '데이터소수점길이',
			sortable: false,
			filterable: false,
			width: 'min-w-[100px]',
			align: 'center'
		},
		{
			key: 'storageFormat',
			label: '저장 형식',
			sortable: false,
			filterable: false,
			width: 'min-w-[150px]',
			align: 'left'
		},
		{
			key: 'displayFormat',
			label: '표현 형식',
			sortable: false,
			filterable: false,
			width: 'min-w-[150px]',
			align: 'left'
		},
		{
			key: 'measurementUnit',
			label: '단위',
			sortable: false,
			filterable: false,
			width: 'min-w-[150px]',
			align: 'center'
		},
		{
			key: 'allowedValues',
			label: '허용값',
			sortable: false,
			filterable: false,
			width: 'min-w-[150px]',
			align: 'left'
		}
	];

	// 파생 상태 (페이지네이션)
	let displayedPages = $derived(getPageNumbers());

	// 열린 필터 추적 (하나만 열리도록)
	let openFilterColumn = $state<string | null>(null);

	// 활성 필터가 있는지 확인
	let hasActiveFilters = $derived(Object.keys(activeFilters).length > 0);
	let displayedCount = $derived(totalCount > 0 ? totalCount : entries.length);

	/**
	 * 컬럼별 고유값 목록 추출
	 */
	function getUniqueValues(columnKey: string): string[] {
		const values = new Set<string>();
		entries.forEach((entry) => {
			const value = entry[columnKey as keyof DomainEntry];
			if (value !== null && value !== undefined && value !== '') {
				values.add(String(value));
			}
		});
		return Array.from(values).sort();
	}

	/**
	 * 컬럼 정렬 처리 (3단계 순환: null → asc → desc → null)
	 */
	function handleSort(column: string) {
		if (!loading) {
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
	}

	/**
	 * 컬럼의 현재 정렬 방향 가져오기
	 */
	function getSortDirection(column: string): 'asc' | 'desc' | null {
		return sortConfig[column] ?? null;
	}

	/**
	 * 필터 적용 처리
	 */
	function handleFilter(column: string, value: string | null) {
		if (onfilter) {
			onfilter({ column, value });
		}
		dispatch('filter', { column, value });
	}

	/**
	 * 페이지 변경 처리
	 */
	function handlePageChange(page: number) {
		if (!loading && page !== currentPage && page >= 1 && page <= totalPages) {
			onpagechange({ page });
		}
	}

	/**
	 * 페이지네이션 번호 생성
	 */
	function getPageNumbers(): (number | string)[] {
		const pages: (number | string)[] = [];
		const maxVisible = 7;

		if (totalPages <= maxVisible) {
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			pages.push(1);

			if (currentPage <= 4) {
				for (let i = 2; i <= 5; i++) {
					pages.push(i);
				}
				pages.push('...');
				pages.push(totalPages);
			} else if (currentPage >= totalPages - 3) {
				pages.push('...');
				for (let i = totalPages - 4; i <= totalPages; i++) {
					pages.push(i);
				}
			} else {
				pages.push('...');
				for (let i = currentPage - 1; i <= currentPage + 1; i++) {
					pages.push(i);
				}
				pages.push('...');
				pages.push(totalPages);
			}
		}

		return pages;
	}

	/**
	 * 데이터 값 포맷팅
	 */
	function formatValue(value: unknown): string {
		if (value === null || value === undefined) {
			return '-';
		}
		return String(value);
	}
</script>

<!-- 도메인 테이블 컴포넌트 -->
<div class="max-w-full rounded-lg border border-border bg-surface shadow-md">
	<!-- 테이블 헤더 -->
	<div class="border-b border-border px-6 py-4">
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-medium text-content">
				도메인 목록
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

	<!-- 테이블 컨테이너 (가로 스크롤 지원) -->
	<div class="overflow-x-auto px-1 pb-6">
		<table class="min-w-full divide-y divide-border" aria-label="도메인 목록" aria-busy={loading}>
			<caption class="sr-only">
				{loading
					? '도메인 목록을 불러오는 중입니다.'
					: `도메인 ${displayedCount.toLocaleString()}개 항목`}
			</caption>
			<!-- 테이블 헤더 -->
			<thead class="overflow-visible bg-surface-muted">
				<tr>
					{#each columns as column (column.key)}
						<th
							scope="col"
							class="relative whitespace-nowrap px-6 py-3 text-xs font-medium uppercase tracking-wider text-content-secondary {column.width} {column.align ===
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
										options={filterOptions[column.key] ||
											column.filterOptions ||
											getUniqueValues(column.key)}
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

			<!-- 테이블 바디 -->
			<tbody class="divide-y divide-border bg-surface">
				{#if loading}
					<!-- 로딩 상태 -->
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
					<!-- 데이터 없음 -->
					<tr>
						<td colspan={columns.length} class="px-6 py-12 text-center">
							<EmptyState
								icon={searchQuery ? 'search' : 'file'}
								title={searchQuery ? '검색 결과가 없습니다' : '표시할 데이터가 없습니다'}
								description={searchQuery
									? '다른 검색어를 시도해보세요.'
									: '먼저 파일을 업로드하여 도메인을 등록해주세요.'}
							/>
						</td>
					</tr>
				{:else}
					<!-- 데이터 행 -->
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
								{@const formattedValue = formatValue(entry[column.key as keyof DomainEntry])}
								{@const highlightedSegments = getHighlightedSegments(
									formattedValue,
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
									{#if column.key === 'dataLength' || column.key === 'decimalPlaces'}
										<span class="block">
											<HighlightedText segments={highlightedSegments} />
										</span>
									{:else}
										<div class="max-w-xs break-words" title={formattedValue}>
											<HighlightedText segments={highlightedSegments} />
										</div>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<!-- 테이블 푸터 (페이지네이션) -->
	{#if totalPages > 1}
		<div
			class="flex flex-col items-center justify-between space-y-4 border-t border-border px-6 py-4 md:flex-row md:space-y-0"
		>
			<!-- 페이지 정보 -->
			<div class="text-sm text-content-muted">
				총 <span class="font-medium">{totalPages}</span> 페이지 중
				<span class="font-medium">{currentPage}</span> 페이지
			</div>

			<!-- 페이지네이션 컨트롤 -->
			<nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
				<!-- 이전 페이지 버튼 -->
				<button
					onclick={() => handlePageChange(currentPage - 1)}
					disabled={currentPage === 1 || loading}
					class="relative inline-flex items-center rounded-l-md px-2 py-2 text-content-muted ring-1 ring-inset ring-border transition-colors hover:bg-surface-muted focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<span class="sr-only">이전</span>
					<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path
							fill-rule="evenodd"
							d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>

				<!-- 페이지 번호 -->
				{#each displayedPages as page, i (typeof page === 'number' ? page : `ellipsis-${i}`)}
					{#if typeof page === 'number'}
						<button
							onclick={() => handlePageChange(page)}
							disabled={loading}
							class="relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-border transition-colors focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50 {currentPage ===
							page
								? 'z-10 bg-brand text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
								: 'text-content hover:bg-surface-muted'}"
						>
							{page}
						</button>
					{:else}
						<span
							class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-content-secondary ring-1 ring-inset ring-border"
						>
							...
						</span>
					{/if}
				{/each}

				<!-- 다음 페이지 버튼 -->
				<button
					onclick={() => handlePageChange(currentPage + 1)}
					disabled={currentPage === totalPages || loading}
					class="relative inline-flex items-center rounded-r-md px-2 py-2 text-content-muted ring-1 ring-inset ring-border transition-colors hover:bg-surface-muted focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<span class="sr-only">다음</span>
					<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path
							fill-rule="evenodd"
							d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			</nav>
		</div>
	{/if}
</div>
