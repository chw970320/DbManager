<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		name: string;
		required?: boolean;
		error?: string;
		hint?: string;
		orientation?: 'vertical' | 'horizontal';
		children: Snippet;
	}

	let {
		label,
		name,
		required = false,
		error = '',
		hint = '',
		orientation = 'vertical',
		children
	}: Props = $props();
</script>

<div class={orientation === 'horizontal' ? 'flex items-start gap-4' : ''}>
	<label
		for={name}
		class="block text-sm font-medium text-content-secondary {orientation === 'horizontal' ? 'w-32 pt-2 flex-shrink-0' : 'mb-1'}"
	>
		{label}
		{#if required}
			<span class="text-status-error">*</span>
		{/if}
	</label>
	<div class={orientation === 'horizontal' ? 'flex-1' : ''}>
		{@render children()}
		{#if error}
			<p class="mt-1 text-xs text-status-error">{error}</p>
		{/if}
		{#if hint && !error}
			<p class="mt-1 text-xs text-content-muted">{hint}</p>
		{/if}
	</div>
</div>
