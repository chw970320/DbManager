<script lang="ts">
	interface Props {
		variant?: 'text' | 'rect' | 'circle';
		width?: string;
		height?: string;
		lines?: number;
		class?: string;
	}

	let {
		variant = 'text',
		width = '100%',
		height = '',
		lines = 1,
		class: className = ''
	}: Props = $props();

	const defaultHeight = variant === 'text' ? '1rem' : variant === 'circle' ? '3rem' : '2rem';
	const resolvedHeight = height || defaultHeight;
</script>

{#if variant === 'text' && lines > 1}
	<div class="space-y-3 {className}">
		{#each Array(lines) as _, i (i)}
			<div
				class="animate-pulse rounded bg-surface-raised"
				style="width: {i === lines - 1 ? '75%' : width}; height: {resolvedHeight}"
				aria-hidden="true"
			></div>
		{/each}
	</div>
{:else if variant === 'circle'}
	<div
		class="animate-pulse rounded-full bg-surface-raised {className}"
		style="width: {width}; height: {width}"
		aria-hidden="true"
	></div>
{:else}
	<div
		class="animate-pulse rounded bg-surface-raised {className}"
		style="width: {width}; height: {resolvedHeight}"
		aria-hidden="true"
	></div>
{/if}
