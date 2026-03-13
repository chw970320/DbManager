<script lang="ts">
	import { onMount } from 'svelte';
	import ActionBar from '$lib/components/ActionBar.svelte';
	import BentoCard from '$lib/components/BentoCard.svelte';
	import BentoGrid from '$lib/components/BentoGrid.svelte';
	import BrowsePageLayout from '$lib/components/BrowsePageLayout.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import { showConfirm } from '$lib/stores/confirm-store';
	import { addToast } from '$lib/stores/toast-store';
	import { getNavigationBreadcrumbItems } from '$lib/utils/navigation';
	import type { DesignSnapshotSummaryEntry } from '$lib/types/design-snapshot.js';
	import type { SharedFileMappingBundleEntry } from '$lib/types/shared-file-mapping.js';
	import { ALL_DATA_TYPES, DATA_TYPE_LABELS } from '$lib/types/base.js';

	type ApiResponse<T> = { success: true; data: T } | { success: false; error?: string };

	type SnapshotPageData = {
		snapshots: DesignSnapshotSummaryEntry[];
		bundles: SharedFileMappingBundleEntry[];
	};

	type SearchDetail = {
		query: string;
		field: string;
		exact: boolean;
	};

	let snapshots = $state<DesignSnapshotSummaryEntry[]>([]);
	let bundles = $state<SharedFileMappingBundleEntry[]>([]);
	let loading = $state(false);
	let createSubmitting = $state(false);
	let errorMessage = $state('');
	let selectedBundleId = $state('');
	let snapshotName = $state('');
	let snapshotDescription = $state('');
	let searchQuery = $state('');
	let searchField = $state('all');
	let searchExact = $state(false);
	let lastRestoredSnapshot = $state<DesignSnapshotSummaryEntry | null>(null);

	const searchFields = [
		{ value: 'all', label: '전체' },
		{ value: 'name', label: '스냅샷명' },
		{ value: 'column', label: '컬럼 파일' },
		{ value: 'term', label: '용어 파일' }
	];

	const selectedBundle = $derived(
		bundles.find((bundle) => bundle.id === selectedBundleId) ?? bundles[0] ?? null
	);
	const protectedFileCount = ALL_DATA_TYPES.length;
	const filteredSnapshots = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) {
			return snapshots;
		}

		return snapshots.filter((snapshot) => {
			const candidates =
				searchField === 'name'
					? [snapshot.name, snapshot.description ?? '']
					: searchField === 'column'
						? [snapshot.bundle.column]
						: searchField === 'term'
							? [snapshot.bundle.term]
							: [
									snapshot.name,
									snapshot.description ?? '',
									snapshot.bundle.column,
									snapshot.bundle.term,
									snapshot.bundle.table,
									snapshot.bundle.domain
								];

			return candidates.some((value) => {
				const normalized = value.toLowerCase();
				return searchExact ? normalized === query : normalized.includes(query);
			});
		});
	});

	function sortSnapshots(entries: DesignSnapshotSummaryEntry[]): DesignSnapshotSummaryEntry[] {
		return [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	}

	function sortBundles(entries: SharedFileMappingBundleEntry[]): SharedFileMappingBundleEntry[] {
		return [...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	}

	function getBundleLabel(bundle: SharedFileMappingBundleEntry): string {
		return `${bundle.files.column} / ${bundle.files.term}`;
	}

	function formatDateTime(value?: string): string {
		if (!value) {
			return '-';
		}

		try {
			return new Intl.DateTimeFormat('ko-KR', {
				dateStyle: 'medium',
				timeStyle: 'short'
			}).format(new Date(value));
		} catch {
			return value;
		}
	}

	function ensureSelectedBundle() {
		if (!bundles.length) {
			selectedBundleId = '';
			return;
		}

		if (!bundles.some((bundle) => bundle.id === selectedBundleId)) {
			selectedBundleId = bundles[0].id;
		}
	}

	async function loadPageData() {
		loading = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/design-snapshots');
			const result: ApiResponse<SnapshotPageData> = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.success ? '스냅샷 목록 조회에 실패했습니다.' : result.error);
			}

			snapshots = sortSnapshots(result.data.snapshots);
			bundles = sortBundles(result.data.bundles);
			ensureSelectedBundle();
		} catch (error) {
			console.error('스냅샷 화면 데이터 로드 오류:', error);
			errorMessage =
				error instanceof Error ? error.message : '스냅샷 정보를 불러오는 중 오류가 발생했습니다.';
		} finally {
			loading = false;
		}
	}

	async function handleSearch(detail: SearchDetail) {
		searchQuery = detail.query;
		searchField = detail.field;
		searchExact = detail.exact;
	}

	function handleSearchClear() {
		searchQuery = '';
		searchField = 'all';
		searchExact = false;
	}

	async function handleCreateSnapshot() {
		if (!selectedBundle) {
			addToast('저장할 파일 번들을 먼저 선택하세요.', 'warning');
			return;
		}

		createSubmitting = true;
		try {
			const response = await fetch('/api/design-snapshots', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: snapshotName.trim(),
					description: snapshotDescription.trim(),
					bundle: selectedBundle.files
				})
			});
			const result: ApiResponse<{ entry: DesignSnapshotSummaryEntry }> = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.success ? '스냅샷 저장에 실패했습니다.' : result.error);
			}

			snapshots = sortSnapshots([result.data.entry, ...snapshots]);
			snapshotName = '';
			snapshotDescription = '';
			addToast('스냅샷을 저장했습니다.', 'success');
		} catch (error) {
			console.error('스냅샷 저장 오류:', error);
			addToast(
				error instanceof Error ? error.message : '스냅샷 저장 중 오류가 발생했습니다.',
				'error'
			);
		} finally {
			createSubmitting = false;
		}
	}

	async function handleRestore(snapshot: DesignSnapshotSummaryEntry) {
		const confirmed = await showConfirm({
			title: '스냅샷 복원',
			message: `'${snapshot.name}' 상태로 8종 파일 번들을 되돌리시겠습니까? 현재 번들의 변경 내용은 덮어써집니다.`,
			confirmText: '복원',
			variant: 'danger'
		});

		if (!confirmed) {
			return;
		}

		try {
			const response = await fetch('/api/design-snapshots/restore', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ id: snapshot.id })
			});
			const result: ApiResponse<{ entry: DesignSnapshotSummaryEntry }> = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.success ? '스냅샷 복원에 실패했습니다.' : result.error);
			}

			lastRestoredSnapshot = result.data.entry;
			snapshots = sortSnapshots(
				snapshots.map((entry) => (entry.id === result.data.entry.id ? result.data.entry : entry))
			);
			addToast('스냅샷을 복원했습니다.', 'success');
		} catch (error) {
			console.error('스냅샷 복원 오류:', error);
			addToast(
				error instanceof Error ? error.message : '스냅샷 복원 중 오류가 발생했습니다.',
				'error'
			);
		}
	}

	async function handleDelete(snapshot: DesignSnapshotSummaryEntry) {
		const confirmed = await showConfirm({
			title: '스냅샷 삭제',
			message: `'${snapshot.name}' 스냅샷을 삭제하시겠습니까? 복구 포인트 정보만 제거되고 실제 데이터 파일은 유지됩니다.`,
			confirmText: '삭제',
			variant: 'danger'
		});

		if (!confirmed) {
			return;
		}

		try {
			const response = await fetch('/api/design-snapshots', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ id: snapshot.id })
			});
			const result: ApiResponse<{ entry: DesignSnapshotSummaryEntry }> = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.success ? '스냅샷 삭제에 실패했습니다.' : result.error);
			}

			snapshots = snapshots.filter((entry) => entry.id !== snapshot.id);
			if (lastRestoredSnapshot?.id === snapshot.id) {
				lastRestoredSnapshot = null;
			}
			addToast('스냅샷을 삭제했습니다.', 'success');
		} catch (error) {
			console.error('스냅샷 삭제 오류:', error);
			addToast(
				error instanceof Error ? error.message : '스냅샷 삭제 중 오류가 발생했습니다.',
				'error'
			);
		}
	}

	onMount(() => {
		void loadPageData();
	});
