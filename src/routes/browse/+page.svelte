<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import VocabularyTable from '$lib/components/VocabularyTable.svelte';
	import VocabularyEditor from '$lib/components/VocabularyEditor.svelte';
	import VocabularyValidationPanel from '$lib/components/VocabularyValidationPanel.svelte';
	import VocabularyFileManager from '$lib/components/VocabularyFileManager.svelte';
	import BrowsePageLayout from '$lib/components/BrowsePageLayout.svelte';
	import ActionBar from '$lib/components/ActionBar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import BentoGrid from '$lib/components/BentoGrid.svelte';
	import BentoCard from '$lib/components/BentoCard.svelte';
	import type { VocabularyEntry, ApiResponse } from '$lib/types/vocabulary.js';
	import { get } from 'svelte/store';
	import { vocabularyDataStore as vocabularyStore } from '$lib/stores/unified-store';
	import { settingsStore } from '$lib/stores/settings-store';
	import { filterVocabularyFiles, isSystemVocabularyFile } from '$lib/utils/file-filter';
	import { getNavigationBreadcrumbItems } from '$lib/utils/navigation';

	// 이벤트 상세 타입 정의
	type SearchDetail = { query: string; field: string; exact: boolean };
	type SortDetail = { column: string; direction: 'asc' | 'desc' | null };
	type PageChangeDetail = { page: number };
	type FilterDetail = { column: string; value: string | null };

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
	// 다중 정렬 상태 관리 (각 컬럼별로 독립적인 정렬 상태)
	let sortConfig = $state<Record<string, 'asc' | 'desc' | null>>({});
	let duplicateFilters = $state({
		standardName: false,
		abbreviation: false,
		englishName: false
	}); // 세부 중복 필터 상태
	let unmappedDomainOnly = $state(false);
	let columnFilters = $state<Record<string, string | null>>({}); // 컬럼 필터 상태
	let filterOptions = $state<Record<string, string[]>>({}); // 필터 옵션 (전체 데이터 기준)

	// 파일 관리 상태
	let vocabularyFiles = $state<string[]>([]);
	let selectedFilename = $state('vocabulary.json');

	// UI 상태
	let showEditor = $state(false);
	let editorServerError = $state('');
	let isFileManagerOpen = $state(false);
	let currentEditingEntry = $state<VocabularyEntry | null>(null);
	let showValidationPanel = $state(false);
	let validationLoading = $state(false);
	let validationResults = $state<{
		totalCount: number;
		failedCount: number;
		passedCount: number;
		failedEntries: Array<{
			entry: VocabularyEntry;
			errors: Array<{
				type: string;
				code: string;
				message: string;
				field?: string;
				priority: number;
			}>;
		}>;
	} | null>(null);

	let unsubscribe: () => void;

	// 설정 변경 시 파일 목록 재필터링
	$effect(() => {
		const unsubscribe = settingsStore.subscribe((settings) => {
			// 파일 목록이 로드된 경우에만 재필터링
			fetch('/api/vocabulary/files')
				.then((res) => res.json())
				.then((result: ApiResponse) => {
					if (result.success && Array.isArray(result.data)) {
						const allFiles = result.data as string[];
						const previousSelected = selectedFilename;
						vocabularyFiles = filterVocabularyFiles(allFiles, settings.showVocabularySystemFiles);

						// 현재 선택된 파일이 필터링 후 목록에 없고 시스템 파일이면 첫 번째 파일로 자동 선택
						if (
							!vocabularyFiles.includes(previousSelected) &&
							isSystemVocabularyFile(previousSelected) &&
							vocabularyFiles.length > 0
						) {
							selectedFilename = vocabularyFiles[0];
							vocabularyStore.set({ selectedFilename: vocabularyFiles[0] });
							if (browser) {
								loadVocabularyData();
							}
						}
					}
				})
				.catch((error) => console.error('파일 목록 로드 오류:', error));
		});
		return unsubscribe;
	});

	// 스토어 구독 및 초기 데이터 로드
	onMount(() => {
		// 비동기 초기화 함수 실행
		(async () => {
			await loadVocabularyFiles();
			if (browser) {
				await loadFilterOptions();
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
					loadFilterOptions();
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
				const files = result.data as string[];
				// 설정에 따라 필터링 - 초기값만 가져오기 위해 get() 사용
				const settings = get(settingsStore);
				vocabularyFiles = filterVocabularyFiles(files, settings.showVocabularySystemFiles);

				if (files.length === 0) {
					// 파일이 하나도 없으면 기본 파일 생성
					try {
						const createResponse = await fetch('/api/vocabulary/files', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ filename: 'vocabulary.json' })
						});
						if (createResponse.ok) {
							vocabularyFiles = ['vocabulary.json'];
							if (selectedFilename !== 'vocabulary.json') {
								handleFileSelect('vocabulary.json');
							}
						}
					} catch (e) {
						console.error('기본 파일 생성 실패:', e);
					}
				} else {
					// 파일이 존재할 때
					if (!files.includes(selectedFilename)) {
						// 현재 선택된 파일이 목록에 없으면 첫 번째 파일 선택
						handleFileSelect(files[0]);
					}
				}
			}
		} catch (error) {
			console.error('파일 목록 로드 오류:', error);
		}
	}

	/**
	 * 단어집 파일 선택 처리
	 */
	async function handleFileSelect(filename: string) {
		if (selectedFilename === filename) return;
		selectedFilename = filename;
		vocabularyStore.update((store) => ({ ...store, selectedFilename: filename }));
		currentPage = 1;
		searchQuery = '';
		await loadFilterOptions();
		await loadVocabularyData();
	}

	/**
	 * 필터 옵션 로드 (전체 데이터 기준)
	 */
	async function loadFilterOptions() {
		try {
			const params = new URLSearchParams({
				filename: selectedFilename
			});

			const response = await fetch(`/api/vocabulary/filter-options?${params}`);
			const result: ApiResponse = await response.json();

			if (result.success && result.data && typeof result.data === 'object') {
				filterOptions = result.data as Record<string, string[]>;
			}
		} catch (error) {
			console.error('필터 옵션 로드 오류:', error);
		}
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
				filename: selectedFilename
			});

			// 다중 정렬 파라미터 추가
			Object.entries(sortConfig).forEach(([column, direction]) => {
				if (direction !== null) {
					params.append('sortBy[]', column);
					params.append('sortOrder[]', direction);
				}
			});

			// 중복 필터링 파라미터 추가
			const filterParam = getDuplicateFilterParam();
			if (filterParam) {
				params.set('filter', filterParam);
			}
			if (unmappedDomainOnly) {
				params.set('unmappedDomain', 'true');
			}

			// 컬럼 필터 파라미터 추가
			Object.entries(columnFilters).forEach(([key, value]) => {
				if (value !== null && value !== '') {
					params.append(`filters[${key}]`, value);
				}
			});

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

			// 다중 정렬 파라미터 추가
			Object.entries(sortConfig).forEach(([column, direction]) => {
				if (direction !== null) {
					params.append('sortBy[]', column);
					params.append('sortOrder[]', direction);
				}
			});

			// 중복 필터링 파라미터 추가
			const filterParam = getDuplicateFilterParam();
			if (filterParam) {
				params.set('filter', filterParam);
			}
			if (unmappedDomainOnly) {
				params.set('unmappedDomain', 'true');
			}

			// 컬럼 필터 파라미터 추가
			Object.entries(columnFilters).forEach(([key, value]) => {
				if (value !== null && value !== '') {
					params.append(`filters[${key}]`, value);
				}
			});

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
	 * 도메인 미매핑 필터 변경
	 */
	async function handleUnmappedToggle() {
		currentPage = 1;
		if (searchQuery) {
			await executeSearch();
		} else {
			await loadVocabularyData();
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
			await loadVocabularyData();
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
			await loadVocabularyData();
		}
	}

	/**
	 * 데이터 새로고침
	 */
	async function refreshData() {
		await loadVocabularyFiles();
		await loadFilterOptions();
		await loadVocabularyData();
	}

	/**
	 * 항목 클릭 처리 (팝업 열기)
	 */
	function handleEntryClick(
		event: CustomEvent<{ entry: VocabularyEntry }> | { entry: VocabularyEntry }
	) {
		// CustomEvent인 경우와 직접 객체인 경우 모두 처리
		const entry = 'detail' in event ? event.detail.entry : event.entry;
		currentEditingEntry = entry;
		editorServerError = '';
		showEditor = true;
	}

	/**
	 * 새 단어 추가 처리
	 */
	async function handleSave(event: CustomEvent<VocabularyEntry>) {
		const newEntry = event.detail;
		loading = true;
		editorServerError = ''; // 에러 상태 초기화

		const isEditMode = !!currentEditingEntry;

		try {
			const params = new URLSearchParams({ filename: selectedFilename });
			const method = isEditMode ? 'PUT' : 'POST';
			const response = await fetch(`/api/vocabulary?${params}`, {
				method,
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
				currentEditingEntry = null;
				// 데이터 새로고침 (성공한 경우에만)
				await loadVocabularyData();
			} else {
				// 에러 발생 시 모달 내부에 표시 (모달 유지, 새로고침하지 않음)
				const errorMsg =
					result.error || (isEditMode ? '단어 수정에 실패했습니다.' : '단어 추가에 실패했습니다.');
				editorServerError = errorMsg;
				// validation 오류 시 데이터 새로고침하지 않음
			}
		} catch (error) {
			console.error(isEditMode ? '단어 수정 중 오류:' : '단어 추가 중 오류:', error);
			const errorMsg = '서버 연결 오류가 발생했습니다.';
			editorServerError = errorMsg;
		} finally {
			loading = false;
		}
	}

	/**
	 * 단어 삭제 처리
	 */
	async function handleDelete(event: CustomEvent<VocabularyEntry>) {
		const entryToDelete = event.detail;
		loading = true;
		editorServerError = '';

		try {
			const params = new URLSearchParams({ id: entryToDelete.id, filename: selectedFilename });
			const response = await fetch(`/api/vocabulary?${params}`, { method: 'DELETE' });

			if (response.ok) {
				// 모달 닫기
				showEditor = false;
				editorServerError = '';
				currentEditingEntry = null;
				// 데이터 새로고침
				await loadVocabularyData();
			} else {
				const result: ApiResponse = await response.json();
				const errorMsg = result.error || '삭제에 실패했습니다.';
				editorServerError = errorMsg;
			}
		} catch (error) {
			console.error('삭제 오류:', error);
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
				filename: selectedFilename
			});

			// 다중 정렬 파라미터 추가
			Object.entries(sortConfig).forEach(([column, direction]) => {
				if (direction !== null) {
					params.append('sortBy[]', column);
					params.append('sortOrder[]', direction);
				}
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
			if (unmappedDomainOnly) {
				params.set('unmappedDomain', 'true');
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

	async function handleValidateAllVocabulary() {
		validationLoading = true;
		showValidationPanel = true;
		validationResults = null;
		try {
			const params = new URLSearchParams({ filename: selectedFilename });
			const response = await fetch(`/api/vocabulary/validate-all?${params.toString()}`);
			const result: ApiResponse = await response.json();
			if (result.success && result.data) {
				validationResults = result.data as NonNullable<typeof validationResults>;
			} else {
				throw new Error(result.error || '단어집 유효성 검사에 실패했습니다.');
			}
		} catch (error) {
			console.error('단어집 유효성 검사 오류:', error);
		} finally {
			validationLoading = false;
		}
	}

	function handleVocabularyValidationEdit(event: CustomEvent<{ entryId: string }>) {
		const { entryId } = event.detail;
		const failedEntry = validationResults?.failedEntries.find((item) => item.entry.id === entryId);
		if (!failedEntry) return;
		currentEditingEntry = failedEntry.entry;
		editorServerError = '';
		showEditor = true;
	}
</script>

<svelte:head>
	<title>데이터 관리 | 단어집</title>
	<meta name="description" content="단어집을 관리하고 검색하세요." />
</svelte:head>

{#snippet sidebar()}
	<div>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-bold text-gray-900">단어집 파일</h2>
			<button
				type="button"
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
			{#each vocabularyFiles as file (file)}
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
{/snippet}

{#snippet actions()}
	<ActionBar alignment="right">
		<button
			type="button"
			onclick={() => {
				currentEditingEntry = null;
				editorServerError = '';
				showEditor = true;
			}}
			disabled={loading}
			class="btn btn-primary rounded-xl px-6 py-3"
		>
			<Icon name="plus" size="sm" />
			<span>새 단어 추가</span>
		</button>
		<button
			type="button"
			onclick={handleValidateAllVocabulary}
			disabled={loading || validationLoading}
			class="btn btn-outline rounded-xl px-6 py-3"
		>
			<Icon name={validationLoading ? 'spinner' : 'check-circle'} size="sm" />
			<span>{validationLoading ? '검사 중' : '유효성 검사'}</span>
		</button>
		<button
			type="button"
			onclick={handleDownload}
			disabled={loading}
			class="btn btn-outline rounded-xl px-6 py-3"
		>
			<Icon name={loading ? 'spinner' : 'download'} size="sm" />
			<span>{loading ? '준비 중' : 'XLSX 다운로드'}</span>
		</button>
		<button
			type="button"
			onclick={refreshData}
			disabled={loading}
			class="btn btn-secondary rounded-xl px-6 py-3"
		>
			<Icon name={loading ? 'spinner' : 'refresh'} size="sm" />
			<span>{loading ? '로딩 중' : '새로고침'}</span>
		</button>
	</ActionBar>
{/snippet}

<BrowsePageLayout
	title="단어집"
	description={`현재 파일: ${selectedFilename}`}
	breadcrumbItems={getNavigationBreadcrumbItems('/browse')}
	{sidebar}
	{actions}
>
	{#if showEditor}
		<VocabularyEditor
			entry={currentEditingEntry || {}}
			isEditMode={!!currentEditingEntry}
			serverError={editorServerError}
			filename={selectedFilename}
			on:save={handleSave}
			on:delete={handleDelete}
			on:cancel={() => {
				showEditor = false;
				editorServerError = '';
				currentEditingEntry = null;
			}}
		/>
	{/if}

	{#if showValidationPanel}
		<VocabularyValidationPanel
			results={validationResults?.failedEntries || []}
			totalCount={validationResults?.totalCount || 0}
			failedCount={validationResults?.failedCount || 0}
			passedCount={validationResults?.passedCount || 0}
			loading={validationLoading}
			open={showValidationPanel}
			on:close={() => (showValidationPanel = false)}
			on:edit={handleVocabularyValidationEdit}
		/>
	{/if}

	<VocabularyFileManager
		isOpen={isFileManagerOpen}
		currentFilename={selectedFilename}
		on:close={() => (isFileManagerOpen = false)}
		on:change={async () => {
			await loadVocabularyFiles();
			await loadVocabularyData();
		}}
	/>

	<BentoGrid>
		<div class="col-span-12 lg:col-span-7">
			<BentoCard title="통합검색" subtitle="표준단어명, 영문약어, 영문명으로 단어를 검색하세요">
				<div class="mb-6">
					<SearchBar
						bind:query={searchQuery}
						bind:field={searchField}
						bind:exact={searchExact}
						onsearch={handleSearch}
						onclear={handleSearchClear}
					/>
				</div>

				<div class="space-y-3">
					<h3 class="text-sm font-medium text-gray-700">중복/상태 필터</h3>
					<div class="flex flex-wrap items-center gap-6">
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
						<div class="flex items-center space-x-2">
							<input
								type="checkbox"
								id="unmappedDomainOnly"
								bind:checked={unmappedDomainOnly}
								onchange={handleUnmappedToggle}
								class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
							/>
							<label
								for="unmappedDomainOnly"
								class="cursor-pointer select-none text-sm font-medium text-gray-700"
							>
								도메인 미매핑
							</label>
						</div>
					</div>
				</div>
			</BentoCard>
		</div>

		<div class="col-span-12 lg:col-span-5">
			<BentoCard title="요약" subtitle="현재 조건의 결과를 확인하세요.">
				<div class="grid grid-cols-2 gap-3 text-sm">
					<div class="rounded-lg bg-surface-muted p-3">
						<p class="text-xs text-content-muted">총 건수</p>
						<p class="mt-1 text-lg font-semibold text-content">{totalCount.toLocaleString()}</p>
					</div>
					<div class="rounded-lg bg-surface-muted p-3">
						<p class="text-xs text-content-muted">페이지</p>
						<p class="mt-1 text-lg font-semibold text-content">{currentPage} / {totalPages}</p>
					</div>
					<div class="col-span-2 rounded-lg bg-surface-muted p-3">
						<p class="text-xs text-content-muted">검색어</p>
						<p class="mt-1 truncate text-content-secondary">{searchQuery ? searchQuery : '전체'}</p>
					</div>
				</div>
			</BentoCard>
		</div>

		<div class="col-span-12">
			<BentoCard
				title="검색 결과"
				subtitle={searchQuery ? `"${searchQuery}" 검색 결과` : '전체 단어'}
			>
				<div class="overflow-x-auto rounded-xl border border-gray-200">
					<VocabularyTable
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
						onentryclick={handleEntryClick}
						onClearAllFilters={handleClearAllFilters}
					/>
				</div>
			</BentoCard>
		</div>
	</BentoGrid>
</BrowsePageLayout>
