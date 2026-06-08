<script lang="ts">
	import { onMount } from 'svelte';
	import BrowsePageLayout from '$lib/components/BrowsePageLayout.svelte';
	import ColumnDefFileManager from '$lib/components/ColumnDefFileManager.svelte';
	import ERDViewer from '$lib/components/ERDViewer.svelte';
	import type { ERDData } from '$lib/types/erd-mapping.js';
	import type { DbDesignApiResponse } from '$lib/types/database-design.js';
	import { settingsStore } from '$lib/stores/settings-store';
	import { filterColumnFiles } from '$lib/utils/file-filter';
	import { getNavigationBreadcrumbItems } from '$lib/utils/navigation';
	import type {
		DesignRelationSyncPreview,
		DesignRelationValidationResult
	} from '$lib/types/design-relation.js';

	interface ERDTableInfo {
		id: string;
		tableEnglishName: string;
		tableKoreanName?: string;
		schemaName?: string;
		physicalDbName?: string;
		subjectArea?: string;
		scopeFlag?: string;
		inBusinessScope?: boolean;
	}
	interface ERDDataWithValidation extends ERDData {
		relationValidation?: DesignRelationValidationResult;
	}
	interface UnifiedValidationSummary {
		totalIssues: number;
		errorCount: number;
		autoFixableCount: number;
		warningCount: number;
		infoCount: number;
		termFailedCount: number;
		relationUnmatchedCount: number;
		termPassedCount: number;
		termTotalCount: number;
	}
	interface RelationSyncResult {
		mode: 'preview' | 'apply';
		counts: DesignRelationSyncPreview['counts'] & {
			appliedTableUpdates: number;
			appliedColumnUpdates: number;
			appliedTotalUpdates: number;
		};
		changes: DesignRelationSyncPreview['changes'];
		suggestions: DesignRelationSyncPreview['suggestions'];
		validationBefore: DesignRelationValidationResult;
		validationAfter: DesignRelationValidationResult;
	}
	type ColumnMappingResult = {
		mapping?: Record<string, string>;
	};

	const NO_TABLE_SELECTION_PARAM = '__dbmanager_no_table_selected__';

	let erdData = $state<ERDDataWithValidation | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let allColumnFiles = $state<string[]>([]);
	let columnFiles = $state<string[]>([]);
	let selectedColumnFile = $state('column.json');
	let showColumnSystemFiles = $state(false);
	let isFileManagerOpen = $state(false);
	let mappingLoading = $state(false);
	let mappingError = $state<string | null>(null);
	let mappedTableFile = $state<string | null>(null);
	let definitionMapping = $state<Record<string, string>>({});

	let tables = $state<ERDTableInfo[]>([]);
	let selectedTableIds = $state<Set<string>>(new Set());
	let subjectAreaFilter = $state('');
	let schemaFilter = $state('');
	let tableSearchQuery = $state('');
	let debouncedTableSearchQuery = $state('');
	let scopeFlagFilter = $state('');
	let displayMode: 'logical' | 'physical' = $state('logical');
	let includeExternalReferences = $state(true);
	let loadingTables = $state(false);
	let isTableSelectionExpanded = $state(false);
	let showMappingSummary = $state(false);
	let relationSyncLoading = $state(false);
	let relationSyncError = $state<string | null>(null);
	let relationSyncResult = $state<RelationSyncResult | null>(null);
	let unifiedValidationSummary = $state<UnifiedValidationSummary | null>(null);
	let unifiedValidationLoading = $state(false);
	let unifiedValidationError = $state<string | null>(null);

	let filterRefreshTimer: ReturnType<typeof setTimeout> | null = null;
	let tableRequestSeq = 0;
	let erdRequestSeq = 0;

	let mappingStats = $derived(() => {
		if (!erdData) return null;
		return {
			databases: erdData.nodes.filter((n) => n.type === 'database').length,
			entities: erdData.nodes.filter((n) => n.type === 'entity').length,
			attributes: erdData.nodes.filter((n) => n.type === 'attribute').length,
			tables: erdData.nodes.filter((n) => n.type === 'table').length,
			columns: erdData.nodes.filter((n) => n.type === 'column').length,
			domains: erdData.nodes.filter((n) => n.type === 'domain').length,
			dbEntity: erdData.mappings.filter(
				(m) => m.sourceType === 'database' && m.targetType === 'entity'
			).length,
			dbTable: erdData.mappings.filter(
				(m) => m.sourceType === 'database' && m.targetType === 'table'
			).length,
			entityAttribute: erdData.mappings.filter(
				(m) => m.sourceType === 'entity' && m.targetType === 'attribute'
			).length,
			entityInheritance: erdData.mappings.filter(
				(m) =>
					m.sourceType === 'entity' &&
					m.targetType === 'entity' &&
					m.mappingKey === 'superTypeEntityName'
			).length,
			tableColumn: erdData.mappings.filter(
				(m) => m.sourceType === 'table' && m.targetType === 'column'
			).length,
			tableEntity: erdData.mappings.filter(
				(m) => m.sourceType === 'table' && m.targetType === 'entity'
			).length,
			columnFK: erdData.mappings.filter(
				(m) => m.sourceType === 'column' && m.targetType === 'column' && m.mappingKey === 'fkInfo'
			).length,
			columnEntity: erdData.mappings.filter(
				(m) => m.sourceType === 'column' && m.targetType === 'entity'
			).length,
			attributeColumn: erdData.mappings.filter(
				(m) => m.sourceType === 'attribute' && m.targetType === 'column'
			).length,
			attributeEntityRef: erdData.mappings.filter(
				(m) => m.sourceType === 'attribute' && m.targetType === 'entity'
			).length,
			columnDomain: erdData.mappings.filter(
				(m) => m.sourceType === 'column' && m.targetType === 'domain'
			).length
		};
	});

	let subjectAreaOptions = $derived(() => uniqueSorted(tables.map((table) => table.subjectArea)));
	let schemaOptions = $derived(() => getSchemaOptionsForSubject());
	let filteredTables = $derived(() => {
		const query = tableSearchQuery.trim().toLowerCase();
		return tables.filter((table) => {
			const subjectMatches = !subjectAreaFilter || table.subjectArea === subjectAreaFilter;
			const schemaMatches = !schemaFilter || table.schemaName === schemaFilter;
			const scopeMatches =
				!scopeFlagFilter ||
				(scopeFlagFilter === 'Y' && table.inBusinessScope) ||
				(scopeFlagFilter === 'N' && !table.inBusinessScope);
			const queryMatches =
				!query ||
				[table.tableEnglishName, table.tableKoreanName, table.schemaName, table.subjectArea]
					.filter((value): value is string => Boolean(value))
					.some((value) => value.toLowerCase().includes(query));
			return subjectMatches && schemaMatches && scopeMatches && queryMatches;
		});
	});
	let selectedFilteredTableIds = $derived(() =>
		filteredTables()
			.map((table) => table.id)
			.filter((id) => selectedTableIds.has(id))
	);

	function uniqueSorted(values: Array<string | undefined>): string[] {
		return Array.from(
			new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])
		).sort((a, b) => a.localeCompare(b, 'ko', { sensitivity: 'base' }));
	}

	function getSchemaOptionsForSubject(subjectArea = subjectAreaFilter): string[] {
		return uniqueSorted(
			tables
				.filter((table) => !subjectArea || table.subjectArea === subjectArea)
				.map((table) => table.schemaName)
		);
	}

	function pickFirstOption(options: string[], current: string): string {
		return current && options.includes(current) ? current : (options[0] ?? '');
	}

	function selectAllFilteredTables() {
		selectedTableIds = new Set(filteredTables().map((table) => table.id));
	}

	function getSelectedTableIdsParam(): string | null {
		const filteredIds = filteredTables().map((table) => table.id);
		if (filteredIds.length === 0) return NO_TABLE_SELECTION_PARAM;

		const selectedIds = filteredIds.filter((id) => selectedTableIds.has(id));
		if (selectedIds.length === 0) return NO_TABLE_SELECTION_PARAM;
		if (selectedIds.length === filteredIds.length) return null;
		return selectedIds.join(',');
	}

	function refreshColumnFileList(files = allColumnFiles) {
		columnFiles = filterColumnFiles(files, showColumnSystemFiles);
	}

	function buildErdParams(options: { format?: 'svg' | 'png'; download?: boolean } = {}) {
		const params = new URLSearchParams();
		if (options.format) params.set('format', options.format);
		if (options.format) params.set('mode', displayMode);
		params.set('includeExternalReferences', includeExternalReferences.toString());
		if (options.download) params.set('download', 'true');
		if (selectedColumnFile.trim()) params.set('columnFile', selectedColumnFile.trim());
		for (const type of [
			'vocabulary',
			'domain',
			'term',
			'database',
			'entity',
			'attribute'
		] as const) {
			const filename = definitionMapping[type];
			if (filename?.trim()) params.set(`${type}File`, filename.trim());
		}
		if (mappedTableFile?.trim()) params.set('tableFile', mappedTableFile.trim());
		const selectedTableIdsParam = getSelectedTableIdsParam();
		if (selectedTableIdsParam) params.set('tableIds', selectedTableIdsParam);
		if (subjectAreaFilter.trim()) params.set('subjectArea', subjectAreaFilter.trim());
		if (schemaFilter.trim()) params.set('schema', schemaFilter.trim());
		if (debouncedTableSearchQuery.trim()) params.set('q', debouncedTableSearchQuery.trim());
		if (scopeFlagFilter.trim()) params.set('scopeFlag', scopeFlagFilter.trim());
		return params;
	}

	function getErdRenderUrl(format: 'svg' | 'png', download = false): string {
		return `/api/erd/render?${buildErdParams({ format, download }).toString()}`;
	}

	function getGenerateUrl(): string {
		const params = buildErdParams();
		return `/api/erd/generate${params.toString() ? `?${params.toString()}` : ''}`;
	}

	function getTablesUrl(): string {
		const params = new URLSearchParams();
		if (selectedColumnFile.trim()) params.set('columnFile', selectedColumnFile.trim());
		if (mappedTableFile?.trim()) params.set('tableFile', mappedTableFile.trim());
		return `/api/erd/tables${params.toString() ? `?${params.toString()}` : ''}`;
	}

	async function loadColumnFiles() {
		const response = await fetch('/api/column/files');
		const result: DbDesignApiResponse<string[]> = await response.json();
		if (!result.success || !result.data) return;

		allColumnFiles = result.data;
		refreshColumnFileList(result.data);
		const availableFiles = columnFiles.length > 0 ? columnFiles : result.data;
		if (availableFiles.length > 0 && !availableFiles.includes(selectedColumnFile)) {
			selectedColumnFile = availableFiles[0];
		}
	}

	async function loadColumnMapping(filename = selectedColumnFile) {
		if (!filename) return;
		mappingLoading = true;
		mappingError = null;
		try {
			const response = await fetch(
				`/api/column/files/mapping?filename=${encodeURIComponent(filename)}`
			);
			const result: DbDesignApiResponse<ColumnMappingResult> = await response.json();

			if (!result.success || !result.data?.mapping) {
				definitionMapping = {};
				mappedTableFile = null;
				mappingError = result.error || '컬럼 정의서 매핑을 불러오지 못했습니다.';
				return;
			}

			definitionMapping = result.data.mapping;
			mappedTableFile = result.data.mapping.table || null;
		} catch (err) {
			console.error('컬럼 정의서 매핑 로드 오류:', err);
			definitionMapping = {};
			mappedTableFile = null;
			mappingError =
				err instanceof Error ? err.message : '컬럼 정의서 매핑 로드 중 오류가 발생했습니다.';
		} finally {
			mappingLoading = false;
		}
	}

	function normalizeFiltersAfterTableLoad(options: { selectAll?: boolean } = {}) {
		const subjects = subjectAreaOptions();
		subjectAreaFilter = pickFirstOption(subjects, subjectAreaFilter);
		schemaFilter = pickFirstOption(getSchemaOptionsForSubject(subjectAreaFilter), schemaFilter);
		const validIds = new Set(tables.map((table) => table.id));
		selectedTableIds = new Set(Array.from(selectedTableIds).filter((id) => validIds.has(id)));
		if (options.selectAll || selectedTableIds.size === 0) {
			selectAllFilteredTables();
		}
	}

	async function loadTables() {
		const requestSeq = ++tableRequestSeq;
		loadingTables = true;
		try {
			const response = await fetch(getTablesUrl());
			const result: DbDesignApiResponse<ERDTableInfo[]> = await response.json();
			if (requestSeq !== tableRequestSeq) return;

			if (result.success && result.data) {
				tables = result.data;
				normalizeFiltersAfterTableLoad({ selectAll: true });
			}
		} catch (err) {
			console.error('테이블 목록 로드 오류:', err);
		} finally {
			if (requestSeq === tableRequestSeq) loadingTables = false;
		}
	}

	async function loadERDData() {
		const requestSeq = ++erdRequestSeq;
		loading = true;
		error = null;
		try {
			const response = await fetch(getGenerateUrl());
			const result: DbDesignApiResponse<ERDDataWithValidation> = await response.json();
			if (requestSeq !== erdRequestSeq) return;

			if (result.success && result.data) {
				erdData = result.data;
			} else {
				error = result.error || 'ERD 데이터를 불러올 수 없습니다.';
			}
		} catch (err) {
			console.error('ERD 로드 오류:', err);
			error = err instanceof Error ? err.message : 'ERD 데이터를 불러오는 중 오류가 발생했습니다.';
		} finally {
			if (requestSeq === erdRequestSeq) loading = false;
		}
	}

	async function reloadForColumnFile() {
		selectedTableIds = new Set();
		subjectAreaFilter = '';
		schemaFilter = '';
		tableSearchQuery = '';
		debouncedTableSearchQuery = '';
		scopeFlagFilter = '';
		isTableSelectionExpanded = false;
		relationSyncResult = null;
		await loadColumnMapping(selectedColumnFile);
		await loadTables();
		await loadERDData();
	}

	function refreshErdImmediately() {
		debouncedTableSearchQuery = tableSearchQuery;
		void loadERDData();
	}

	function scheduleTableSearchRefresh() {
		if (filterRefreshTimer) clearTimeout(filterRefreshTimer);
		filterRefreshTimer = setTimeout(() => {
			debouncedTableSearchQuery = tableSearchQuery;
			selectAllFilteredTables();
			void loadERDData();
		}, 250);
	}

	function handleSubjectAreaFilterChange(event: Event) {
		subjectAreaFilter = (event.currentTarget as HTMLSelectElement).value;
		schemaFilter = pickFirstOption(getSchemaOptionsForSubject(subjectAreaFilter), schemaFilter);
		selectAllFilteredTables();
		refreshErdImmediately();
	}

	function handleSchemaFilterChange(event: Event) {
		schemaFilter = (event.currentTarget as HTMLSelectElement).value;
		selectAllFilteredTables();
		refreshErdImmediately();
	}

	function handleScopeFlagFilterChange(event: Event) {
		scopeFlagFilter = (event.currentTarget as HTMLSelectElement).value;
		selectAllFilteredTables();
		refreshErdImmediately();
	}

	function handleTableToggle(tableId: string) {
		if (selectedTableIds.has(tableId)) {
			selectedTableIds.delete(tableId);
		} else {
			selectedTableIds.add(tableId);
		}
		selectedTableIds = new Set(selectedTableIds);
		refreshErdImmediately();
	}

	function handleSelectAll() {
		selectedTableIds = new Set(filteredTables().map((table) => table.id));
		refreshErdImmediately();
	}

	function handleDeselectAll() {
		selectedTableIds = new Set();
		refreshErdImmediately();
	}

	async function handleFileSelect(filename: string) {
		if (selectedColumnFile === filename) return;
		selectedColumnFile = filename;
		await reloadForColumnFile();
	}

	async function handleRefresh() {
		await loadColumnMapping(selectedColumnFile);
		await loadTables();
		await loadERDData();
		await loadUnifiedValidationSummary();
	}

	async function loadUnifiedValidationSummary(
		termFilename = definitionMapping.term || 'term.json'
	) {
		unifiedValidationLoading = true;
		unifiedValidationError = null;
		try {
			const params = new URLSearchParams({
				termFilename,
				termFile: termFilename,
				scopeType: 'column',
				scopeFile: selectedColumnFile,
				columnFile: selectedColumnFile
			});
			for (const type of [
				'vocabulary',
				'domain',
				'database',
				'entity',
				'attribute',
				'table'
			] as const) {
				const filename = definitionMapping[type];
				if (filename) {
					params.set(`${type}File`, filename);
				}
			}
			const response = await fetch(`/api/validation/report?${params.toString()}`);
			const result: DbDesignApiResponse<{
				summary: Omit<UnifiedValidationSummary, 'termPassedCount' | 'termTotalCount'>;
				sections: {
					term: {
						totalCount: number;
						passedCount: number;
						failedCount: number;
					};
				};
			}> = await response.json();
			if (!result.success || !result.data) {
				unifiedValidationError = result.error || '통합 진단 요약을 불러오지 못했습니다.';
				unifiedValidationSummary = null;
				return;
			}
			unifiedValidationSummary = {
				...result.data.summary,
				termPassedCount: result.data.sections.term?.passedCount || 0,
				termTotalCount: result.data.sections.term?.totalCount || 0
			};
		} catch (err) {
			console.error('통합 진단 요약 로드 오류:', err);
			unifiedValidationError =
				err instanceof Error ? err.message : '통합 진단 요약을 불러오는 중 오류가 발생했습니다.';
			unifiedValidationSummary = null;
		} finally {
			unifiedValidationLoading = false;
		}
	}

	async function handleRelationSyncPreview() {
		relationSyncLoading = true;
		relationSyncError = null;
		try {
			const response = await fetch('/api/erd/relations/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					apply: false,
					columnFile: selectedColumnFile,
					tableFile: mappedTableFile ?? undefined
				})
			});
			const result: DbDesignApiResponse<RelationSyncResult> = await response.json();

			if (!result.success || !result.data) {
				relationSyncError =
					result.error || '레거시 관계 동기화 미리보기 실행 중 오류가 발생했습니다.';
				return;
			}

			relationSyncResult = result.data;
		} catch (err) {
			console.error('레거시 관계 동기화 미리보기 오류:', err);
			relationSyncError =
				err instanceof Error
					? err.message
					: '레거시 관계 동기화 미리보기 실행 중 오류가 발생했습니다.';
		} finally {
			relationSyncLoading = false;
		}
	}

	onMount(() => {
		const unsubscribe = settingsStore.subscribe((settings) => {
			showColumnSystemFiles = settings.showColumnSystemFiles ?? false;
			refreshColumnFileList();
		});

		void (async () => {
			await loadColumnFiles();
			await reloadForColumnFile();
			await loadUnifiedValidationSummary();
		})();

		return () => {
			unsubscribe();
			if (filterRefreshTimer) clearTimeout(filterRefreshTimer);
		};
	});
