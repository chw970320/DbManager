<script lang="ts">
	import EmptyState from '$lib/components/EmptyState.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { ALL_DATA_TYPES, DATA_TYPE_LABELS } from '$lib/types/base.js';
	import type { SharedFileMappingBundleEntry } from '$lib/types/shared-file-mapping.js';

	export type DesignSnapshotEditorSubmitDetail = {
		bundleId: string;
		name: string;
		description: string;
	};

	interface Props {
		isOpen?: boolean;
		bundles?: SharedFileMappingBundleEntry[];
		initialBundleId?: string;
		isSubmitting?: boolean;
		serverError?: string;
		onsave?: (detail: DesignSnapshotEditorSubmitDetail) => void;
		onclose?: () => void;
	}

	let {
		isOpen = false,
		bundles = [],
		initialBundleId = '',
		isSubmitting = false,
		serverError = '',
		onsave,
		onclose
	}: Props = $props();

	let hydrationKey = $state('');
	let validationError = $state('');
	let formData = $state({
		bundleId: '',
		name: '',
		description: ''
	});

	const selectedBundle = $derived(
		bundles.find((bundle) => bundle.id === formData.bundleId) ?? bundles[0] ?? null
	);

	function getBundleLabel(bundle: SharedFileMappingBundleEntry): string {
		return `${bundle.files.column} / ${bundle.files.term}`;
	}

	function getInitialBundleId(): string {
		if (bundles.some((bundle) => bundle.id === initialBundleId)) {
			return initialBundleId;
		}

		return bundles[0]?.id ?? '';
	}

	function hydrateForm() {
		formData.bundleId = getInitialBundleId();
		formData.name = '';
		formData.description = '';
		validationError = '';
	}

	function handleSave() {
		if (!selectedBundle) {
			validationError = '저장할 파일 번들을 먼저 구성하세요.';
			return;
		}

		validationError = '';
		onsave?.({
			bundleId: formData.bundleId,
			name: formData.name.trim(),
			description: formData.description.trim()
		});
	}

	function handleClose() {
		onclose?.();
	}

	$effect(() => {
		if (!isOpen) {
			hydrationKey = '';
			validationError = '';
			return;
		}

		const bundleSignature = bundles.map((bundle) => bundle.id).join(',');
		const nextKey = `${initialBundleId}:${bundleSignature}`;
		if (hydrationKey !== nextKey) {
			hydrationKey = nextKey;
			hydrateForm();
			return;
		}

		if (selectedBundle && !formData.bundleId) {
			formData.bundleId = selectedBundle.id;
		}
	});
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="design-snapshot-editor-title"
		onclick={(event) => {
			if (event.target === event.currentTarget) {
				handleClose();
			}
		}}
		onkeydown={(event) => {
			if (event.key === 'Escape') {
				handleClose();
			}
		}}
		tabindex="-1"
	>
		<div class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-surface shadow-xl">
			<div class="flex items-center justify-between border-b border-border px-6 py-4">
				<div>
					<h2 id="design-snapshot-editor-title" class="text-xl font-semibold text-content">
						스냅샷 추가
					</h2>
					<p class="mt-1 text-sm text-content-muted">
						복구 포인트로 저장할 8종 파일 번들을 선택하고 필요한 메모를 함께 남깁니다.
					</p>
				</div>
				<button type="button" class="btn btn-ghost btn-sm" onclick={handleClose} aria-label="닫기">
					<Icon name="x" size="md" />
				</button>
			</div>

			<div class="flex-1 overflow-y-auto px-6 py-5">
				<form
					class="space-y-4"
					onsubmit={(event) => {
						event.preventDefault();
						handleSave();
					}}
				>
					{#if serverError}
						<div
							class="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error"
						>
							{serverError}
						</div>
					{/if}

					{#if validationError}
						<div
							class="rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning"
						>
							{validationError}
						</div>
					{/if}

					{#if bundles.length === 0}
						<EmptyState
							icon="save"
							title="저장 가능한 파일 번들이 없습니다."
							description="먼저 정의서 화면에서 공통 파일 매핑 번들을 구성한 뒤 다시 시도하세요."
						/>
					{:else}
						<div class="space-y-4">
							<FormField
								label="대상 번들"
								name="snapshot-bundle"
								required
								hint="공통 파일 매핑에서 구성한 8종 파일 조합을 선택합니다."
							>
								<select
									id="snapshot-bundle"
									class="input"
									bind:value={formData.bundleId}
									disabled={isSubmitting}
									aria-label="대상 번들"
								>
									{#each bundles as bundle (bundle.id)}
										<option value={bundle.id}>{getBundleLabel(bundle)}</option>
									{/each}
								</select>
							</FormField>

							<FormField
								label="스냅샷명"
								name="snapshot-name"
								hint="비워두면 컬럼 파일명 기준 기본 이름이 저장됩니다."
							>
								<input
									id="snapshot-name"
									type="text"
									class="input"
									bind:value={formData.name}
									placeholder="예: 표준 보정 전"
									disabled={isSubmitting}
									aria-label="스냅샷명"
								/>
							</FormField>

							<FormField
								label="설명"
								name="snapshot-description"
								hint="저장 이유를 함께 남겨두면 복구 시점을 더 빨리 찾을 수 있습니다."
							>
								<textarea
									id="snapshot-description"
									class="input min-h-24 resize-none"
									bind:value={formData.description}
									placeholder="왜 저장하는지 메모를 남깁니다."
									disabled={isSubmitting}
									aria-label="설명"
								></textarea>
							</FormField>

							{#if selectedBundle}
								<div class="rounded-lg border border-border bg-surface-muted p-4">
									<p class="text-xs font-medium text-content-secondary">포함되는 파일</p>
									<div class="mt-3 flex flex-wrap gap-2">
										{#each ALL_DATA_TYPES as type (type)}
											<span class="rounded-full bg-surface px-3 py-1 text-xs text-content-secondary">
												{DATA_TYPE_LABELS[type]} · {selectedBundle.files[type]}
											</span>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</form>
			</div>

			<div class="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
				<button type="button" class="btn btn-secondary" onclick={handleClose}>
					취소
				</button>
				<button
					type="button"
					class="btn btn-primary"
					onclick={handleSave}
					disabled={isSubmitting || !selectedBundle}
				>
					<Icon name="save" size="sm" />
					{isSubmitting ? '저장 중...' : '스냅샷 저장'}
				</button>
			</div>
		</div>
	</div>
{/if}
