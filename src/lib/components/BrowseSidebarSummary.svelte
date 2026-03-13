<script lang="ts">
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
		variant = 'embedded'
	}: Props = $props();

	const wrapperClass = $derived(
		variant === 'card'
			? 'hidden lg:block rounded-2xl border border-border bg-surface/95 p-4 shadow-xl backdrop-blur-md dark:bg-surface/90'
			: 'hidden lg:block border-t border-border/70 pt-4'
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

<section aria-label={ariaLabel} class={wrapperClass}>
	<div class="mb-3">
		<h2 class="text-base font-semibold text-content">{title}</h2>
		<p class="mt-1 text-xs text-content-muted">{subtitle}</p>
	</div>

	<div class="grid grid-cols-2 gap-3 text-sm">
		{#each summaryItems as item (`${item.label}-${item.value}`)}
			<div class={`rounded-lg bg-surface-muted p-3 ${item.span === 2 ? 'col-span-2' : ''}`}>
				<p class="text-xs text-content-muted">{item.label}</p>
				<p class={item.valueClass ?? 'mt-1 text-lg font-semibold text-content'}>
					{formatValue(item.value)}
				</p>
			</div>
		{/each}
	</div>
</section>
