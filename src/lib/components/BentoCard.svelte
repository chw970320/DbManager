<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		title?: string;
		subtitle?: string;
		eyebrow?: string;
		icon?: Snippet;
		actions?: Snippet;
		children: Snippet;
	}

	let {
		class: className = '',
		title = '',
		subtitle = '',
		eyebrow = '',
		icon,
		actions,
		children
	}: Props = $props();
</script>

<section class="card relative overflow-hidden {className}">
	<div class="p-5 sm:p-6">
		{#if eyebrow || title || subtitle || icon || actions}
			<header class="mb-4 flex items-start justify-between gap-4">
				<div class="flex min-w-0 items-start gap-3">
					{#if icon}
						<div class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-content-secondary">
							{@render icon()}
						</div>
					{/if}
					<div class="min-w-0">
						{#if eyebrow}
							<p class="text-xs font-semibold uppercase tracking-[0.22em] text-content-muted">
								{eyebrow}
							</p>
						{/if}
						{#if title}
							<h2 class="truncate text-lg font-semibold text-content">{title}</h2>
						{/if}
						{#if subtitle}
							<p class="mt-1 text-sm text-content-muted">{subtitle}</p>
						{/if}
					</div>
				</div>
				{#if actions}
					<div class="shrink-0">
						{@render actions()}
					</div>
				{/if}
			</header>
		{/if}

		<div>
			{@render children()}
		</div>
	</div>
</section>

