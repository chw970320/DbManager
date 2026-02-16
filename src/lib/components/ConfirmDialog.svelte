<script lang="ts">
	import { confirmStore, closeConfirm } from '$lib/stores/confirm-store';
	import Icon from './Icon.svelte';

	function handleKeydown(e: KeyboardEvent) {
		if (!$confirmStore.isOpen) return;
		if (e.key === 'Escape') {
			closeConfirm(false);
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			closeConfirm(false);
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if $confirmStore.isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={handleBackdropClick}
	>
		<div
			class="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="confirm-title"
			aria-describedby="confirm-message"
		>
			<div class="flex items-start gap-3">
				{#if $confirmStore.options.variant === 'danger'}
					<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-status-error-bg">
						<Icon name="warning" size="md" class="text-status-error" />
					</div>
				{:else}
					<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-status-info-bg">
						<Icon name="info" size="md" class="text-status-info" />
					</div>
				{/if}
				<div class="flex-1">
					<h3 id="confirm-title" class="text-lg font-semibold text-content">
						{$confirmStore.options.title}
					</h3>
					<p id="confirm-message" class="mt-2 text-sm text-content-secondary">
						{$confirmStore.options.message}
					</p>
				</div>
			</div>

			<div class="mt-6 flex justify-end gap-3">
				<button class="btn btn-secondary" onclick={() => closeConfirm(false)}>
					{$confirmStore.options.cancelText}
				</button>
				<button
					class="btn {$confirmStore.options.variant === 'danger' ? 'btn-danger' : 'btn-primary'}"
					onclick={() => closeConfirm(true)}
				>
					{$confirmStore.options.confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
