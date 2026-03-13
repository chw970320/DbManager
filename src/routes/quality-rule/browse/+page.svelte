<script lang="ts">
	import { onMount } from 'svelte';
	import ActionBar from '$lib/components/ActionBar.svelte';
	import BentoCard from '$lib/components/BentoCard.svelte';
	import BentoGrid from '$lib/components/BentoGrid.svelte';
	import BrowsePageLayout from '$lib/components/BrowsePageLayout.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import QualityRuleEditor, {
		type QualityRuleEditorSubmitDetail
	} from '$lib/components/QualityRuleEditor.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import { showConfirm } from '$lib/stores/confirm-store';
	import { addToast } from '$lib/stores/toast-store';
	import type { QualityRuleData, QualityRuleEntry } from '$lib/types/data-quality-rule.js';

	type ApiResponse<T> = { success: true; data: T } | { success: false; error?: string };

	type SearchDetail = {
		query: string;
		field: string;
		exact: boolean;
	};

	type MutationResponse = {
		entry?: QualityRuleEntry;
		data: QualityRuleData;
	};

	const searchFields = [
		{ value: 'all', label: '전체' },
		{ value: 'name', label: '규칙 이름' },
		{ value: 'severity', label: '심각도' },
		{ value: 'scope', label: '범위' },
		{ value: 'metric', label: '메트릭' }
	];

	let entries = $state<QualityRuleEntry[]>([]);
	let loading = $state(false);
	let errorMessage = $state('');
	let searchQuery = $state('');
	let searchField = $state('all');
	let searchExact = $state(false);
	let showEditor = $state(false);
	let currentEditingEntry = $state<QualityRuleEntry | null>(null);
	let editorSubmitting = $state(false);
	let editorServerError = $state('');

	const filteredEntries = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) {
			return entries;
		}

		return entries.filter((entry) => {
			const candidates =
				searchField === 'name'
					? [entry.name]
					: searchField === 'severity'
						? [entry.severity]
						: searchField === 'scope'
							? [entry.scope]
							: searchField === 'metric'
								? [entry.metric]
								: [entry.name, entry.severity, entry.scope, entry.metric];

			return candidates.some((value) => {
				const normalized = value.toLowerCase();
				return searchExact ? normalized === query : normalized.includes(query);
			});
		});
	});

	const enabledCount = $derived(entries.filter((entry) => entry.enabled).length);
	const columnRuleCount = $derived(entries.filter((entry) => entry.scope === 'column').length);
	const warningRuleCount = $derived(entries.filter((entry) => entry.severity === 'warning').length);

	function sortEntries(nextEntries: QualityRuleEntry[]): QualityRuleEntry[] {
		return [...nextEntries].sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
	}

	function formatDateTime(value: string): string {
		try {
			return new Intl.DateTimeFormat('ko-KR', {
				dateStyle: 'medium',
				timeStyle: 'short'
			}).format(new Date(value));
		} catch {
			return value;
		}
	}

	function formatThreshold(value: number): string {
		if (value % 1 === 0) {
			return new Intl.NumberFormat('ko-KR').format(value);
		}

		return value.toString();
	}

	function formatTarget(entry: QualityRuleEntry): string {
		const schema = entry.target.schemaPattern || '*';
		const table = entry.target.tablePattern || '*';

		if (entry.scope === 'column') {
			return `${schema}.${table}.${entry.target.columnPattern || '*'}`;
		}

		return `${schema}.${table}`;
	}

	async function loadEntries() {
		loading = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/quality-rules');
			const result: ApiResponse<QualityRuleData> = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.success ? '품질 규칙 목록 조회에 실패했습니다.' : result.error);
			}

			entries = sortEntries(result.data.entries);
		} catch (error) {
			console.error('품질 규칙 목록 로드 오류:', error);
			errorMessage =
				error instanceof Error
					? error.message
					: '품질 규칙 목록을 불러오는 중 오류가 발생했습니다.';
		} finally {
			loading = false;
		}
	}

	function openCreateEditor() {
		currentEditingEntry = null;
		editorServerError = '';
		showEditor = true;
	}

	function openEditEditor(entry: QualityRuleEntry) {
		currentEditingEntry = entry;
		editorServerError = '';
		showEditor = true;
	}

	function closeEditor() {
		showEditor = false;
		currentEditingEntry = null;
		editorServerError = '';
	}

	async function handleSave(event: CustomEvent<QualityRuleEditorSubmitDetail>) {
		editorSubmitting = true;
		editorServerError = '';

		try {
			const detail = event.detail;
			const isEditMode = Boolean(detail.id);
			const response = await fetch('/api/quality-rules', {
				method: isEditMode ? 'PUT' : 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(detail)
			});
			const result: ApiResponse<MutationResponse> = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.success ? '품질 규칙 저장에 실패했습니다.' : result.error);
			}

			entries = sortEntries(result.data.data.entries);
			addToast(isEditMode ? '품질 규칙을 수정했습니다.' : '품질 규칙을 추가했습니다.', 'success');
			closeEditor();
		} catch (error) {
			console.error('품질 규칙 저장 오류:', error);
			editorServerError =
				error instanceof Error ? error.message : '품질 규칙 저장 중 오류가 발생했습니다.';
		} finally {
			editorSubmitting = false;
		}
	}

	async function handleDelete(entry: QualityRuleEntry) {
		const confirmed = await showConfirm({
			title: '품질 규칙 삭제',
			message: `'${entry.name}' 규칙을 삭제하시겠습니까? 프로파일링 평가에서 즉시 제외됩니다.`,
			confirmText: '삭제',
			variant: 'danger'
		});

		if (!confirmed) {
			return;
		}

		try {
			const response = await fetch('/api/quality-rules', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ id: entry.id })
			});
			const result: ApiResponse<{ data: QualityRuleData }> = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.success ? '품질 규칙 삭제에 실패했습니다.' : result.error);
			}

			entries = sortEntries(result.data.data.entries);
			addToast('품질 규칙을 삭제했습니다.', 'success');
		} catch (error) {
			console.error('품질 규칙 삭제 오류:', error);
			addToast(
				error instanceof Error ? error.message : '품질 규칙 삭제 중 오류가 발생했습니다.',
				'error'
			);
		}
	}

	function handleSearch(detail: SearchDetail) {
		searchQuery = detail.query;
		searchField = detail.field;
		searchExact = detail.exact;
	}

	function handleSearchClear() {
		searchQuery = '';
		searchField = 'all';
		searchExact = false;
	}

	onMount(() => {
		void loadEntries();
	});
