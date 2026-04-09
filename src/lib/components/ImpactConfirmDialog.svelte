<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { EditorSaveImpactPreview } from '$lib/types/change-impact.js';
	import Icon from './Icon.svelte';

	interface Props {
		isOpen?: boolean;
		preview?: EditorSaveImpactPreview | null;
		isSubmitting?: boolean;
		confirmText?: string;
	}

	let {
		isOpen = false,
		preview = null,
		isSubmitting = false,
		confirmText = '저장'
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		cancel: void;
		confirm: void;
	}>();

	function handleBackdropClick(event: MouseEvent) {
		if (isSubmitting) return;
		if (event.target === event.currentTarget) {
			dispatch('cancel');
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!isOpen || isSubmitting) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			dispatch('cancel');
		}
	}

	const typeLabels: Record<string, string> = {
		vocabulary: '단어집',
		domain: '도메인',
		term: '용어집'
	};
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && preview}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
		onclick={handleBackdropClick}
	>
		<div
			class="w-full max-w-3xl rounded-2xl bg-surface p-6 shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="impact-confirm-title"
			aria-describedby="impact-confirm-summary"
		>
			<div class="flex items-start gap-3">
				<div
					class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full {preview.blocked
						? 'bg-status-error-bg'
						: 'bg-status-warning-bg'}"
				>
					<Icon
						name={preview.blocked ? 'warning' : 'info'}
						size="md"
						class={preview.blocked ? 'text-status-error' : 'text-status-warning'}
					/>
				</div>
				<div class="flex-1">
					<h2 id="impact-confirm-title" class="text-xl font-semibold text-content">
						{#if preview.blocked}
							자동 반영 충돌 확인
						{:else}
							저장 전 영향도 확인
						{/if}
					</h2>
					<p id="impact-confirm-summary" class="mt-2 text-sm text-content-secondary">
						{preview.sourceEntryName} 변경을 저장하기 전에 자동 반영 범위를 확인하세요.
					</p>
				</div>
			</div>

			<div class="mt-5 grid gap-3 sm:grid-cols-4">
				<div class="bg-surface-alt rounded-xl border border-border px-4 py-3">
					<div class="text-xs text-content-secondary">원본 변경</div>
					<div class="mt-1 text-lg font-semibold text-content">
						{preview.summary.sourceChangeCount}
					</div>
				</div>
				<div class="bg-surface-alt rounded-xl border border-border px-4 py-3">
					<div class="text-xs text-content-secondary">연관 변경</div>
					<div class="mt-1 text-lg font-semibold text-content">
						{preview.summary.relatedChangeCount}
					</div>
				</div>
				<div class="bg-surface-alt rounded-xl border border-border px-4 py-3">
					<div class="text-xs text-content-secondary">변경 파일</div>
					<div class="mt-1 text-lg font-semibold text-content">
						{preview.summary.totalChangedFiles}
					</div>
				</div>
				<div class="bg-surface-alt rounded-xl border border-border px-4 py-3">
					<div class="text-xs text-content-secondary">충돌</div>
					<div
						class="mt-1 text-lg font-semibold {preview.summary.conflictCount > 0
							? 'text-status-error'
							: 'text-content'}"
					>
						{preview.summary.conflictCount}
					</div>
				</div>
			</div>

			<div class="bg-surface-alt mt-5 rounded-xl border border-border px-4 py-3">
				<div class="text-sm font-medium text-content">변경 필드</div>
				<div class="mt-2 flex flex-wrap gap-2">
					{#if preview.fileSummaries[0]?.samples[0]?.changedFields?.length}
						{#each preview.fileSummaries[0].samples[0].changedFields as field (field)}
							<span class="rounded-full bg-surface px-3 py-1 text-xs text-content-secondary">
								{field}
							</span>
						{/each}
					{:else}
						<span class="text-xs text-content-secondary">원본 항목 저장</span>
					{/if}
				</div>
			</div>

			<div class="mt-5 space-y-3">
				{#each preview.fileSummaries as summary (`${summary.type}-${summary.filename}-${summary.role}`)}
					<div class="rounded-xl border border-border px-4 py-3">
						<div class="flex items-center justify-between gap-3">
							<div>
								<div class="text-sm font-medium text-content">
									{typeLabels[summary.type]} · {summary.filename}
								</div>
								<div class="mt-1 text-xs text-content-secondary">
									{summary.role === 'source' ? '원본 저장' : '연관 자동 반영'} · {summary.changedCount}건
								</div>
							</div>
						</div>
						{#if summary.samples.length > 0}
							<div class="mt-3 space-y-2">
								{#each summary.samples as sample (sample.id)}
									<div class="bg-surface-alt rounded-lg px-3 py-2">
										<div class="text-sm font-medium text-content">{sample.name}</div>
										<div class="mt-1 text-xs text-content-secondary">{sample.reason}</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<div class="mt-5 space-y-2">
				{#each preview.guidance as guide (`guide-${guide}`)}
					<div
						class="bg-surface-alt rounded-lg border border-border px-4 py-3 text-sm text-content-secondary"
					>
						{guide}
					</div>
				{/each}
			</div>

			{#if preview.conflicts.length > 0}
				<div class="mt-5 rounded-xl border border-status-error bg-status-error-bg px-4 py-3">
					<div class="text-sm font-medium text-status-error">자동 반영 차단 항목</div>
					<div class="mt-3 space-y-2">
						{#each preview.conflicts as conflict (`${conflict.filename}-${conflict.entryId}`)}
							<div class="rounded-lg bg-surface px-3 py-2">
								<div class="text-sm font-medium text-content">{conflict.name}</div>
								<div class="mt-1 text-xs text-content-secondary">{conflict.reason}</div>
								{#if conflict.candidates?.length}
									<div class="mt-2 flex flex-wrap gap-2">
										{#each conflict.candidates as candidate (candidate)}
											<span
												class="rounded-full bg-status-error-bg px-3 py-1 text-xs text-status-error"
											>
												{candidate}
											</span>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div class="mt-6 flex justify-end gap-3">
				<button
					class="btn btn-secondary"
					disabled={isSubmitting}
					onclick={() => dispatch('cancel')}
				>
					{preview.blocked ? '닫기' : '취소'}
				</button>
				{#if !preview.blocked}
					<button
						class="btn btn-primary"
						disabled={isSubmitting}
						onclick={() => dispatch('confirm')}
					>
						{isSubmitting ? '저장 중...' : confirmText}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
