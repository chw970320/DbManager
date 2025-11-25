<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import VocabularyTable from '$lib/components/VocabularyTable.svelte';
	import TermGenerator from '$lib/components/TermGenerator.svelte';
	import TermEditor from '$lib/components/TermEditor.svelte';
	import ForbiddenWordManager from '$lib/components/ForbiddenWordManager.svelte';
	import type {
		VocabularyEntry,
		ApiResponse,
		SearchQuery,
		SearchResult
	} from '$lib/types/vocabulary.js';
	import { vocabularyStore } from '$lib/stores/vocabularyStore';

	// 이벤트 상세 타입 정의
	type SearchDetail = { query: string; field: string; exact: boolean };
	type SortDetail = { column: string; direction: 'asc' | 'desc' };
	type PageChangeDetail = { page: number };

	// 상태 변수
	let entries = $state<VocabularyEntry[]>([]);
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
	let duplicateFilters = $state({
		standardName: false,
		abbreviation: false,
		englishName: false
	}); // 세부 중복 필터 상태

	// 파일 관리 상태
	let vocabularyFiles = $state<string[]>([]);
	let selectedFilename = $state('vocabulary.json');

	// UI 상태
	let showEditor = $state(false);
	let editorServerError = $state('');
	let showForbiddenWordManager = $state(false);

	let unsubscribe: () => void;

	// 스토어 구독 및 초기 데이터 로드
	onMount(() => {
		// 비동기 초기화 함수 실행
		(async () => {
			await loadVocabularyFiles();
			if (browser) {
				await loadVocabularyData();
			}
		})();

		unsubscribe = vocabularyStore.subscribe((value) => {
			if (selectedFilename !== value.selectedFilename) {
				selectedFilename = value.selectedFilename;
				if (browser) {
					// 파일 변경 시 검색 조건 초기화 및 데이터 로드
					currentPage = 1;
					searchQuery = '';
					loadVocabularyData();
				}
			}
		});

		return () => {
			if (unsubscribe) unsubscribe();
		};
	});

	/**
	 * 중복 필터 상태에 따라 필터 파라미터 문자열을 생성
	 */
	function getDuplicateFilterParam(): string | null {
		const activeFilters = [];
		if (duplicateFilters.standardName) activeFilters.push('standardName');
		if (duplicateFilters.abbreviation) activeFilters.push('abbreviation');
		if (duplicateFilters.englishName) activeFilters.push('englishName');

		if (activeFilters.length > 0) {
			return `duplicates:${activeFilters.join(',')}`;
		}
		return null;
	}

	/**
	 * 사용 가능한 단어집 파일 목록 로드
	 */
	async function loadVocabularyFiles() {
		try {
			const response = await fetch('/api/vocabulary/files');
			const result: ApiResponse = await response.json();
			if (result.success && Array.isArray(result.data)) {
				vocabularyFiles = result.data as string[];
			}
		} catch (error) {
			console.error('파일 목록 로드 오류:', error);
		}
	}

	/**
	 * 단어집 파일 선택 처리
	 */
	function handleFileSelect(filename: string) {
		if (selectedFilename === filename) return;
		vocabularyStore.update((store) => ({ ...store, selectedFilename: filename }));
	}

	/**
	 * 단어집 데이터 로드
	 */
	async function loadVocabularyData() {
		loading = true;

		try {
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: pageSize.toString(),
				sortBy: sortColumn,
				sortOrder: sortDirection,
				filename: selectedFilename
			});

			// 중복 필터링 파라미터 추가
			const filterParam = getDuplicateFilterParam();
			if (filterParam) {
				params.set('filter', filterParam);
			}

			const response = await fetch(`/api/vocabulary?${params}`);
			const result: ApiResponse = await response.json();

			if (
				result.success &&
				result.data &&
				typeof result.data === 'object' &&
				'entries' in result.data &&
				Array.isArray((result.data as { entries: unknown }).entries)
			) {
				entries = result.data.entries as VocabularyEntry[];
				if (
					'pagination' in result.data &&
					result.data.pagination &&
					typeof result.data.pagination === 'object' &&
					result.data.pagination !== null &&
					'totalCount' in result.data.pagination &&
					'totalPages' in result.data.pagination
				) {
					totalCount = (result.data.pagination as { totalCount: number }).totalCount || 0;
					totalPages = (result.data.pagination as { totalPages: number }).totalPages || 1;
				}
			} else {
				entries = [];
				totalCount = 0;
			}
		} catch (error) {
			console.error('데이터 로드 오류:', error);
			entries = [];
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
		currentPage = 1; // 새로운 검색 시 첫 페이지로 이동

		await executeSearch();
	}

	/**
	 * 검색 API 호출 (페이지 유지)
	 */
	async function executeSearch() {
		loading = true;

		try {
			const params = new URLSearchParams({
				q: searchQuery,
				field: searchField,
				exact: searchExact.toString(),
				page: currentPage.toString(),
				limit: pageSize.toString(),
				filename: selectedFilename
			});

			// 중복 필터링 파라미터 추가
			const filterParam = getDuplicateFilterParam();
			if (filterParam) {
				params.set('filter', filterParam);
			}

			const response = await fetch(`/api/search?${params}`);
			const result: ApiResponse = await response.json();

			if (
				result.success &&
				result.data &&
				typeof result.data === 'object' &&
				'entries' in result.data &&
				Array.isArray(result.data.entries)
			) {
				entries = result.data.entries as VocabularyEntry[];
				if (
					'pagination' in result.data &&
					result.data.pagination &&
					typeof result.data.pagination === 'object' &&
					result.data.pagination !== null &&
					('totalResults' in result.data.pagination || 'totalCount' in result.data.pagination) &&
					'totalPages' in result.data.pagination
				) {
					totalCount =
						(result.data.pagination as { totalResults?: number; totalCount?: number })
							.totalResults ??
						(result.data.pagination as { totalCount?: number }).totalCount ??
						0;
					totalPages = (result.data.pagination as { totalPages: number }).totalPages || 1;
				}
			} else {
				entries = [];
				totalCount = 0;
				totalPages = 1;
			}
		} catch (error) {
			console.error('검색 오류:', error);
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
		await loadVocabularyData();
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
			await executeSearch();
		} else {
			// 일반 조회 시 데이터 재로드
			await loadVocabularyData();
		}
	}

	/**
	 * 페이지 변경 처리
	 */
	async function handlePageChange(detail: PageChangeDetail) {
		const { page } = detail;
		currentPage = page;

		if (searchQuery) {
			// 검색 중인 경우 현재 페이지로 검색 재실행
			await executeSearch();
		} else {
			// 일반 조회 시 데이터 재로드
			await loadVocabularyData();
		}
	}

	/**
	 * 중복 필터 변경 처리
	 */
	async function handleDuplicateFilterChange() {
		currentPage = 1; // 필터 변경 시 첫 페이지로 이동

		try {
			if (searchQuery) {
				// 검색 중인 경우 검색 재실행
				await executeSearch();
			} else {
				// 일반 조회 시 데이터 재로드
				await loadVocabularyData();
			}
		} catch (error) {
			console.error('필터 변경 중 오류:', error);
		}
	}

	/**
	 * 데이터 새로고침
	 */
	async function refreshData() {
		await loadVocabularyFiles();
		await loadVocabularyData();
	}

	/**
	 * 새 단어 추가 처리
	 */
	async function handleSave(event: CustomEvent<VocabularyEntry>) {
		const newEntry = event.detail;
		loading = true;
		editorServerError = ''; // 에러 상태 초기화

		try {
			const params = new URLSearchParams({ filename: selectedFilename });
			const response = await fetch(`/api/vocabulary?${params}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(newEntry)
			});

			const result: ApiResponse = await response.json();

			if (
				result.success &&
				result.data &&
				typeof result.data === 'object' &&
				'id' in result.data &&
				'standardName' in result.data &&
				'abbreviation' in result.data &&
				'englishName' in result.data
			) {
				// 모달 닫기
				showEditor = false;
				editorServerError = ''; // 에러 상태 초기화
				// 데이터 새로고침
				await loadVocabularyData();

				// 히스토리 로그 기록
				try {
					await fetch('/api/history', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							action: 'add',
							targetId: result.data.id,
							targetName: result.data.standardName,
							filename: selectedFilename, // 파일명 추가
							details: {
								after: {
									standardName: result.data.standardName,
									abbreviation: result.data.abbreviation,
									englishName: result.data.englishName
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
			} else {
				// 에러 발생 시 모달 내부에 표시
				const errorMsg = result.error || '단어 추가에 실패했습니다.';
				editorServerError = errorMsg;
			}
		} catch (error) {
			console.error('단어 추가 중 오류:', error);
			const errorMsg = '서버 연결 오류가 발생했습니다.';
			editorServerError = errorMsg;
		} finally {
			loading = false;
		}
	}

	/**
	 * XLSX 파일 다운로드 처리
	 */
	async function handleDownload() {
		loading = true;

		try {
			// 현재 적용된 모든 상태를 쿼리 파라미터로 구성
			const params = new URLSearchParams({
				sortBy: sortColumn,
				sortOrder: sortDirection,
				filename: selectedFilename
			});

			// 검색 조건이 있는 경우 추가
			if (searchQuery) {
				params.set('q', searchQuery);
				params.set('field', searchField);
				params.set('exact', searchExact.toString());
			}

			// 중복 필터링 파라미터 추가
			const filterParam = getDuplicateFilterParam();
			if (filterParam) {
				params.set('filter', filterParam);
			}

			// 다운로드 API 호출
			const response = await fetch(`/api/vocabulary/download?${params}`);

			if (!response.ok) {
				throw new Error(`다운로드 실패: ${response.status} ${response.statusText}`);
			}

			// Blob 데이터로 변환
			const blob = await response.blob();

			// 파일명 추출 (Content-Disposition 헤더에서)
			let filename = 'vocabulary.xlsx';
			const contentDisposition = response.headers.get('Content-Disposition');
			if (contentDisposition) {
				const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
				if (filenameMatch) {
					filename = filenameMatch[1];
				}
			}

			// 다운로드 트리거
			const downloadUrl = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = downloadUrl;
			link.download = filename;
			link.style.display = 'none';

			// DOM에 추가하고 클릭한 후 제거
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			// 메모리 해제
			URL.revokeObjectURL(downloadUrl);
		} catch (error) {
			console.error('다운로드 중 오류:', error);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>단어집 관리 - 모던한 단어 관리 시스템</title>
	<meta name="description" content="AI 기반 검색으로 등록된 단어집을 빠르게 찾아보세요." />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex flex-col gap-6 lg:flex-row">
			<!-- 사이드바 (파일 목록) -->
			<aside class="w-full flex-shrink-0 lg:w-64">
				<div
					class="sticky top-8 rounded-2xl border border-gray-200/50 bg-white/80 p-4 shadow-sm backdrop-blur-sm"
				>
					<h2 class="mb-4 text-lg font-bold text-gray-900">단어집 파일</h2>
					<div class="space-y-2">
						{#each vocabularyFiles as file}
							<button
								type="button"
								onclick={() => handleFileSelect(file)}
								class="w-full rounded-lg px-4 py-2 text-left text-sm font-medium transition-colors duration-200 {selectedFilename ===
								file
									? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
									: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
							>
								{file}
							</button>
						{/each}
						{#if vocabularyFiles.length === 0}
							<div class="px-4 py-2 text-sm text-gray-500">파일이 없습니다.</div>
						{/if}
					</div>
				</div>
			</aside>

			<!-- 메인 컨텐츠 -->
			<main class="flex-1">
				<!-- 페이지 헤더 -->
				<div class="mb-10">
					<div
						class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
					>
						<div>
							<h1
								class="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-4xl font-bold text-transparent"
							>
								단어집 관리
							</h1>
							<p class="mt-2 text-sm text-gray-500">
								현재 파일: <span class="font-medium text-gray-900">{selectedFilename}</span>
							</p>
						</div>

						<!-- 액션 버튼들 -->
						<div class="flex items-center space-x-3">
							<!-- 금지어 관리 버튼 -->
							<button
								type="button"
								onclick={() => {
									showForbiddenWordManager = true;
								}}
								disabled={loading}
								class="group inline-flex items-center space-x-2 rounded-xl border border-red-200/50 bg-red-50/80 px-6 py-3 text-sm font-medium text-red-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-red-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
										d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18 12l-2.364-2.364M5.636 5.636L12 12l2.364-2.364"
									/>
								</svg>
								<span>금지어 관리</span>
							</button>

							<!-- 새 단어 추가 버튼 -->
							<button
								type="button"
								onclick={() => {
									editorServerError = '';
									showEditor = true;
								}}
								disabled={loading}
								class="btn btn-primary group space-x-2 rounded-xl px-6 py-3 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
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
										d="M12 6v6m0 0v6m0-6h6m-6 0H6"
									/>
								</svg>
								<span>새 단어 추가</span>
							</button>

							<!-- XLSX 다운로드 버튼 -->
							<button
								type="button"
								onclick={handleDownload}
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

							<!-- 새로고침 버튼 -->
							<button
								type="button"
								onclick={refreshData}
								disabled={loading}
								class="btn btn-secondary group space-x-2 rounded-xl px-6 py-3 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
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
				</div>

				<!-- TermEditor 모달 -->
				{#if showEditor}
					<TermEditor
						entry={{}}
						serverError={editorServerError}
						on:save={handleSave}
						on:cancel={() => {
							showEditor = false;
							editorServerError = '';
						}}
					/>
				{/if}

				<!-- ForbiddenWordManager 모달 -->
				<ForbiddenWordManager
					isOpen={showForbiddenWordManager}
					on:close={() => {
						showForbiddenWordManager = false;
					}}
				/>

				<!-- 통계 카드 섹션 -->
				<div class="my-8">
					<TermGenerator />
				</div>

				<!-- 검색 영역 -->
				<div
					class="mb-8 rounded-2xl border border-gray-200/50 bg-white/80 p-4 shadow-sm backdrop-blur-sm"
				>
					<div class="mb-6">
						<h2 class="text-2xl font-bold text-gray-900">통합검색</h2>
						<p class="mt-2 text-gray-600">표준단어명, 영문약어, 영문명으로 단어를 검색하세요</p>
					</div>

					<div class="mb-6">
						<SearchBar
							bind:query={searchQuery}
							bind:field={searchField}
							bind:exact={searchExact}
							onsearch={handleSearch}
							onclear={handleSearchClear}
						/>
					</div>

					<!-- 고급 검색 옵션 -->
					<div class="mb-4">
						<div class="space-y-3">
							<h3 class="text-sm font-medium text-gray-700">중복 필터</h3>

							<div class="flex flex-wrap items-center gap-6">
								<!-- 표준단어명 중복 필터 -->
								<div class="flex items-center space-x-2">
									<input
										type="checkbox"
										id="duplicateStandardName"
										bind:checked={duplicateFilters.standardName}
										onchange={handleDuplicateFilterChange}
										class="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
									/>
									<label
										for="duplicateStandardName"
										class="cursor-pointer select-none text-sm font-medium text-gray-700"
									>
										표준단어명 중복
									</label>
								</div>

								<!-- 영문약어 중복 필터 -->
								<div class="flex items-center space-x-2">
									<input
										type="checkbox"
										id="duplicateAbbreviation"
										bind:checked={duplicateFilters.abbreviation}
										onchange={handleDuplicateFilterChange}
										class="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
									/>
									<label
										for="duplicateAbbreviation"
										class="cursor-pointer select-none text-sm font-medium text-gray-700"
									>
										영문약어 중복
									</label>
								</div>

								<!-- 영문명 중복 필터 -->
								<div class="flex items-center space-x-2">
									<input
										type="checkbox"
										id="duplicateEnglishName"
										bind:checked={duplicateFilters.englishName}
										onchange={handleDuplicateFilterChange}
										class="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
									/>
									<label
										for="duplicateEnglishName"
										class="cursor-pointer select-none text-sm font-medium text-gray-700"
									>
										영문명 중복
									</label>
								</div>
							</div>

							<!-- 필터 상태 표시 -->
							{#if duplicateFilters.standardName || duplicateFilters.abbreviation || duplicateFilters.englishName}
								<div class="flex flex-wrap items-center gap-2">
									{#if duplicateFilters.standardName}
										<div
											class="flex items-center space-x-1 rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-800"
										>
											<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
												/>
											</svg>
											<span>표준단어명</span>
										</div>
									{/if}
									{#if duplicateFilters.abbreviation}
										<div
											class="flex items-center space-x-1 rounded-md bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800"
										>
											<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
												/>
											</svg>
											<span>영문약어</span>
										</div>
									{/if}
									{#if duplicateFilters.englishName}
										<div
											class="flex items-center space-x-1 rounded-md bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800"
										>
											<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
												/>
											</svg>
											<span>영문명</span>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				</div>

				<!-- 결과 테이블 영역 -->
				<div
					class="rounded-2xl border border-gray-200/50 bg-white/80 p-8 shadow-sm backdrop-blur-sm"
				>
					<div class="mb-6 flex items-center justify-between">
						<div>
							<h2 class="text-2xl font-bold text-gray-900">검색 결과</h2>
							<p class="mt-1 text-gray-600">
								{#if searchQuery}
									"{searchQuery}"에 대한 검색 결과 {totalCount.toLocaleString()}건
								{:else}
									전체 단어 {totalCount.toLocaleString()}건
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
						<VocabularyTable
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
				</div>
			</main>
		</div>
	</div>
</div>
