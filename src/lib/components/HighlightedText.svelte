<script lang="ts">
	import type { HighlightSegment } from '$lib/utils/text-highlight';

	type Props = {
		segments: HighlightSegment[];
	};

	let { segments }: Props = $props();

	function getMarkClass(tone: HighlightSegment['tone']): string {
		return tone === 'error'
			? 'rounded bg-status-error-bg px-1 text-status-error'
			: 'rounded bg-status-warning-bg px-1 text-status-warning';
	}
</script>

{#each segments as segment, index (`${index}-${segment.text}-${segment.matched}-${segment.tone ?? 'plain'}`)}
	{#if segment.matched}
		<mark class={getMarkClass(segment.tone)}>{segment.text}</mark>
	{:else}
		{segment.text}
	{/if}
{/each}
