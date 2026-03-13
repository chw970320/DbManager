<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	type BrowseSidebarSummaryItem = {
		label: string;
		value: string | number;
		span?: 1 | 2;
		valueClass?: string;
	};

	interface Props {
		totalCount?: number;
		currentPage?: number;
		totalPages?: number;
		searchQuery?: string;
		items?: BrowseSidebarSummaryItem[];
		title?: string;
		subtitle?: string;
		ariaLabel?: string;
		variant?: 'embedded' | 'card';
		loading?: boolean;
		loadingText?: string;
	}

	let {
		totalCount = 0,
		currentPage = 1,
		totalPages = 1,
		searchQuery = '',
		items,
		title = '요약',
		subtitle = '현재 조건의 결과를 확인하세요.',
		ariaLabel = '검색 결과 요약',
		variant = 'embedded',
		loading = false,
		loadingText = '요약을 불러오는 중입니다.'
	}: Props = $props();

	const wrapperClass = $derived(
		variant === 'card'
			? 'hidden lg:block rounded-2xl border border-border bg-surface/95 p-4 shadow-xl backdrop-blur-md dark:bg-surface/90'
			: 'hidden lg:block border-t border-border/70 pt-4'
	);
	const summaryGridClass = $derived(
		`grid grid-cols-1 gap-3 text-sm transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`
	);
	const summaryItems = $derived(
		items ?? [
			{ label: '총 건수', value: totalCount },
			{ label: '페이지', value: `${currentPage} / ${totalPages}` },
			{
				label: '검색어',
				value: searchQuery ? searchQuery : '전체',
				span: 2,
				valueClass: 'mt-1 truncate text-content-secondary'
			}
		]
	);

	function formatValue(value: string | number): string {
		return typeof value === 'number' ? value.toLocaleString() : value;
	}
</script>

<section aria-label={ariaLabel} aria-busy={loading ? 'true' : 'false'} class={wrapperClass}>
	<div class="mb-3 flex items-start justify-between gap-3">
		<div>
			<h2 class="text-base font-semibold text-content">{title}</h2>
			<p class="mt-1 text-xs text-content-muted">{subtitle}</p>
		</div>

		{#if loading}
			<span
				class="border-brand-200 text-brand-700 inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-brand-50 px-2.5 py-1 text-[11px] font-semibold"
			>
				<Icon name="spinner" size="xs" />
				갱신 중
			</span>
		{/if}
	</div>

	<div class="relative">
		<div class={summaryGridClass}>
			{#each summaryItems as item (`${item.label}-${item.value}`)}
				<div class="rounded-lg bg-surface-muted p-3">
					<p class="text-xs text-content-muted">{item.label}</p>
					<p class={item.valueClass ?? 'mt-1 text-lg font-semibold text-content'}>
						{formatValue(item.value)}
					</p>
				</div>
			{/each}
		</div>

		{#if loading}
			<div
				class="absolute inset-0 flex items-center justify-center rounded-xl bg-surface/85 px-4 text-center backdrop-blur-[2px]"
			>
				<div class="flex flex-col items-center gap-2 text-sm text-content-secondary">
					<Icon name="spinner" size="md" />
					<p>{loadingText}</p>
				</div>
			</div>
		{/if}
	</div>
</section>
