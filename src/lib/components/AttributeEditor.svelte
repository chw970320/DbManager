<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { AttributeEntry } from '$lib/types/database-design.js';

	let props = $props<{ entry?: Partial<AttributeEntry>; isEditMode?: boolean; serverError?: string; filename?: string }>();
	const dispatch = createEventDispatcher<{ save: AttributeEntry; delete: AttributeEntry; cancel: void }>();

	let entry = $derived(props.entry ?? {});
	let isEditMode = $derived(props.isEditMode ?? false);
	let serverError = $derived(props.serverError ?? '');

	let formData = $state({
		schemaName: entry.schemaName || '', entityName: entry.entityName || '', attributeName: entry.attributeName || '',
		attributeType: entry.attributeType || '', requiredInput: entry.requiredInput || '', identifierFlag: entry.identifierFlag || '',
		refEntityName: entry.refEntityName || '', refAttributeName: entry.refAttributeName || '', attributeDescription: entry.attributeDescription || ''
	});

	let errors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);

	$effect(() => {
		formData = { schemaName: entry.schemaName || '', entityName: entry.entityName || '', attributeName: entry.attributeName || '',
			attributeType: entry.attributeType || '', requiredInput: entry.requiredInput || '', identifierFlag: entry.identifierFlag || '',
			refEntityName: entry.refEntityName || '', refAttributeName: entry.refAttributeName || '', attributeDescription: entry.attributeDescription || '' };
	});

