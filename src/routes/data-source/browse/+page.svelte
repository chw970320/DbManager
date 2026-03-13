<script lang="ts">
	import { onMount } from 'svelte';
	import ActionBar from '$lib/components/ActionBar.svelte';
	import BentoCard from '$lib/components/BentoCard.svelte';
	import BentoGrid from '$lib/components/BentoGrid.svelte';
	import BrowsePageLayout from '$lib/components/BrowsePageLayout.svelte';
	import DataSourceEditor from '$lib/components/DataSourceEditor.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import { showConfirm } from '$lib/stores/confirm-store';
	import { addToast } from '$lib/stores/toast-store';
	import type {
		DataSourceConnectionTestResult,
		DataSourceSummaryEntry
	} from '$lib/types/data-source.js';

	type ApiResponse<T> = { success: true; data: T } | { success: false; error?: string };

	type SearchDetail = {
		query: string;
		field: string;
		exact: boolean;
	};

	type DataSourceEditorSubmitDetail = {
		id?: string;
		name: string;
		type: 'postgresql';
		description?: string;
		config: {
			host: string;
			port: number;
			database: string;
			schema?: string;
			username: string;
			password: string;
			ssl: boolean;
			connectionTimeoutSeconds: number;
		};
	};

	let entries = $state<DataSourceSummaryEntry[]>([]);
	let loading = $state(false);
	let errorMessage = $state('');
	let searchQuery = $state('');
	let searchField = $state('all');
	let searchExact = $state(false);

	let showEditor = $state(false);
	let currentEditingEntry = $state<DataSourceSummaryEntry | null>(null);
	let editorServerError = $state('');
	let editorSubmitting = $state(false);
	let editorTesting = $state(false);
	let editorTestResult = $state<DataSourceConnectionTestResult | null>(null);
	let lastTestResult = $state<{
		entryName: string;
		result: DataSourceConnectionTestResult;
	} | null>(null);

	const searchFields = [
		{ value: 'all', label: '전체' },
		{ value: 'name', label: '연결 이름' },
		{ value: 'host', label: '호스트' },
		{ value: 'database', label: '데이터베이스' },
		{ value: 'username', label: '사용자명' }
	];

	const filteredEntries = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) {
			return entries;
		}

		return entries.filter((entry) => {
			const candidates =
				searchField === 'name'
					? [entry.name]
					: searchField === 'host'
						? [entry.config.host]
						: searchField === 'database'
							? [entry.config.database]
							: searchField === 'username'
								? [entry.config.username]
								: [entry.name, entry.config.host, entry.config.database, entry.config.username];

			return candidates.some((value) => {
				const normalized = value.toLowerCase();
				return searchExact ? normalized === query : normalized.includes(query);
			});
		});
	});

	const sslEnabledCount = $derived(entries.filter((entry) => entry.config.ssl).length);
	const passwordConfiguredCount = $derived(
		entries.filter((entry) => entry.config.hasPassword).length
	);

	function sortEntries(nextEntries: DataSourceSummaryEntry[]): DataSourceSummaryEntry[] {
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

	async function loadEntries() {
		loading = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/data-sources');
			const result: ApiResponse<DataSourceSummaryEntry[]> = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.success ? '데이터 소스 목록 조회에 실패했습니다.' : result.error);
			}

			entries = sortEntries(result.data);
		} catch (error) {
			console.error('데이터 소스 목록 로드 오류:', error);
			errorMessage =
				error instanceof Error
					? error.message
					: '데이터 소스 목록을 불러오는 중 오류가 발생했습니다.';
		} finally {
			loading = false;
		}
	}

	function openCreateEditor() {
		currentEditingEntry = null;
		editorServerError = '';
		editorTestResult = null;
		showEditor = true;
	}

	function openEditEditor(entry: DataSourceSummaryEntry) {
		currentEditingEntry = entry;
		editorServerError = '';
		editorTestResult = null;
		showEditor = true;
	}

	function closeEditor() {
		showEditor = false;
		currentEditingEntry = null;
		editorServerError = '';
		editorTestResult = null;
	}

	function upsertEntry(entry: DataSourceSummaryEntry) {
		const index = entries.findIndex((item) => item.id === entry.id);
		if (index === -1) {
			entries = sortEntries([...entries, entry]);
			return;
		}

		const nextEntries = [...entries];
		nextEntries[index] = entry;
		entries = sortEntries(nextEntries);
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

	async function handleSave(event: CustomEvent<DataSourceEditorSubmitDetail>) {
		editorSubmitting = true;
		editorServerError = '';

		try {
			const detail = event.detail;
			const isEditMode = Boolean(detail.id);
			const response = await fetch('/api/data-sources', {
				method: isEditMode ? 'PUT' : 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(detail)
			});
			const result: ApiResponse<{ entry: DataSourceSummaryEntry }> = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.success ? '데이터 소스 저장에 실패했습니다.' : result.error);
			}

			upsertEntry(result.data.entry);
			addToast(
				isEditMode ? '데이터 소스를 수정했습니다.' : '데이터 소스를 추가했습니다.',
				'success'
			);
			closeEditor();
		} catch (error) {
			console.error('데이터 소스 저장 오류:', error);
			editorServerError =
				error instanceof Error ? error.message : '데이터 소스 저장 중 오류가 발생했습니다.';
		} finally {
			editorSubmitting = false;
		}
	}

	async function handleEditorTest(event: CustomEvent<DataSourceEditorSubmitDetail>) {
		editorTesting = true;
		editorServerError = '';
		editorTestResult = null;

		try {
			const detail = event.detail;
			const payload = detail.id
				? {
						id: detail.id,
						type: detail.type,
						config: detail.config
					}
				: {
						type: detail.type,
						config: detail.config
					};

			const response = await fetch('/api/data-sources/test', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});
			const result: ApiResponse<DataSourceConnectionTestResult> = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.success ? '연결 테스트에 실패했습니다.' : result.error);
			}

			editorTestResult = result.data;
		} catch (error) {
			console.error('데이터 소스 편집기 연결 테스트 오류:', error);
			editorServerError =
				error instanceof Error ? error.message : '연결 테스트 중 오류가 발생했습니다.';
		} finally {
			editorTesting = false;
		}
	}

	async function runSavedTest(entry: DataSourceSummaryEntry) {
		try {
			const response = await fetch('/api/data-sources/test', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ id: entry.id })
			});
			const result: ApiResponse<DataSourceConnectionTestResult> = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.success ? '연결 테스트에 실패했습니다.' : result.error);
			}

			lastTestResult = {
				entryName: entry.name,
				result: result.data
			};
			addToast(
				result.data.success
					? `'${entry.name}' 연결 테스트가 완료되었습니다.`
					: `'${entry.name}' 연결 테스트가 실패했습니다.`,
				result.data.success ? 'success' : 'warning'
			);
		} catch (error) {
			console.error('저장된 데이터 소스 연결 테스트 오류:', error);
			addToast(
				error instanceof Error ? error.message : '연결 테스트 중 오류가 발생했습니다.',
				'error'
			);
		}
	}

	async function handleDelete(entry: DataSourceSummaryEntry) {
		const confirmed = await showConfirm({
			title: '데이터 소스 삭제',
			message: `'${entry.name}' 연결을 삭제하시겠습니까? 저장된 접속 정보만 제거되며 실제 DB에는 영향을 주지 않습니다.`,
			confirmText: '삭제',
			variant: 'danger'
		});

		if (!confirmed) {
			return;
		}

		try {
			const response = await fetch('/api/data-sources', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ id: entry.id })
			});
			const result: ApiResponse<{ data: unknown }> = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.success ? '데이터 소스 삭제에 실패했습니다.' : result.error);
			}

			entries = entries.filter((item) => item.id !== entry.id);
			if (currentEditingEntry?.id === entry.id) {
				closeEditor();
			}
			addToast('데이터 소스를 삭제했습니다.', 'success');
		} catch (error) {
			console.error('데이터 소스 삭제 오류:', error);
			addToast(
				error instanceof Error ? error.message : '데이터 소스 삭제 중 오류가 발생했습니다.',
				'error'
			);
		}
	}

	onMount(() => {
		void loadEntries();
	});
