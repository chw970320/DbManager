<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		columns?: 12 | 6 | 4;
		gapClass?: string;
		children: Snippet;
	}

	let { columns = 12, gapClass = 'gap-4 sm:gap-6', children }: Props = $props();

	const colsClass =
		columns === 12 ? 'grid-cols-12' : columns === 6 ? 'grid-cols-6' : 'grid-cols-4';
</script>

<div class="grid {colsClass} {gapClass}">
	{@render children()}
</div>

