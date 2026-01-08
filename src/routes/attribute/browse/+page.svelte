<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import AttributeTable from '$lib/components/AttributeTable.svelte';
	import AttributeEditor from '$lib/components/AttributeEditor.svelte';
	import AttributeFileManager from '$lib/components/AttributeFileManager.svelte';
	import type { AttributeEntry, DbDesignApiResponse } from '$lib/types/database-design.js';
	import { attributeStore } from '$lib/stores/database-design-store';
	import { settingsStore } from '$lib/stores/settings-store';
	import { filterAttributeFiles } from '$lib/utils/file-filter';

	type SearchDetail = { query: string; field: string; exact: boolean };
	type SortDetail = { column: string; direction: 'asc' | 'desc' | null };
	type PageChangeDetail = { page: number };
	type FilterDetail = { column: string; value: string | null };

	let entries = $state<AttributeEntry[]>([]);
	let loading = $state(false); let searchQuery = $state(''); let searchField = $state('all'); let searchExact = $state(false);
	let totalCount = $state(0); let currentPage = $state(1); let totalPages = $state(1); let pageSize = $state(20);
	let sortConfig = $state<Record<string, 'asc' | 'desc' | null>>({}); let columnFilters = $state<Record<string, string | null>>({}); let filterOptions = $state<Record<string, string[]>>({});
	let allAttributeFiles = $state<string[]>([]); let attributeFiles = $state<string[]>([]); let selectedFilename = $state('attribute.json'); let showSystemFiles = $state(false);
	let showEditor = $state(false); let editorServerError = $state(''); let isFileManagerOpen = $state(false); let sidebarOpen = $state(false);
	let currentEditingEntry = $state<AttributeEntry | null>(null);
	let unsubscribe: () => void;
	let settingsUnsubscribe: () => void;

	onMount(() => {
		settingsUnsubscribe = settingsStore.subscribe((settings) => {
			showSystemFiles = settings.showAttributeSystemFiles ?? false;
			if (allAttributeFiles.length > 0) {
				const newFilteredFiles = filterAttributeFiles(allAttributeFiles, showSystemFiles);
				attributeFiles = newFilteredFiles;
				if (newFilteredFiles.length > 0 && !newFilteredFiles.includes(selectedFilename)) {
					handleFileSelect(newFilteredFiles[0]);
				}
			}
		});
		(async () => { await loadFiles(); if (browser) { await loadFilterOptions(); await loadData(); } })();
		unsubscribe = attributeStore.subscribe((value) => { if (selectedFilename !== value.selectedFilename) { selectedFilename = value.selectedFilename; if (browser) { currentPage = 1; searchQuery = ''; loadData(); } } });
		return () => { if (unsubscribe) unsubscribe(); if (settingsUnsubscribe) settingsUnsubscribe(); };
	});

	async function loadFiles() { try { const response = await fetch('/api/attribute/files'); const result: DbDesignApiResponse = await response.json(); if (result.success && Array.isArray(result.data)) { const files = result.data as string[]; allAttributeFiles = files; const filteredFiles = filterAttributeFiles(files, showSystemFiles); attributeFiles = filteredFiles; if (files.length === 0) { const createResponse = await fetch('/api/attribute/files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: 'attribute.json' }) }); if (createResponse.ok) { allAttributeFiles = ['attribute.json']; attributeFiles = filterAttributeFiles(['attribute.json'], showSystemFiles); if (selectedFilename !== 'attribute.json') handleFileSelect('attribute.json'); } } else if (filteredFiles.length > 0 && !filteredFiles.includes(selectedFilename)) { handleFileSelect(filteredFiles[0]); } else if (!files.includes(selectedFilename)) { handleFileSelect(filteredFiles.length > 0 ? filteredFiles[0] : files[0]); } } } catch (error) { console.error('파일 목록 로드 오류:', error); } }
	async function loadFilterOptions() { try { const params = new URLSearchParams({ filename: selectedFilename }); const response = await fetch(`/api/attribute/filter-options?${params}`); const result: DbDesignApiResponse = await response.json(); if (result.success && result.data && typeof result.data === 'object') { filterOptions = result.data as Record<string, string[]>; } } catch (error) { console.error('필터 옵션 로드 오류:', error); } }
	async function handleFileSelect(filename: string) { if (selectedFilename === filename) return; selectedFilename = filename; attributeStore.update((store) => ({ ...store, selectedFilename: filename })); currentPage = 1; searchQuery = ''; await loadFilterOptions(); await loadData(); }

	async function loadData() {
		loading = true;
		try {
			const params = new URLSearchParams({ page: currentPage.toString(), limit: pageSize.toString(), filename: selectedFilename });
			Object.entries(sortConfig).forEach(([column, direction]) => { if (direction !== null) { params.append('sortBy[]', column); params.append('sortOrder[]', direction); } });
			Object.entries(columnFilters).forEach(([key, value]) => { if (value !== null && value !== '') params.append(`filters[${key}]`, value); });
			if (searchQuery) { params.set('q', searchQuery); params.set('field', searchField); params.set('exact', searchExact.toString()); }
			const response = await fetch(`/api/attribute?${params}`);
			const result: DbDesignApiResponse = await response.json();
			if (result.success && result.data) { const data = result.data as { entries: AttributeEntry[]; pagination?: { totalCount: number; totalPages: number } }; entries = data.entries || []; if (data.pagination) { totalCount = data.pagination.totalCount || 0; totalPages = data.pagination.totalPages || 1; } } else { entries = []; totalCount = 0; }
		} catch (error) { console.error('데이터 로드 오류:', error); entries = []; }
		finally { loading = false; }
	}

	async function handleSearch(detail: SearchDetail) { searchQuery = detail.query; searchField = detail.field; searchExact = detail.exact; currentPage = 1; await loadData(); }
	async function handleSearchClear() { searchQuery = ''; searchField = 'all'; searchExact = false; currentPage = 1; await loadData(); }
	async function handleSort(detail: SortDetail) { if (detail.direction === null) { const newConfig = { ...sortConfig }; delete newConfig[detail.column]; sortConfig = newConfig; } else sortConfig = { ...sortConfig, [detail.column]: detail.direction }; await loadData(); }
	async function handlePageChange(detail: PageChangeDetail) { currentPage = detail.page; await loadData(); }
	async function handleFilter(detail: FilterDetail) { currentPage = 1; if (detail.value === null || detail.value === '') { const { [detail.column]: _, ...rest } = columnFilters; columnFilters = rest; } else columnFilters = { ...columnFilters, [detail.column]: detail.value }; await loadData(); }
	async function handleClearAllFilters() { columnFilters = {}; sortConfig = {}; currentPage = 1; await loadData(); }
	async function refreshData() { await loadFiles(); await loadData(); }
	function handleEntryClick(event: { entry: AttributeEntry }) { currentEditingEntry = event.entry; editorServerError = ''; showEditor = true; }

	async function handleSave(event: CustomEvent<AttributeEntry>) { loading = true; editorServerError = ''; const isEditMode = !!currentEditingEntry; try { const params = new URLSearchParams({ filename: selectedFilename }); const response = await fetch(`/api/attribute?${params}`, { method: isEditMode ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event.detail) }); const result: DbDesignApiResponse = await response.json(); if (result.success) { showEditor = false; editorServerError = ''; currentEditingEntry = null; await loadData(); } else editorServerError = result.error || (isEditMode ? '수정에 실패했습니다.' : '추가에 실패했습니다.'); } catch (error) { console.error('저장 중 오류:', error); editorServerError = '서버 연결 오류가 발생했습니다.'; } finally { loading = false; } }
	async function handleDelete(event: CustomEvent<AttributeEntry>) { loading = true; editorServerError = ''; try { const params = new URLSearchParams({ id: event.detail.id, filename: selectedFilename }); const response = await fetch(`/api/attribute?${params}`, { method: 'DELETE' }); if (response.ok) { showEditor = false; editorServerError = ''; currentEditingEntry = null; await loadData(); } else { const result: DbDesignApiResponse = await response.json(); editorServerError = result.error || '삭제에 실패했습니다.'; } } catch (error) { console.error('삭제 오류:', error); editorServerError = '서버 연결 오류가 발생했습니다.'; } finally { loading = false; } }
	async function handleDownload() { loading = true; try { const params = new URLSearchParams({ filename: selectedFilename }); Object.entries(sortConfig).forEach(([column, direction]) => { if (direction !== null) { params.append('sortBy[]', column); params.append('sortOrder[]', direction); } }); if (searchQuery) { params.set('q', searchQuery); params.set('field', searchField); params.set('exact', searchExact.toString()); } const response = await fetch(`/api/attribute/download?${params}`); if (!response.ok) throw new Error(`다운로드 실패: ${response.status}`); const blob = await response.blob(); let filename = 'attribute.xlsx'; const contentDisposition = response.headers.get('Content-Disposition'); if (contentDisposition) { const match = contentDisposition.match(/filename="([^"]+)"/); if (match) filename = match[1]; } const downloadUrl = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = downloadUrl; link.download = filename; link.style.display = 'none'; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(downloadUrl); } catch (error) { console.error('다운로드 중 오류:', error); } finally { loading = false; } }
</script>

<svelte:head><title>데이터 관리 | 속성 정의서</title><meta name="description" content="속성 정의서를 관리하고 검색하세요." /></svelte:head>

<div class="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8">
	<div class="mx-auto w-full px-4 sm:px-6 lg:px-8">
		<div class="gap-8 lg:grid lg:grid-cols-[16rem_1fr] lg:items-start">
			<aside class="hidden h-full w-64 lg:block">
				<div class="sticky top-20 rounded-2xl border border-gray-200/50 bg-white/95 p-4 shadow-xl backdrop-blur-md">
					<div class="mb-4 flex items-center justify-between"><h2 class="text-lg font-bold text-gray-900">정의서 파일</h2><button onclick={() => (isFileManagerOpen = true)} class="text-gray-500 hover:text-blue-600" title="파일 관리" aria-label="파일 관리"><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button></div>
					<div class="space-y-2">{#each attributeFiles as file (file)}<button type="button" onclick={() => handleFileSelect(file)} class="w-full rounded-lg px-4 py-2 text-left text-sm font-medium transition-colors duration-200 {selectedFilename === file ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}">{file}</button>{/each}{#if attributeFiles.length === 0}<div class="px-4 py-2 text-sm text-gray-500">파일이 없습니다.</div>{/if}</div>
				</div>
			</aside>

			{#if sidebarOpen}
				<div class="fixed inset-0 z-40 flex lg:hidden">
					<div class="w-64 transform bg-white p-4 pt-20 shadow-2xl transition-transform duration-300" role="dialog" aria-modal="true">
						<div class="mb-4 flex items-center justify-between"><h2 class="text-lg font-bold text-gray-900">정의서 파일</h2><div class="flex items-center space-x-2"><button onclick={() => (isFileManagerOpen = true)} class="text-gray-500 hover:text-blue-600" title="파일 관리" aria-label="파일 관리"><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button><button onclick={() => (sidebarOpen = false)} class="text-gray-500 hover:text-gray-700" title="사이드바 닫기" aria-label="사이드바 닫기"><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div></div>
						<div class="space-y-2">{#each attributeFiles as file (file)}<button type="button" onclick={() => { handleFileSelect(file); sidebarOpen = false; }} class="w-full rounded-lg px-4 py-2 text-left text-sm font-medium transition-colors duration-200 {selectedFilename === file ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}">{file}</button>{/each}</div>
					</div>
					<button type="button" class="flex-1 bg-black/30 backdrop-blur-sm" onclick={() => (sidebarOpen = false)} aria-label="사이드바 닫기"></button>
				</div>
			{/if}

			<main class="w-full min-w-0 overflow-x-hidden">
				<div class="mb-10">
					<div class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
						<div class="flex items-center space-x-4"><button onclick={() => (sidebarOpen = true)} class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden" title="사이드바 열기" aria-label="사이드바 열기"><svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg></button><div><h1 class="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-4xl font-bold text-transparent">속성 정의서</h1><p class="mt-2 text-sm text-gray-500">현재 파일: <span class="font-medium text-gray-900">{selectedFilename}</span></p></div></div>
						<div class="mb-4 flex items-center space-x-3">
							<button type="button" onclick={() => { currentEditingEntry = null; editorServerError = ''; showEditor = true; }} disabled={loading} class="group inline-flex items-center space-x-2 rounded-xl border border-purple-200/50 bg-purple-50/80 px-6 py-3 text-sm font-medium text-purple-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-purple-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"><svg class="h-5 w-5 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg><span>새 정의서 추가</span></button>
							<button type="button" onclick={handleDownload} disabled={loading} class="group inline-flex items-center space-x-2 rounded-xl border border-green-200/50 bg-green-50/80 px-6 py-3 text-sm font-medium text-green-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-green-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"><svg class="h-5 w-5 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><span>{loading ? '준비 중' : 'XLSX 다운로드'}</span></button>
							<button type="button" onclick={refreshData} disabled={loading} class="btn btn-secondary group space-x-2 rounded-xl px-6 py-3 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"><svg class="h-5 w-5 transition-transform duration-200 {loading ? 'animate-spin' : 'group-hover:rotate-180'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg><span>{loading ? '로딩 중' : '새로고침'}</span></button>
						</div>
					</div>
				</div>

				{#if showEditor}<AttributeEditor entry={currentEditingEntry || {}} isEditMode={!!currentEditingEntry} serverError={editorServerError} filename={selectedFilename} on:save={handleSave} on:delete={handleDelete} on:cancel={() => { showEditor = false; editorServerError = ''; currentEditingEntry = null; }} />{/if}
				<AttributeFileManager isOpen={isFileManagerOpen} on:close={() => (isFileManagerOpen = false)} on:change={async () => { await loadFiles(); await loadData(); }} />

				<div class="mb-8 rounded-2xl border border-gray-200/50 bg-white/80 p-4 shadow-sm backdrop-blur-sm"><div class="mb-6"><h2 class="text-2xl font-bold text-gray-900">통합검색</h2><p class="mt-2 text-gray-600">속성명, 엔터티명 등으로 검색하세요</p></div><div class="mb-6"><SearchBar bind:query={searchQuery} bind:field={searchField} bind:exact={searchExact} searchFields={[{ value: 'all', label: '전체' }, { value: 'schemaName', label: '스키마명' }, { value: 'entityName', label: '엔터티명' }, { value: 'attributeName', label: '속성명' }]} onsearch={handleSearch} onclear={handleSearchClear} /></div></div>
				<div class="min-w-0 rounded-2xl border border-gray-200/50 bg-white/80 p-8 shadow-sm backdrop-blur-sm"><div class="mb-6 flex items-center justify-between"><div><h2 class="text-2xl font-bold text-gray-900">검색 결과</h2><p class="mt-1 text-gray-600">{#if searchQuery}"{searchQuery}"에 대한 검색 결과 {totalCount.toLocaleString()}건{:else}전체 속성 정의서 {totalCount.toLocaleString()}건{/if}</p></div>{#if entries.length > 0}<div class="flex items-center space-x-2 text-sm text-gray-500"><svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span>페이지 {currentPage} / {totalPages}</span></div>{/if}</div><div class="rounded-xl border border-gray-200"><AttributeTable {entries} {loading} {searchQuery} {totalCount} {currentPage} {totalPages} {pageSize} {sortConfig} {searchField} _selectedFilename={selectedFilename} activeFilters={columnFilters} {filterOptions} onsort={handleSort} onpagechange={handlePageChange} onfilter={handleFilter} onentryclick={handleEntryClick} onClearAllFilters={handleClearAllFilters} /></div></div>
			</main>
		</div>
	</div>
</div>

