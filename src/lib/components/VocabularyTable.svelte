<script lang="ts">
	import type { VocabularyEntry } from '$lib/types/vocabulary.js';
	import { onMount } from 'svelte';

	type SortEvent = {
		column: string;
		direction: 'asc' | 'desc';
	};

	type PageChangeEvent = {
		page: number;
	};

	// 컴포넌트 속성
	let props = $props<{
		entries?: VocabularyEntry[];
		loading?: boolean;
		searchQuery?: string;
		totalCount?: number;
		currentPage?: number;
		totalPages?: number;
		pageSize?: number;
		sortColumn?: string;
		sortDirection?: 'asc' | 'desc';
		searchField?: string;
		selectedFilename?: string;
		onsort: (detail: SortEvent) => void;
		onpagechange: (detail: PageChangeEvent) => void;
	}>();

	// Default values using derived state
	let entries = $derived(props.entries ?? []);
	let loading = $derived(props.loading ?? false);
	let searchQuery = $derived(props.searchQuery ?? '');
	let totalCount = $derived(props.totalCount ?? 0);
	let currentPage = $derived(props.currentPage ?? 1);
	let totalPages = $derived(props.totalPages ?? 1);
	let pageSize = $derived(props.pageSize ?? 20);
	let sortColumn = $derived(props.sortColumn ?? '');
	let sortDirection = $derived(props.sortDirection ?? 'asc');
	let searchField = $derived(props.searchField ?? 'all');
	let selectedFilename = $derived(props.selectedFilename ?? 'vocabulary.json');
	let onsort = $derived(props.onsort);
	let onpagechange = $derived(props.onpagechange);

	// 상태 변수
	let editingId = $state<string | null>(null);
	let editedEntry = $state<Partial<VocabularyEntry>>({});
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let duplicates = $state<Set<string>>(new Set());

	onMount(() => {
		fetchDuplicates();
	});

	async function fetchDuplicates() {
		try {
			const response = await fetch(`/api/vocabulary/duplicates?filename=${selectedFilename}`);
			const result = await response.json();
			if (result.success) {
				const duplicateIds = new Set<string>();
				for (const group of result.data.duplicates) {
					for (const entry of group) {
						duplicateIds.add(entry.id);
					}
				}
				duplicates = duplicateIds;
			}
		} catch (error) {
			console.error('중복 데이터 로드 실패:', error);
		}
	}

	function handleEdit(entry: VocabularyEntry) {
		editingId = entry.id;
		editedEntry = { ...entry };
	}

	function cancelEdit() {
		editingId = null;
		editedEntry = {};
	}

	async function handleSave(id: string) {
		if (!editedEntry) return;

		// 수정 전 데이터 백업
		const originalEntry = entries.find((entry: VocabularyEntry) => entry.id === id);

		try {
			const params = new URLSearchParams({ filename: selectedFilename });
			const response = await fetch(`/api/vocabulary?${params}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...editedEntry, id })
			});

			if (response.ok) {
				// 히스토리 로그 기록
				try {
					await fetch('/api/history', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							action: 'update',
							targetId: id,
							targetName: editedEntry.standardName || originalEntry?.standardName || '',
							filename: selectedFilename,
							details: {
								before: originalEntry
									? {
											standardName: originalEntry.standardName,
											abbreviation: originalEntry.abbreviation,
											englishName: originalEntry.englishName
										}
									: undefined,
								after: {
									standardName: editedEntry.standardName,
									abbreviation: editedEntry.abbreviation,
									englishName: editedEntry.englishName
								}
							}
						})
					});

					// 히스토리 UI 새로고침
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					if (typeof window !== 'undefined' && (window as any).refreshHistoryLog) {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						(window as any).refreshHistoryLog();
					}
				} catch (historyError: unknown) {
					console.warn('히스토리 로그 기록 실패:', historyError);
				}

				cancelEdit();
				onpagechange({ page: currentPage }); // 데이터 새로고침
				fetchDuplicates(); // 중복 데이터 다시 확인
			} else {
				alert('수정에 실패했습니다.');
			}
		} catch (error) {
			console.error('수정 오류:', error);
		}
	}

	async function handleDelete(id: string) {
		const entryToDelete = entries.find((entry: VocabularyEntry) => entry.id === id);

		if (confirm('정말로 이 항목을 삭제하시겠습니까?')) {
			try {
				const params = new URLSearchParams({ id, filename: selectedFilename });
				const response = await fetch(`/api/vocabulary?${params}`, { method: 'DELETE' });
				if (response.ok) {
					// 히스토리 로그 기록
					if (entryToDelete) {
						try {
							await fetch('/api/history', {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json'
								},
								body: JSON.stringify({
									action: 'delete',
									targetId: id,
									targetName: entryToDelete.standardName,
									details: {
										before: {
											standardName: entryToDelete.standardName,
											abbreviation: entryToDelete.abbreviation,
											englishName: entryToDelete.englishName
										}
									}
								})
							});

							// 히스토리 UI 새로고침
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							if (typeof window !== 'undefined' && (window as any).refreshHistoryLog) {
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								(window as any).refreshHistoryLog();
							}
						} catch (historyError: unknown) {
							console.warn('히스토리 로그 기록 실패:', historyError);
						}
					}

					onpagechange({ page: currentPage });
					fetchDuplicates();
				} else {
					alert('삭제에 실패했습니다.');
				}
			} catch (error) {
				console.error('삭제 오류:', error);
			}
		}
	}

	// 테이블 컬럼 정의
	const columns = [
		{
			key: 'standardName',
			label: '표준단어명',
			sortable: true,
			width: 'min-w-[150px] max-w-[200px]'
		},
		{
			key: 'abbreviation',
			label: '영문약어',
			sortable: true,
			width: 'min-w-[150px] max-w-[200px]'
		},
		{ key: 'englishName', label: '영문명', sortable: true, width: 'min-w-[150px] max-w-[250px]' },
		{ key: 'description', label: '설명', sortable: false, width: 'min-w-[200px]' },
		{ key: 'actions', label: '관리', sortable: false, width: 'w-auto' }
	];

	// 파생 상태 (페이지네이션)
	let displayedPages = $derived(getPageNumbers());

	/**
	 * 특정 필드의 중복 상태에 따른 배경색 클래스를 결정
	 */
	function getFieldDuplicateBackgroundClass(
		duplicateInfo:
			| { standardName: boolean; abbreviation: boolean; englishName: boolean }
			| undefined,
		fieldKey: string
	): string {
		if (!duplicateInfo) return '';

		// 필드별 중복 상태에 따라 배경색 결정
		switch (fieldKey) {
			case 'standardName':
				return duplicateInfo.standardName ? 'bg-red-100' : '';
			case 'abbreviation':
				return duplicateInfo.abbreviation ? 'bg-orange-100' : '';
			case 'englishName':
				return duplicateInfo.englishName ? 'bg-yellow-100' : '';
			default:
				return '';
		}
	}

	/**
	 * 컬럼 정렬 처리
	 */
	function handleSort(column: string) {
		if (!loading && !editingId) {
			const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
			onsort({ column, direction: newDirection });
		}
	}

	/**
	 * 페이지 변경 처리
	 */
	function handlePageChange(page: number) {
		if (!loading && !editingId && page !== currentPage && page >= 1 && page <= totalPages) {
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
	 * HTML 태그 및 스크립트 태그 제거 (mark 태그만 허용)
	 */
	function sanitizeHtml(html: string): string {
		// mark 태그만 허용, 나머지 태그는 모두 제거
		return html.replace(/<(?!\/?mark(?=>|\s.*>))\/?[^>]+>/gi, '');
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
	function focus(el: HTMLElement, shouldFocus: boolean) {
		if (shouldFocus) el.focus();
	}
</script>

<!-- 단어집 테이블 컴포넌트 -->
<div class="max-w-full rounded-lg border border-gray-300 shadow-md">
	<!-- 테이블 헤더 -->
	<div class="border-b border-gray-200 px-6 py-4">
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-medium text-gray-900">
				단어집 목록
				{#if totalCount > 0}
					<span class="ml-2 text-sm font-normal text-gray-500">
						총 {totalCount.toLocaleString()}개 항목
					</span>
				{/if}
			</h3>

			{#if searchQuery}
				<div class="text-sm text-gray-500">
					<span class="font-medium">"{searchQuery}"</span> 검색 결과
				</div>
			{/if}
		</div>
	</div>

	<!-- 테이블 컨테이너 -->
	<div class="overflow-hidden">
		<table class="w-full table-auto divide-y divide-gray-200">
			<!-- 테이블 헤더 -->
			<thead class="bg-gray-100">
				<tr>
					{#each columns as column (column.key)}
						{@const isActions = column.key === 'actions'}
						<th
							scope="col"
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 {column.width} {isActions
								? 'whitespace-nowrap'
								: 'whitespace-normal'} {column.sortable ? 'cursor-pointer hover:bg-gray-200' : ''}"
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
							<div class="flex items-center space-x-1">
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
							<td class="whitespace-nowrap px-6 py-4">
								<div class="h-4 w-3/4 rounded bg-gray-200"></div>
							</td>
							<td class="whitespace-nowrap px-6 py-4">
								<div class="h-4 w-1/2 rounded bg-gray-200"></div>
							</td>
							<td class="whitespace-nowrap px-6 py-4">
								<div class="h-4 w-2/3 rounded bg-gray-200"></div>
							</td>
							<td class="whitespace-nowrap px-6 py-4">
								<div class="h-4 w-1/3 rounded bg-gray-200"></div>
							</td>
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
										<p class="text-sm">먼저 파일을 업로드하여 단어집을 등록해주세요.</p>
									{/if}
								</div>
							</div>
						</td>
					</tr>
				{:else}
					<!-- 데이터 행 -->
					{#each entries as entry (entry.id)}
						{@const isEditing = editingId === entry.id}
						<tr class:bg-blue-50={isEditing} class="border-t border-gray-300">
							{#each columns as column (column.key)}
								{@const fieldBackgroundClass = getFieldDuplicateBackgroundClass(
									entry.duplicateInfo,
									column.key
								)}
								{@const isActions = column.key === 'actions'}
								<td
									class="px-6 py-4 text-sm text-gray-700 {isActions
										? 'whitespace-nowrap'
										: 'whitespace-normal break-words'} {fieldBackgroundClass && !isEditing
										? fieldBackgroundClass
										: ''}"
								>
									{#if column.key === 'actions'}
										<div class="flex items-center space-x-2">
											{#if isEditing}
												<button
													type="button"
													onclick={(e: MouseEvent) => {
														e.stopPropagation();
														handleSave(entry.id);
													}}
													class="text-blue-600 hover:text-blue-900">저장</button
												>
												<button
													type="button"
													onclick={(e: MouseEvent) => {
														e.stopPropagation();
														cancelEdit();
													}}
													class="text-gray-600 hover:text-gray-900">취소</button
												>
											{:else}
												<button
													type="button"
													onclick={(e: MouseEvent) => {
														e.stopPropagation();
														handleEdit(entry);
													}}
													class="whitespace-nowrap text-indigo-600 hover:text-indigo-900"
													>편집</button
												>
												<button
													type="button"
													onclick={(e: MouseEvent) => {
														e.stopPropagation();
														handleDelete(entry.id);
													}}
													class="whitespace-nowrap text-red-600 hover:text-red-900">삭제</button
												>
											{/if}
										</div>
									{:else if isEditing}
										<input
											type="text"
											bind:value={editedEntry[column.key as keyof VocabularyEntry]}
											use:focus={column.key === 'standardName'}
											onkeydown={(e: KeyboardEvent) => {
												if (e.key === 'Enter') {
													e.preventDefault();
													handleSave(entry.id);
												}
											}}
											class="w-full rounded-md border-gray-300 px-2 py-1 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
										/>
									{:else}
										<p class="break-words px-2 py-1">
											{@html sanitizeHtml(
												highlightSearchTerm(
													(entry[column.key as keyof VocabularyEntry] as string) || '',
													searchQuery,
													column.key
												)
											)}
										</p>
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
								? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
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