</script>

<svelte:head>
	<title>데이터 관리 | 품질 규칙</title>
	<meta
		name="description"
		content="프로파일링 결과에 즉시 적용할 품질 규칙을 등록하고 관리합니다."
	/>
</svelte:head>

{#snippet actions()}
	<ActionBar alignment="right">
		<button type="button" class="btn btn-primary" onclick={openCreateEditor} disabled={loading}>
			<Icon name="plus" size="sm" />
			<span>새 품질 규칙 추가</span>
		</button>
		<button type="button" class="btn btn-secondary" onclick={loadEntries} disabled={loading}>
			<Icon name={loading ? 'spinner' : 'refresh'} size="sm" />
			<span>{loading ? '로딩 중...' : '새로고침'}</span>
		</button>
	</ActionBar>
{/snippet}

<BrowsePageLayout
	title="품질 규칙"
	description="PostgreSQL 프로파일링 결과에 즉시 적용할 최소 품질 규칙을 저장합니다."
	{actions}
>
	<QualityRuleEditor
		isOpen={showEditor}
		entry={currentEditingEntry}
		isSubmitting={editorSubmitting}
		serverError={editorServerError}
		on:save={handleSave}
		on:close={closeEditor}
	/>

	<BentoGrid gapClass="gap-6">
		<!-- 1. 검색 영역 우선 노출 -->
		<div class="col-span-12">
			<BentoCard title="검색" subtitle="규칙 이름, 심각도, 범위, 메트릭으로 검색">
				<SearchBar
					placeholder="규칙 이름, 심각도, 범위, 메트릭으로 검색하세요..."
					{searchFields}
					bind:query={searchQuery}
					bind:field={searchField}
					bind:exact={searchExact}
					onsearch={handleSearch}
					onclear={handleSearchClear}
				/>
			</BentoCard>
		</div>

		<!-- 2. 요약/설명 카드를 6:6으로 정리 -->
		<div class="col-span-12 lg:col-span-6">
			<BentoCard title="요약" subtitle="저장된 규칙 현황">
				<div class="grid gap-3 text-sm sm:grid-cols-4 lg:grid-cols-2">
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="text-xs text-content-muted">전체 규칙</p>
						<p class="mt-1 text-2xl font-semibold text-content">{entries.length}</p>
					</div>
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="text-xs text-content-muted">활성 규칙</p>
						<p class="mt-1 text-2xl font-semibold text-content">{enabledCount}</p>
					</div>
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="text-xs text-content-muted">column 규칙</p>
						<p class="mt-1 text-2xl font-semibold text-content">{columnRuleCount}</p>
					</div>
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="text-xs text-content-muted">warning 규칙</p>
						<p class="mt-1 text-2xl font-semibold text-content">{warningRuleCount}</p>
					</div>
				</div>
			</BentoCard>
		</div>

		<div class="col-span-12 lg:col-span-6">
			<BentoCard
				eyebrow="현재 범위"
				title="프로파일링 기반 품질 규칙"
				subtitle="실데이터 프로파일링에서 계산하는 지표만 규칙으로 저장해 즉시 평가합니다."
				class="bg-gradient-to-r from-amber-50 via-white to-emerald-50"
			>
				<div class="grid gap-3 text-sm text-content-secondary sm:grid-cols-3">
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="font-medium text-content">table 범위</p>
						<p class="mt-1">현재는 `rowCount` 기준만 지원합니다.</p>
					</div>
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="font-medium text-content">column 범위</p>
						<p class="mt-1">NULL, distinct, 길이 기반 메트릭을 평가합니다.</p>
					</div>
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="font-medium text-content">타깃 지정</p>
						<p class="mt-1">
							`schema`, `table`, `column` 패턴에 `*` 와일드카드를 사용할 수 있습니다.
						</p>
					</div>
				</div>
			</BentoCard>
		</div>

		<div class="col-span-12">
			<BentoCard
				title="저장된 품질 규칙"
				subtitle={searchQuery
					? `검색 결과 ${filteredEntries.length}건`
					: `전체 ${entries.length}건`}
			>
				{#if errorMessage}
					<div
						class="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error"
					>
						{errorMessage}
					</div>
				{:else if loading}
					<div class="flex items-center justify-center gap-2 py-16 text-sm text-content-muted">
						<Icon name="spinner" size="md" />
						<span>품질 규칙 목록을 불러오는 중입니다.</span>
					</div>
				{:else if filteredEntries.length === 0}
					<EmptyState
						icon="check-circle"
						title={entries.length === 0 ? '저장된 품질 규칙이 없습니다.' : '검색 결과가 없습니다.'}
						description={entries.length === 0
							? '첫 규칙을 추가하면 프로파일링 실행 시 자동으로 품질 평가가 함께 표시됩니다.'
							: '검색 조건을 바꾸거나 새로운 규칙을 추가해 보세요.'}
						actionLabel={entries.length === 0 ? '새 품질 규칙 추가' : ''}
						onaction={entries.length === 0 ? openCreateEditor : undefined}
					/>
				{:else}
					<div class="overflow-x-auto rounded-xl border border-border">
						<table class="min-w-full divide-y divide-border text-sm">
							<thead class="bg-surface-muted">
								<tr>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">규칙 이름</th
									>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">심각도</th>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">범위</th>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">메트릭</th>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">조건</th>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">대상 패턴</th
									>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">수정일</th>
									<th class="px-4 py-3 text-right font-semibold text-content-secondary">관리</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-border bg-surface">
								{#each filteredEntries as entry (entry.id)}
									<tr class="hover:bg-surface-muted/70" aria-label={entry.name}>
										<td class="px-4 py-3 align-top">
											<div>
												<p class="font-medium text-content">{entry.name}</p>
												{#if entry.description}
													<p class="mt-1 max-w-xs truncate text-xs text-content-muted">
														{entry.description}
													</p>
												{/if}
											</div>
										</td>
										<td class="px-4 py-3 align-top">
											<span class={`badge ${entry.enabled ? 'badge-success' : 'badge-info'}`}>
												{entry.severity}
											</span>
										</td>
										<td class="px-4 py-3 align-top text-content-secondary">{entry.scope}</td>
										<td class="px-4 py-3 align-top text-content-secondary">{entry.metric}</td>
										<td class="px-4 py-3 align-top text-content-secondary">
											{entry.operator}
											{formatThreshold(entry.threshold)}
										</td>
										<td class="px-4 py-3 align-top text-content-secondary">
											<div class="max-w-xs break-all">{formatTarget(entry)}</div>
											<p class="mt-1 text-xs text-content-muted">
												{entry.enabled ? '평가 포함' : '비활성'}
											</p>
										</td>
										<td class="px-4 py-3 align-top text-content-muted">
											{formatDateTime(entry.updatedAt)}
										</td>
										<td class="px-4 py-3 align-top">
											<div class="flex justify-end gap-2">
												<button
													type="button"
													class="btn btn-secondary btn-sm"
													aria-label={`${entry.name} 수정`}
													onclick={() => openEditEditor(entry)}
												>
													수정
												</button>
												<button
													type="button"
													class="btn btn-danger btn-sm"
													aria-label={`${entry.name} 삭제`}
													onclick={() => handleDelete(entry)}
												>
													삭제
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
	</BentoGrid>
</BrowsePageLayout>
