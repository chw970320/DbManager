<script lang="ts">
	import { onMount, tick } from 'svelte';
	import BentoCard from '$lib/components/BentoCard.svelte';
	import BentoGrid from '$lib/components/BentoGrid.svelte';
	import BrowsePageLayout from '$lib/components/BrowsePageLayout.svelte';
	import BrowseSidebarSummary from '$lib/components/BrowseSidebarSummary.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { addToast } from '$lib/stores/toast-store';
	import { getNavigationBreadcrumbItems } from '$lib/utils/navigation';
	import type { QualityRuleMetric, QualityRuleViolation } from '$lib/types/data-quality-rule.js';
	import type { DataSourceSummaryEntry } from '$lib/types/data-source.js';
	import type {
		DataSourceProfileTarget,
		DataSourceProfileTargetsResult,
		DataSourceTableProfileResult
	} from '$lib/types/data-profiling.js';

	type ApiResponse<T> = { success: true; data: T } | { success: false; error?: string };

	const TARGETS_PER_PAGE = 10;

	let dataSources = $state<DataSourceSummaryEntry[]>([]);
	let selectedDataSourceId = $state('');
	let targetsResult = $state<DataSourceProfileTargetsResult | null>(null);
	let profileResult = $state<DataSourceTableProfileResult | null>(null);
	let tableSearchQuery = $state('');
	let schemaFilter = $state('all');
	let loadingSources = $state(false);
	let loadingTargets = $state(false);
	let profiling = $state(false);
	let sourceError = $state('');
	let targetError = $state('');
	let profileError = $state('');
	let activeTableKey = $state('');
	let currentTargetPage = $state(1);
	let profileResultSection = $state<HTMLElement | null>(null);

	const selectedDataSource = $derived(
		dataSources.find((entry) => entry.id === selectedDataSourceId) ?? null
	);

	const filteredTables = $derived.by(() => {
		const targets = targetsResult?.tables ?? [];
		const query = tableSearchQuery.trim().toLowerCase();

		return targets.filter((target) => {
			if (schemaFilter !== 'all' && target.schema !== schemaFilter) {
				return false;
			}

			if (!query) {
				return true;
			}

			const key = `${target.schema}.${target.table}`.toLowerCase();
			return key.includes(query);
		});
	});

	const schemaOptions = $derived(['all', ...(targetsResult?.schemas ?? [])]);
	const totalTargets = $derived(targetsResult?.tables.length ?? 0);
	const totalEstimatedRows = $derived.by(() =>
		(targetsResult?.tables ?? []).reduce((sum, target) => sum + (target.estimatedRowCount ?? 0), 0)
	);
	const targetTotalPages = $derived(
		Math.max(1, Math.ceil(filteredTables.length / TARGETS_PER_PAGE))
	);
	const pagedTables = $derived.by(() => {
		const startIndex = (currentTargetPage - 1) * TARGETS_PER_PAGE;
		return filteredTables.slice(startIndex, startIndex + TARGETS_PER_PAGE);
	});
	const currentTargetRange = $derived.by(() => {
		if (filteredTables.length === 0) {
			return { start: 0, end: 0 };
		}

		const start = (currentTargetPage - 1) * TARGETS_PER_PAGE + 1;
		const end = Math.min(filteredTables.length, currentTargetPage * TARGETS_PER_PAGE);

		return { start, end };
	});
	const targetDisplayedPages = $derived.by(() =>
		getDisplayedPages(currentTargetPage, targetTotalPages)
	);

	function formatNumber(value: number | undefined | null): string {
		if (value === null || value === undefined || Number.isNaN(value)) {
			return '-';
		}

		return new Intl.NumberFormat('ko-KR').format(value);
	}

	function formatRatio(value: number): string {
		return `${(value * 100).toFixed(value > 0 && value < 0.01 ? 2 : 1)}%`;
	}

	function isRatioMetric(metric: QualityRuleMetric): boolean {
		return metric === 'nullRatio' || metric === 'distinctRatio';
	}

	function formatRuleMetricValue(metric: QualityRuleMetric, value: number): string {
		return isRatioMetric(metric) ? formatRatio(value) : formatNumber(value);
	}

	function severityBadgeClass(severity: QualityRuleViolation['severity']): string {
		if (severity === 'error') {
			return 'badge-danger';
		}

		if (severity === 'warning') {
			return 'badge-warning';
		}

		return 'badge-info';
	}

	function sortDataSources(entries: DataSourceSummaryEntry[]): DataSourceSummaryEntry[] {
		return [...entries].sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
	}

	function getDisplayedPages(currentPage: number, totalPages: number): Array<number | string> {
		if (totalPages <= 7) {
			return Array.from({ length: totalPages }, (_, index) => index + 1);
		}

		if (currentPage <= 4) {
			return [1, 2, 3, 4, 5, 'ellipsis-right', totalPages];
		}

		if (currentPage >= totalPages - 3) {
			return [
				1,
				'ellipsis-left',
				totalPages - 4,
				totalPages - 3,
				totalPages - 2,
				totalPages - 1,
				totalPages
			];
		}

		return [
			1,
			'ellipsis-left',
			currentPage - 1,
			currentPage,
			currentPage + 1,
			'ellipsis-right',
			totalPages
		];
	}

	function resetTargets() {
		targetsResult = null;
		profileResult = null;
		targetError = '';
		profileError = '';
		activeTableKey = '';
		tableSearchQuery = '';
		schemaFilter = 'all';
		currentTargetPage = 1;
	}

	async function loadDataSources() {
		loadingSources = true;
		sourceError = '';

		try {
			const response = await fetch('/api/data-sources');
			const result: ApiResponse<DataSourceSummaryEntry[]> = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.success ? '데이터 소스 목록 조회에 실패했습니다.' : result.error);
			}

			dataSources = sortDataSources(result.data);

			if (!dataSources.find((entry) => entry.id === selectedDataSourceId)) {
				selectedDataSourceId = dataSources[0]?.id ?? '';
				resetTargets();
			}
		} catch (error) {
			console.error('프로파일링용 데이터 소스 로드 오류:', error);
			sourceError =
				error instanceof Error
					? error.message
					: '데이터 소스 목록을 불러오는 중 오류가 발생했습니다.';
		} finally {
			loadingSources = false;
		}
	}

	async function loadTargets() {
		if (!selectedDataSourceId) {
			addToast('프로파일링할 데이터 소스를 먼저 선택하세요.', 'warning');
			return;
		}

		loadingTargets = true;
		targetError = '';
		profileError = '';
		profileResult = null;
		activeTableKey = '';

		try {
			const response = await fetch(
				`/api/data-sources/profile/targets?dataSourceId=${encodeURIComponent(selectedDataSourceId)}`
			);
			const result: ApiResponse<DataSourceProfileTargetsResult> = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.success ? '프로파일링 대상 조회에 실패했습니다.' : result.error);
			}

			targetsResult = result.data;
			schemaFilter = 'all';
			tableSearchQuery = '';
			currentTargetPage = 1;
		} catch (error) {
			console.error('프로파일링 대상 조회 오류:', error);
			targetError =
				error instanceof Error
					? error.message
					: '프로파일링 대상을 불러오는 중 오류가 발생했습니다.';
		} finally {
			loadingTargets = false;
		}
	}

	function handleDataSourceChange(event: Event) {
		selectedDataSourceId = (event.target as HTMLSelectElement).value;
		resetTargets();
	}

	function handleSchemaFilterChange(event: Event) {
		schemaFilter = (event.target as HTMLSelectElement).value;
		currentTargetPage = 1;
	}

	function handleTableSearchInput(event: Event) {
		tableSearchQuery = (event.target as HTMLInputElement).value;
		currentTargetPage = 1;
	}

	function handleTargetPageChange(page: number) {
		if (page < 1 || page > targetTotalPages || page === currentTargetPage) {
			return;
		}

		currentTargetPage = page;
	}

	async function moveToProfileResult() {
		await tick();
		profileResultSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	async function runProfiling(target: DataSourceProfileTarget) {
		if (!selectedDataSourceId) {
			return;
		}

		profiling = true;
		profileError = '';
		activeTableKey = `${target.schema}.${target.table}`;

		try {
			const response = await fetch('/api/data-sources/profile/run', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					dataSourceId: selectedDataSourceId,
					schema: target.schema,
					table: target.table
				})
			});
			const result: ApiResponse<DataSourceTableProfileResult> = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.success ? '테이블 프로파일링 실행에 실패했습니다.' : result.error);
			}

			profileResult = result.data;
			addToast(`${target.schema}.${target.table} 프로파일링을 완료했습니다.`, 'success');
			await moveToProfileResult();
		} catch (error) {
			console.error('프로파일링 실행 오류:', error);
			profileError =
				error instanceof Error ? error.message : '테이블 프로파일링 중 오류가 발생했습니다.';
			addToast(profileError, 'error');
			await moveToProfileResult();
		} finally {
			profiling = false;
		}
	}

	function moveToDataSourcePage() {
		window.location.href = '/data-source/browse';
	}

	onMount(() => {
		void loadDataSources();
	});
