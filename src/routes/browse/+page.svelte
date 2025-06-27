<script lang="ts">
	import { onMount } from 'svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import TerminologyTable from '$lib/components/TerminologyTable.svelte';
	import TermGenerator from '$lib/components/TermGenerator.svelte';
	import type { TerminologyEntry, ApiResponse } from '$lib/types/terminology.js';

	// 상태 변수
	let entries = $state<TerminologyEntry[]>([]);
	let loading = $state(false);
	let searchQuery = $state('');
	let searchField = $state('all');
	let searchExact = $state(false);
	let totalCount = $state(0);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let pageSize = $state(20);
	let sortColumn = $state('standardName');
	let sortDirection = $state<'asc' | 'desc'>('asc');
	let lastUpdated = $state('');
	let errorMessage = $state('');

	// 통계 정보
	let statistics = $state({
		totalEntries: 0,
		lastUpdate: '',
		mostSearched: [] as { term: string; count: number }[]
	});

	// 이벤트 상세 타입 정의
	type SearchDetail = { query: string; field: string; exact: boolean };
	type SortDetail = { column: string; direction: 'asc' | 'desc' };
	type PageChangeDetail = { page: number };

	/**
	 * 컴포넌트 마운트 시 초기 데이터 로드
	 */
	onMount(async () => {
		await loadTerminologyData();
	});

	/**
	 * 용어집 데이터 로드
	 */
	async function loadTerminologyData() {
		loading = true;
		errorMessage = '';

		try {
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: pageSize.toString(),
				sortBy: sortColumn,
				sortOrder: sortDirection
			});

			const response = await fetch(`/api/terminology?${params}`);
			const result: ApiResponse = await response.json();

			if (result.success && result.data) {
				entries = result.data.entries || [];
				totalCount = result.data.pagination?.totalCount || 0;
				totalPages = result.data.pagination?.totalPages || 1;
				lastUpdated = result.data.lastUpdated || '';
			} else {
				errorMessage = result.error || '데이터 로드 실패';
			}
		} catch (error) {
			console.error('데이터 로드 오류:', error);
			errorMessage = '서버 연결 오류가 발생했습니다.';
		} finally {
			loading = false;
		}
	}

	/**
	 * 검색 실행
	 */
	async function handleSearch(detail: SearchDetail) {
		const { query, field, exact } = detail;
		searchQuery = query;
		searchField = field;
		searchExact = exact;
		currentPage = 1; // 검색 시 첫 페이지로 이동

		loading = true;
		errorMessage = '';

		try {
			const params = new URLSearchParams({
				q: query,
				field: field,
				exact: exact.toString(),
				page: '1',
				limit: pageSize.toString()
			});

			const response = await fetch(`/api/search?${params}`);
			const result: ApiResponse = await response.json();

			if (result.success && result.data) {
				entries = result.data.entries || [];
				totalCount = result.data.totalResults || 0;
				totalPages = result.data.pagination?.totalPages || 1;
				currentPage = 1;
			} else {
				errorMessage = result.error || '검색 실패';
			}
		} catch (error) {
			console.error('검색 오류:', error);
			errorMessage = '검색 중 오류가 발생했습니다.';
		} finally {
			loading = false;
		}
	}

	/**
	 * 검색 초기화
	 */
	async function handleSearchClear() {
		searchQuery = '';
		searchField = 'all';
		searchExact = false;
		currentPage = 1;
		await loadTerminologyData();
	}

	/**
	 * 정렬 처리
	 */
	async function handleSort(detail: SortDetail) {
		const { column, direction } = detail;
		sortColumn = column;
		sortDirection = direction;

		if (searchQuery) {
			// 검색 중인 경우 검색 재실행
			await handleSearch({ query: searchQuery, field: searchField, exact: searchExact });
		} else {
			// 일반 조회 시 데이터 재로드
			await loadTerminologyData();
		}
	}

	/**
	 * 페이지 변경 처리
	 */
	async function handlePageChange(detail: PageChangeDetail) {
		const { page } = detail;
		currentPage = page;

		if (searchQuery) {
			// 검색 중인 경우 검색 재실행
			await handleSearch({ query: searchQuery, field: searchField, exact: searchExact });
		} else {
			// 일반 조회 시 데이터 재로드
			await loadTerminologyData();
		}
	}

	/**
	 * 데이터 새로고침
	 */
	async function refreshData() {
		await loadTerminologyData();
	}

	/**
	 * 날짜 포맷팅
	 */
	function formatDate(dateString: string): string {
		try {
			const date = new Date(dateString);
			return date.toLocaleString('ko-KR', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return dateString;
		}
	}
</script>

<svelte:head>
	<title>용어집 조회 - 모던한 용어 관리 시스템</title>
	<meta name="description" content="AI 기반 검색으로 등록된 용어집을 빠르게 찾아보세요." />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<!-- 페이지 헤더 -->
		<div class="mb-10">
			<div
				class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
			>
				<div>
					<h1
						class="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-4xl font-bold text-transparent"
					>
						용어집 조회
					</h1>
					<p class="mt-2 text-lg text-gray-600">AI 기반 검색으로 원하는 용어를 빠르게 찾아보세요</p>
				</div>

				<!-- 새로고침 버튼 -->
				<button
					type="button"
					onclick={refreshData}
					disabled={loading}
					class="group inline-flex items-center space-x-2 rounded-xl border border-gray-200/50 bg-white/80 px-6 py-3 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<svg
						class="h-5 w-5 transition-transform duration-200 {loading
							? 'animate-spin'
							: 'group-hover:rotate-180'}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
					<span>{loading ? '로딩 중' : '새로고침'}</span>
				</button>
			</div>
		</div>

		<!-- 통계 카드 섹션 -->
		<div class="my-8">
			<TermGenerator />
		</div>

		<!-- 에러 메시지 -->
		{#if errorMessage}
			<div class="mb-8 rounded-2xl border border-red-200 bg-red-50 p-4">
				<div class="flex items-center">
					<svg
						class="mr-3 h-5 w-5 text-red-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<p class="text-sm font-medium text-red-800">{errorMessage}</p>
				</div>
			</div>
		{/if}

		<!-- 검색 영역 -->
		<div
			class="mb-8 rounded-2xl border border-gray-200/50 bg-white/80 p-8 shadow-sm backdrop-blur-sm"
		>
			<div class="mb-6">
				<h2 class="text-2xl font-bold text-gray-900">통합검색</h2>
				<p class="mt-2 text-gray-600">표준단어명, 영문약어, 영문명으로 용어를 검색하세요</p>
			</div>

			<div class="mb-8">
				<SearchBar
					bind:query={searchQuery}
					bind:field={searchField}
					bind:exact={searchExact}
					onsearch={handleSearch}
					onclear={handleSearchClear}
				/>
			</div>
		</div>

		<!-- 결과 테이블 영역 -->
		<div class="rounded-2xl border border-gray-200/50 bg-white/80 p-8 shadow-sm backdrop-blur-sm">
			<div class="mb-6 flex items-center justify-between">
				<div>
					<h2 class="text-2xl font-bold text-gray-900">검색 결과</h2>
					<p class="mt-1 text-gray-600">
						{#if searchQuery}
							"{searchQuery}"에 대한 검색 결과 {totalCount.toLocaleString()}건
						{:else}
							전체 용어 {totalCount.toLocaleString()}건
						{/if}
					</p>
				</div>

				{#if entries.length > 0}
					<div class="flex items-center space-x-2 text-sm text-gray-500">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span>페이지 {currentPage} / {totalPages}</span>
					</div>
				{/if}
			</div>

			<div class="overflow-hidden rounded-xl border border-gray-200">
				<TerminologyTable
					{entries}
					{loading}
					{searchQuery}
					{totalCount}
					{currentPage}
					{totalPages}
					{pageSize}
					{sortColumn}
					{sortDirection}
					{searchField}
					onsort={handleSort}
					onpagechange={handlePageChange}
					onrefresh={refreshData}
				/>
			</div>
		</div>
	</div>
</div>