</script>

<svelte:head>
	<title>데이터 관리 | 스냅샷</title>
	<meta name="description" content="8종 설계 파일 번들의 스냅샷을 저장하고 필요 시 복원합니다." />
</svelte:head>

{#snippet actions()}
	<ActionBar alignment="right">
		<button
			type="button"
			class="btn btn-primary"
			onclick={handleCreateSnapshot}
			disabled={createSubmitting || !selectedBundle}
		>
			<Icon name="save" size="sm" />
			<span>{createSubmitting ? '저장 중...' : '현재 번들 스냅샷 저장'}</span>
		</button>
		<button type="button" class="btn btn-secondary" onclick={loadPageData} disabled={loading}>
			<Icon name={loading ? 'spinner' : 'refresh'} size="sm" />
			<span>{loading ? '로딩 중...' : '새로고침'}</span>
		</button>
	</ActionBar>
{/snippet}

<BrowsePageLayout
	title="스냅샷"
	description="8종 파일 번들을 통째로 저장하고 필요할 때 빠르게 복원합니다."
	breadcrumbItems={getNavigationBreadcrumbItems('/snapshot/browse')}
	{actions}
>
	<BentoGrid gapClass="gap-6">
		<div class="col-span-12 lg:col-span-8">
			<BentoCard
				eyebrow="복구 수단"
				title="설계 번들 스냅샷"
				subtitle="표준/설계 변경 전에 현재 번들의 8개 JSON 상태를 저장하고 되돌릴 수 있습니다."
				class="bg-gradient-to-r from-amber-50 via-white to-sky-50"
			>
				<div class="grid gap-3 text-sm text-content-secondary sm:grid-cols-2">
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="font-medium text-content">저장 위치</p>
						<p class="mt-1 break-all">
							<code class="font-mono text-xs">static/data/settings/design-snapshots.json</code>
						</p>
					</div>
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="font-medium text-content">보호 범위</p>
						<p class="mt-1">{protectedFileCount}개 파일 번들 + 공통 파일 매핑 번들</p>
					</div>
				</div>
			</BentoCard>
		</div>

		<div class="col-span-12 lg:col-span-4">
			<BentoCard title="요약" subtitle="현재 저장소 상태">
				<div class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="text-xs text-content-muted">저장된 스냅샷</p>
						<p class="mt-1 text-2xl font-semibold text-content">{snapshots.length}</p>
					</div>
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="text-xs text-content-muted">사용 가능한 번들</p>
						<p class="mt-1 text-2xl font-semibold text-content">{bundles.length}</p>
					</div>
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="text-xs text-content-muted">최근 복원</p>
						<p class="mt-1 text-sm font-medium text-content">
							{lastRestoredSnapshot ? formatDateTime(lastRestoredSnapshot.restoredAt) : '없음'}
						</p>
					</div>
				</div>
			</BentoCard>
		</div>

		<div class="col-span-12">
			<BentoCard title="검색" subtitle="스냅샷명 또는 주요 파일명으로 저장 지점을 찾습니다.">
				<SearchBar
					placeholder="스냅샷명, 컬럼 파일, 용어 파일로 검색하세요..."
					{searchFields}
					bind:query={searchQuery}
					bind:field={searchField}
					bind:exact={searchExact}
					onsearch={handleSearch}
					onclear={handleSearchClear}
				/>
			</BentoCard>
		</div>

		<div class="col-span-12 lg:col-span-5">
			<BentoCard title="스냅샷 생성" subtitle="복구 포인트로 저장할 파일 번들을 선택하세요.">
				{#if bundles.length === 0}
					<EmptyState
						icon="save"
						title="저장 가능한 파일 번들이 없습니다."
						description="먼저 정의서 화면에서 공통 파일 매핑 번들을 구성한 뒤 다시 시도하세요."
					/>
				{:else}
					<div class="space-y-4">
						<div>
							<label for="snapshotBundle" class="mb-1 block text-sm font-medium text-content"
								>대상 번들</label
							>
							<select
								id="snapshotBundle"
								bind:value={selectedBundleId}
								class="input"
								disabled={createSubmitting}
							>
								{#each bundles as bundle (bundle.id)}
									<option value={bundle.id}>{getBundleLabel(bundle)}</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="snapshotName" class="mb-1 block text-sm font-medium text-content"
								>스냅샷명</label
							>
							<input
								id="snapshotName"
								type="text"
								bind:value={snapshotName}
								class="input"
								placeholder="예: 표준 보정 전"
								disabled={createSubmitting}
							/>
						</div>

						<div>
							<label for="snapshotDescription" class="mb-1 block text-sm font-medium text-content"
								>설명</label
							>
							<textarea
								id="snapshotDescription"
								bind:value={snapshotDescription}
								rows="3"
								class="input resize-none"
								placeholder="왜 저장하는지 메모를 남깁니다."
								disabled={createSubmitting}
							></textarea>
						</div>

						{#if selectedBundle}
							<div class="rounded-lg border border-border bg-surface-muted p-4">
								<p class="text-xs font-medium text-content-secondary">포함되는 파일</p>
								<div class="mt-3 flex flex-wrap gap-2">
									{#each ALL_DATA_TYPES as type (type)}
										<span class="rounded-full bg-surface px-3 py-1 text-xs text-content-secondary">
											{DATA_TYPE_LABELS[type]} · {selectedBundle.files[type]}
										</span>
									{/each}
								</div>
							</div>
						{/if}

						<button
							type="button"
							class="btn btn-primary w-full"
							onclick={handleCreateSnapshot}
							disabled={createSubmitting || !selectedBundle}
						>
							{createSubmitting ? '저장 중...' : '스냅샷 저장'}
						</button>
					</div>
				{/if}
			</BentoCard>
		</div>

		<div class="col-span-12 lg:col-span-7">
			<BentoCard
				title="저장된 스냅샷"
				subtitle={searchQuery
					? `검색 결과 ${filteredSnapshots.length}건`
					: `전체 ${snapshots.length}건`}
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
						<span>스냅샷 정보를 불러오는 중입니다.</span>
					</div>
				{:else if filteredSnapshots.length === 0}
					<EmptyState
						icon="save"
						title={snapshots.length === 0 ? '저장된 스냅샷이 없습니다.' : '검색 결과가 없습니다.'}
						description={snapshots.length === 0
							? '먼저 현재 번들을 스냅샷으로 저장해 복구 지점을 만드세요.'
							: '검색 조건을 바꾸거나 다른 스냅샷명을 확인해 보세요.'}
					/>
				{:else}
					<div class="overflow-x-auto rounded-xl border border-border">
						<table class="min-w-full divide-y divide-border text-sm">
							<thead class="bg-surface-muted">
								<tr>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">스냅샷명</th>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">번들</th>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">컬럼 수</th>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">생성일</th>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">최근 복원</th
									>
									<th class="px-4 py-3 text-right font-semibold text-content-secondary">관리</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-border bg-surface">
								{#each filteredSnapshots as snapshot (snapshot.id)}
									<tr class="hover:bg-surface-muted/70" aria-label={snapshot.name}>
										<td class="px-4 py-3 align-top">
											<div>
												<p class="font-medium text-content">{snapshot.name}</p>
												{#if snapshot.description}
													<p class="mt-1 max-w-xs truncate text-xs text-content-muted">
														{snapshot.description}
													</p>
												{/if}
											</div>
										</td>
										<td class="px-4 py-3 align-top text-content-secondary">
											<div>{snapshot.bundle.column}</div>
											<div class="mt-1 text-xs text-content-muted">
												{snapshot.bundle.term}
											</div>
										</td>
										<td class="px-4 py-3 align-top text-content-secondary">
											{snapshot.counts.column}
										</td>
										<td class="px-4 py-3 align-top text-content-muted">
											{formatDateTime(snapshot.createdAt)}
										</td>
										<td class="px-4 py-3 align-top text-content-muted">
											{formatDateTime(snapshot.restoredAt)}
										</td>
										<td class="px-4 py-3 align-top">
											<div class="flex justify-end gap-2">
												<button
													type="button"
													class="btn btn-outline btn-sm"
													aria-label={`${snapshot.name} 복원`}
													onclick={() => handleRestore(snapshot)}
												>
													복원
												</button>
												<button
													type="button"
													class="btn btn-danger btn-sm"
													aria-label={`${snapshot.name} 삭제`}
													onclick={() => handleDelete(snapshot)}
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
