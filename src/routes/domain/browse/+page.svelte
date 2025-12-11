<script lang="ts">
	import { onMount } from 'svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import DomainTable from '$lib/components/DomainTable.svelte';
	import DomainFileManager from '$lib/components/DomainFileManager.svelte';
	import type { DomainEntry, DomainApiResponse } from '$lib/types/domain.js';
	import { settingsStore } from '$lib/stores/settings-store';
	import { filterDomainFiles, isSystemDomainFile } from '$lib/utils/file-filter';

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

	// 파일 관리 상태
	let isFileManagerOpen = $state(false);
	let selectedFilename = $state('domain.json');
	let fileList = $state<string[]>([]);

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
		await loadDomainData();
		await loadStatistics();
		await loadFileList();
	});

	async function loadFileList() {
		try {
			const response = await fetch('/api/domain/files');
			const result = await response.json();
			if (result.success && result.data) {
				const allFiles = result.data as string[];
				// 설정에 따라 필터링
				settingsStore.subscribe((settings) => {
					fileList = filterDomainFiles(allFiles, settings.showDomainSystemFiles);
				})();
			}
		} catch (error) {
			console.error('파일 목록 로드 실패:', error);
		}
	}

	// 설정 변경 시 파일 목록 재필터링
	$effect(() => {
		const unsubscribe = settingsStore.subscribe((settings) => {
			if (fileList.length > 0 || fileList.length === 0) {
				// 파일 목록이 로드된 경우에만 재필터링
				fetch('/api/domain/files')
					.then((res) => res.json())
					.then((result) => {
						if (result.success && result.data) {
							const allFiles = result.data as string[];
							const previousSelected = selectedFilename;
							fileList = filterDomainFiles(allFiles, settings.showDomainSystemFiles);
							
							// 현재 선택된 파일이 필터링 후 목록에 없고 시스템 파일이면 첫 번째 파일로 자동 선택
							if (
								!fileList.includes(previousSelected) &&
								isSystemDomainFile(previousSelected) &&
								fileList.length > 0
							) {
								selectedFilename = fileList[0];
								loadDomainData();
							}
						}
					})
					.catch((error) => console.error('파일 목록 로드 실패:', error));
			}
		});
		return unsubscribe;
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
				sortOrder: sortDirection,
				filename: selectedFilename
			});

			const response = await fetch(`/api/domain?${params}`);
			const result: DomainApiResponse = await response.json();

			if (result.success && result.data) {
				const data = result.data as {
					entries: DomainEntry[];
					pagination: { totalCount: number; totalPages: number };
					lastUpdated: string;
				};
				entries = data.entries || [];
				totalCount = data.pagination?.totalCount || 0;
				totalPages = data.pagination?.totalPages || 1;
				lastUpdated = data.lastUpdated || '';
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
			const params = new URLSearchParams({ filename: selectedFilename });
			const response = await fetch(`/api/domain?${params}`, { method: 'OPTIONS' });
			const result: DomainApiResponse = await response.json();

			if (result.success && result.data) {
				const data = result.data as {
					totalEntries: number;
					lastUpdated: string;
					summary: { uniqueGroups: number; uniqueDataTypes: number };
				};
				statistics = {
					totalEntries: data.totalEntries || 0,
					lastUpdate: data.lastUpdated || '',
					uniqueGroups: data.summary?.uniqueGroups || 0,
					uniqueDataTypes: data.summary?.uniqueDataTypes || 0
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
				query: searchQuery, // 'q' → 'query'로 변경
				field: searchField,
				page: currentPage.toString(),
				limit: pageSize.toString(),
				sortBy: sortColumn,
				sortOrder: sortDirection,
				filename: selectedFilename
			});

			const response = await fetch(`/api/domain?${params}`);
			const result: DomainApiResponse = await response.json();

			if (result.success && result.data) {
				const data = result.data as {
					entries: DomainEntry[];
					pagination: { totalCount: number; totalPages: number };
					lastUpdated: string;
				};
				entries = data.entries || [];
				totalCount = data.pagination?.totalCount || 0;
				totalPages = data.pagination?.totalPages || 1;
				lastUpdated = data.lastUpdated || '';
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
		await loadFileList();
	}

	/**
	 * 도메인 XLSX 다운로드 처리 (단어집 관리와 동일하게)
	 */
	async function handleDomainDownload() {
		loading = true;
		try {
			const params = new URLSearchParams({
				sortBy: sortColumn,
				sortOrder: sortDirection,
				filename: selectedFilename
			});
			const response = await fetch(`/api/domain/download?${params}`);
			if (!response.ok) {
				throw new Error(`다운로드 실패: ${response.status} ${response.statusText}`);
			}
			const blob = await response.blob();
			// 파일명: domain_YYYY-MM-DD.xlsx
			const today = new Date();
			const yyyy = today.getFullYear();
			const mm = String(today.getMonth() + 1).padStart(2, '0');
			const dd = String(today.getDate()).padStart(2, '0');
			let filename = `domain_${yyyy}-${mm}-${dd}.xlsx`;
			const contentDisposition = response.headers.get('Content-Disposition');
			if (contentDisposition) {
				const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
				if (filenameMatch) {
					filename = filenameMatch[1];
				}
			}
			const downloadUrl = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = downloadUrl;
			link.download = filename;
			link.style.display = 'none';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(downloadUrl);
		} catch (error) {
			console.error('도메인 다운로드 중 오류:', error);
		} finally {
			loading = false;
		}
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

	function handleFileChange() {
		// 파일 변경 시 데이터 새로고침
		// selectedFilename은 FileManager에서 변경되지 않음 (현재는).
		// 하지만 파일 생성/삭제/이름변경 후 목록을 다시 불러와야 할 수도 있고,
		// 현재 선택된 파일이 삭제되거나 이름이 변경되었을 수 있음.
		// 여기서는 단순히 데이터를 다시 로드함.
		// 만약 현재 파일이 삭제되었다면 에러가 날 수 있으므로,
		// FileManager에서 변경 사항을 알려주면 처리가 필요함.
		// 일단은 새로고침.
		handleRefresh();
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

		<!-- 액션 버튼들 -->
		<div class="mb-4 flex items-center justify-between space-x-3">
			<!-- 파일 선택 드롭다운 (임시: 텍스트 표시 및 관리 버튼) -->
			<div class="flex items-center space-x-2 rounded-xl bg-white/50 px-4 py-2 backdrop-blur-sm">
				<span class="text-sm font-medium text-gray-600">현재 파일:</span>
				<select
					bind:value={selectedFilename}
					onchange={handleRefresh}
					class="rounded-md border-gray-300 bg-transparent text-sm font-bold text-gray-900 focus:border-purple-500 focus:ring-purple-500"
				>
					<!-- 파일 목록을 불러와서 보여줘야 함. 
                         하지만 여기서는 DomainFileManager가 파일 목록을 관리함.
                         간단하게 하기 위해 파일 목록을 여기서도 불러오거나,
                         DomainFileManager와 연동해야 함.
                         일단은 DomainFileManager를 열어서 관리하도록 하고,
                         여기서는 파일명을 입력받거나(임시), 
                         DomainFileManager에서 선택 기능을 추가해야 함.
                         
                         *개선*: DomainFileManager에 '선택' 기능을 넣거나,
                         여기서 파일 목록을 불러오는 로직을 추가해야 함.
                         시간 관계상, 파일 목록을 불러오는 로직을 추가함.
                    -->
					{#each fileList as file}
						<option value={file}>{file}</option>
					{/each}
				</select>
			</div>

			<div class="flex items-center gap-2 space-x-2">
				<button
					type="button"
					onclick={() => (isFileManagerOpen = true)}
					class="group inline-flex items-center space-x-2 rounded-xl border border-purple-200/50 bg-purple-50/80 px-6 py-3 text-sm font-medium text-purple-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-purple-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
				>
					<svg
						class="h-5 w-5 transition-transform duration-200 group-hover:scale-110"
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
					<span>파일 관리</span>
				</button>
				<button
					type="button"
					onclick={handleDomainDownload}
					disabled={loading}
					class="group inline-flex items-center space-x-2 rounded-xl border border-green-200/50 bg-green-50/80 px-6 py-3 text-sm font-medium text-green-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-green-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<svg
						class="h-5 w-5 transition-transform duration-200 group-hover:scale-110"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<span>{loading ? '준비 중' : 'XLSX 다운로드'}</span>
				</button>
			</div>
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
				{selectedFilename}
				onsort={handleSort}
				onpagechange={handlePageChange}
			/>
		</div>

		<DomainFileManager
			isOpen={isFileManagerOpen}
			on:close={() => (isFileManagerOpen = false)}
			on:change={handleFileChange}
		/>

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
</style>