</script>

<svelte:head>
	<title>데이터 관리 | 프로파일링</title>
	<meta
		name="description"
		content="저장된 PostgreSQL 데이터 소스로 스키마와 테이블을 조회하고 컬럼 프로파일링을 실행합니다."
	/>
</svelte:head>

{#snippet sidebar()}
	<BrowseSidebarSummary
		variant="card"
		loading={loadingSources || loadingTargets}
		loadingText="프로파일링 요약을 갱신하는 중입니다."
		ariaLabel="프로파일링 요약"
		subtitle="현재 선택과 조회 현황"
		items={[
			{ label: '저장된 데이터 소스', value: dataSources.length },
			{ label: '조회된 테이블', value: totalTargets },
			{ label: '목록 페이지', value: `${currentTargetPage} / ${targetTotalPages}` },
			{ label: '예상 행 수 합계', value: formatNumber(totalEstimatedRows), span: 2 }
		]}
	/>
{/snippet}

<BrowsePageLayout
	title="프로파일링"
	description="저장된 PostgreSQL 데이터 소스를 기준으로 실제 테이블과 컬럼 분포를 즉시 확인합니다."
	breadcrumbItems={getNavigationBreadcrumbItems('/profiling/browse')}
	sidebarSurface="plain"
	mobileSidebarEnabled={false}
	{sidebar}
>
	<BentoGrid gapClass="gap-6">
		<div class="col-span-12">
			<BentoCard title="대상 선택" subtitle="데이터 소스를 고른 뒤 테이블 목록을 불러오세요.">
				{#if sourceError}
					<div
						class="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error"
					>
						{sourceError}
					</div>
				{:else if dataSources.length === 0 && !loadingSources}
					<EmptyState
						icon="link"
						title="저장된 데이터 소스가 없습니다."
						description="먼저 PostgreSQL 연결을 등록해야 프로파일링을 시작할 수 있습니다."
						actionLabel="데이터 소스 관리로 이동"
						onaction={moveToDataSourcePage}
					/>
				{:else}
					<div class="grid gap-4 md:grid-cols-1">
						<FormField label="저장된 데이터 소스" name="profiling-data-source" required>
							<select
								id="profiling-data-source"
								class="input"
								value={selectedDataSourceId}
								onchange={handleDataSourceChange}
								aria-label="저장된 데이터 소스"
							>
								<option value="">데이터 소스를 선택하세요</option>
								{#each dataSources as entry (entry.id)}
									<option value={entry.id}>{entry.name}</option>
								{/each}
							</select>
						</FormField>

						{#if selectedDataSource}
							<div class="rounded-lg border border-border bg-surface-muted p-4 text-sm">
								<p class="font-medium text-content">{selectedDataSource.name}</p>
								<p class="mt-1 text-content-secondary">
									{selectedDataSource.config.host}:{selectedDataSource.config.port} /
									{selectedDataSource.config.database}
								</p>
								<p class="mt-1 text-content-muted">
									기본 스키마: {selectedDataSource.config.schema ?? 'public'} / 사용자명:
									{selectedDataSource.config.username}
								</p>
							</div>
						{/if}

						<div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
							<button
								type="button"
								class="btn btn-secondary"
								onclick={loadDataSources}
								disabled={loadingSources}
							>
								<Icon name={loadingSources ? 'spinner' : 'refresh'} size="sm" />
								<span>{loadingSources ? '로딩 중...' : '데이터 소스 새로고침'}</span>
							</button>
							<button
								type="button"
								class="btn btn-primary"
								onclick={loadTargets}
								disabled={loadingSources || loadingTargets || !selectedDataSourceId}
							>
								<Icon name={loadingTargets ? 'spinner' : 'search'} size="sm" />
								<span>{loadingTargets ? '불러오는 중...' : '테이블 불러오기'}</span>
							</button>
						</div>
					</div>
				{/if}
			</BentoCard>
		</div>

		{#if profileResult || profileError}
			<div class="col-span-12">
				<div bind:this={profileResultSection}>
					<BentoCard
						title="프로파일링 결과"
						subtitle={profileResult
							? `${profileResult.schema}.${profileResult.table} / ${profileResult.columns.length}개 컬럼`
							: '실행 오류'}
					>
						{#if profileError}
							<div
								class="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error"
							>
								{profileError}
							</div>
						{/if}

						{#if profileResult}
							<div class="grid gap-3 text-sm sm:grid-cols-3">
								<div class="rounded-lg bg-surface-muted p-4">
									<p class="text-xs text-content-muted">총 행 수</p>
									<p class="mt-1 text-2xl font-semibold text-content">
										{formatNumber(profileResult.rowCount)}건
									</p>
								</div>
								<div class="rounded-lg bg-surface-muted p-4">
									<p class="text-xs text-content-muted">프로파일링 컬럼</p>
									<p class="mt-1 text-2xl font-semibold text-content">
										{formatNumber(profileResult.columns.length)}개
									</p>
								</div>
								<div class="rounded-lg bg-surface-muted p-4">
									<p class="text-xs text-content-muted">실행 시각</p>
									<p class="mt-1 text-sm font-medium text-content">{profileResult.profiledAt}</p>
								</div>
							</div>

							{#if profileResult.qualityRuleEvaluation}
								<div class="mt-5 rounded-xl border border-border bg-surface-muted p-4">
									<div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
										<div>
											<h3 class="text-base font-semibold text-content">품질 규칙 평가</h3>
											<p class="mt-1 text-sm text-content-muted">
												활성 규칙 {profileResult.qualityRuleEvaluation.summary.totalRules}건 중 매칭 {profileResult
													.qualityRuleEvaluation.summary.matchedRules}건
											</p>
										</div>
										<p class="text-xs text-content-muted">
											평가 시각: {profileResult.qualityRuleEvaluation.evaluatedAt}
										</p>
									</div>

									<div class="mt-4 grid gap-3 text-sm sm:grid-cols-4">
										<div class="rounded-lg bg-surface p-4">
											<p class="text-xs text-content-muted">통과 규칙</p>
											<p class="mt-1 text-2xl font-semibold text-content">
												{formatNumber(profileResult.qualityRuleEvaluation.summary.passedRules)}
											</p>
										</div>
										<div class="rounded-lg bg-surface p-4">
											<p class="text-xs text-content-muted">실패 규칙</p>
											<p class="mt-1 text-2xl font-semibold text-content">
												{formatNumber(profileResult.qualityRuleEvaluation.summary.failedRules)}
											</p>
										</div>
										<div class="rounded-lg bg-surface p-4">
											<p class="text-xs text-content-muted">warning 위반</p>
											<p class="mt-1 text-2xl font-semibold text-content">
												{formatNumber(profileResult.qualityRuleEvaluation.summary.warningCount)}
											</p>
										</div>
										<div class="rounded-lg bg-surface p-4">
											<p class="text-xs text-content-muted">error 위반</p>
											<p class="mt-1 text-2xl font-semibold text-content">
												{formatNumber(profileResult.qualityRuleEvaluation.summary.errorCount)}
											</p>
										</div>
									</div>

									{#if profileResult.qualityRuleEvaluation.violations.length > 0}
										<div class="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
											<table class="min-w-full divide-y divide-border text-sm">
												<thead class="bg-surface-muted">
													<tr>
														<th class="px-4 py-3 text-left font-semibold text-content-secondary">
															규칙
														</th>
														<th class="px-4 py-3 text-left font-semibold text-content-secondary">
															대상
														</th>
														<th class="px-4 py-3 text-left font-semibold text-content-secondary">
															심각도
														</th>
														<th class="px-4 py-3 text-left font-semibold text-content-secondary">
															메트릭
														</th>
														<th class="px-4 py-3 text-left font-semibold text-content-secondary">
															실제값 / 기준
														</th>
													</tr>
												</thead>
												<tbody class="divide-y divide-border bg-surface">
													{#each profileResult.qualityRuleEvaluation.violations as violation (`${violation.ruleId}:${violation.target.column ?? violation.target.table}`)}
														<tr>
															<td class="px-4 py-3 align-top">
																<p class="font-medium text-content">{violation.ruleName}</p>
																<p class="mt-1 text-xs text-content-muted">{violation.message}</p>
															</td>
															<td class="px-4 py-3 align-top text-content-secondary">
																{violation.target.schema}.{violation.target.table}
																{#if violation.target.column}
																	.{violation.target.column}
																{/if}
															</td>
															<td class="px-4 py-3 align-top">
																<span class={`badge ${severityBadgeClass(violation.severity)}`}>
																	{violation.severity}
																</span>
															</td>
															<td class="px-4 py-3 align-top text-content-secondary">
																{violation.metric}
																{violation.operator}
															</td>
															<td class="px-4 py-3 align-top text-content-secondary">
																{formatRuleMetricValue(violation.metric, violation.actualValue)}
																/
																{formatRuleMetricValue(violation.metric, violation.threshold)}
															</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									{:else if profileResult.qualityRuleEvaluation.summary.totalRules === 0}
										<div
											class="mt-4 rounded-lg border border-status-info-border bg-status-info-bg p-4 text-sm text-status-info"
										>
											활성 품질 규칙이 없습니다. `품질 규칙` 메뉴에서 규칙을 추가하면 프로파일링
											결과와 함께 평가됩니다.
										</div>
									{:else}
										<div
											class="mt-4 rounded-lg border border-status-success-border bg-status-success-bg p-4 text-sm text-status-success"
										>
											매칭된 품질 규칙 위반이 없습니다.
										</div>
									{/if}
								</div>
							{/if}

							<div class="mt-5 overflow-x-auto rounded-xl border border-border">
								<table class="min-w-full divide-y divide-border text-sm">
									<thead class="bg-surface-muted">
										<tr>
											<th class="px-4 py-3 text-left font-semibold text-content-secondary">컬럼</th>
											<th class="px-4 py-3 text-left font-semibold text-content-secondary">타입</th>
											<th class="px-4 py-3 text-left font-semibold text-content-secondary">NULL</th>
											<th class="px-4 py-3 text-left font-semibold text-content-secondary">
												NULL 비율
											</th>
											<th class="px-4 py-3 text-left font-semibold text-content-secondary">
												Distinct
											</th>
											<th class="px-4 py-3 text-left font-semibold text-content-secondary">
												Distinct 비율
											</th>
											<th class="px-4 py-3 text-left font-semibold text-content-secondary">
												길이 범위
											</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-border bg-surface">
										{#each profileResult.columns as column (column.columnName)}
											<tr>
												<td class="px-4 py-3 align-top">
													<p class="font-medium text-content">{column.columnName}</p>
													<p class="mt-1 text-xs text-content-muted">
														순서 {column.ordinalPosition} / {column.isNullable
															? 'NULL 허용'
															: 'NOT NULL'}
													</p>
												</td>
												<td class="px-4 py-3 align-top text-content-secondary">
													{column.dataType}
												</td>
												<td class="px-4 py-3 align-top text-content-secondary">
													{formatNumber(column.nullCount)}
												</td>
												<td class="px-4 py-3 align-top text-content-secondary">
													{formatRatio(column.nullRatio)}
												</td>
												<td class="px-4 py-3 align-top text-content-secondary">
													{formatNumber(column.distinctCount)}
												</td>
												<td class="px-4 py-3 align-top text-content-secondary">
													{formatRatio(column.distinctRatio)}
												</td>
												<td class="px-4 py-3 align-top text-content-secondary">
													{column.minLength !== undefined && column.maxLength !== undefined
														? `${formatNumber(column.minLength)} ~ ${formatNumber(column.maxLength)}`
														: '-'}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</BentoCard>
				</div>
			</div>
		{/if}

		{#if targetsResult}
			<div class="col-span-12">
				<BentoCard
					title="대상 필터"
					subtitle="조회된 테이블을 스키마와 이름으로 좁혀볼 수 있습니다."
				>
					<div class="grid gap-4 md:grid-cols-2">
						<FormField label="스키마 필터" name="profiling-schema-filter">
							<select
								id="profiling-schema-filter"
								class="input"
								value={schemaFilter}
								onchange={handleSchemaFilterChange}
								aria-label="스키마 필터"
							>
								{#each schemaOptions as option (option)}
									<option value={option}>
										{option === 'all' ? '전체 스키마' : option}
									</option>
								{/each}
							</select>
						</FormField>

						<FormField label="테이블 검색" name="profiling-table-search">
							<input
								id="profiling-table-search"
								class="input"
								value={tableSearchQuery}
								oninput={handleTableSearchInput}
								placeholder="schema.table 또는 테이블명으로 검색"
								aria-label="테이블 검색"
							/>
						</FormField>
					</div>
				</BentoCard>
			</div>
		{/if}

		<div class="col-span-12">
			<BentoCard
				title="프로파일링 대상 테이블"
				subtitle={targetsResult
					? `검색 결과 ${filteredTables.length}건 / 전체 ${targetsResult.tables.length}건${
							filteredTables.length > 0
								? ` · ${currentTargetRange.start}-${currentTargetRange.end}건 표시`
								: ''
						}`
					: '데이터 소스를 선택하고 테이블을 불러오면 목록이 표시됩니다.'}
			>
				{#if targetError}
					<div
						class="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error"
					>
						{targetError}
					</div>
				{:else if loadingTargets}
					<div class="flex items-center justify-center gap-2 py-16 text-sm text-content-muted">
						<Icon name="spinner" size="md" />
						<span>PostgreSQL 테이블 목록을 불러오는 중입니다.</span>
					</div>
				{:else if !targetsResult}
					<EmptyState
						icon="database"
						title="프로파일링 대상이 아직 없습니다."
						description="데이터 소스를 선택한 뒤 상단의 '테이블 불러오기'를 실행하세요."
					/>
				{:else if filteredTables.length === 0}
					<EmptyState
						icon="search"
						title="조건에 맞는 테이블이 없습니다."
						description="스키마 필터나 검색어를 조정한 뒤 다시 확인하세요."
					/>
				{:else}
					<div class="overflow-x-auto rounded-xl border border-border">
						<table class="min-w-full divide-y divide-border text-sm">
							<thead class="bg-surface-muted">
								<tr>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">스키마</th>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">테이블</th>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">유형</th>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary"
										>예상 행 수</th
									>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">컬럼 수</th>
									<th class="px-4 py-3 text-right font-semibold text-content-secondary">실행</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-border bg-surface">
								{#each pagedTables as target (`${target.schema}.${target.table}`)}
									<tr
										class="hover:bg-surface-muted/70"
										aria-label={`${target.schema}.${target.table}`}
									>
										<td class="px-4 py-3 text-content-secondary">{target.schema}</td>
										<td class="px-4 py-3">
											<p class="font-medium text-content">{target.table}</p>
										</td>
										<td class="px-4 py-3 text-content-secondary">{target.tableType}</td>
										<td class="px-4 py-3 text-content-secondary">
											{formatNumber(target.estimatedRowCount)}
										</td>
										<td class="px-4 py-3 text-content-secondary">
											{formatNumber(target.columnCount)}
										</td>
										<td class="px-4 py-3">
											<div class="flex justify-end">
												{#if profiling && activeTableKey === `${target.schema}.${target.table}`}
													<button type="button" class="btn btn-outline btn-sm" disabled>
														실행 중...
													</button>
												{:else}
													<button
														type="button"
														class="btn btn-primary btn-sm"
														onclick={() => runProfiling(target)}
														disabled={profiling}
														aria-label={`${target.table} 프로파일링 실행`}>프로파일링 실행</button
													>
												{/if}
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					{#if targetTotalPages > 1}
						<div
							class="mt-4 flex flex-col gap-4 rounded-xl border border-border bg-surface-muted px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
						>
							<p class="text-sm text-content-muted">
								총 <span class="font-semibold text-content">{targetTotalPages}</span> 페이지 중
								<span class="font-semibold text-content">{currentTargetPage}</span> 페이지
							</p>

							<nav
								class="flex flex-wrap items-center justify-end gap-2"
								aria-label="프로파일링 대상 페이지네이션"
							>
								<button
									type="button"
									class="btn btn-outline btn-sm"
									onclick={() => handleTargetPageChange(currentTargetPage - 1)}
									disabled={currentTargetPage === 1}
								>
									이전
								</button>

								{#each targetDisplayedPages as page, index (`${page}-${index}`)}
									{#if typeof page === 'number'}
										<button
											type="button"
											class={`btn btn-sm ${
												currentTargetPage === page ? 'btn-primary' : 'btn-outline'
											}`}
											onclick={() => handleTargetPageChange(page)}
											aria-current={currentTargetPage === page ? 'page' : undefined}
										>
											{page}
										</button>
									{:else}
										<span class="px-1 text-sm font-medium text-content-muted">...</span>
									{/if}
								{/each}

								<button
									type="button"
									class="btn btn-outline btn-sm"
									onclick={() => handleTargetPageChange(currentTargetPage + 1)}
									disabled={currentTargetPage === targetTotalPages}
								>
									다음
								</button>
							</nav>
						</div>
					{/if}
				{/if}
			</BentoCard>
		</div>
	</BentoGrid>
</BrowsePageLayout>
