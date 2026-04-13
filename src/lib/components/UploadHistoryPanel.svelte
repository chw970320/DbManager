<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { showConfirm } from '$lib/stores/confirm-store';
	import type { DataType } from '$lib/types/base';
	import type { UploadHistorySummaryEntry } from '$lib/types/upload-history';
	import type { ApiResponse } from '$lib/types/vocabulary';

	let {
		dataType,
		filename,
		disabled = false
	}: {
		dataType: DataType;
		filename: string;
		disabled?: boolean;
	} = $props();

	const dispatch = createEventDispatcher<{
		restored: { entry: UploadHistorySummaryEntry };
	}>();

	let entries = $state<UploadHistorySummaryEntry[]>([]);
	let isLoading = $state(false);
	let error = $state('');
	let restoringId = $state<string | null>(null);

	function formatDate(value: string): string {
		return new Date(value).toLocaleString('ko-KR');
	}

	async function loadEntries() {
		if (!filename) {
			entries = [];
			return;
		}

		isLoading = true;
		error = '';

		try {
			const response = await fetch(
				`/api/upload-history?dataType=${encodeURIComponent(dataType)}&filename=${encodeURIComponent(filename)}`
			);
			const result: ApiResponse = await response.json();
			if (!response.ok || !result.success) {
				error = result.error || '업로드 이력을 불러오지 못했습니다.';
				return;
			}

			const nextEntries = (result.data as { entries?: UploadHistorySummaryEntry[] } | undefined)?.entries;
			entries = Array.isArray(nextEntries) ? nextEntries : [];
		} catch (_err) {
			error = '업로드 이력을 불러오는 중 오류가 발생했습니다.';
		} finally {
			isLoading = false;
		}
	}

	async function handleRestore(entry: UploadHistorySummaryEntry) {
		const confirmed = await showConfirm({
			title: '이력 복원',
			message: `${entry.filename} 파일을 ${formatDate(entry.createdAt)} 시점 내용으로 복원하시겠습니까? 현재 JSON 내용은 교체됩니다.`,
			confirmText: '복원',
			variant: 'danger'
		});
		if (!confirmed) {
			return;
		}

		restoringId = entry.id;
		error = '';

		try {
			const response = await fetch('/api/upload-history/restore', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					dataType,
					id: entry.id
				})
			});
			const result: ApiResponse = await response.json();

			if (!response.ok || !result.success) {
				error = result.error || '업로드 이력 복원에 실패했습니다.';
				return;
			}

			const restoredEntry = (result.data as { entry?: UploadHistorySummaryEntry } | undefined)?.entry;
			if (restoredEntry) {
				dispatch('restored', { entry: restoredEntry });
			}
			await loadEntries();
		} catch (_err) {
			error = '업로드 이력 복원 중 오류가 발생했습니다.';
		} finally {
			restoringId = null;
		}
	}

	$effect(() => {
		if (filename) {
			void loadEntries();
		}
	});
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4">
	<div class="mb-3 flex items-center justify-between">
		<div>
			<h3 class="text-sm font-semibold text-gray-800">파일 교체 이력</h3>
			<p class="text-xs text-gray-500">업로드 교체 직전 JSON 본문만 30일 동안 보관됩니다.</p>
		</div>
		<button
			type="button"
			onclick={() => void loadEntries()}
			class="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
			disabled={disabled || isLoading}
		>
			새로고침
		</button>
	</div>

	{#if error}
		<div class="mb-3 rounded-md bg-red-50 p-3 text-xs text-red-700">{error}</div>
	{/if}

	{#if isLoading}
		<div class="rounded-md bg-gray-50 px-3 py-6 text-center text-xs text-gray-500">
			이력 불러오는 중...
		</div>
	{:else if entries.length === 0}
		<div class="rounded-md bg-gray-50 px-3 py-6 text-center text-xs text-gray-500">
			저장된 업로드 교체 이력이 없습니다.
		</div>
	{:else}
		<ul class="space-y-2">
			{#each entries as entry (entry.id)}
				<li class="rounded-md border border-gray-200 px-3 py-3">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0 flex-1">
							<div class="text-sm font-medium text-gray-800">{formatDate(entry.createdAt)}</div>
							<div class="mt-1 text-xs text-gray-500">
								만료 예정: {formatDate(entry.expiresAt)} · 항목 수: {entry.entryCount}
							</div>
						</div>
						<button
							type="button"
							onclick={() => void handleRestore(entry)}
							class="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
							disabled={disabled || restoringId === entry.id}
						>
							{restoringId === entry.id ? '복원 중...' : '복원'}
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
