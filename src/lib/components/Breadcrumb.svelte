<script lang="ts">
	import Icon from './Icon.svelte';
	import type { NavigationBreadcrumbItem } from '$lib/utils/navigation';

	interface Props {
		items: NavigationBreadcrumbItem[];
	}

	let { items }: Props = $props();
	const previousItem = $derived(items.length > 1 ? items[items.length - 2] : undefined);

	function getTriggerClass(item: NavigationBreadcrumbItem) {
		if (item.level === 1) {
			return 'inline-flex list-none items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-dark shadow-sm transition-colors hover:border-brand hover:bg-brand-100 hover:text-brand-dark';
		}

		return 'inline-flex list-none items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-content-secondary shadow-sm transition-colors hover:border-brand-100 hover:bg-surface-muted hover:text-content';
	}
</script>

<nav aria-label="현재 위치" class="mb-4">
	<!-- 데스크탑: 전체 경로 -->
	<ol class="hidden items-center gap-1.5 text-sm sm:flex">
		{#each items as item, index (`${item.label}-${index}`)}
			{#if index > 0}
				<li class="text-content-subtle" aria-hidden="true">
					<Icon name="chevron-right" size="xs" />
				</li>
			{/if}
			<li class="relative">
				{#if item.children?.length}
					<details class="relative">
						<summary class={getTriggerClass(item)} aria-label={`${item.label} 메뉴 열기`}>
							{#if item.level === 1}
								<span class="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true"></span>
							{/if}
							<span>{item.label}</span>
							<Icon
								name="chevron-down"
								size="xs"
								class={item.level === 1 ? 'text-brand-dark' : 'text-content-muted'}
							/>
						</summary>
						<div
							class="absolute left-0 top-full z-popover mt-2 min-w-[13rem] rounded-xl border border-border bg-surface p-1 shadow-lg"
						>
							{#each item.children as child (child.href)}
								<a
									href={child.href}
									class="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors {item.activeChildId ===
									child.id
										? item.level === 1
											? 'bg-brand-50 text-brand-dark'
											: 'bg-surface-muted text-content'
										: 'text-content-secondary hover:bg-surface-muted hover:text-content'}"
								>
									{#if child.icon}
										<Icon name={child.icon} size="sm" />
									{/if}
									<span>{child.label}</span>
								</a>
							{/each}
						</div>
					</details>
				{:else if item.href && index < items.length - 1}
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
				<a
					href={previousItem.href}
					class="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content"
				>
					<Icon name="chevron-right" size="xs" class="rotate-180" />
					{previousItem.label}
				</a>
			{/if}
		</div>
	{/if}
</nav>

<style>
	summary::-webkit-details-marker {
		display: none;
	}
</style>