function validate(): boolean {
	const newErrors: Record<string, string> = {};
	if (!formData.schemaName.trim()) newErrors.schemaName = '스키마명은 필수입니다.';
	if (!formData.entityName.trim()) newErrors.entityName = '엔터티명은 필수입니다.';
	if (!formData.attributeName.trim()) newErrors.attributeName = '속성명은 필수입니다.';
	if (!formData.attributeType.trim()) newErrors.attributeType = '속성유형은 필수입니다.';
	errors = newErrors;
	return Object.keys(newErrors).length === 0;
}

	function handleSave() {
		if (!validate()) return;
		const saveData: AttributeEntry = {
			id: entry.id || crypto.randomUUID(),
			schemaName: formData.schemaName.trim(),
			entityName: formData.entityName.trim(),
			attributeName: formData.attributeName.trim(),
			attributeType: formData.attributeType.trim(),
			requiredInput: formData.requiredInput.trim() || undefined,
			refEntityName: formData.refEntityName.trim() || undefined,
			identifierFlag: formData.identifierFlag.trim() || undefined,
			refAttributeName: formData.refAttributeName.trim() || undefined,
			attributeDescription: formData.attributeDescription.trim() || undefined,
			createdAt: entry.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
		dispatch('save', saveData);
	}

	function handleDelete() {
		if (!entry.id) return;
		if (confirm('정말로 이 항목을 삭제하시겠습니까?')) {
			const entryToDelete: AttributeEntry = {
				id: entry.id,
				requiredInput: formData.requiredInput.trim() || entry.requiredInput || '',
				refEntityName: formData.refEntityName.trim() || entry.refEntityName || '',
				schemaName: formData.schemaName.trim() || entry.schemaName || undefined,
				entityName: formData.entityName.trim() || entry.entityName || undefined,
				attributeName: formData.attributeName.trim() || entry.attributeName || undefined,
				attributeType: formData.attributeType.trim() || entry.attributeType || undefined,
				identifierFlag: formData.identifierFlag.trim() || entry.identifierFlag || undefined,
				refAttributeName: formData.refAttributeName.trim() || entry.refAttributeName || undefined,
				attributeDescription: formData.attributeDescription.trim() || entry.attributeDescription || undefined,
				createdAt: entry.createdAt || '',
				updatedAt: entry.updatedAt || ''
			};
			dispatch('delete', entryToDelete);
		}
	}
	function handleCancel() { dispatch('cancel'); }
	function handleBackdropClick(event: MouseEvent) { if (event.target === event.currentTarget) handleCancel(); }
	function handleKeydown(event: KeyboardEvent) { if (event.key === 'Escape') handleCancel(); }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onclick={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="modal-title">
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl" onclick={(e) => e.stopPropagation()}>
		<div class="flex flex-shrink-0 items-center justify-between border-b p-6">
			<h2 id="modal-title" class="text-xl font-bold text-gray-900">{isEditMode ? '속성 정의서 수정' : '새 속성 정의서'}</h2>
			<button onclick={handleCancel} class="text-gray-400 hover:text-gray-600" aria-label="닫기"><svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
		</div>

		<div class="flex-1 overflow-y-auto p-6">
			<form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
			{#if serverError}<div class="mb-4 rounded-lg bg-red-50 p-4 text-red-700"><p class="text-sm">{serverError}</p></div>{/if}

			<div class="space-y-4">
				<div><label for="schemaName" class="mb-1 block text-sm font-medium text-gray-700">스키마명 <span class="text-red-500">*</span></label><input id="schemaName" type="text" bind:value={formData.schemaName} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.schemaName ? 'border-red-500' : 'border-gray-300'}" placeholder="스키마명 입력" />{#if errors.schemaName}<p class="mt-1 text-xs text-red-500">{errors.schemaName}</p>{/if}</div>
				<div><label for="entityName" class="mb-1 block text-sm font-medium text-gray-700">엔터티명 <span class="text-red-500">*</span></label><input id="entityName" type="text" bind:value={formData.entityName} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.entityName ? 'border-red-500' : 'border-gray-300'}" placeholder="엔터티명 입력" />{#if errors.entityName}<p class="mt-1 text-xs text-red-500">{errors.entityName}</p>{/if}</div>
				<div><label for="attributeName" class="mb-1 block text-sm font-medium text-gray-700">속성명 <span class="text-red-500">*</span></label><input id="attributeName" type="text" bind:value={formData.attributeName} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.attributeName ? 'border-red-500' : 'border-gray-300'}" placeholder="속성명 입력" />{#if errors.attributeName}<p class="mt-1 text-xs text-red-500">{errors.attributeName}</p>{/if}</div>
				<div><label for="attributeType" class="mb-1 block text-sm font-medium text-gray-700">속성유형 <span class="text-red-500">*</span></label><input id="attributeType" type="text" bind:value={formData.attributeType} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.attributeType ? 'border-red-500' : 'border-gray-300'}" placeholder="속성유형 입력" />{#if errors.attributeType}<p class="mt-1 text-xs text-red-500">{errors.attributeType}</p>{/if}</div>
				<div><label for="requiredInput" class="mb-1 block text-sm font-medium text-gray-700">필수입력여부</label><select id="requiredInput" bind:value={formData.requiredInput} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"><option value="">선택</option><option value="Y">Y</option><option value="N">N</option></select></div>
				<div><label for="identifierFlag" class="mb-1 block text-sm font-medium text-gray-700">식별자여부</label><select id="identifierFlag" bind:value={formData.identifierFlag} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"><option value="">선택</option><option value="Y">Y</option><option value="N">N</option></select></div>
				<div><label for="refEntityName" class="mb-1 block text-sm font-medium text-gray-700">참조엔터티명</label><input id="refEntityName" type="text" bind:value={formData.refEntityName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="참조엔터티명 입력" /></div>
				<div><label for="refAttributeName" class="mb-1 block text-sm font-medium text-gray-700">참조속성명</label><input id="refAttributeName" type="text" bind:value={formData.refAttributeName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="참조속성명 입력" /></div>
				<div><label for="attributeDescription" class="mb-1 block text-sm font-medium text-gray-700">속성설명</label><textarea id="attributeDescription" bind:value={formData.attributeDescription} rows="3" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="속성설명 입력"></textarea></div>
			</div>

			<div class="flex justify-between border-t border-gray-200 pt-4">
				{#if isEditMode && entry.id}
					<button type="button" onclick={handleDelete} class="group inline-flex items-center space-x-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 shadow-sm transition-all duration-200 hover:border-red-400 hover:bg-red-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={isSubmitting}>
						<svg class="h-4 w-4 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
						<span>삭제</span>
					</button>
				{:else}
					<div></div>
				{/if}
				<div class="flex space-x-3">
					<button type="button" onclick={handleCancel} class="btn btn-secondary" disabled={isSubmitting}>취소</button>
					<button type="submit" class="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={isSubmitting}>{#if isSubmitting}저장 중...{:else}{isEditMode ? '수정' : '저장'}{/if}</button>
				</div>
			</div>
			</form>
		</div>
	</div>
</div>

