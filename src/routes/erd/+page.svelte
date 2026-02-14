<script lang="ts">
	import { onMount } from 'svelte';
	import ERDViewer from '$lib/components/ERDViewer.svelte';
	import type { ERDData } from '$lib/types/erd-mapping.js';
	import type { DbDesignApiResponse } from '$lib/types/database-design.js';
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
	}
	interface ERDDataWithValidation extends ERDData {
		relationValidation?: DesignRelationValidationResult;
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

	let erdData = $state<ERDDataWithValidation | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// 테이블 선택 관련 상태
	let tables = $state<ERDTableInfo[]>([]);
	let selectedTableIds = $state<Set<string>>(new Set());
	let selectionMode: 'single' | 'multi' = $state('multi');
	let tableSearchQuery = $state('');
	let showTableSelector = $state(false);
	let includeRelated = $state(true);
	let loadingTables = $state(false);
	let showMappingSummary = $state(false);
	let relationSyncLoading = $state(false);
	let relationSyncError = $state<string | null>(null);
	let relationSyncResult = $state<RelationSyncResult | null>(null);

	// 매핑 통계 계산
	let mappingStats = $derived(() => {
		if (!erdData) return null;
		const stats = {
			databases: erdData.nodes.filter((n) => n.type === 'database').length,
			entities: erdData.nodes.filter((n) => n.type === 'entity').length,
			attributes: erdData.nodes.filter((n) => n.type === 'attribute').length,
			tables: erdData.nodes.filter((n) => n.type === 'table').length,
			columns: erdData.nodes.filter((n) => n.type === 'column').length,
			domains: erdData.nodes.filter((n) => n.type === 'domain').length,
			// 매핑별 카운트
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
		return stats;
	});

	// 필터링된 테이블 목록
	let filteredTables = $derived(() => {
		if (!tableSearchQuery.trim()) return tables;
		const query = tableSearchQuery.toLowerCase();
		return tables.filter(
			(table) =>
				table.tableEnglishName?.toLowerCase().includes(query) ||
				table.tableKoreanName?.toLowerCase().includes(query) ||
				table.schemaName?.toLowerCase().includes(query)
		);
	});

	async function loadTables() {
		loadingTables = true;
		try {
			const response = await fetch('/api/erd/tables');
			const result: DbDesignApiResponse<ERDTableInfo[]> = await response.json();

			if (result.success && result.data) {
				tables = result.data;
			}
		} catch (err) {
			console.error('테이블 목록 로드 오류:', err);
		} finally {
			loadingTables = false;
		}
	}

	async function loadERDData(tableIds?: string[]) {
		loading = true;
		error = null;

		try {
			const params = new URLSearchParams();
			if (tableIds && tableIds.length > 0) {
				params.set('tableIds', tableIds.join(','));
				params.set('includeRelated', includeRelated.toString());
			}

			const url = `/api/erd/generate${params.toString() ? `?${params.toString()}` : ''}`;
			const response = await fetch(url);
			const result: DbDesignApiResponse<ERDDataWithValidation> = await response.json();

			if (result.success && result.data) {
				erdData = result.data;
			} else {
				error = result.error || 'ERD 데이터를 불러올 수 없습니다.';
			}
		} catch (err) {
			console.error('ERD 로드 오류:', err);
			error = err instanceof Error ? err.message : 'ERD 데이터를 불러오는 중 오류가 발생했습니다.';
		} finally {
			loading = false;
		}
	}

	function handleTableToggle(tableId: string) {
		if (selectionMode === 'single') {
			selectedTableIds.clear();
			selectedTableIds.add(tableId);
		} else {
			if (selectedTableIds.has(tableId)) {
				selectedTableIds.delete(tableId);
			} else {
				selectedTableIds.add(tableId);
			}
		}
		// 반응성을 위해 새 Set 생성
		selectedTableIds = new Set(selectedTableIds);
	}

	function handleSelectAll() {
		if (selectionMode === 'single') return;
		selectedTableIds = new Set(filteredTables().map((t) => t.id));
	}

	function handleDeselectAll() {
		selectedTableIds = new Set();
	}

	function handleGenerateERD() {
		if (selectedTableIds.size === 0) {
			// 전체 보기
			loadERDData();
		} else {
			loadERDData(Array.from(selectedTableIds));
		}
		showTableSelector = false;
	}

	function handleViewAll() {
		selectedTableIds = new Set();
		loadERDData();
		showTableSelector = false;
	}

	function handleRefresh() {
		if (selectedTableIds.size === 0) {
			loadERDData();
		} else {
			loadERDData(Array.from(selectedTableIds));
		}
	}

	async function handleRelationSync(apply: boolean) {
		relationSyncLoading = true;
		relationSyncError = null;

		try {
			const response = await fetch('/api/erd/relations/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ apply })
			});
			const result: DbDesignApiResponse<RelationSyncResult> = await response.json();

			if (!result.success || !result.data) {
				relationSyncError = result.error || '관계 동기화 실행 중 오류가 발생했습니다.';
				return;
			}

			relationSyncResult = result.data;

			if (apply && result.data.counts.appliedTotalUpdates > 0) {
				handleRefresh();
			}
		} catch (err) {
			console.error('관계 동기화 오류:', err);
			relationSyncError =
				err instanceof Error ? err.message : '관계 동기화 실행 중 오류가 발생했습니다.';
		} finally {
			relationSyncLoading = false;
		}
	}

	onMount(() => {
		loadTables();
		loadERDData();
	});
</script>

<svelte:head>
	<title>ERD 다이어그램 - DbManager</title>
	<meta name="description" content="데이터베이스 ERD 다이어그램을 생성하고 시각화합니다." />
</svelte:head>

<div class="flex h-screen flex-col">
	<!-- 페이지 헤더 -->
	<header class="border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">ERD 다이어그램</h1>
				<p class="mt-1 text-sm text-gray-600">
					등록된 DB, 엔터티, 속성, 테이블, 컬럼 데이터를 기반으로 ERD를 생성합니다.
				</p>
			</div>
			<div class="flex gap-2">
				<button
					onclick={() => {
						showMappingSummary = !showMappingSummary;
					}}
					class="rounded-lg border px-4 py-2 text-sm font-medium transition-colors {showMappingSummary
						? 'border-indigo-300 bg-indigo-50 text-indigo-700'
						: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}"
				>
					연관관계 요약
				</button>
				<button
					onclick={() => {
						showTableSelector = !showTableSelector;
					}}
					class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
				>
					테이블 선택
				</button>
				<button
					onclick={handleRefresh}
					disabled={loading}
					class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if loading}
						<span class="flex items-center gap-2">
							<svg
								class="h-4 w-4 animate-spin"
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
							생성 중...
						</span>
					{:else}
						<span class="flex items-center gap-2">
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
								/>
							</svg>
							새로고침
						</span>
					{/if}
				</button>
			</div>
		</div>
	</header>

	<!-- 테이블 선택 패널 -->
	{#if showTableSelector}
		<div class="border-b border-gray-200 bg-gray-50 px-4 py-4 sm:px-6 lg:px-8">
			<div class="space-y-4">
				<!-- 선택 모드 및 옵션 -->
				<div class="flex flex-wrap items-center gap-4">
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium text-gray-700">선택 모드:</span>
						<label class="flex cursor-pointer items-center gap-2">
							<input
								type="radio"
								name="selectionMode"
								value="single"
								bind:group={selectionMode}
								class="h-4 w-4 text-blue-600 focus:ring-blue-500"
							/>
							<span class="text-sm text-gray-700">단일 선택</span>
						</label>
						<label class="flex cursor-pointer items-center gap-2">
							<input
								type="radio"
								name="selectionMode"
								value="multi"
								bind:group={selectionMode}
								class="h-4 w-4 text-blue-600 focus:ring-blue-500"
							/>
							<span class="text-sm text-gray-700">다중 선택</span>
						</label>
					</div>
					<div class="flex items-center gap-2">
						<input
							type="checkbox"
							id="includeRelated"
							bind:checked={includeRelated}
							class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						/>
						<label for="includeRelated" class="cursor-pointer text-sm text-gray-700">
							관련 엔터티/속성 포함
						</label>
					</div>
				</div>

				<!-- 검색 및 선택 버튼 -->
				<div class="flex flex-wrap items-center gap-2">
					<input
						type="text"
						placeholder="테이블명으로 검색..."
						bind:value={tableSearchQuery}
						class="min-w-[200px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					/>
					{#if selectionMode === 'multi'}
						<button
							onclick={handleSelectAll}
							class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
						>
							전체 선택
						</button>
						<button
							onclick={handleDeselectAll}
							class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
						>
							전체 해제
						</button>
					{/if}
					<button
						onclick={handleGenerateERD}
						disabled={loading || (selectionMode === 'single' && selectedTableIds.size === 0)}
						class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						ERD 생성
					</button>
					<button
						onclick={handleViewAll}
						class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
					>
						전체 보기
					</button>
				</div>

				<!-- 선택된 테이블 표시 -->
				{#if selectedTableIds.size > 0}
					<div class="flex flex-wrap items-center gap-2">
						<span class="text-sm font-medium text-gray-700"
							>선택됨 ({selectedTableIds.size}개):</span
						>
						{#each Array.from(selectedTableIds) as tableId (tableId)}
							{@const table = tables.find((t) => t.id === tableId)}
							{#if table}
								<span
									class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
								>
									{table.tableEnglishName || table.tableKoreanName || tableId}
									<button
										onclick={() => handleTableToggle(tableId)}
										class="text-blue-600 hover:text-blue-800"
									>
										×
									</button>
								</span>
							{/if}
						{/each}
					</div>
				{/if}

				<!-- 테이블 목록 -->
				<div class="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white">
					{#if loadingTables}
						<div class="flex items-center justify-center p-4">
							<div
								class="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
							></div>
						</div>
					{:else if filteredTables().length === 0}
						<div class="p-4 text-center text-sm text-gray-500">테이블이 없습니다.</div>
					{:else}
						<div class="divide-y divide-gray-200">
							{#each filteredTables() as table (table.id)}
								<label class="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-gray-50">
									<input
										type={selectionMode === 'single' ? 'radio' : 'checkbox'}
										name={selectionMode === 'single' ? 'tableSelect' : undefined}
										checked={selectedTableIds.has(table.id)}
										onchange={() => handleTableToggle(table.id)}
										class="h-4 w-4 text-blue-600 focus:ring-blue-500"
									/>
									<div class="flex-1">
										<div class="text-sm font-medium text-gray-900">
											{table.tableEnglishName || '이름 없음'}
										</div>
										{#if table.tableKoreanName || table.schemaName}
											<div class="text-xs text-gray-500">
												{#if table.tableKoreanName}
													{table.tableKoreanName}
												{/if}
												{#if table.schemaName}
													{#if table.tableKoreanName}
														·
													{/if}
													스키마: {table.schemaName}
												{/if}
											</div>
										{/if}
									</div>
								</label>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- 연관관계 요약 패널 -->
	{#if showMappingSummary && erdData}
		{@const stats = mappingStats()}
		{#if stats}
			<div class="border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
			<div class="space-y-4">
				<h3 class="text-sm font-semibold text-gray-900">데이터 연관관계 요약</h3>

				<!-- 노드 통계 -->
				<div class="grid grid-cols-3 gap-3 sm:grid-cols-6">
					<div class="rounded-lg border border-blue-200 bg-blue-50 p-2 text-center">
						<div class="text-lg font-bold text-blue-700">{stats.databases}</div>
						<div class="text-xs text-blue-600">데이터베이스</div>
					</div>
					<div class="rounded-lg border border-green-200 bg-green-50 p-2 text-center">
						<div class="text-lg font-bold text-green-700">{stats.entities}</div>
						<div class="text-xs text-green-600">엔터티</div>
					</div>
					<div class="rounded-lg border border-teal-200 bg-teal-50 p-2 text-center">
						<div class="text-lg font-bold text-teal-700">{stats.attributes}</div>
						<div class="text-xs text-teal-600">속성</div>
					</div>
					<div class="rounded-lg border border-purple-200 bg-purple-50 p-2 text-center">
						<div class="text-lg font-bold text-purple-700">{stats.tables}</div>
						<div class="text-xs text-purple-600">테이블</div>
					</div>
					<div class="rounded-lg border border-orange-200 bg-orange-50 p-2 text-center">
						<div class="text-lg font-bold text-orange-700">{stats.columns}</div>
						<div class="text-xs text-orange-600">컬럼</div>
					</div>
					<div class="rounded-lg border border-pink-200 bg-pink-50 p-2 text-center">
						<div class="text-lg font-bold text-pink-700">{stats.domains}</div>
						<div class="text-xs text-pink-600">도메인</div>
					</div>
				</div>

				<!-- 매핑 관계 상세 -->
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<!-- 논리적 계층 -->
					<div class="rounded-lg border border-gray-200 p-3">
						<h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
							논리적 계층
						</h4>
						<div class="space-y-1 text-sm">
							<div class="flex justify-between">
								<span class="text-gray-600">DB → 엔터티</span>
								<span class="font-medium text-gray-900">{stats.dbEntity}건</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">엔터티 → 속성</span>
								<span class="font-medium text-gray-900">{stats.entityAttribute}건</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">엔터티 상속</span>
								<span class="font-medium text-gray-900">{stats.entityInheritance}건</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">속성 → 엔터티 참조</span>
								<span class="font-medium text-gray-900">{stats.attributeEntityRef}건</span>
							</div>
						</div>
					</div>

					<!-- 물리적 계층 -->
					<div class="rounded-lg border border-gray-200 p-3">
						<h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
							물리적 계층
						</h4>
						<div class="space-y-1 text-sm">
							<div class="flex justify-between">
								<span class="text-gray-600">DB → 테이블</span>
								<span class="font-medium text-gray-900">{stats.dbTable}건</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">테이블 → 컬럼</span>
								<span class="font-medium text-gray-900">{stats.tableColumn}건</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">컬럼 FK 관계</span>
								<span class="font-medium text-gray-900">{stats.columnFK}건</span>
							</div>
						</div>
					</div>

					<!-- 논리-물리 / 도메인 계층 -->
					<div class="rounded-lg border border-gray-200 p-3">
						<h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
							논리-물리 / 도메인
						</h4>
						<div class="space-y-1 text-sm">
							<div class="flex justify-between">
								<span class="text-gray-600">테이블 → 엔터티</span>
								<span class="font-medium text-gray-900">{stats.tableEntity}건</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">컬럼 → 엔터티</span>
								<span class="font-medium text-gray-900">{stats.columnEntity}건</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">속성 → 컬럼</span>
								<span class="font-medium text-gray-900">{stats.attributeColumn}건</span>
							</div>
							<div class="flex justify-between">
								<span class="text-gray-600">컬럼 → 도메인</span>
								<span class="font-medium text-gray-900">{stats.columnDomain}건</span>
							</div>
						</div>
					</div>
				</div>

				{#if erdData.relationValidation}
					<div class="rounded-lg border border-amber-200 bg-amber-50 p-3">
						<div class="mb-2 flex items-center justify-between">
							<h4 class="text-xs font-semibold uppercase tracking-wider text-amber-700">
								5개 정의서 정합성
							</h4>
							<div class="flex items-center gap-2">
								<span class="text-xs text-amber-700">
									검사 {erdData.relationValidation.totals.totalChecked}건
								</span>
								<button
									onclick={() => handleRelationSync(false)}
									disabled={relationSyncLoading}
									class="rounded border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
								>
									보정 미리보기
								</button>
								<button
									onclick={() => handleRelationSync(true)}
									disabled={relationSyncLoading}
									class="rounded border border-blue-300 bg-blue-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
								>
									자동 보정 실행
								</button>
							</div>
						</div>
						<div class="mb-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
							<div class="rounded border border-green-200 bg-white p-2 text-center">
								<div class="font-semibold text-green-700">
									{erdData.relationValidation.totals.matched}
								</div>
								<div class="text-xs text-green-600">매칭</div>
							</div>
							<div class="rounded border border-red-200 bg-white p-2 text-center">
								<div class="font-semibold text-red-700">
									{erdData.relationValidation.totals.errorCount}
								</div>
								<div class="text-xs text-red-600">오류</div>
							</div>
							<div class="rounded border border-yellow-200 bg-white p-2 text-center">
								<div class="font-semibold text-yellow-700">
									{erdData.relationValidation.totals.warningCount}
								</div>
								<div class="text-xs text-yellow-600">경고</div>
							</div>
							<div class="rounded border border-gray-200 bg-white p-2 text-center">
								<div class="font-semibold text-gray-700">
									{erdData.relationValidation.totals.unmatched}
								</div>
								<div class="text-xs text-gray-600">총 미매칭</div>
							</div>
						</div>
						<div class="grid grid-cols-1 gap-1 text-xs text-gray-700 sm:grid-cols-2">
							{#each erdData.relationValidation.summaries as summary (summary.relationId)}
								<div class="flex items-center justify-between rounded bg-white px-2 py-1">
									<span>{summary.relationName}</span>
									<span class={summary.severity === 'error'
										? 'font-medium text-red-700'
										: 'font-medium text-yellow-700'}>{summary.unmatched}</span>
								</div>
							{/each}
						</div>
						{#if relationSyncError}
							<div class="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
								{relationSyncError}
							</div>
						{/if}
						{#if relationSyncResult}
							<div class="mt-2 rounded border border-blue-200 bg-white p-2 text-xs text-gray-700">
								<div class="mb-1 font-semibold text-blue-700">
									최근 동기화 결과 ({relationSyncResult.mode === 'apply' ? '실행' : '미리보기'})
								</div>
								<div class="grid grid-cols-2 gap-1 sm:grid-cols-4">
									<div>후보 테이블: {relationSyncResult.counts.tableCandidates}</div>
									<div>후보 컬럼: {relationSyncResult.counts.columnCandidates}</div>
									<div>추천(속성→컬럼): {relationSyncResult.counts.attributeColumnSuggestions}</div>
									<div>실제 반영: {relationSyncResult.counts.appliedTotalUpdates}</div>
								</div>
							</div>
						{/if}
					</div>
				{/if}
				</div>
			</div>
		{/if}
	{/if}

	<!-- ERD 뷰어 -->
	<div class="flex-1 overflow-hidden">
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
					<svg
						class="mx-auto h-12 w-12 text-red-600"
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
					<h3 class="mt-4 text-lg font-semibold text-red-800">오류 발생</h3>
					<p class="mt-2 text-sm text-red-600">{error}</p>
					<button
						onclick={handleRefresh}
						class="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
					>
						다시 시도
					</button>
				</div>
			</div>
		{:else if erdData}
			<ERDViewer {erdData} />
		{:else}
			<div class="flex h-full items-center justify-center">
				<div class="text-center">
					<svg
						class="mx-auto h-12 w-12 text-gray-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<h3 class="mt-4 text-lg font-semibold text-gray-900">ERD 데이터 없음</h3>
					<p class="mt-2 text-sm text-gray-600">
						ERD를 생성하려면 DB, 엔터티, 속성, 테이블, 컬럼 데이터가 필요합니다.
					</p>
					<button
						onclick={handleRefresh}
						class="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
					>
						다시 시도
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
