<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		position?: 'top' | 'bottom' | 'sticky';
		alignment?: 'left' | 'right' | 'between';
		primary?: Snippet;
		secondary?: Snippet;
		children?: Snippet;
	}

	let {
		position = 'top',
		alignment = 'right',
		primary,
		secondary,
		children
	}: Props = $props();

	const positionClass =
		position === 'sticky'
			? 'sticky top-16 z-30 bg-surface/95 backdrop-blur-sm py-3 border-b border-border'
			: position === 'bottom'
				? 'mt-4 pt-4 border-t border-border'
				: 'mb-4';

	const alignClass =
		alignment === 'between'
			? 'justify-between'
			: alignment === 'left'
				? 'justify-start'
				: 'justify-end';
</script>

<div class="flex items-center gap-3 {positionClass} {alignClass}">
	{#if secondary}
		<div class="flex items-center gap-2">
			{@render secondary()}
		</div>
	{/if}
	{#if primary}
		<div class="flex items-center gap-2">
			{@render primary()}
		</div>
	{/if}
	{#if children}
		{@render children()}
	{/if}
</div>
