<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Icon from './Icon.svelte';

	interface Props {
		title: string;
		totalCount?: number;
		failedCount?: number;
		passedCount?: number;
		loading?: boolean;
		open?: boolean;
		errorTypes?: string[];
		selectedErrorType?: string;
		searchPlaceholder?: string;
		searchQuery?: string;
		filteredCount?: number;
		children?: import('svelte').Snippet;
	}

	let {
		title,
		totalCount = 0,
		failedCount = 0,
		passedCount = 0,
		loading = false,
		open = false,
		errorTypes = [],
		selectedErrorType = $bindable('ALL'),
		searchPlaceholder = '검색...',
		searchQuery = $bindable(''),
		filteredCount = 0,
		children
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	function handleClose() {
		dispatch('close');
	}

	const panelId = `validation-panel-${Math.random().toString(36).slice(2, 8)}`;
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 bg-black/50 transition-opacity"
		onclick={handleClose}
	></div>

	<div
		class="fixed right-0 top-0 z-50 flex h-full w-full max-w-4xl flex-col bg-surface shadow-xl sm:w-2/3 lg:w-1/2"
		role="dialog"
		aria-modal="true"
		aria-labelledby="{panelId}-title"
	>
		<!-- 헤더 -->
		<div class="flex items-center justify-between border-b border-border bg-surface-muted px-6 py-4">
			<div>
				<h2 id="{panelId}-title" class="text-lg font-semibold text-content">{title}</h2>
				<p class="mt-1 text-sm text-content-muted">
					전체 {totalCount.toLocaleString()}개 중 {passedCount.toLocaleString()}개 통과,
					{failedCount.toLocaleString()}개 실패
				</p>
			</div>
			<button
				type="button"
				onclick={handleClose}
				class="rounded-md p-2 text-content-muted hover:bg-surface-raised hover:text-content-secondary"
				aria-label="닫기"
			>
				<Icon name="x" size="md" />
			</button>
		</div>

		<!-- 필터 영역 -->
		<div class="border-b border-border bg-surface px-6 py-4">
			<div class="flex flex-col gap-4 sm:flex-row">
				<div class="flex-1">
					<label for="{panelId}-error-filter" class="block text-xs font-medium text-content-secondary">오류 유형</label>
					<select
						id="{panelId}-error-filter"
						bind:value={selectedErrorType}
						class="input mt-1 text-sm"
					>
						<option value="ALL">전체</option>
						{#each errorTypes as type (type)}
							<option value={type}>{type}</option>
						{/each}
					</select>
				</div>
				<div class="flex-1">
					<label for="{panelId}-search" class="block text-xs font-medium text-content-secondary">검색</label>
					<input
						id="{panelId}-search"
						type="text"
						bind:value={searchQuery}
						placeholder={searchPlaceholder}
						class="input mt-1 text-sm"
					/>
				</div>
			</div>
			{#if filteredCount > 0}
				<p class="mt-2 text-xs text-content-muted">{filteredCount}건 표시</p>
			{/if}
		</div>

		<!-- 결과 영역 -->
		<div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
			{#if loading}
				<div class="flex items-center justify-center py-12">
					<Icon name="spinner" size="lg" class="text-brand" />
					<span class="ml-2 text-sm text-content-muted">검사 중...</span>
				</div>
			{:else if filteredCount === 0}
				<div class="py-12 text-center">
					{#if failedCount === 0}
						<Icon name="check-circle" size="xl" class="mx-auto text-status-success" />
						<p class="mt-2 text-sm text-content-muted">모든 항목이 통과했습니다.</p>
					{:else}
						<p class="text-sm text-content-muted">표시할 항목이 없습니다.</p>
					{/if}
				</div>
			{:else if children}
				{@render children()}
			{/if}
		</div>
	</div>
{/if}
