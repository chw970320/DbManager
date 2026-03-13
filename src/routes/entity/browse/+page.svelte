<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
import SearchBar from '$lib/components/SearchBar.svelte';
	import DesignRelationPanel from '$lib/components/DesignRelationPanel.svelte';
	import EntityTable from '$lib/components/EntityTable.svelte';
	import EntityEditor from '$lib/components/EntityEditor.svelte';
	import EntityFileManager from '$lib/components/EntityFileManager.svelte';
	import BrowsePageLayout from '$lib/components/BrowsePageLayout.svelte';
import ActionBar from '$lib/components/ActionBar.svelte';
import Icon from '$lib/components/Icon.svelte';
	import BentoGrid from '$lib/components/BentoGrid.svelte';
	import BentoCard from '$lib/components/BentoCard.svelte';
	import type { EntityEntry, DbDesignApiResponse } from '$lib/types/database-design.js';
	import type { DataType } from '$lib/types/base';
	import { entityDataStore as entityStore } from '$lib/stores/unified-store';
	import { settingsStore } from '$lib/stores/settings-store';
	import { filterEntityFiles } from '$lib/utils/file-filter';
	import { extractDbDesignRelatedMapping } from '$lib/utils/db-design-file-mapping';

	type SearchDetail = { query: string; field: string; exact: boolean };
	type SortDetail = { column: string; direction: 'asc' | 'desc' | null };
	type PageChangeDetail = { page: number };
	type FilterDetail = { column: string; value: string | null };
	let entries = $state<EntityEntry[]>([]);
	let loading = $state(false);
	let searchQuery = $state('');
	let searchField = $state('all');
	let searchExact = $state(false);
	let totalCount = $state(0);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let pageSize = $state(20);
	let sortConfig = $state<Record<string, 'asc' | 'desc' | null>>({});
	let columnFilters = $state<Record<string, string | null>>({});
	let filterOptions = $state<Record<string, string[]>>({});

	let allEntityFiles = $state<string[]>([]);
	let entityFiles = $state<string[]>([]);
	let selectedFilename = $state('entity.json');
	let showSystemFiles = $state(false);
	let relationFileMapping = $state<Partial<Record<DataType, string>>>({});

	let showEditor = $state(false);
	let editorServerError = $state('');
	let isFileManagerOpen = $state(false);
	let currentEditingEntry = $state<EntityEntry | null>(null);

	let unsubscribe: () => void;
	let settingsUnsubscribe: () => void;
	let pageDataRequestSeq = 0;

	onMount(() => {
		settingsUnsubscribe = settingsStore.subscribe((settings) => {
			showSystemFiles = settings.showEntitySystemFiles ?? false;
			if (allEntityFiles.length > 0) {
				const newFilteredFiles = filterEntityFiles(allEntityFiles, showSystemFiles);
				entityFiles = newFilteredFiles;
				// 현재 선택된 파일이 필터링된 목록에 없으면 첫 번째 파일로 전환
				if (newFilteredFiles.length > 0 && !newFilteredFiles.includes(selectedFilename)) {
					handleFileSelect(newFilteredFiles[0]);
				}
			}
		});

		(async () => {
			await loadFiles();
			if (browser) {
				await loadPageData(selectedFilename);
			}
		})();
		unsubscribe = entityStore.subscribe((value) => {
			if (selectedFilename !== value.selectedFilename) {
				selectedFilename = value.selectedFilename;
				if (browser) {
					currentPage = 1;
					searchQuery = '';
					void loadPageData(value.selectedFilename);
				}
			}
		});
		return () => {
			if (unsubscribe) unsubscribe();
			if (settingsUnsubscribe) settingsUnsubscribe();
		};
	});

	async function loadFiles() {
		try {
			const response = await fetch('/api/entity/files');
			const result: DbDesignApiResponse = await response.json();
			if (result.success && Array.isArray(result.data)) {
				const files = result.data as string[];
				allEntityFiles = files;
				const filteredFiles = filterEntityFiles(files, showSystemFiles);
				entityFiles = filteredFiles;
				if (files.length === 0) {
					const createResponse = await fetch('/api/entity/files', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ filename: 'entity.json' })
					});
					if (createResponse.ok) {
						allEntityFiles = ['entity.json'];
						entityFiles = filterEntityFiles(['entity.json'], showSystemFiles);
						if (selectedFilename !== 'entity.json') handleFileSelect('entity.json');
					}
				} else if (filteredFiles.length > 0 && !filteredFiles.includes(selectedFilename)) {
					handleFileSelect(filteredFiles[0]);
				} else if (!files.includes(selectedFilename)) {
					handleFileSelect(filteredFiles.length > 0 ? filteredFiles[0] : files[0]);
				}
			}
		} catch (error) {
			console.error('파일 목록 로드 오류:', error);
		}
	}

	function toDefinitionFileMapping(mapping?: Record<string, unknown>): Partial<Record<DataType, string>> {
		return extractDbDesignRelatedMapping(mapping);
	}

	async function loadRelationFileMapping(filename: string, requestSeq?: number) {
		try {
			const response = await fetch(
				`/api/entity/files/mapping?filename=${encodeURIComponent(filename)}`
			);
			const result: DbDesignApiResponse<{ mapping?: Record<string, unknown> }> =
				await response.json();
			if (requestSeq !== undefined && requestSeq !== pageDataRequestSeq) {
				return;
			}
			relationFileMapping = result.success
				? toDefinitionFileMapping(result.data?.mapping)
				: {};
		} catch (mappingError) {
			console.error('관계 파일 매핑 로드 오류:', mappingError);
			if (requestSeq !== undefined && requestSeq !== pageDataRequestSeq) {
				return;
			}
			relationFileMapping = {};
		}
	}

	async function loadFilterOptions(filename = selectedFilename, requestSeq?: number) {
		try {
			const params = new URLSearchParams({ filename });
			const response = await fetch(`/api/entity/filter-options?${params}`);
			const result: DbDesignApiResponse = await response.json();
			if (requestSeq !== undefined && requestSeq !== pageDataRequestSeq) {
				return;
			}
			if (result.success && result.data && typeof result.data === 'object') {
				filterOptions = result.data as Record<string, string[]>;
			}
		} catch (error) {
			console.error('필터 옵션 로드 오류:', error);
		}
	}

	async function loadPageData(filename: string) {
		const requestSeq = ++pageDataRequestSeq;
		selectedFilename = filename;
		await loadData(filename, requestSeq);
		if (requestSeq !== pageDataRequestSeq) {
			return;
		}
		void Promise.allSettled([
			loadRelationFileMapping(filename, requestSeq),
			loadFilterOptions(filename, requestSeq)
		]);
	}

	async function handleFileSelect(filename: string) {
		if (selectedFilename === filename) return;
		selectedFilename = filename;
		entityStore.update((store) => ({ ...store, selectedFilename: filename }));
		currentPage = 1;
		searchQuery = '';
		await loadPageData(filename);
	}

	async function loadData(filename = selectedFilename, requestSeq?: number) {
		loading = true;
		try {
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: pageSize.toString(),
				filename
			});
			Object.entries(sortConfig).forEach(([column, direction]) => {
				if (direction !== null) {
					params.append('sortBy[]', column);
					params.append('sortOrder[]', direction);
				}
			});
			Object.entries(columnFilters).forEach(([key, value]) => {
				if (value !== null && value !== '') params.append(`filters[${key}]`, value);
			});
			if (searchQuery) {
				params.set('q', searchQuery);
				params.set('field', searchField);
				params.set('exact', searchExact.toString());
			}

			const response = await fetch(`/api/entity?${params}`);
			const result: DbDesignApiResponse = await response.json();
			if (requestSeq !== undefined && requestSeq !== pageDataRequestSeq) {
				return;
			}
			if (result.success && result.data) {
				const data = result.data as {
					entries: EntityEntry[];
					pagination?: { totalCount: number; totalPages: number };
				};
				entries = data.entries || [];
				if (data.pagination) {
					totalCount = data.pagination.totalCount || 0;
					totalPages = data.pagination.totalPages || 1;
				}
			} else {
				entries = [];
				totalCount = 0;
			}
		} catch (error) {
			console.error('데이터 로드 오류:', error);
			if (requestSeq !== undefined && requestSeq !== pageDataRequestSeq) {
				return;
			}
			entries = [];
		} finally {
			if (requestSeq !== undefined && requestSeq !== pageDataRequestSeq) {
				return;
			}
			loading = false;
		}
	}

	async function handleSearch(detail: SearchDetail) {
		searchQuery = detail.query;
		searchField = detail.field;
		searchExact = detail.exact;
		currentPage = 1;
		await loadData();
	}
	async function handleSearchClear() {
		searchQuery = '';
		searchField = 'all';
		searchExact = false;
		currentPage = 1;
		await loadData();
	}
	async function handleSort(detail: SortDetail) {
		if (detail.direction === null) {
			const newConfig = { ...sortConfig };
			delete newConfig[detail.column];
			sortConfig = newConfig;
		} else sortConfig = { ...sortConfig, [detail.column]: detail.direction };
		await loadData();
	}
	async function handlePageChange(detail: PageChangeDetail) {
		currentPage = detail.page;
		await loadData();
	}
	async function handleFilter(detail: FilterDetail) {
		currentPage = 1;
		if (detail.value === null || detail.value === '') {
			const { [detail.column]: _, ...rest } = columnFilters;
			columnFilters = rest;
		} else columnFilters = { ...columnFilters, [detail.column]: detail.value };
		await loadData();
	}
	async function handleClearAllFilters() {
		columnFilters = {};
		sortConfig = {};
		currentPage = 1;
		await loadData();
	}
	async function refreshData() {
		await loadFiles();
		await loadPageData(selectedFilename);
	}
	function handleEntryClick(event: { entry: EntityEntry }) {
		currentEditingEntry = event.entry;
		editorServerError = '';
		showEditor = true;
	}

	async function handleSave(event: CustomEvent<EntityEntry>) {
		loading = true;
		editorServerError = '';
		const isEditMode = !!currentEditingEntry;
		try {
			const params = new URLSearchParams({ filename: selectedFilename });
			const response = await fetch(`/api/entity?${params}`, {
				method: isEditMode ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(event.detail)
			});
			const result: DbDesignApiResponse = await response.json();
			if (result.success) {
				showEditor = false;
				editorServerError = '';
				currentEditingEntry = null;
				await loadData();
			} else
				editorServerError =
					result.error || (isEditMode ? '수정에 실패했습니다.' : '추가에 실패했습니다.');
		} catch (error) {
			console.error('저장 중 오류:', error);
			editorServerError = '서버 연결 오류가 발생했습니다.';
		} finally {
			loading = false;
		}
	}

	async function handleDelete(event: CustomEvent<EntityEntry>) {
		loading = true;
		editorServerError = '';
		try {
			const params = new URLSearchParams({ id: event.detail.id, filename: selectedFilename });
			const response = await fetch(`/api/entity?${params}`, { method: 'DELETE' });
			if (response.ok) {
				showEditor = false;
				editorServerError = '';
				currentEditingEntry = null;
				await loadData();
			} else {
				const result: DbDesignApiResponse = await response.json();
				editorServerError = result.error || '삭제에 실패했습니다.';
			}
		} catch (error) {
			console.error('삭제 오류:', error);
			editorServerError = '서버 연결 오류가 발생했습니다.';
		} finally {
			loading = false;
		}
	}

	async function handleDownload() {
		loading = true;
		try {
			const params = new URLSearchParams({ filename: selectedFilename });
			Object.entries(sortConfig).forEach(([column, direction]) => {
				if (direction !== null) {
					params.append('sortBy[]', column);
					params.append('sortOrder[]', direction);
				}
			});
			if (searchQuery) {
				params.set('q', searchQuery);
				params.set('field', searchField);
				params.set('exact', searchExact.toString());
			}
			const response = await fetch(`/api/entity/download?${params}`);
			if (!response.ok) throw new Error(`다운로드 실패: ${response.status}`);
			const blob = await response.blob();
			let filename = 'entity.xlsx';
			const contentDisposition = response.headers.get('Content-Disposition');
			if (contentDisposition) {
				const match = contentDisposition.match(/filename="([^"]+)"/);
				if (match) filename = match[1];
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
			console.error('다운로드 중 오류:', error);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>데이터 관리 | 엔터티 정의서</title>
	<meta name="description" content="엔터티 정의서를 관리하고 검색하세요." />
</svelte:head>

{#snippet sidebar()}
	<div>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-bold text-gray-900">정의서 파일</h2>
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
			{#each entityFiles as file (file)}
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
			{#if entityFiles.length === 0}
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
			<span>새 정의서 추가</span>
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

<BrowsePageLayout title="엔터티 정의서" description={`현재 파일: ${selectedFilename}`} {sidebar} {actions}>
	<EntityFileManager
		isOpen={isFileManagerOpen}
		currentFilename={selectedFilename}
		on:close={() => (isFileManagerOpen = false)}
		on:change={async () => {
			await loadFiles();
			await loadPageData(selectedFilename);
		}}
	/>

	{#if showEditor}
		<EntityEditor
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

	<BentoGrid>
		<div class="col-span-12">
			<BentoCard title="연관 파일" subtitle="정의서 간 연결 관계를 확인/적용합니다.">
				<DesignRelationPanel
					currentType="entity"
					currentFilename={selectedFilename}
					fileMapping={relationFileMapping}
					onApplied={refreshData}
				/>
			</BentoCard>
		</div>

		<div class="col-span-12 lg:col-span-7">
			<BentoCard title="통합검색" subtitle="엔터티명, 스키마명 등으로 검색하세요">
				<SearchBar
					bind:query={searchQuery}
					bind:field={searchField}
					bind:exact={searchExact}
					searchFields={[
						{ value: 'all', label: '전체' },
						{ value: 'schemaName', label: '스키마명' },
						{ value: 'entityName', label: '엔터티명' },
						{ value: 'primaryIdentifier', label: '주식별자' },
						{ value: 'superTypeEntityName', label: '수퍼타입엔터티명' },
						{ value: 'tableKoreanName', label: '테이블한글명' }
					]}
					onsearch={handleSearch}
					onclear={handleSearchClear}
				/>
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
			<BentoCard title="검색 결과" subtitle={searchQuery ? `\"${searchQuery}\" 검색 결과` : '전체 엔터티 정의서'}>
				<div class="overflow-x-auto rounded-xl border border-gray-200">
					<EntityTable
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
