<script lang="ts">
	import type { EditorSaveImpactPreview } from '$lib/types/change-impact.js';
	import { getEditorSaveTypeLabel } from '$lib/utils/cascade-update-rules.js';
	import { createEventDispatcher } from 'svelte';

	interface Props {
		preview?: EditorSaveImpactPreview | null;
		loading?: boolean;
		error?: string;
		regionLabel?: string;
		title?: string;
		description?: string;
		emptyMessage?: string;
		refreshable?: boolean;
		refreshDisabled?: boolean;
		accent?: 'amber' | 'sky' | 'slate';
	}

	let {
		preview = null,
		loading = false,
		error = '',
		regionLabel = '저장 영향도',
		title = '저장 영향도',
		description = '저장 전에 변경 범위를 확인합니다.',
		emptyMessage = '필수 항목을 채우면 저장 전 영향도를 자동으로 계산합니다.',
		refreshable = false,
		refreshDisabled = false,
		accent = 'slate'
	}: Props = $props();

	const dispatch = createEventDispatcher<{ refresh: void }>();

	const accentTone = {
		amber: {
			wrapper: 'border-amber-200 bg-amber-50/70',
			title: 'text-amber-900',
			text: 'text-amber-800',
			button: 'border-amber-300 text-amber-900 hover:bg-amber-100'
		},
		sky: {
			wrapper: 'border-sky-200 bg-sky-50/70',
			title: 'text-sky-900',
			text: 'text-sky-800',
			button: 'border-sky-300 text-sky-800 hover:bg-sky-100'
		},
		slate: {
			wrapper: 'border-slate-200 bg-slate-50/70',
			title: 'text-slate-900',
			text: 'text-slate-700',
			button: 'border-slate-300 text-slate-800 hover:bg-slate-100'
		}
	};
</script>

<div
	class="rounded-xl border p-4 {accentTone[accent].wrapper}"
	role="region"
	aria-label={regionLabel}
>
	<div class="mb-3 flex items-start justify-between gap-3">
		<div>
			<h3 class="text-sm font-semibold {accentTone[accent].title}">{title}</h3>
			<p class="mt-1 text-xs {accentTone[accent].text}">{description}</p>
		</div>
		{#if refreshable}
			<button
				type="button"
				class="rounded-md border bg-white px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 {accentTone[accent].button}"
				disabled={loading || refreshDisabled}
				onclick={() => dispatch('refresh')}
			>
				{loading ? '계산 중...' : '다시 계산'}
			</button>
		{/if}
	</div>

	{#if loading}
		<p class="text-xs {accentTone[accent].text}">입력값 기준 영향도를 계산하는 중입니다.</p>
	{:else if preview}
		<div class="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
			<div class="rounded-lg border border-white/70 bg-white px-3 py-2">
				<div class="text-slate-500">원본 저장</div>
				<div class="mt-1 text-base font-semibold text-slate-900">
					{preview.summary.sourceChangeCount}
				</div>
			</div>
			<div class="rounded-lg border border-white/70 bg-white px-3 py-2">
				<div class="text-slate-500">연쇄 반영</div>
				<div class="mt-1 text-base font-semibold text-slate-900">
					{preview.summary.relatedChangeCount}
				</div>
			</div>
			<div class="rounded-lg border border-white/70 bg-white px-3 py-2">
				<div class="text-slate-500">변경 파일</div>
				<div class="mt-1 text-base font-semibold text-slate-900">
					{preview.summary.totalChangedFiles}
				</div>
			</div>
			<div class="rounded-lg border border-white/70 bg-white px-3 py-2">
				<div class="text-slate-500">충돌</div>
				<div
					class="mt-1 text-base font-semibold {preview.summary.conflictCount > 0
						? 'text-rose-700'
						: 'text-emerald-700'}"
				>
					{preview.summary.conflictCount}
				</div>
			</div>
		</div>

		<div class="mt-3 space-y-2">
			{#each preview.guidance as guide (guide)}
				<div class="rounded-lg border border-white/70 bg-white/80 px-3 py-2 text-xs text-slate-700">
					{guide}
				</div>
			{/each}
		</div>

		<div class="mt-3 grid gap-2 sm:grid-cols-2">
			{#each preview.fileSummaries as summary (`${summary.type}-${summary.filename}-${summary.role}`)}
				<div class="rounded-lg border border-white/70 bg-white px-3 py-2 text-xs">
					<div class="font-medium text-slate-800">
						{getEditorSaveTypeLabel(summary.type)} · {summary.changedCount}건
					</div>
					<div class="mt-1 text-slate-500">{summary.filename}</div>
					<div class="mt-2 space-y-2">
						{#each summary.samples as sample (sample.id)}
							<div class="rounded-md bg-slate-50 px-2 py-2">
								<div class="font-medium text-slate-800">{sample.name}</div>
								<div class="mt-1 text-slate-600">{sample.reason}</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		{#if preview.conflicts.length > 0}
			<div class="mt-3 space-y-2">
				{#each preview.conflicts as conflict (`${conflict.type}-${conflict.filename}-${conflict.entryId}`)}
					<div class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
						<div class="font-medium">{conflict.name}</div>
						<div class="mt-1">{conflict.reason}</div>
						{#if conflict.candidates && conflict.candidates.length > 0}
							<div class="mt-2 flex flex-wrap gap-2">
								{#each conflict.candidates as candidate (candidate)}
									<span class="rounded-full bg-white px-2 py-1 text-rose-700">{candidate}</span>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	{:else if error}
		<p class="text-xs text-rose-700">{error}</p>
	{:else}
		<p class="text-xs {accentTone[accent].text}">{emptyMessage}</p>
	{/if}
</div>
