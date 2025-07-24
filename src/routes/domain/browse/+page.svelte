<script lang="ts">
	import { onMount } from 'svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import DomainTable from '$lib/components/DomainTable.svelte';
	import type { DomainEntry, DomainApiResponse } from '$lib/types/domain.js';

	// 상태 변수
	let entries = $state<DomainEntry[]>([]);
	let loading = $state(false);
	let searchQuery = $state('');
	let searchField = $state('all');
	let searchExact = $state(false);
	let totalCount = $state(0);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let pageSize = $state(20);
	let sortColumn = $state('standardDomainName');
	let sortDirection = $state<'asc' | 'desc'>('asc');
	let lastUpdated = $state('');
	let errorMessage = $state('');

	// 통계 정보
	let statistics = $state({
		totalEntries: 0,
		lastUpdate: '',
		uniqueGroups: 0,
		uniqueDataTypes: 0
	});

	// 이벤트 상세 타입 정의
	type SearchDetail = { query: string; field: string; exact: boolean };
	type SortDetail = { column: string; direction: 'asc' | 'desc' };
	type PageChangeDetail = { page: number };

	/**
	 * 컴포넌트 마운트 시 초기 데이터 로드
	 */
	onMount(async () => {
		await loadDomainData();
		await loadStatistics();
	});

	/**
	 * 도메인 데이터 로드
	 */
	async function loadDomainData() {
		loading = true;
		errorMessage = '';

		try {
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: pageSize.toString(),
				sortBy: sortColumn,
				sortOrder: sortDirection
			});

			const response = await fetch(`/api/domain?${params}`);
			const result: DomainApiResponse = await response.json();

			if (result.success && result.data) {
				entries = result.data.entries || [];
				totalCount = result.data.pagination?.totalItems || 0;
				totalPages = result.data.pagination?.totalPages || 1;
				lastUpdated = result.data.lastUpdated || '';
			} else {
				errorMessage = result.error || '데이터 로드 실패';
			}
		} catch (error) {
			console.error('도메인 데이터 로드 오류:', error);
			errorMessage = '서버 연결 오류가 발생했습니다.';
		} finally {
			loading = false;
		}
	}

	/**
	 * 통계 정보 로드
	 */
	async function loadStatistics() {
		try {
			const response = await fetch('/api/domain', { method: 'OPTIONS' });
			const result: DomainApiResponse = await response.json();

			if (result.success && result.data) {
				statistics = {
					totalEntries: result.data.totalEntries || 0,
					lastUpdate: result.data.lastUpdated || '',
					uniqueGroups: result.data.summary?.uniqueGroups || 0,
					uniqueDataTypes: result.data.summary?.uniqueDataTypes || 0
				};
			}
		} catch (error) {
			console.warn('통계 정보 로드 실패:', error);
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
		currentPage = 1; // 새로운 검색 시 첫 페이지로 이동

		await executeSearch();
	}

	/**
	 * 검색 API 호출
	 */
	async function executeSearch() {
		loading = true;
		errorMessage = '';

		try {
			const params = new URLSearchParams({
				q: searchQuery,
				field: searchField,
				page: currentPage.toString(),
				limit: pageSize.toString(),
				sortBy: sortColumn,
				sortOrder: sortDirection
			});

			const response = await fetch(`/api/domain?${params}`);
			const result: DomainApiResponse = await response.json();

			if (result.success && result.data) {
				entries = result.data.entries || [];
				totalCount = result.data.pagination?.totalItems || 0;
				totalPages = result.data.pagination?.totalPages || 1;
				lastUpdated = result.data.lastUpdated || '';
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
	 * 정렬 처리
	 */
	async function handleSort(detail: SortDetail) {
		const { column, direction } = detail;
		sortColumn = column;
		sortDirection = direction;

		if (searchQuery) {
			await executeSearch();
		} else {
			await loadDomainData();
		}
	}

	/**
	 * 페이지 변경 처리
	 */
	async function handlePageChange(detail: PageChangeDetail) {
		const { page } = detail;
		currentPage = page;

		if (searchQuery) {
			await executeSearch();
		} else {
			await loadDomainData();
		}
	}

	/**
	 * 데이터 새로고침
	 */
	async function handleRefresh() {
		if (searchQuery) {
			await executeSearch();
		} else {
			await loadDomainData();
		}
		await loadStatistics();
	}

	/**
	 * 날짜 포맷팅
	 */
	function formatDate(dateString: string): string {
		if (!dateString) return '';
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
	<title>도메인 조회</title>
	<meta name="description" content="업로드된 도메인 정보를 검색하고 조회하세요." />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 py-8">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<!-- 페이지 헤더 -->
		<div class="mb-8 text-center">
			<h1
				class="mx-auto max-w-4xl whitespace-nowrap bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl"
			>
				도메인 조회
			</h1>
			<p class="mx-auto mt-4 max-w-2xl break-words text-base text-gray-600 sm:text-lg">
				등록된 <span class="font-semibold text-purple-600">도메인 정보</span>를 검색하고 조회하세요
			</p>
		</div>

		<!-- 통계 카드 -->
		<div class="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
			<div class="rounded-2xl border border-gray-200/50 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
				<div class="flex items-center">
					<div class="rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 p-3">
						<svg
							class="h-6 w-6 text-purple-600"
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
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">총 도메인</p>
						<p class="text-2xl font-bold text-gray-900">
							{statistics.totalEntries.toLocaleString()}
						</p>
					</div>
				</div>
			</div>

			<div class="rounded-2xl border border-gray-200/50 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
				<div class="flex items-center">
					<div class="rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 p-3">
						<svg
							class="h-6 w-6 text-blue-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
							/>
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">도메인 그룹</p>
						<p class="text-2xl font-bold text-gray-900">{statistics.uniqueGroups}</p>
					</div>
				</div>
			</div>

			<div class="rounded-2xl border border-gray-200/50 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
				<div class="flex items-center">
					<div class="rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 p-3">
						<svg
							class="h-6 w-6 text-green-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
							/>
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">데이터 타입</p>
						<p class="text-2xl font-bold text-gray-900">{statistics.uniqueDataTypes}</p>
					</div>
				</div>
			</div>

			<div class="rounded-2xl border border-gray-200/50 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
				<div class="flex items-center">
					<div class="rounded-2xl bg-gradient-to-br from-orange-100 to-red-100 p-3">
						<svg
							class="h-6 w-6 text-orange-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">마지막 업데이트</p>
						<p class="text-sm font-bold text-gray-900">
							{statistics.lastUpdate ? formatDate(statistics.lastUpdate) : '-'}
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- 에러 메시지 -->
		{#if errorMessage}
			<div
				class="mb-8 rounded-2xl border border-red-200/50 bg-gradient-to-r from-red-50 to-pink-50 p-6 shadow-lg backdrop-blur-sm"
			>
				<div class="flex items-start">
					<div class="rounded-full bg-red-100 p-2">
						<svg class="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="ml-4">
						<h4 class="text-lg font-semibold text-red-800">오류 발생</h4>
						<p class="text-red-700">{errorMessage}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- 검색 영역 -->
		<div
			class="mb-8 rounded-3xl border border-gray-200/50 bg-white/80 p-8 shadow-lg backdrop-blur-sm"
		>
			<SearchBar
				placeholder="도메인 그룹, 분류명, 표준명, 논리/물리 데이터타입으로 검색하세요..."
				searchFields={[
					{ value: 'all', label: '전체' },
					{ value: 'domainGroup', label: '도메인그룹' },
					{ value: 'domainCategory', label: '도메인 분류명' },
					{ value: 'standardDomainName', label: '표준 도메인명' },
					{ value: 'logicalDataType', label: '논리 데이터타입' },
					{ value: 'physicalDataType', label: '물리 데이터타입' }
				]}
				bind:query={searchQuery}
				bind:field={searchField}
				bind:exact={searchExact}
				onsearch={handleSearch}
				onclear={handleRefresh}
			/>
		</div>

		<!-- 도메인 테이블 -->
		<div class="rounded-3xl border border-gray-200/50 bg-white/80 shadow-lg backdrop-blur-sm">
			<DomainTable
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
				onrefresh={handleRefresh}
			/>
		</div>

		<!-- 추가 정보 -->
		{#if lastUpdated && !loading}
			<div class="mt-8 text-center">
				<p class="text-sm text-gray-500">
					마지막 업데이트: {formatDate(lastUpdated)}
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-fade-in {
		animation: fade-in 0.5s ease-out forwards;
	}
</style>
