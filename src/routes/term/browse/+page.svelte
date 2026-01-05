<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import TermTable from '$lib/components/TermTable.svelte';
	import TermFileManager from '$lib/components/TermFileManager.svelte';
	import TermEditor from '$lib/components/TermEditor.svelte';
	import HistoryLog from '$lib/components/HistoryLog.svelte';
	import TermGenerator from '$lib/components/TermGenerator.svelte';
	import TermValidationPanel from '$lib/components/TermValidationPanel.svelte';
	import type {
		TermEntry,
		ValidationCheckResult,
		ValidationResult,
		AutoFixSuggestion
	} from '$lib/types/term.js';
	import type { ApiResponse } from '$lib/types/vocabulary.js';
	import { get } from 'svelte/store';
	import { settingsStore } from '$lib/stores/settings-store';
	import { termStore } from '$lib/stores/term-store';
	import { filterTermFiles, isSystemTermFile } from '$lib/utils/file-filter';

	// 상태 변수
	let entries = $state<TermEntry[]>([]);
	let loading = $state(false);
	let searchQuery = $state('');
	let searchField = $state('all');
	let searchExact = $state(false);
	let totalCount = $state(0);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let pageSize = $state(20);
	// 다중 정렬 상태 관리 (각 컬럼별로 독립적인 정렬 상태)
	let sortConfig = $state<Record<string, 'asc' | 'desc' | null>>({});
	let _lastUpdated = $state('');
	let errorMessage = $state('');
	let columnFilters = $state<Record<string, string | null>>({}); // 컬럼 필터 상태
	let filterOptions = $state<Record<string, string[]>>({}); // 필터 옵션 (전체 데이터 기준)

	// 파일 관리 상태
	let isFileManagerOpen = $state(false);
	let selectedFilename = $state('term.json');
	let fileList = $state<string[]>([]);
	let sidebarOpen = $state(false);

	// 편집기 상태
	let showEditor = $state(false);
	let editorServerError = $state('');
	let initialEntry = $state<Partial<TermEntry>>({});

	// Validation 패널 상태
	let showValidationPanel = $state(false);
	let validationLoading = $state(false);
	let validationResults = $state<ValidationCheckResult | null>(null);

	// 이벤트 상세 타입 정의
	type SearchDetail = { query: string; field: string; exact: boolean };
	type SortDetail = { column: string; direction: 'asc' | 'desc' | null };
	type PageChangeDetail = { page: number };
	type FilterDetail = { column: string; value: string | null };

	async function loadFileList() {
		try {
			const response = await fetch('/api/term/files');
			const result = await response.json();
			if (result.success && result.data) {
				const allFiles = result.data as string[];
				// 설정에 따라 필터링 - 초기값만 가져오기 위해 get() 사용
				const settings = get(settingsStore);
				fileList = filterTermFiles(allFiles, settings.showTermSystemFiles);

				// 파일 목록이 비어있으면 기본 파일 생성 시도
				if (fileList.length === 0 && allFiles.length === 0) {
					try {
						const createResponse = await fetch('/api/term/files', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ filename: 'term.json' })
						});
						if (createResponse.ok) {
							fileList = ['term.json'];
							if (selectedFilename !== 'term.json') {
								selectedFilename = 'term.json';
							}
						}
					} catch (e) {
						console.error('기본 파일 생성 실패:', e);
					}
				}
			}
		} catch (error) {
			console.error('파일 목록 로드 실패:', error);
		}
	}

	// 설정 변경 시 파일 목록 재필터링
	$effect(() => {
		const unsubscribe = settingsStore.subscribe((settings) => {
			// 파일 목록이 로드된 경우에만 재필터링
			fetch('/api/term/files')
				.then((res) => res.json())
				.then((result) => {
					if (result.success && result.data) {
						const allFiles = result.data as string[];
						const previousSelected = selectedFilename;
						fileList = filterTermFiles(allFiles, settings.showTermSystemFiles);

						// 현재 선택된 파일이 필터링 후 목록에 없고 시스템 파일이면 첫 번째 파일로 자동 선택
						if (
							!fileList.includes(previousSelected) &&
							isSystemTermFile(previousSelected) &&
							fileList.length > 0
						) {
							selectedFilename = fileList[0];
							termStore.set({ selectedFilename: fileList[0] });
							loadTermData();
						}
					}
				})
				.catch((error) => console.error('파일 목록 로드 실패:', error));
		});
		return unsubscribe;
	});

	/**
	 * 컴포넌트 마운트 시 초기 데이터 로드
	 */
	onMount(async () => {
		await loadFileList();
		// 파일 목록 로드 후 데이터 로드
		if (fileList.length > 0) {
			// selectedFilename이 파일 목록에 없으면 첫 번째 파일 선택
			if (!fileList.includes(selectedFilename)) {
				selectedFilename = fileList[0];
			}
			termStore.set({ selectedFilename });
			await loadFilterOptions();
			await loadTermData();
		}
	});

	/**
	 * 필터 옵션 로드 (전체 데이터 기준)
	 */
	async function loadFilterOptions() {
		try {
			const params = new URLSearchParams({
				filename: selectedFilename
			});

			const response = await fetch(`/api/term/filter-options?${params}`);
			const result: ApiResponse = await response.json();

			if (result.success && result.data && typeof result.data === 'object') {
				filterOptions = result.data as Record<string, string[]>;
			}
		} catch (error) {
			console.error('필터 옵션 로드 오류:', error);
		}
	}

	/**
	 * 용어 데이터 로드
	 */
	async function loadTermData() {
		loading = true;
		errorMessage = '';

		try {
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: pageSize.toString(),
				filename: selectedFilename
			});

			// 다중 정렬 파라미터 추가
			Object.entries(sortConfig).forEach(([column, direction]) => {
				if (direction !== null) {
					params.append('sortBy[]', column);
					params.append('sortOrder[]', direction);
				}
			});

			// 컬럼 필터 파라미터 추가
			Object.entries(columnFilters).forEach(([key, value]) => {
				if (value !== null && value !== '') {
					params.append(`filters[${key}]`, value);
				}
			});

			const response = await fetch(`/api/term?${params}`);
			const result: ApiResponse = await response.json();

			if (result.success && result.data) {
				const data = result.data as {
					entries: TermEntry[];
					pagination: { totalCount: number; totalPages: number };
					lastUpdated: string;
				};
				entries = data.entries || [];
				totalCount = data.pagination?.totalCount || 0;
				totalPages = data.pagination?.totalPages || 1;
				_lastUpdated = data.lastUpdated || '';
			} else {
				errorMessage = result.error || '데이터 로드 실패';
			}
		} catch (error) {
			console.error('용어 데이터 로드 오류:', error);
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
		currentPage = 1; // 새로운 검색 시 첫 페이지로 이동

		await executeSearch();
	}

	/**
	 * 검색 초기화
	 */
	async function handleSearchClear() {
		searchQuery = '';
		searchField = 'all';
		searchExact = false;
		currentPage = 1;
		await loadTermData();
	}

	/**
	 * 검색 API 호출
	 */
	async function executeSearch() {
		loading = true;
		errorMessage = '';

		try {
			const params = new URLSearchParams({
				query: searchQuery,
				field: searchField,
				page: currentPage.toString(),
				limit: pageSize.toString(),
				filename: selectedFilename
			});

			// 다중 정렬 파라미터 추가
			Object.entries(sortConfig).forEach(([column, direction]) => {
				if (direction !== null) {
					params.append('sortBy[]', column);
					params.append('sortOrder[]', direction);
				}
			});

			// 컬럼 필터 파라미터 추가
			Object.entries(columnFilters).forEach(([key, value]) => {
				if (value !== null && value !== '') {
					params.append(`filters[${key}]`, value);
				}
			});

			const response = await fetch(`/api/term?${params}`);
			const result: ApiResponse = await response.json();

			if (result.success && result.data) {
				const data = result.data as {
					entries: TermEntry[];
					pagination: { totalCount: number; totalPages: number };
					lastUpdated: string;
				};
				entries = data.entries || [];
				totalCount = data.pagination?.totalCount || 0;
				totalPages = data.pagination?.totalPages || 1;
				_lastUpdated = data.lastUpdated || '';
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
	 * 정렬 처리 (3단계 순환: null → asc → desc → null)
	 */
	async function handleSort(detail: SortDetail) {
		const { column, direction } = detail;

		// 정렬 상태 업데이트
		if (direction === null) {
			// null이면 해당 컬럼의 정렬 제거
			const newConfig = { ...sortConfig };
			delete newConfig[column];
			sortConfig = newConfig;
		} else {
			// asc 또는 desc면 해당 컬럼의 정렬 설정
			sortConfig = { ...sortConfig, [column]: direction };
		}

		if (searchQuery) {
			await executeSearch();
		} else {
			await loadTermData();
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
			await loadTermData();
		}
	}

	/**
	 * 데이터 새로고침
	 */
	async function handleRefresh() {
		await loadFileList();
		// 파일 목록 로드 후 selectedFilename 확인
		if (fileList.length > 0 && !fileList.includes(selectedFilename)) {
			selectedFilename = fileList[0];
		}
		await loadFilterOptions();
		if (searchQuery) {
			await executeSearch();
		} else {
			await loadTermData();
		}
	}

	/**
	 * 컬럼 필터 변경 처리
	 */
	async function handleFilter(detail: FilterDetail) {
		const { column, value } = detail;
		currentPage = 1; // 필터 변경 시 첫 페이지로 이동

		// 필터 상태 업데이트
		if (value === null || value === '') {
			const { [column]: _, ...rest } = columnFilters;
			columnFilters = rest;
		} else {
			columnFilters = { ...columnFilters, [column]: value };
		}

		// 데이터 재로드
		if (searchQuery) {
			await executeSearch();
		} else {
			await loadTermData();
		}
	}

	/**
	 * 모든 필터 초기화 (정렬도 함께 초기화)
	 */
	async function handleClearAllFilters() {
		columnFilters = {};
		sortConfig = {}; // 정렬도 초기화
		currentPage = 1;
		if (searchQuery) {
			await executeSearch();
		} else {
			await loadTermData();
		}
	}

	/**
	 * 전체 유효성 검사 실행
	 */
	async function handleValidateAll() {
		validationLoading = true;
		showValidationPanel = true;
		validationResults = null;

		try {
			const response = await fetch(`/api/term/validate-all?filename=${selectedFilename}`);
			const result: ApiResponse = await response.json();

			if (result.success && result.data) {
				validationResults = result.data as ValidationCheckResult;
				console.log('Validation 결과:', validationResults);
				console.log('실패 항목 수:', validationResults.failedEntries?.length || 0);
			} else {
				errorMessage = result.error || '유효성 검사 중 오류가 발생했습니다.';
				console.error('Validation 실패:', result);
			}
		} catch (error) {
			console.error('유효성 검사 오류:', error);
			errorMessage = '유효성 검사 중 오류가 발생했습니다.';
		} finally {
			validationLoading = false;
		}
	}

	/**
	 * Validation 패널에서 편집 요청 처리
	 */
	function handleValidationEdit(
		event: CustomEvent<{ entryId: string; suggestions?: AutoFixSuggestion }>
	) {
		const { entryId, suggestions } = event.detail;

		// validationResults.failedEntries에서 항목 찾기 (현재 페이지의 entries가 아닌 전체 검증 결과에서 찾기)
		let entry: TermEntry | undefined;

		if (validationResults?.failedEntries) {
			const validationResult = validationResults.failedEntries.find((r) => r.entry.id === entryId);
			if (validationResult) {
				entry = validationResult.entry;
			}
		}

		// validationResults에서 찾지 못한 경우, 현재 페이지의 entries에서도 시도
		if (!entry) {
			entry = entries.find((e) => e.id === entryId);
		}

		if (entry) {
			// 자동 수정 제안이 있으면 적용
			if (suggestions) {
				initialEntry = {
					...entry,
					termName: suggestions.termName || entry.termName,
					columnName: suggestions.columnName || entry.columnName,
					domainName: suggestions.domainName || entry.domainName
				};
			} else {
				initialEntry = { ...entry };
			}
			// 패널은 닫지 않고 에디터만 열기 (연속 작업 가능)
			showEditor = true;
			editorServerError = '';
		} else {
			// 항목을 찾지 못한 경우 에러 메시지 표시
			console.error('항목을 찾을 수 없습니다:', entryId, {
				validationResults: validationResults,
				entriesLength: entries.length
			});
			editorServerError = '항목을 찾을 수 없습니다. 페이지를 새로고침한 후 다시 시도해주세요.';
		}
	}

	/**
	 * 용어 XLSX 다운로드 처리
	 */
	async function handleTermDownload() {
		loading = true;
		try {
			const params = new URLSearchParams({
				filename: selectedFilename
			});

			// 다중 정렬 파라미터 추가
			Object.entries(sortConfig).forEach(([column, direction]) => {
				if (direction !== null) {
					params.append('sortBy[]', column);
					params.append('sortOrder[]', direction);
				}
			});
			const response = await fetch(`/api/term/download?${params}`);
			if (!response.ok) {
				throw new Error(`다운로드 실패: ${response.status} ${response.statusText}`);
			}
			const blob = await response.blob();
			// 파일명은 서버에서 설정한 Content-Disposition 헤더 사용
			let filename = 'term.xlsx'; // 기본값
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
			console.error('용어 다운로드 중 오류:', error);
		} finally {
			loading = false;
		}
	}

	/**
	 * 파일 선택 변경 처리
	 */
	async function handleFileSelect(filename: string) {
		if (selectedFilename === filename) return;
		selectedFilename = filename;
		termStore.set({ selectedFilename: filename });
		currentPage = 1;
		searchQuery = '';
		await loadFilterOptions();
		await loadTermData();
	}

	async function handleFileChange() {
		// 파일 변경 시 파일 목록 다시 로드 후 데이터 새로고침
		await loadFileList();
		// 파일 목록 로드 후 selectedFilename 확인
		if (fileList.length > 0 && !fileList.includes(selectedFilename)) {
			selectedFilename = fileList[0];
			termStore.set({ selectedFilename: fileList[0] });
		}
		await handleRefresh();
	}

	/**
	 * 용어 저장 처리
	 */
	async function handleSave(event: CustomEvent<TermEntry>) {
		const editedEntry = event.detail;
		loading = true;
		editorServerError = '';

		try {
			const url = '/api/term';
			const body = JSON.stringify({
				entry: editedEntry,
				filename: selectedFilename
			});

			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body
			});

			const result: ApiResponse = await response.json();

			if (result.success) {
				// 서버에서 생성된 엔트리 정보 가져오기
				const savedEntry = result.data as TermEntry;

				// 모달 닫기
				showEditor = false;
				editorServerError = '';
				initialEntry = {};
				// 데이터 새로고침
				if (searchQuery) {
					await executeSearch();
				} else {
					await loadTermData();
				}

				// 히스토리 로그 기록
				try {
					await fetch('/api/history?type=term', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							action: 'add',
							targetId: savedEntry.id,
							targetName: savedEntry.termName,
							details: {
								after: {
									termName: savedEntry.termName,
									columnName: savedEntry.columnName,
									domainName: savedEntry.domainName
								}
							}
						})
					});

					// 히스토리 UI 새로고침
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					if (typeof window !== 'undefined' && (window as any).refreshTermHistoryLog) {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						(window as any).refreshTermHistoryLog();
					}
				} catch (historyError: unknown) {
					console.warn('히스토리 로그 기록 실패:', historyError);
				}
			} else {
				// 에러 발생 시 모달 내부에 표시
				const errorMsg = result.error || '용어 저장에 실패했습니다.';
				editorServerError = errorMsg;
			}
		} catch (error) {
			console.error('용어 저장 중 오류:', error);
			const errorMsg = '서버 연결 오류가 발생했습니다.';
			editorServerError = errorMsg;
		} finally {
			loading = false;
		}
	}

	/**
	 * 편집기 취소 처리
	 */
	function handleCancel() {
		showEditor = false;
		editorServerError = '';
		initialEntry = {};
	}

	/**
	 * 용어 변환기에서 새 용어 추가 요청 처리
	 */
	function handleAddTermFromGenerator(
		event: CustomEvent<{ termName: string; columnName: string }>
	) {
		const { termName, columnName } = event.detail;
		initialEntry = {
			termName,
			columnName,
			domainName: ''
		};
		showEditor = true;
		editorServerError = '';
	}
