<script lang="ts">
	import type { AssistantMarkdownInlineSegment } from '$lib/utils/assistant-markdown';

	let { segments }: { segments: AssistantMarkdownInlineSegment[] } = $props();
</script>

{#each segments as segment, index (`${segment.type}-${index}-${segment.text}`)}
	{#if segment.type === 'strong'}
		<strong class="font-semibold text-content">{segment.text}</strong>
	{:else if segment.type === 'code'}
		<code class="rounded bg-surface-muted px-1 py-0.5 font-mono text-[0.85em] text-content">
			{segment.text}
		</code>
	{:else}
		{segment.text}
	{/if}
{/each}
