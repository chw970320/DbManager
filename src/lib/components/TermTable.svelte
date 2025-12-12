<script lang="ts">
	import type { TermEntry } from '$lib/types/term.js';
	import { createEventDispatcher } from 'svelte';

	type SortEvent = {
		column: string;
		direction: 'asc' | 'desc';
	};

	type PageChangeEvent = {
		page: number;
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
		sortColumn = '',
		sortDirection = 'asc' as 'asc' | 'desc',
		searchField = 'all',
		_selectedFilename = 'term.json',
		onsort,
		onpagechange,
		onentryclick
	}: {
		entries?: TermEntry[];
		loading?: boolean;
		searchQuery?: string;
		totalCount?: number;
		currentPage?: number;
		totalPages?: number;
		pageSize?: number;
		sortColumn?: string;
		sortDirection?: 'asc' | 'desc';
		searchField?: string;
		_selectedFilename?: string;
		onsort: (detail: SortEvent) => void;
		onpagechange: (detail: PageChangeEvent) => void;
		onentryclick?: (detail: EntryClickEvent) => void;
	} = $props();

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		entryclick: EntryClickEvent;
	}>();

	// 행 클릭 핸들러
	function handleRowClick(entry: TermEntry, event: MouseEvent) {
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

	// 테이블 컬럼 정의
	type ColumnAlignment = 'left' | 'center' | 'right';
	const columns: Array<{
		key: string;
		label: string;
		sortable: boolean;
		width: string;
		align: ColumnAlignment;
	}> = [
		{
			key: 'termName',
			label: '용어명',
			sortable: true,
			width: 'min-w-[200px]',
			align: 'left'
		},
		{
			key: 'columnName',
			label: '칼럼명',
			sortable: true,
			width: 'min-w-[200px]',
			align: 'left'
		},
		{
			key: 'domainName',
			label: '도메인',
			sortable: true,
			width: 'min-w-[200px]',
			align: 'left'
		}
	];

	// 파생 상태 (페이지네이션)
	let displayedPages = $derived(getPageNumbers());

	/**
	 * 컬럼 정렬 처리
	 */
	function handleSort(column: string) {
		if (!loading) {
			const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
			onsort({ column, direction: newDirection });
		}
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
	 * 검색어 하이라이팅
	 */
	function highlightSearchTerm(text: string, query: string, columnKey: string): string {
		if (!query || !text || (searchField !== 'all' && searchField !== columnKey)) {
			return text;
		}

		const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
		return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
	}

	/**
	 * 정규식 특수문자 이스케이프
	 */
	function escapeRegExp(string: string): string {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

	/**
	 * HTML 태그 및 스크립트 태그 제거 (mark 태그만 허용)
	 */
	function sanitizeHtml(html: string): string {
		// mark 태그만 허용, 나머지 태그는 모두 제거
		return html.replace(/<(?!\/?mark(?=>|\s.*>))\/?[^>]+>/gi, '');
	}

	/**
	 * 매핑 실패 여부 확인
	 */
	function isMappingFailed(entry: TermEntry): boolean {
		return !entry.isMappedTerm || !entry.isMappedColumn || !entry.isMappedDomain;
	}

	/**
	 * 특정 필드의 매핑 실패 여부 확인
	 */
	function getMappingFailedClass(entry: TermEntry, columnKey: string): string {
		if (columnKey === 'termName' && !entry.isMappedTerm) {
			return 'bg-red-100';
		}
		if (columnKey === 'columnName' && !entry.isMappedColumn) {
			return 'bg-red-100';
		}
		if (columnKey === 'domainName' && !entry.isMappedDomain) {
			return 'bg-red-100';
		}
		return '';
	}
</script>

<!-- 용어 테이블 컴포넌트 -->
<div class="overflow-x-auto rounded-lg border border-gray-300 shadow-md">
	<!-- 테이블 헤더 -->
	<div class="border-b border-gray-200 px-6 py-4">
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-medium text-gray-900">
				용어 목록
				<span class="ml-2 text-sm font-normal text-gray-500">
					총 {totalCount.toLocaleString()}개 항목
				</span>
			</h3>

			{#if searchQuery}
				<div class="text-sm text-gray-500">
					<span class="font-medium">"{searchQuery}"</span> 검색 결과
				</div>
			{/if}
		</div>
	</div>

	<!-- 테이블 컨테이너 (가로 스크롤 지원) -->
	<div>
		<table class="min-w-full divide-y divide-gray-200">
			<!-- 테이블 헤더 -->
			<thead class="bg-gray-100">
				<tr>
					{#each columns as column (column.key)}
						<th
							scope="col"
							class=" whitespace-nowrap px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-700 {column.width} {column.align ===
							'center'
								? 'text-center'
								: column.align === 'right'
									? 'text-right'
									: 'text-left'} {column.sortable ? 'cursor-pointer hover:bg-gray-200' : ''}"
							class:bg-gray-200={sortColumn === column.key}
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
									<svg
										class="h-4 w-4 text-gray-400 {sortColumn === column.key ? 'text-gray-600' : ''}"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										{#if sortColumn === column.key}
											{#if sortDirection === 'asc'}
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M5 15l7-7 7 7"
												/>
											{:else}
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M19 9l-7 7-7-7"
												/>
											{/if}
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
							</div>
						</th>
					{/each}
				</tr>
			</thead>

			<!-- 테이블 바디 -->
			<tbody class="divide-y divide-gray-200 bg-white">
				{#if loading}
					<!-- 로딩 상태 -->
					{#each Array(pageSize) as _, i (i)}
						<tr class="animate-pulse">
							{#each columns as column (column.key)}
								<td class="whitespace-nowrap px-6 py-4">
									<div
										class="h-4 rounded bg-gray-200 {column.width === 'w-20' ? 'w-12' : 'w-3/4'}"
									></div>
								</td>
							{/each}
						</tr>
					{/each}
				{:else if entries.length === 0}
					<!-- 데이터 없음 -->
					<tr>
						<td colspan={columns.length} class="px-6 py-12 text-center">
							<div class="flex flex-col items-center space-y-3">
								<svg
									class="h-12 w-12 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
									/>
								</svg>
								<div class="text-gray-500">
									{#if searchQuery}
										<p class="text-lg font-medium">검색 결과가 없습니다</p>
										<p class="text-sm">다른 검색어를 시도해보세요</p>
									{:else}
										<p class="text-lg font-medium">표시할 데이터가 없습니다</p>
										<p class="text-sm">먼저 파일을 업로드하여 용어를 등록해주세요.</p>
									{/if}
								</div>
							</div>
						</td>
					</tr>
				{:else}
					<!-- 데이터 행 -->
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
								<td
									class="whitespace-normal break-words px-6 py-4 text-sm text-gray-700 {column.align ===
									'center'
										? 'text-center'
										: column.align === 'right'
											? 'text-right'
											: 'text-left'} {getMappingFailedClass(entry, column.key)}"
								>
									<div
										class="max-w-xs break-words"
										title={formatValue(entry[column.key as keyof TermEntry])}
									>
										{@html sanitizeHtml(
											highlightSearchTerm(
												formatValue(entry[column.key as keyof TermEntry]),
												searchQuery,
												column.key
											)
										)}
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
	{#if totalPages > 1}
		<div
			class="flex flex-col items-center justify-between space-y-4 border-t border-gray-200 px-6 py-4 md:flex-row md:space-y-0"
		>
			<!-- 페이지 정보 -->
			<div class="text-sm text-gray-600">
				총 <span class="font-medium">{totalPages}</span> 페이지 중
				<span class="font-medium">{currentPage}</span> 페이지
			</div>

			<!-- 페이지네이션 컨트롤 -->
			<nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
				<!-- 이전 페이지 버튼 -->
				<button
					onclick={() => handlePageChange(currentPage - 1)}
					disabled={currentPage === 1 || loading}
					class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 transition-colors hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
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
							class="relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 transition-colors focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50 {currentPage ===
							page
								? 'z-10 bg-purple-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600'
								: 'text-gray-900 hover:bg-gray-50'}"
						>
							{page}
						</button>
					{:else}
						<span
							class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
						>
							...
						</span>
					{/if}
				{/each}

				<!-- 다음 페이지 버튼 -->
				<button
					onclick={() => handlePageChange(currentPage + 1)}
					disabled={currentPage === totalPages || loading}
					class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 transition-colors hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
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

