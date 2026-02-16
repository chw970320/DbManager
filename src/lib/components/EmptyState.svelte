<script lang="ts">
	import Icon from './Icon.svelte';

	interface Props {
		icon?: string;
		title: string;
		description?: string;
		actionLabel?: string;
		onaction?: () => void;
	}

	let {
		icon = 'file',
		title,
		description = '',
		actionLabel = '',
		onaction
	}: Props = $props();
</script>

<div class="flex flex-col items-center justify-center py-12 text-center">
	<Icon name={icon} size="xl" class="mb-4 text-content-subtle" />
	<h3 class="text-lg font-medium text-content-secondary">{title}</h3>
	{#if description}
		<p class="mt-2 max-w-sm text-sm text-content-muted">{description}</p>
	{/if}
	{#if actionLabel && onaction}
		<button
			type="button"
			onclick={onaction}
			class="btn btn-primary mt-4"
		>
			{actionLabel}
		</button>
	{/if}
</div>