</script>

<svelte:head>
	<title>ERD 다이어그램 - DbManager</title>
	<meta
		name="description"
		content="컬럼 정의서와 매핑된 테이블 정의서를 기준으로 ERD 이미지를 생성합니다."
	/>
</svelte:head>

{#snippet sidebar()}
	<div class="space-y-4">
		<section
			aria-label="ERD 컬럼 정의서 파일 선택"
			class="rounded-2xl border border-border bg-surface/95 p-4 shadow-xl backdrop-blur-md dark:bg-surface/90"
		>
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
				{#each columnFiles as file (file)}
					<button
						type="button"
						onclick={() => handleFileSelect(file)}
						class="w-full rounded-lg px-4 py-2 text-left text-sm font-medium transition-colors duration-200 {selectedColumnFile ===
						file
							? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
							: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
					>
						{file}
					</button>
				{/each}
				{#if columnFiles.length === 0}
					<div class="px-4 py-2 text-sm text-gray-500">파일이 없습니다.</div>
				{/if}
			</div>
		</section>

		<section
			aria-label="ERD 매핑 기준"
			class="rounded-2xl border border-border bg-surface/95 p-4 shadow-xl backdrop-blur-md dark:bg-surface/90"
		>
			<h2 class="mb-3 text-sm font-semibold text-gray-900">매핑 기준</h2>
			<div class="space-y-2 text-xs text-gray-600">
				<div class="rounded-lg bg-gray-50 p-2">
					<div class="font-medium text-gray-500">컬럼 정의서</div>
					<div class="mt-1 break-all font-semibold text-gray-900">{selectedColumnFile}</div>
				</div>
				<div class="rounded-lg bg-gray-50 p-2">
					<div class="font-medium text-gray-500">매핑된 테이블 정의서</div>
					<div class="mt-1 break-all font-semibold text-gray-900">
						{#if mappingLoading}
							확인 중...
						{:else if mappedTableFile}
							{mappedTableFile}
						{:else}
							매핑 없음
						{/if}
					</div>
				</div>
				{#if mappingError}
					<p class="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-700">
						{mappingError}
					</p>
				{/if}
				<p class="text-gray-500">설정 버튼에서 정의서 매핑을 확인하고 수정할 수 있습니다.</p>
			</div>
		</section>
	</div>
{/snippet}

{#snippet actions()}
	<button
		type="button"
		onclick={() => (showMappingSummary = !showMappingSummary)}
		class="rounded-lg border px-4 py-2 text-sm font-medium transition-colors {showMappingSummary
			? 'border-indigo-300 bg-indigo-50 text-indigo-700'
			: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}"
	>
		연관관계 요약
	</button>
	<button
		type="button"
		onclick={handleRefresh}
		disabled={loading}
		class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
	>
		{loading ? '생성 중...' : '새로고침'}
	</button>
{/snippet}

<BrowsePageLayout
	title="ERD 다이어그램"
	description={`현재 컬럼 정의서: ${selectedColumnFile}`}
	breadcrumbItems={getNavigationBreadcrumbItems('/erd')}
	sidebarSurface="plain"
	{sidebar}
	{actions}
>
	<ColumnDefFileManager
		isOpen={isFileManagerOpen}
		currentFilename={selectedColumnFile}
		on:close={() => (isFileManagerOpen = false)}
		on:change={async () => {
			await loadColumnFiles();
			await reloadForColumnFile();
		}}
	/>

	<section aria-label="ERD 메인 제어 영역" class="mb-4 space-y-4">
		<section
			aria-label="ERD 조회 조건"
			class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
		>
			<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
				<h2 class="text-sm font-semibold text-gray-900">조회 조건</h2>
				<span class="text-xs text-gray-500">조건 결과 {filteredTables().length}개 테이블</span>
			</div>
			<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<div>
					<label for="displayMode" class="mb-1 block text-xs font-medium text-gray-700"
						>표시 모드</label
					>
					<select
						id="displayMode"
						bind:value={displayMode}
						class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					>
						<option value="logical">논리 이미지</option>
						<option value="physical">물리 이미지</option>
					</select>
				</div>
				<div>
					<label for="subjectAreaFilter" class="mb-1 block text-xs font-medium text-gray-700"
						>주제영역</label
					>
					<select
						id="subjectAreaFilter"
						bind:value={subjectAreaFilter}
						onchange={handleSubjectAreaFilterChange}
						class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					>
						{#each subjectAreaOptions() as subjectArea (subjectArea)}
							<option value={subjectArea}>{subjectArea}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="schemaFilter" class="mb-1 block text-xs font-medium text-gray-700"
						>스키마</label
					>
					<select
						id="schemaFilter"
						bind:value={schemaFilter}
						onchange={handleSchemaFilterChange}
						class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					>
						{#each schemaOptions() as schemaName (schemaName)}
							<option value={schemaName}>{schemaName}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="scopeFlagFilter" class="mb-1 block text-xs font-medium text-gray-700"
						>사업범위여부</label
					>
					<select
						id="scopeFlagFilter"
						bind:value={scopeFlagFilter}
						onchange={handleScopeFlagFilterChange}
						class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					>
						<option value="">전체</option>
						<option value="Y">사업범위</option>
						<option value="N">사업범위 외</option>
					</select>
				</div>
				<label
					class="flex cursor-pointer items-center gap-2 self-end rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
				>
					<input
						type="checkbox"
						bind:checked={includeExternalReferences}
						onchange={refreshErdImmediately}
						class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					/>
					FK 외부참조 포함
				</label>
			</div>
		</section>

		<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
			<section
				aria-label="ERD 테이블 다중 선택"
				class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
			>
				<div class="flex flex-wrap items-center justify-between gap-2">
					<div>
						<h2 class="text-sm font-semibold text-gray-900">테이블 선택</h2>
						<p class="mt-1 text-xs text-gray-500">
							기본으로 조건 결과 전체가 선택됩니다. 필요할 때만 펼쳐 수정합니다.
						</p>
					</div>
					<div class="flex items-center gap-2">
						<span class="text-xs text-gray-500">
							{selectedFilteredTableIds().length}개 선택 / 조건 결과 {filteredTables().length}개
						</span>
						<button
							type="button"
							onclick={() => (isTableSelectionExpanded = !isTableSelectionExpanded)}
							aria-expanded={isTableSelectionExpanded}
							aria-controls="erd-table-selection-panel"
							class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
						>
							{isTableSelectionExpanded ? '접기' : '수정'}
						</button>
					</div>
				</div>

				{#if isTableSelectionExpanded}
					<div id="erd-table-selection-panel" class="mt-4 space-y-3">
						<div>
							<label for="erdTableSearch" class="mb-1 block text-xs font-medium text-gray-700">
								테이블명 검색
							</label>
							<input
								id="erdTableSearch"
								type="text"
								placeholder="영문/한글/스키마/주제영역"
								bind:value={tableSearchQuery}
								oninput={scheduleTableSearchRefresh}
								class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							/>
						</div>

						<div class="flex gap-2 sm:max-w-xs">
							<button
								type="button"
								onclick={handleSelectAll}
								class="flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
							>
								전체 선택
							</button>
							<button
								type="button"
								onclick={handleDeselectAll}
								class="flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
							>
								전체 해제
							</button>
						</div>
						<div class="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white">
							{#if loadingTables}
								<div class="flex items-center justify-center p-4 text-sm text-gray-500">
									테이블 로딩 중...
								</div>
							{:else if filteredTables().length === 0}
								<div class="p-4 text-center text-sm text-gray-500">
									조건에 맞는 테이블이 없습니다.
								</div>
							{:else}
								<div
									class="grid divide-y divide-gray-200 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-3"
								>
									{#each filteredTables() as table (table.id)}
										<label
											class="flex cursor-pointer items-start gap-3 border-b border-gray-200 px-3 py-2 hover:bg-gray-50 md:border-b-0"
										>
											<input
												type="checkbox"
												checked={selectedTableIds.has(table.id)}
												onchange={() => handleTableToggle(table.id)}
												class="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
											/>
											<div class="min-w-0 flex-1">
												<div class="truncate text-sm font-medium text-gray-900">
													{table.tableEnglishName || '이름 없음'}
												</div>
												<div class="mt-0.5 truncate text-xs text-gray-500">
													{table.tableKoreanName || '-'} · {table.schemaName || '-'} · {table.subjectArea ||
														'-'}
												</div>
											</div>
										</label>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{:else}
					<p
						class="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700"
					>
						현재 조건 결과는 기본 전체 선택 상태입니다. 특정 테이블만 내려받으려면 수정 버튼을 눌러
						검색 후 선택을 조정하세요.
					</p>
				{/if}
			</section>

			<section
				aria-label="ERD 이미지 다운로드"
				class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
			>
				<h2 class="text-sm font-semibold text-gray-900">이미지 다운로드</h2>
				<p class="mt-1 text-xs text-gray-500">현재 조건과 선택 테이블 기준으로 내려받습니다.</p>
				<div class="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
					<a
						href={getErdRenderUrl('svg', true)}
						download
						class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
					>
						SVG 다운로드
					</a>
					<a
						href={getErdRenderUrl('png', true)}
						download
						class="rounded-lg bg-blue-600 px-3 py-2 text-center text-xs font-medium text-white transition-colors hover:bg-blue-700"
					>
						PNG 다운로드
					</a>
				</div>
			</section>
		</div>
	</section>

	{#if showMappingSummary && erdData}
		{@const stats = mappingStats()}
		{#if stats}
			<section class="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="mb-3 flex items-center justify-between">
					<h2 class="text-sm font-semibold text-gray-900">데이터 연관관계 요약</h2>
					<button
						type="button"
						onclick={handleRelationSyncPreview}
						disabled={relationSyncLoading}
						class="rounded border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{relationSyncLoading ? '확인 중...' : '레거시 동기화 미리보기'}
					</button>
				</div>
				<p class="mb-3 text-xs text-gray-500">
					자동 수정은 DB/엔터티/속성/테이블/컬럼 정의서의 유효성 검사 패널에서 후보를 선택해
					실행합니다. ERD에서는 관계 검증의 미매칭·오류·경고 건수만 조회용으로 표시합니다.
				</p>
				<div class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
					<div class="rounded-lg border border-blue-200 bg-blue-50 p-2 text-center">
						<div class="font-bold text-blue-700">{stats.databases}</div>
						<div class="text-xs text-blue-600">데이터베이스</div>
					</div>
					<div class="rounded-lg border border-green-200 bg-green-50 p-2 text-center">
						<div class="font-bold text-green-700">{stats.entities}</div>
						<div class="text-xs text-green-600">엔터티</div>
					</div>
					<div class="rounded-lg border border-teal-200 bg-teal-50 p-2 text-center">
						<div class="font-bold text-teal-700">{stats.attributes}</div>
						<div class="text-xs text-teal-600">속성</div>
					</div>
					<div class="rounded-lg border border-purple-200 bg-purple-50 p-2 text-center">
						<div class="font-bold text-purple-700">{stats.tables}</div>
						<div class="text-xs text-purple-600">테이블</div>
					</div>
					<div class="rounded-lg border border-orange-200 bg-orange-50 p-2 text-center">
						<div class="font-bold text-orange-700">{stats.columns}</div>
						<div class="text-xs text-orange-600">컬럼</div>
					</div>
					<div class="rounded-lg border border-pink-200 bg-pink-50 p-2 text-center">
						<div class="font-bold text-pink-700">{stats.domains}</div>
						<div class="text-xs text-pink-600">도메인</div>
					</div>
				</div>

				{#if erdData.relationValidation}
					<div
						class="mt-3 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
					>
						<div>
							<p class="font-semibold text-amber-900">정의서 관계 유효성 검사</p>
							<p class="mt-1">
								미매칭 {erdData.relationValidation.totals.unmatched}건 · 오류
								{erdData.relationValidation.totals.errorCount}건 · 경고
								{erdData.relationValidation.totals.warningCount}건
							</p>
						</div>
					</div>
				{/if}

				{#if relationSyncError}
					<div class="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
						{relationSyncError}
					</div>
				{/if}
				{#if relationSyncResult}
					<div
						class="mt-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800"
					>
						최근 레거시 동기화 미리보기: 후보 테이블 {relationSyncResult.counts.tableCandidates}건 ·
						후보 컬럼
						{relationSyncResult.counts.columnCandidates}건 · 추천
						{relationSyncResult.counts.attributeColumnSuggestions}건
					</div>
				{/if}

				<div
					class="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-800"
				>
					<div class="mb-1 flex items-center justify-between">
						<span class="font-semibold">통합 정합성 요약</span>
						<button
							type="button"
							onclick={() => loadUnifiedValidationSummary()}
							disabled={unifiedValidationLoading}
							class="rounded border border-indigo-300 bg-white px-2 py-1 font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
						>
							재검증
						</button>
					</div>
					{#if unifiedValidationSummary}
						관계 미매칭 {unifiedValidationSummary.relationUnmatchedCount}건 · 용어계 실패
						{unifiedValidationSummary.termFailedCount}건 · 전체 이슈
						{unifiedValidationSummary.totalIssues}건
					{:else if unifiedValidationLoading}
						통합 진단 요약을 불러오는 중...
					{:else}
						요약 정보가 없습니다.
					{/if}
					{#if unifiedValidationError}
						<div class="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-red-700">
							{unifiedValidationError}
						</div>
					{/if}
				</div>
			</section>
		{/if}
	{/if}

	<div
		class="h-[calc(100vh-13rem)] min-h-[560px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
	>
		{#if loading}
			<div class="flex h-full items-center justify-center">
				<div class="text-center">
					<div
						class="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
					></div>
					<p class="text-sm font-medium text-gray-900">ERD 데이터를 생성하는 중...</p>
					<p class="mt-1 text-xs text-gray-500">잠시만 기다려주세요.</p>
				</div>
			</div>
		{:else if error}
			<div class="flex h-full items-center justify-center">
				<div class="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
					<h3 class="text-lg font-semibold text-red-800">오류 발생</h3>
					<p class="mt-2 text-sm text-red-600">{error}</p>
					<button
						type="button"
						onclick={handleRefresh}
						class="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
					>
						다시 시도
					</button>
				</div>
			</div>
		{:else if erdData}
			<ERDViewer {erdData} renderUrl={getErdRenderUrl('svg')} />
		{:else}
			<div class="flex h-full items-center justify-center">
				<div class="text-center">
					<h3 class="text-lg font-semibold text-gray-900">ERD 데이터 없음</h3>
					<p class="mt-2 text-sm text-gray-600">
						ERD를 생성하려면 컬럼 정의서와 매핑된 테이블 정의서가 필요합니다.
					</p>
					<button
						type="button"
						onclick={handleRefresh}
						class="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
					>
						다시 시도
					</button>
				</div>
			</div>
		{/if}
	</div>
</BrowsePageLayout>
