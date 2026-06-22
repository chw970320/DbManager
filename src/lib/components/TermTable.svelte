<script lang="ts">
	import type { TermEntry } from '$lib/types/term.js';
	import { getHighlightedSegments, type HighlightSegment } from '$lib/utils/text-highlight';
	import { createEventDispatcher } from 'svelte';
	import ColumnFilter from './ColumnFilter.svelte';
	import EmptyState from './EmptyState.svelte';
	import HighlightedText from './HighlightedText.svelte';
	import Skeleton from './Skeleton.svelte';
	import TablePagination from './TablePagination.svelte';

	type SortEvent = {
		column: string;
		direction: 'asc' | 'desc' | null;
	};

	type PageChangeEvent = {
		page: number;
	};

	type FilterEvent = {
		column: string;
		value: string | null;
	};

	type EntryClickEvent = {
		entry: TermEntry;
	};

	// 컴포넌트 속성
	let {
		entries = [] as TermEntry[],
		loading = false,
		searchQuery = '',
		totalCount = 0,
		currentPage = 1,
		totalPages = 1,
		pageSize = 20,
		sortConfig = {} as Record<string, 'asc' | 'desc' | null>,
		searchField = 'all',
		_selectedFilename = 'term.json',
		activeFilters = {} as Record<string, string | null>,
		filterOptions = {} as Record<string, string[]>,
		onsort,
		onpagechange,
		onfilter,
		onentryclick,
		onClearAllFilters
	}: {
		entries?: TermEntry[];
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
		filter: FilterEvent;
		entryclick: EntryClickEvent;
	}>();

	function handleRowClick(entry: TermEntry) {
		onentryclick?.({ entry });
		dispatch('entryclick', { entry });
	}

	// 테이블 컬럼 정의
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
			key: 'termName',
			label: '용어명',
			sortable: true,
			filterable: true,
			width: 'min-w-[200px]',
			align: 'left'
		},
		{
			key: 'columnName',
			label: '컬럼명',
			sortable: true,
			filterable: true,
			width: 'min-w-[200px]',
			align: 'left'
		},
		{
			key: 'domainName',
			label: '도메인',
			sortable: true,
			filterable: true,
			width: 'min-w-[200px]',
			align: 'left'
		}
	];

	// 파생 상태 (페이지네이션)

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
			const value = entry[columnKey as keyof TermEntry];
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
	function getUnmappedSegments(
		text: string,
		entry: TermEntry,
		columnKey: string
	): HighlightSegment[] {
		if (!text) return [{ text: '-', matched: false }];

		const getPartSegments = (parts: string[], unmappedParts: string[]): HighlightSegment[] => {
			const unmappedSet = new Set(unmappedParts.map((part) => part.toLowerCase()));
			return parts.flatMap((part, index) => {
				const segments: HighlightSegment[] = [];
				if (index > 0) {
					segments.push({ text: '_', matched: false });
				}
				segments.push({
					text: part,
					matched: unmappedSet.has(part.toLowerCase()),
					tone: unmappedSet.has(part.toLowerCase()) ? 'error' : undefined
				});
				return segments;
			});
		};

		if (columnKey === 'termName' && entry.unmappedTermParts?.length) {
			return getPartSegments(text.split('_'), entry.unmappedTermParts);
		}

		if (columnKey === 'columnName' && entry.unmappedColumnParts?.length) {
			return getPartSegments(text.split('_'), entry.unmappedColumnParts);
		}

		if (columnKey === 'domainName' && !entry.isMappedDomain) {
			return [{ text, matched: true, tone: 'error' }];
		}

		return [{ text, matched: false }];
	}

	function getCellHighlightSegments(
		text: string,
		entry: TermEntry,
		columnKey: string,
		query: string
	): HighlightSegment[] {
		const unmappedSegments = getUnmappedSegments(text, entry, columnKey);
		if (!query || (searchField !== 'all' && searchField !== columnKey)) {
			return unmappedSegments;
		}

		return unmappedSegments.flatMap((segment) =>
			segment.tone === 'error' ? [segment] : getHighlightedSegments(segment.text, query, true)
		);
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

<!-- 용어 테이블 컴포넌트 -->
<div class="rounded-lg border border-border bg-surface shadow-md">
	<!-- 테이블 헤더 -->
	<div class="border-b border-border px-6 py-4">
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-medium text-content">
				용어 목록
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
		<table class="min-w-full divide-y divide-border" aria-label="용어 목록" aria-busy={loading}>
			<caption class="sr-only">
				{loading
					? '용어 목록을 불러오는 중입니다.'
					: `용어 ${displayedCount.toLocaleString()}개 항목`}
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
									: '먼저 파일을 업로드하여 용어를 등록해주세요.'}
							/>
						</td>
					</tr>
				{:else}
					<!-- 데이터 행 -->
					{#each entries as entry (entry.id)}
						<tr
							class="cursor-pointer border-t border-border transition-colors hover:bg-surface-muted/70"
							onclick={() => handleRowClick(entry)}
							role="button"
							tabindex="0"
							onkeydown={(event: KeyboardEvent) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									handleRowClick(entry);
								}
							}}
							aria-label="항목 클릭하여 상세 정보 보기"
						>
							{#each columns as column (column.key)}
								{@const formattedValue = formatValue(entry[column.key as keyof TermEntry])}
								{@const highlightedSegments = getCellHighlightSegments(
									formattedValue,
									entry,
									column.key,
									searchQuery
								)}
								<td
									class="whitespace-normal break-words px-6 py-4 text-sm text-content-secondary {column.align ===
									'center'
										? 'text-center'
										: column.align === 'right'
											? 'text-right'
											: 'text-left'}"
								>
									<div class="max-w-xs break-words" title={formattedValue}>
										<HighlightedText segments={highlightedSegments} />
									</div>
								</td>
							{/each}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<!-- 테이블 푸터 (페이지네이션) -->
	<TablePagination {currentPage} {totalPages} {loading} {onpagechange} />
</div>