</script>

<svelte:head>
	<title>데이터 관리 | 데이터 소스</title>
	<meta name="description" content="PostgreSQL 데이터 소스를 등록하고 연결 테스트를 수행합니다." />
</svelte:head>

{#snippet actions()}
	<ActionBar alignment="right">
		<button type="button" class="btn btn-primary" onclick={openCreateEditor} disabled={loading}>
			<Icon name="plus" size="sm" />
			<span>새 데이터 소스 추가</span>
		</button>
		<button type="button" class="btn btn-secondary" onclick={loadEntries} disabled={loading}>
			<Icon name={loading ? 'spinner' : 'refresh'} size="sm" />
			<span>{loading ? '로딩 중...' : '새로고침'}</span>
		</button>
	</ActionBar>
{/snippet}

<BrowsePageLayout
	title="데이터 소스"
	description="저장 가능한 연결 정의를 관리하고 PostgreSQL 연결 테스트를 실행합니다."
	{actions}
>
	<DataSourceEditor
		isOpen={showEditor}
		entry={currentEditingEntry}
		isSubmitting={editorSubmitting}
		isTesting={editorTesting}
		serverError={editorServerError}
		testResult={editorTestResult}
		on:save={handleSave}
		on:test={handleEditorTest}
		on:close={closeEditor}
	/>

	<BentoGrid gapClass="gap-6">
		<!-- 1. 검색 영역 + 요약을 한 줄에 배치해 상단 여백과 공백을 줄임 -->
		<div class="col-span-12 lg:col-span-7">
			<BentoCard title="검색" subtitle="연결 이름, 호스트, 데이터베이스, 사용자명으로 검색">
				<SearchBar
					placeholder="연결 이름, 호스트, 데이터베이스, 사용자명으로 검색하세요..."
					{searchFields}
					bind:query={searchQuery}
					bind:field={searchField}
					bind:exact={searchExact}
					onsearch={handleSearch}
					onclear={handleSearchClear}
				/>
			</BentoCard>
		</div>

		<!-- 2. 요약 카드: 검색 카드 옆으로 붙여 상단을 채움 -->
		<div class="col-span-12 lg:col-span-5">
			<BentoCard title="요약" subtitle="저장된 연결 현황">
				<div class="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-1">
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="text-xs text-content-muted">저장된 연결</p>
						<p class="mt-1 text-2xl font-semibold text-content">{entries.length}</p>
					</div>
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="text-xs text-content-muted">SSL 사용</p>
						<p class="mt-1 text-2xl font-semibold text-content">{sslEnabledCount}</p>
					</div>
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="text-xs text-content-muted">비밀번호 저장됨</p>
						<p class="mt-1 text-2xl font-semibold text-content">{passwordConfiguredCount}</p>
					</div>
				</div>
			</BentoCard>
		</div>

		<div class="col-span-12 lg:col-span-6">
			<BentoCard
				eyebrow="현재 지원"
				title="PostgreSQL 연결 관리"
				subtitle="확장 가능한 구조로 시작하되, 첫 단계는 PostgreSQL만 지원합니다."
				class="bg-gradient-to-r from-sky-50 via-white to-emerald-50"
			>
				<div class="grid gap-3 text-sm text-content-secondary sm:grid-cols-2">
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="font-medium text-content">저장 위치</p>
						<p class="mt-1 break-all">
							<code class="font-mono text-xs">static/data/settings/data-sources.json</code>
						</p>
					</div>
					<div class="rounded-lg bg-surface-muted p-4">
						<p class="font-medium text-content">확장 방향</p>
						<p class="mt-1">
							타입 분기와 연결 테스트 유틸리티를 기준으로 이후 DBMS를 추가할 수 있습니다.
						</p>
					</div>
				</div>
			</BentoCard>
		</div>

		{#if lastTestResult}
			<div class="col-span-12">
				<BentoCard
					title="최근 연결 테스트"
					subtitle={`마지막 실행: ${lastTestResult.entryName} / ${formatDateTime(lastTestResult.result.testedAt)}`}
				>
					<div class="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
						<div class="rounded-lg bg-surface-muted p-4">
							<p class="text-xs text-content-muted">상태</p>
							<p class="mt-1 font-medium text-content">{lastTestResult.result.message}</p>
						</div>
						<div class="rounded-lg bg-surface-muted p-4">
							<p class="text-xs text-content-muted">대상 DB</p>
							<p class="mt-1 font-medium text-content">
								{lastTestResult.result.details?.database ?? '-'}
							</p>
						</div>
						<div class="rounded-lg bg-surface-muted p-4">
							<p class="text-xs text-content-muted">스키마</p>
							<p class="mt-1 font-medium text-content">
								{lastTestResult.result.details?.schema ?? '-'}
							</p>
						</div>
						<div class="rounded-lg bg-surface-muted p-4">
							<p class="text-xs text-content-muted">지연시간</p>
							<p class="mt-1 font-medium text-content">
								{lastTestResult.result.latencyMs ? `${lastTestResult.result.latencyMs}ms` : '-'}
							</p>
						</div>
					</div>
					{#if lastTestResult.result.details?.serverVersion}
						<p class="mt-4 break-all text-sm text-content-muted">
							{lastTestResult.result.details.serverVersion}
						</p>
					{/if}
				</BentoCard>
			</div>
		{/if}

		<div class="col-span-12">
			<BentoCard
				title="저장된 데이터 소스"
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
						<span>데이터 소스 목록을 불러오는 중입니다.</span>
					</div>
				{:else if filteredEntries.length === 0}
					<EmptyState
						icon="link"
						title={entries.length === 0
							? '저장된 데이터 소스가 없습니다.'
							: '검색 결과가 없습니다.'}
						description={entries.length === 0
							? '첫 PostgreSQL 연결을 등록한 뒤 실제 DB 연결 테스트 흐름을 시작하세요.'
							: '검색 조건을 바꾸거나 새로운 데이터 소스를 추가해 보세요.'}
						actionLabel={entries.length === 0 ? '새 데이터 소스 추가' : ''}
						onaction={entries.length === 0 ? openCreateEditor : undefined}
					/>
				{:else}
					<div class="overflow-x-auto rounded-xl border border-border">
						<table class="min-w-full divide-y divide-border text-sm">
							<thead class="bg-surface-muted">
								<tr>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">연결 이름</th
									>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">타입</th>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">호스트</th>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary"
										>데이터베이스</th
									>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">사용자명</th>
									<th class="px-4 py-3 text-left font-semibold text-content-secondary">SSL</th>
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
										<td class="px-4 py-3 align-top text-content-secondary">{entry.type}</td>
										<td class="px-4 py-3 align-top text-content-secondary">
											<div>{entry.config.host}</div>
											<div class="mt-1 text-xs text-content-muted">:{entry.config.port}</div>
										</td>
										<td class="px-4 py-3 align-top text-content-secondary">
											<div>{entry.config.database}</div>
											<div class="mt-1 text-xs text-content-muted">
												{entry.config.schema ?? 'public'}
											</div>
										</td>
										<td class="px-4 py-3 align-top text-content-secondary"
											>{entry.config.username}</td
										>
										<td class="px-4 py-3 align-top">
											<span class={`badge ${entry.config.ssl ? 'badge-success' : 'badge-info'}`}>
												{entry.config.ssl ? '사용' : '미사용'}
											</span>
										</td>
										<td class="px-4 py-3 align-top text-content-muted">
											{formatDateTime(entry.updatedAt)}
										</td>
										<td class="px-4 py-3 align-top">
											<div class="flex justify-end gap-2">
												<button
													type="button"
													class="btn btn-outline btn-sm"
													aria-label="연결 테스트"
													onclick={() => runSavedTest(entry)}
												>
													연결 테스트
												</button>
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
