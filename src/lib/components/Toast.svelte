<script lang="ts">
	import { toastStore, removeToast, type ToastType } from '$lib/stores/toast-store';
	import Icon from './Icon.svelte';

	const iconMap: Record<ToastType, string> = {
		success: 'check-circle',
		error: 'x-circle',
		warning: 'warning',
		info: 'info'
	};

	const styleMap: Record<ToastType, string> = {
		success: 'bg-status-success-bg border-status-success-border text-status-success',
		error: 'bg-status-error-bg border-status-error-border text-status-error',
		warning: 'bg-status-warning-bg border-status-warning-border text-status-warning',
		info: 'bg-status-info-bg border-status-info-border text-status-info'
	};
</script>

{#if $toastStore.length > 0}
	<div class="fixed right-4 top-4 z-50 flex flex-col gap-2" role="status" aria-live="polite">
		{#each $toastStore as toast (toast.id)}
			<div
				class="flex min-w-[320px] max-w-md items-start gap-3 rounded-lg border px-4 py-3 shadow-lg animate-slide-in-right {styleMap[
					toast.type
				]}"
			>
				<Icon name={iconMap[toast.type]} size="md" class="mt-0.5 flex-shrink-0" />
				<p class="flex-1 text-sm font-medium">{toast.message}</p>
				<button
					onclick={() => removeToast(toast.id)}
					class="flex-shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
					aria-label="닫기"
				>
					<Icon name="x" size="sm" />
				</button>
			</div>
		{/each}
	</div>
{/if}
