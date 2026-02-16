<script lang="ts">
	import Icon from './Icon.svelte';

	interface BreadcrumbItem {
		label: string;
		href?: string;
	}

	interface Props {
		items: BreadcrumbItem[];
	}

	let { items }: Props = $props();
	const previousItem = $derived(items.length > 1 ? items[items.length - 2] : undefined);
</script>

<nav aria-label="현재 위치" class="mb-4">
	<!-- 데스크탑: 전체 경로 -->
	<ol class="hidden items-center gap-1.5 text-sm sm:flex">
		{#each items as item, index (index)}
			{#if index > 0}
				<li class="text-content-subtle" aria-hidden="true">
					<Icon name="chevron-right" size="xs" />
				</li>
			{/if}
			<li>
				{#if item.href && index < items.length - 1}
					<a href={item.href} class="text-content-muted transition-colors hover:text-content">
						{item.label}
					</a>
				{:else}
					<span class="font-medium text-content">{item.label}</span>
				{/if}
			</li>
		{/each}
	</ol>

	<!-- 모바일: 뒤로 링크 -->
	{#if items.length > 1}
		<div class="sm:hidden">
			{#if previousItem?.href}
				<a href={previousItem.href} class="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content">
					<Icon name="chevron-right" size="xs" class="rotate-180" />
					{previousItem.label}
				</a>
			{/if}
		</div>
	{/if}
</nav>