</script>

<svelte:head>
	<title>데이터 관리 | 용어</title>
	<meta name="description" content="용어를 관리하고 검색하세요." />
</svelte:head>

<div
	class="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8"
>
	<div class="mx-auto w-full px-4 sm:px-6 lg:px-8">
		<div class="gap-8 lg:grid lg:grid-cols-[16rem_1fr] lg:items-start">
			<!-- 좌측 고정 사이드바 (데스크탑) -->
			<aside class="hidden h-full w-64 lg:block">
				<div
					class="sticky top-20 rounded-2xl border border-gray-200/50 bg-white/95 p-4 shadow-xl backdrop-blur-md"
				>
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-lg font-bold text-gray-900">용어 파일</h2>
						<button
							onclick={() => (isFileManagerOpen = true)}
							class="text-gray-500 hover:text-blue-600"
							title="파일 관리"
							aria-label="파일 관리"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
						</button>
					</div>
					<div class="space-y-2">
						{#each fileList as file (file)}
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
						{#if fileList.length === 0}
							<div class="px-4 py-2 text-sm text-gray-500">파일이 없습니다.</div>
						{/if}
					</div>
				</div>
			</aside>

			<!-- 모바일 드로어 사이드바 -->
			{#if sidebarOpen}
				<div class="fixed inset-0 z-40 flex lg:hidden">
					<div
						class="w-64 transform bg-white p-4 pt-20 shadow-2xl transition-transform duration-300"
						role="dialog"
						aria-modal="true"
					>
						<div class="mb-4 flex items-center justify-between">
							<h2 class="text-lg font-bold text-gray-900">용어 파일</h2>
							<div class="flex items-center space-x-2">
								<button
									onclick={() => (isFileManagerOpen = true)}
									class="text-gray-500 hover:text-blue-600"
									title="파일 관리"
									aria-label="파일 관리"
								>
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
										/>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
										/>
									</svg>
								</button>
								<button
									onclick={() => (sidebarOpen = false)}
									class="text-gray-500 hover:text-gray-700"
									title="사이드바 닫기"
									aria-label="사이드바 닫기"
								>
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							</div>
						</div>
						<div class="space-y-2">
							{#each fileList as file (file)}
								<button
									type="button"
									onclick={() => {
										handleFileSelect(file);
										sidebarOpen = false;
									}}
									class="w-full rounded-lg px-4 py-2 text-left text-sm font-medium transition-colors duration-200 {selectedFilename ===
									file
										? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
										: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
								>
									{file}
								</button>
							{/each}
							{#if fileList.length === 0}
								<div class="px-4 py-2 text-sm text-gray-500">파일이 없습니다.</div>
							{/if}
						</div>
					</div>
					<button
						type="button"
						class="flex-1 bg-black/30 backdrop-blur-sm"
						onclick={() => (sidebarOpen = false)}
						aria-label="사이드바 닫기"
					></button>
				</div>
			{/if}

			<!-- 메인 컨텐츠 -->
			<main class="w-full overflow-x-hidden">
				<!-- 페이지 헤더 -->
				<div class="mb-10">
					<div
						class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
					>
						<div class="flex items-center space-x-4">
							<!-- 모바일 사이드바 토글 버튼 -->
							<button
								onclick={() => (sidebarOpen = true)}
								class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
								title="사이드바 열기"
								aria-label="사이드바 열기"
							>
								<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 6h16M4 12h16M4 18h16"
									/>
								</svg>
							</button>
							<div>
								<h1
									class="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-4xl font-bold text-transparent"
								>
									용어
								</h1>
								<p class="mt-2 text-sm text-gray-500">
									현재 파일: <span class="font-medium text-gray-900">{selectedFilename}</span>
								</p>
							</div>
						</div>

						<!-- 액션 버튼들 -->
						<div class="mb-4 flex items-center space-x-3">
							<!-- 전체 유효성 검사 버튼 -->
							<button
								type="button"
								onclick={handleValidateAll}
								disabled={loading || validationLoading}
								class="group inline-flex items-center space-x-2 rounded-xl border border-blue-200/50 bg-blue-50/80 px-6 py-3 text-sm font-medium text-blue-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-blue-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<span>{validationLoading ? '검사 중...' : '전체 유효성 검사'}</span>
							</button>

							<!-- XLSX 다운로드 버튼 -->
							<button
								type="button"
								onclick={handleTermDownload}
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
								onclick={handleRefresh}
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
						entry={initialEntry}
						serverError={editorServerError}
						filename={selectedFilename}
						isEditMode={!!initialEntry.id}
						on:save={handleSave}
						on:cancel={handleCancel}
					/>
				{/if}

				<!-- Validation 패널 -->
				{#if showValidationPanel}
					<TermValidationPanel
						results={validationResults?.failedEntries || []}
						totalCount={validationResults?.totalCount || 0}
						failedCount={validationResults?.failedCount || 0}
						passedCount={validationResults?.passedCount || 0}
						loading={validationLoading}
						open={showValidationPanel}
						on:close={() => (showValidationPanel = false)}
						on:edit={handleValidationEdit}
					/>
				{/if}

				<!-- TermFileManager 모달 -->
				<TermFileManager
					isOpen={isFileManagerOpen}
					{selectedFilename}
					on:close={() => (isFileManagerOpen = false)}
					on:change={handleFileChange}
				/>

				<!-- 히스토리 로그 -->
				<HistoryLog type="term" />

				<!-- 용어 변환기 -->
				<div class="mb-8">
					<TermGenerator filename={selectedFilename} on:addTerm={handleAddTermFromGenerator} />
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
					class="mb-8 rounded-2xl border border-gray-200/50 bg-white/80 p-4 shadow-sm backdrop-blur-sm"
				>
					<div class="mb-6">
						<h2 class="text-2xl font-bold text-gray-900">통합검색</h2>
						<p class="mt-2 text-gray-600">용어명, 컬럼명, 도메인으로 검색하세요</p>
					</div>

					<div class="mb-6">
						<SearchBar
							placeholder="용어명, 컬럼명, 도메인으로 검색하세요..."
							searchFields={[
								{ value: 'all', label: '전체' },
								{ value: 'termName', label: '용어명' },
								{ value: 'columnName', label: '컬럼명' },
								{ value: 'domainName', label: '도메인' }
							]}
							bind:query={searchQuery}
							bind:field={searchField}
							bind:exact={searchExact}
							onsearch={handleSearch}
							onclear={handleSearchClear}
						/>
					</div>
				</div>

				<!-- 결과 테이블 영역 -->
				<div
					class="min-w-0 rounded-2xl border border-gray-200/50 bg-white/80 p-8 shadow-sm backdrop-blur-sm"
				>
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

					<div class="rounded-xl border border-gray-200">
						<div>
							<TermTable
								{entries}
								{loading}
								{searchQuery}
								{totalCount}
								{currentPage}
								{totalPages}
								{pageSize}
								{sortConfig}
								{searchField}
								_selectedFilename={selectedFilename}
								activeFilters={columnFilters}
								{filterOptions}
								onsort={handleSort}
								onpagechange={handlePageChange}
								onfilter={handleFilter}
								onClearAllFilters={handleClearAllFilters}
							/>
						</div>
					</div>
				</div>
			</main>
		</div>
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
