<script lang="ts">
	import AssistantMarkdownInline from './AssistantMarkdownInline.svelte';
	import { parseAssistantMarkdown } from '$lib/utils/assistant-markdown';

	let { content }: { content: string } = $props();

	const blocks = $derived(parseAssistantMarkdown(content));
</script>

<div class="space-y-3 text-sm leading-6 text-content">
	{#each blocks as block, index (`${block.type}-${index}`)}
		{#if block.type === 'paragraph'}
			<p>
				<AssistantMarkdownInline segments={block.segments} />
			</p>
		{:else if block.type === 'unordered-list'}
			<ul class="list-disc space-y-1 pl-5">
				{#each block.items as item, itemIndex (`ul-${itemIndex}`)}
					<li>
						<AssistantMarkdownInline segments={item} />
					</li>
				{/each}
			</ul>
		{:else if block.type === 'ordered-list'}
			<ol class="list-decimal space-y-1 pl-5">
				{#each block.items as item, itemIndex (`ol-${itemIndex}`)}
					<li>
						<AssistantMarkdownInline segments={item} />
					</li>
				{/each}
			</ol>
		{:else if block.type === 'table'}
			<div class="overflow-x-auto rounded-lg border border-border">
				<table class="min-w-full divide-y divide-border text-left text-xs">
					<thead class="bg-surface-muted text-content-secondary">
						<tr>
							{#each block.headers as header, headerIndex (`th-${headerIndex}`)}
								<th class="px-3 py-2 font-semibold">
									<AssistantMarkdownInline segments={header} />
								</th>
							{/each}
						</tr>
					</thead>
					<tbody class="divide-y divide-border bg-surface">
						{#each block.rows as row, rowIndex (`tr-${rowIndex}`)}
							<tr>
								{#each row as cell, cellIndex (`td-${cellIndex}`)}
									<td class="px-3 py-2 align-top">
										<AssistantMarkdownInline segments={cell} />
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else if block.type === 'code'}
			<pre
				class="overflow-x-auto rounded-lg border border-border bg-surface-muted p-3 text-xs leading-5 text-content"><code
					>{block.code}</code
				></pre>
		{/if}
	{/each}
</div>
