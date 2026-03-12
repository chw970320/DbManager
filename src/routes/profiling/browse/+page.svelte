<script lang="ts">
	import { onMount } from 'svelte';
	import ActionBar from '$lib/components/ActionBar.svelte';
	import BentoCard from '$lib/components/BentoCard.svelte';
	import BentoGrid from '$lib/components/BentoGrid.svelte';
	import BrowsePageLayout from '$lib/components/BrowsePageLayout.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { addToast } from '$lib/stores/toast-store';
	import type { DataSourceSummaryEntry } from '$lib/types/data-source.js';
	import type {
		DataSourceProfileTarget,
		DataSourceProfileTargetsResult,
		DataSourceTableProfileResult
	} from '$lib/types/data-profiling.js';

	type ApiResponse<T> = { success: true; data: T } | { success: false; error?: string };

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
		(targetsResult?.tables ?? []).reduce(
			(sum, target) => sum + (target.estimatedRowCount ?? 0),
			0
		)
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

	function sortDataSources(entries: DataSourceSummaryEntry[]): DataSourceSummaryEntry[] {
		return [...entries].sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
	}

	function resetTargets() {
		targetsResult = null;
		profileResult = null;
		targetError = '';
		profileError = '';
		activeTableKey = '';
		tableSearchQuery = '';
		schemaFilter = 'all';
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
		} catch (error) {
			console.error('프로파일링 실행 오류:', error);
			profileError =
				error instanceof Error ? error.message : '테이블 프로파일링 중 오류가 발생했습니다.';
			addToast(profileError, 'error');
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

{#snippet actions()}
	<ActionBar alignment="right">
		<button type="button" class="btn btn-secondary" onclick={loadDataSources} disabled={loadingSources}>
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
	</ActionBar>
{/snippet}

<BrowsePageLayout
	title="프로파일링"
	description="저장된 PostgreSQL 데이터 소스를 기준으로 실제 테이블과 컬럼 분포를 즉시 확인합니다."
	{actions}
>
	<BentoGrid gapClass="gap-6">
		<div class="col-span-12 lg:col-span-8">
			<BentoCard
				eyebrow="1차 범위"
				title="PostgreSQL 실데이터 프로파일링"
				subtitle="실행 이력 저장 없이 현재 연결 상태에서 스키마/테이블/컬럼 지표를 바로 계산합니다."
				class="bg-gradient-to-r from-emerald-50 via-white to-sky-50"
			>
				<div class="grid gap-3 text-sm text-content-secondary sm:grid-cols-3">
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="font-medium text-content">현재 지표</p>
						<p class="mt-1">행 수, NULL 비율, distinct 비율, 최소/최대 길이</p>
					</div>
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="font-medium text-content">입력 범위</p>
						<p class="mt-1">저장된 PostgreSQL 사용자 테이블</p>
					</div>
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="font-medium text-content">주의</p>
						<p class="mt-1">정확한 `COUNT(*)`를 사용하므로 대용량 테이블은 시간이 걸릴 수 있습니다.</p>
					</div>
				</div>
			</BentoCard>
		</div>

		<div class="col-span-12 lg:col-span-4">
			<BentoCard title="요약" subtitle="현재 선택과 조회 현황">
				<div class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="text-xs text-content-muted">저장된 데이터 소스</p>
						<p class="mt-1 text-2xl font-semibold text-content">{dataSources.length}</p>
					</div>
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="text-xs text-content-muted">조회된 테이블</p>
						<p class="mt-1 text-2xl font-semibold text-content">{totalTargets}</p>
					</div>
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="text-xs text-content-muted">예상 행 수 합계</p>
						<p class="mt-1 text-2xl font-semibold text-content">{formatNumber(totalEstimatedRows)}</p>
					</div>
				</div>
			</BentoCard>
		</div>

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
					</div>
				{/if}
			</BentoCard>
		</div>

		{#if targetsResult}
			<div class="col-span-12">
				<BentoCard title="대상 필터" subtitle="조회된 테이블을 스키마와 이름으로 좁혀볼 수 있습니다.">
					<div class="grid gap-4 md:grid-cols-2">
						<FormField label="스키마 필터" name="profiling-schema-filter">
							<select
								id="profiling-schema-filter"
								class="input"
								bind:value={schemaFilter}
								aria-label="스키마 필터"
							>
								{#each schemaOptions as option}
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
								bind:value={tableSearchQuery}
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
					? `검색 결과 ${filteredTables.length}건 / 전체 ${targetsResult.tables.length}건`
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
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">예상 행 수</th>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">컬럼 수</th>
									<th class="px-4 py-3 text-right font-semibold text-content-secondary">실행</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-border bg-surface">
								{#each filteredTables as target (`${target.schema}.${target.table}`)}
									<tr class="hover:bg-surface-muted/70" aria-label={`${target.schema}.${target.table}`}>
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
												<button
													type="button"
													class="btn btn-primary btn-sm"
													onclick={() => runProfiling(target)}
													disabled={profiling}
													aria-label={`${target.table} 프로파일링 실행`}
												>
													{profiling && activeTableKey === `${target.schema}.${target.table}`
														? '실행 중...'
														: '프로파일링 실행'}
												</button>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</BentoCard>
		</div>

		{#if profileResult || profileError}
			<div class="col-span-12">
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

						<div class="mt-5 overflow-x-auto rounded-xl border border-border">
							<table class="min-w-full divide-y divide-border text-sm">
								<thead class="bg-surface-muted">
									<tr>
										<th class="px-4 py-3 text-left font-semibold text-content-secondary">컬럼</th>
										<th class="px-4 py-3 text-left font-semibold text-content-secondary">타입</th>
										<th class="px-4 py-3 text-left font-semibold text-content-secondary">NULL</th>
										<th class="px-4 py-3 text-left font-semibold text-content-secondary">NULL 비율</th>
										<th class="px-4 py-3 text-left font-semibold text-content-secondary">
											Distinct
										</th>
										<th class="px-4 py-3 text-left font-semibold text-content-secondary">
											Distinct 비율
										</th>
										<th class="px-4 py-3 text-left font-semibold text-content-secondary">길이 범위</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-border bg-surface">
									{#each profileResult.columns as column (column.columnName)}
										<tr>
											<td class="px-4 py-3 align-top">
												<p class="font-medium text-content">{column.columnName}</p>
												<p class="mt-1 text-xs text-content-muted">
													순서 {column.ordinalPosition} / {column.isNullable ? 'NULL 허용' : 'NOT NULL'}
												</p>
											</td>
											<td class="px-4 py-3 align-top text-content-secondary">{column.dataType}</td>
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
		{/if}
	</BentoGrid>
</BrowsePageLayout>
