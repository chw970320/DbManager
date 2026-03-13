<script lang="ts">
	import { onMount } from 'svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import DomainTable from '$lib/components/DomainTable.svelte';
	import DomainFileManager from '$lib/components/DomainFileManager.svelte';
	import DomainEditor from '$lib/components/DomainEditor.svelte';
	import DomainDataTypeMappingModal from '$lib/components/DomainDataTypeMappingModal.svelte';
	import DomainValidationPanel from '$lib/components/DomainValidationPanel.svelte';
	import BrowsePageLayout from '$lib/components/BrowsePageLayout.svelte';
	import ActionBar from '$lib/components/ActionBar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import BentoGrid from '$lib/components/BentoGrid.svelte';
	import BentoCard from '$lib/components/BentoCard.svelte';
	import type { DomainEntry, DomainApiResponse } from '$lib/types/domain.js';
	import type { DomainDataTypeMappingLike } from '$lib/utils/domain-name';
	import { DEFAULT_DOMAIN_DATA_TYPE_MAPPINGS } from '$lib/utils/domain-name';
	import { resolvePreferredFilename } from '$lib/utils/file-selection';
	import { get } from 'svelte/store';
	import { settingsStore } from '$lib/stores/settings-store';
	import { domainDataStore as domainStore } from '$lib/stores/unified-store';
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
	// 다중 정렬 상태 관리 (각 컬럼별로 독립적인 정렬 상태)
	let sortConfig = $state<Record<string, 'asc' | 'desc' | null>>({});
	let _lastUpdated = $state('');
	let errorMessage = $state('');
	let columnFilters = $state<Record<string, string | null>>({}); // 컬럼 필터 상태
	let filterOptions = $state<Record<string, string[]>>({}); // 필터 옵션 (전체 데이터 기준)

	// 파일 관리 상태
	let isFileManagerOpen = $state(false);
	let isDataTypeMappingOpen = $state(false);
	let selectedFilename = $state(get(domainStore).selectedFilename);
	let fileList = $state<string[]>([]);
	let dataTypeMappings = $state<DomainDataTypeMappingLike[]>([
		...DEFAULT_DOMAIN_DATA_TYPE_MAPPINGS
	]);
	let unsubscribe: (() => void) | undefined;

	// 편집기 상태
	let showEditor = $state(false);
	let editorServerError = $state('');
	let currentEditingEntry = $state<DomainEntry | null>(null);
	let showValidationPanel = $state(false);
	let validationLoading = $state(false);
	let validationResults = $state<{
		totalCount: number;
		failedCount: number;
		passedCount: number;
		failedEntries: Array<{
			entry: DomainEntry;
			errors: Array<{
				type: string;
				code: string;
				message: string;
				field?: string;
				priority: number;
			}>;
			generatedDomainName?: string;
		}>;
	} | null>(null);

	// 이벤트 상세 타입 정의
	type SearchDetail = { query: string; field: string; exact: boolean };
	type SortDetail = { column: string; direction: 'asc' | 'desc' | null };
	type PageChangeDetail = { page: number };
	type FilterDetail = { column: string; value: string | null };

	function syncSelectedFilename(filename: string) {
		selectedFilename = filename;
		if (get(domainStore).selectedFilename !== filename) {
			domainStore.set({ selectedFilename: filename });
		}
	}

	function reconcileSelectedFilename(files: string[]) {
		const resolvedFilename = resolvePreferredFilename({
			files,
			currentSelection: selectedFilename,
			fallbackFilename: 'domain.json'
		});
		syncSelectedFilename(resolvedFilename);
	}

	/**
	 * 컴포넌트 마운트 시 초기 데이터 로드
	 */
	onMount(() => {
		void (async () => {
			await loadDataTypeMappings();
			await loadFileList();
			// 파일 목록 로드 후 데이터 로드
			if (fileList.length > 0) {
				reconcileSelectedFilename(fileList);
				await loadFilterOptions();
				await loadDomainData();
			}
		})();

		unsubscribe = domainStore.subscribe((value) => {
			if (selectedFilename !== value.selectedFilename) {
				selectedFilename = value.selectedFilename;
				currentPage = 1;
				searchQuery = '';
				void loadFilterOptions();
				void loadDomainData();
			}
		});

		return () => {
			if (unsubscribe) unsubscribe();
		};
	});

	async function loadDataTypeMappings() {
		try {
			const response = await fetch('/api/domain/type-mappings');
			const result = await response.json();
			if (result.success && result.data && Array.isArray(result.data.entries)) {
				dataTypeMappings = result.data.entries;
			}
		} catch (mappingError) {
			console.error('데이터타입 매핑 목록 로드 오류:', mappingError);
		}
	}

	async function loadFileList() {
		try {
			const response = await fetch('/api/domain/files');
			const result = await response.json();
			if (result.success && result.data) {
				const allFiles = result.data as string[];
				// 설정에 따라 필터링 - 초기값만 가져오기 위해 get() 사용
				const settings = get(settingsStore);
				fileList = filterDomainFiles(allFiles, settings.showDomainSystemFiles);

				// 파일 목록이 비어있으면 기본 파일 생성 시도
				if (fileList.length === 0 && allFiles.length === 0) {
					try {
						const createResponse = await fetch('/api/domain/files', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ filename: 'domain.json' })
						});
						if (createResponse.ok) {
							fileList = ['domain.json'];
							if (selectedFilename !== 'domain.json') {
								selectedFilename = 'domain.json';
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
							domainStore.set({ selectedFilename: fileList[0] });
							loadDomainData();
						}
					}
				})
				.catch((error) => console.error('파일 목록 로드 실패:', error));
		});
		return unsubscribe;
	});

	/**
	 * 필터 옵션 로드 (전체 데이터 기준)
	 */
	async function loadFilterOptions() {
		try {
			const params = new URLSearchParams({
				filename: selectedFilename
			});

			const response = await fetch(`/api/domain/filter-options?${params}`);
			const result: DomainApiResponse<Record<string, string[]>> = await response.json();

			if (result.success && result.data && typeof result.data === 'object') {
				filterOptions = result.data;
			}
		} catch (error) {
			console.error('필터 옵션 로드 오류:', error);
		}
	}

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
				_lastUpdated = data.lastUpdated || '';
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
		await loadDomainData();
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

			// 컬럼 필터 파라미터 추가
			Object.entries(columnFilters).forEach(([key, value]) => {
				if (value !== null && value !== '') {
					params.append(`filters[${key}]`, value);
				}
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
		await loadDataTypeMappings();
		await loadFileList();
		// 파일 목록 로드 후 selectedFilename 확인
		if (fileList.length > 0 && !fileList.includes(selectedFilename)) {
			selectedFilename = fileList[0];
		}
		await loadFilterOptions();
		if (searchQuery) {
			await executeSearch();
		} else {
			await loadDomainData();
		}
	}

	async function handleDataTypeMappingChange() {
		await handleRefresh();
	}

	async function handleValidateAllDomain() {
		validationLoading = true;
		showValidationPanel = true;
		validationResults = null;
		try {
			const params = new URLSearchParams({ filename: selectedFilename });
			const response = await fetch(`/api/domain/validate-all?${params.toString()}`);
			const result: DomainApiResponse = await response.json();
			if (result.success && result.data) {
				validationResults = result.data as NonNullable<typeof validationResults>;
			} else {
				throw new Error(result.error || '도메인 유효성 검사에 실패했습니다.');
			}
		} catch (error) {
			console.error('도메인 유효성 검사 오류:', error);
			errorMessage =
				error instanceof Error ? error.message : '도메인 유효성 검사 중 오류가 발생했습니다.';
		} finally {
			validationLoading = false;
		}
	}

	function handleDomainValidationEdit(event: CustomEvent<{ entryId: string }>) {
		const { entryId } = event.detail;
		const failedEntry = validationResults?.failedEntries.find((item) => item.entry.id === entryId);
		if (!failedEntry) return;
		currentEditingEntry = failedEntry.entry;
		editorServerError = '';
		showEditor = true;
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
			await loadDomainData();
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
			await loadDomainData();
		}
	}

	/**
	 * 도메인 XLSX 다운로드 처리 (단어집 관리와 동일하게)
	 */
	async function handleDomainDownload() {
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
	 * 파일 선택 변경 처리
	 */
	async function handleFileSelect(filename: string) {
		if (selectedFilename === filename) return;
		syncSelectedFilename(filename);
		currentPage = 1;
		searchQuery = '';
		await loadFilterOptions();
		await loadDomainData();
	}

	async function handleFileChange() {
		// 파일 변경 시 파일 목록 다시 로드 후 데이터 새로고침
		await loadFileList();
		// 파일 목록 로드 후 selectedFilename 확인
		if (fileList.length > 0) {
			reconcileSelectedFilename(fileList);
		}
		await handleRefresh();
	}

	/**
	 * 항목 클릭 처리 (팝업 열기)
	 */
	function handleEntryClick(event: CustomEvent<{ entry: DomainEntry }> | { entry: DomainEntry }) {
		// CustomEvent인 경우와 직접 객체인 경우 모두 처리
		const entry = 'detail' in event ? event.detail.entry : event.entry;
		currentEditingEntry = entry;
		editorServerError = '';
		showEditor = true;
	}

	/**
	 * 도메인 저장 처리
	 */
	async function handleSave(event: CustomEvent<DomainEntry>) {
		const editedEntry = event.detail;
		loading = true;
		editorServerError = '';

		// 새 도메인 추가인지 수정인지 판단
		const isEditMode =
			!!currentEditingEntry && !!currentEditingEntry.id && currentEditingEntry.id.trim() !== '';
		const method = isEditMode ? 'PUT' : 'POST';

		try {
			const params = new URLSearchParams({ filename: selectedFilename });
			const response = await fetch(`/api/domain?${params}`, {
				method,
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(editedEntry)
			});

			const result: DomainApiResponse = await response.json();

			if (result.success && result.data) {
				// 모달 닫기
				showEditor = false;
				editorServerError = '';
				currentEditingEntry = null;
				// 데이터 새로고침
				await loadDomainData();
			} else {
				// 에러 발생 시 모달 내부에 표시
				const errorMsg =
					result.error ||
					(isEditMode ? '도메인 수정에 실패했습니다.' : '도메인 추가에 실패했습니다.');
				editorServerError = errorMsg;
			}
		} catch (error) {
			console.error(isEditMode ? '도메인 수정 중 오류:' : '도메인 추가 중 오류:', error);
			const errorMsg = '서버 연결 오류가 발생했습니다.';
			editorServerError = errorMsg;
		} finally {
			loading = false;
		}
	}

	/**
	 * 도메인 삭제 처리
	 */
	async function handleDelete(event: CustomEvent<DomainEntry>) {
		const entryToDelete = event.detail;
		loading = true;
		editorServerError = '';

		try {
			const params = new URLSearchParams({ id: entryToDelete.id, filename: selectedFilename });
			const response = await fetch(`/api/domain?${params}`, { method: 'DELETE' });

			const result: DomainApiResponse = await response.json();

			if (result.success) {
				// 모달 닫기
				showEditor = false;
				editorServerError = '';
				currentEditingEntry = null;
				// 데이터 새로고침
				await loadDomainData();
			} else {
				const errorMsg = result.error || '도메인 삭제에 실패했습니다.';
				editorServerError = errorMsg;
			}
		} catch (error) {
			console.error('도메인 삭제 중 오류:', error);
			const errorMsg = '서버 연결 오류가 발생했습니다.';
			editorServerError = errorMsg;
		} finally {
			loading = false;
		}
	}

	/**
	 * 편집 취소 처리
	 */
	function handleCancel() {
		showEditor = false;
		editorServerError = '';
		currentEditingEntry = null;
	}
</script>

<svelte:head>
	<title>데이터 관리 | 도메인</title>
	<meta name="description" content="도메인을 관리하고 검색하세요." />
</svelte:head>

{#snippet sidebar()}
	<div>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-bold text-gray-900">도메인 파일</h2>
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
{/snippet}

{#snippet actions()}
	<div role="group" aria-label="현재 파일 작업">
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
				<span>새 도메인 추가</span>
			</button>
			<button
				type="button"
				onclick={handleValidateAllDomain}
				disabled={loading || validationLoading}
				class="btn btn-outline rounded-xl px-6 py-3"
			>
				<Icon name={validationLoading ? 'spinner' : 'check-circle'} size="sm" />
				<span>{validationLoading ? '검사 중' : '유효성 검사'}</span>
			</button>
			<button
				type="button"
				onclick={handleDomainDownload}
				disabled={loading}
				class="btn btn-outline rounded-xl px-6 py-3"
			>
				<Icon name={loading ? 'spinner' : 'download'} size="sm" />
				<span>{loading ? '준비 중' : 'XLSX 다운로드'}</span>
			</button>
			<button
				type="button"
				onclick={handleRefresh}
				disabled={loading}
				class="btn btn-secondary rounded-xl px-6 py-3"
			>
				<Icon name={loading ? 'spinner' : 'refresh'} size="sm" />
				<span>{loading ? '로딩 중' : '새로고침'}</span>
			</button>
		</ActionBar>
	</div>
{/snippet}

{#snippet dataTypeMappingActions()}
	<button
		type="button"
		onclick={() => (isDataTypeMappingOpen = true)}
		disabled={loading}
		class="btn btn-outline rounded-xl px-5 py-3 text-amber-900"
	>
		데이터타입 매핑 관리
	</button>
{/snippet}

<BrowsePageLayout title="도메인" description={`현재 파일: ${selectedFilename}`} {sidebar} {actions}>
	{#if showEditor}
		<DomainEditor
			entry={currentEditingEntry || {}}
			isEditMode={!!currentEditingEntry}
			serverError={editorServerError}
			filename={selectedFilename}
			{dataTypeMappings}
			on:save={handleSave}
			on:delete={handleDelete}
			on:cancel={handleCancel}
		/>
	{/if}

	<DomainDataTypeMappingModal
		isOpen={isDataTypeMappingOpen}
		on:close={() => (isDataTypeMappingOpen = false)}
		on:change={handleDataTypeMappingChange}
	/>

	{#if showValidationPanel}
		<DomainValidationPanel
			results={validationResults?.failedEntries || []}
			totalCount={validationResults?.totalCount || 0}
			failedCount={validationResults?.failedCount || 0}
			passedCount={validationResults?.passedCount || 0}
			loading={validationLoading}
			open={showValidationPanel}
			on:close={() => (showValidationPanel = false)}
			on:edit={handleDomainValidationEdit}
		/>
	{/if}

	<DomainFileManager
		isOpen={isFileManagerOpen}
		currentFilename={selectedFilename}
		on:close={() => (isFileManagerOpen = false)}
		on:change={handleFileChange}
	/>

	<BentoGrid>
		<div class="col-span-12 lg:col-span-7">
			<section aria-label="전역 도메인명 규칙">
				<BentoCard
					eyebrow="전체 파일 공통 규칙"
					title="데이터타입 매핑 관리"
					subtitle="현재 선택 파일과 관계없이 모든 도메인 파일의 표준명 생성 규칙에 적용됩니다."
					class="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50"
					actions={dataTypeMappingActions}
				>
					<p class="text-sm text-gray-700">
						도메인 표준명 생성 시 자료형을 일관되게 유지하려면 먼저 매핑을 정리하는 것을 권장합니다.
					</p>
				</BentoCard>
			</section>
		</div>

		<div class="col-span-12 lg:col-span-5">
			{#if errorMessage}
				<BentoCard
					title="오류 발생"
					subtitle="요청을 처리하는 중 문제가 발생했습니다."
					class="border-red-200/60 bg-gradient-to-r from-red-50 to-pink-50"
				>
					<p class="text-sm text-red-800">{errorMessage}</p>
				</BentoCard>
			{:else}
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
							<p class="mt-1 truncate text-content-secondary">
								{searchQuery ? searchQuery : '전체'}
							</p>
						</div>
					</div>
				</BentoCard>
			{/if}
		</div>

		<div class="col-span-12">
			<BentoCard
				title="통합검색"
				subtitle="도메인 그룹, 분류명, 표준 도메인명, 데이터타입으로 검색하세요"
			>
				<SearchBar
					placeholder="도메인 그룹, 분류명, 표준명, 데이터타입으로 검색하세요..."
					searchFields={[
						{ value: 'all', label: '전체' },
						{ value: 'domainGroup', label: '도메인그룹' },
						{ value: 'domainCategory', label: '도메인분류명' },
						{ value: 'standardDomainName', label: '도메인명' },
						{ value: 'physicalDataType', label: '데이터타입' }
					]}
					bind:query={searchQuery}
					bind:field={searchField}
					bind:exact={searchExact}
					onsearch={handleSearch}
					onclear={handleSearchClear}
				/>
			</BentoCard>
		</div>

		<div class="col-span-12">
			<BentoCard
				title="검색 결과"
				subtitle={searchQuery ? `"${searchQuery}" 검색 결과` : '전체 도메인'}
			>
				<div class="overflow-x-auto rounded-xl border border-gray-200">
					<DomainTable
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
