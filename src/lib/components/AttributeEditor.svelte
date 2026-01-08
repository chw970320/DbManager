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
	let showDeleteConfirm = $state(false);

	$effect(() => {
		formData = { schemaName: entry.schemaName || '', entityName: entry.entityName || '', attributeName: entry.attributeName || '',
			attributeType: entry.attributeType || '', requiredInput: entry.requiredInput || '', identifierFlag: entry.identifierFlag || '',
			refEntityName: entry.refEntityName || '', refAttributeName: entry.refAttributeName || '', attributeDescription: entry.attributeDescription || '' };
	});

	function validate(): boolean {
		const newErrors: Record<string, string> = {};
		if (!formData.requiredInput.trim()) newErrors.requiredInput = '필수입력여부는 필수입니다.';
		if (!formData.refEntityName.trim()) newErrors.refEntityName = '참조엔터티명은 필수입니다.';
		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	function handleSave() {
		if (!validate()) return;
		const saveData: AttributeEntry = {
			id: entry.id || crypto.randomUUID(),
			requiredInput: formData.requiredInput.trim(), refEntityName: formData.refEntityName.trim(),
			schemaName: formData.schemaName.trim() || undefined, entityName: formData.entityName.trim() || undefined,
			attributeName: formData.attributeName.trim() || undefined, attributeType: formData.attributeType.trim() || undefined,
			identifierFlag: formData.identifierFlag.trim() || undefined, refAttributeName: formData.refAttributeName.trim() || undefined,
			attributeDescription: formData.attributeDescription.trim() || undefined,
			createdAt: entry.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString()
		};
		dispatch('save', saveData);
	}

	function handleDelete() { if (entry.id) dispatch('delete', entry as AttributeEntry); }
	function handleCancel() { dispatch('cancel'); }
	function handleBackdropClick(event: MouseEvent) { if (event.target === event.currentTarget) handleCancel(); }
	function handleKeydown(event: KeyboardEvent) { if (event.key === 'Escape') handleCancel(); }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onclick={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="modal-title">
	<div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onclick={(e) => e.stopPropagation()}>
		<div class="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
			<div class="flex items-center justify-between">
				<h2 id="modal-title" class="text-xl font-bold text-gray-900">{isEditMode ? '속성 정의서 수정' : '새 속성 정의서'}</h2>
				<button onclick={handleCancel} class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" aria-label="닫기"><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
			</div>
		</div>

		<form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="p-6">
			{#if serverError}<div class="mb-4 rounded-lg bg-red-50 p-4 text-red-700"><p class="text-sm">{serverError}</p></div>{/if}

			<div class="space-y-4">
				<div><label for="schemaName" class="mb-1 block text-sm font-medium text-gray-700">스키마명</label><input id="schemaName" type="text" bind:value={formData.schemaName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="스키마명 입력" /></div>
				<div><label for="entityName" class="mb-1 block text-sm font-medium text-gray-700">엔터티명</label><input id="entityName" type="text" bind:value={formData.entityName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="엔터티명 입력" /></div>
				<div><label for="attributeName" class="mb-1 block text-sm font-medium text-gray-700">속성명</label><input id="attributeName" type="text" bind:value={formData.attributeName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="속성명 입력" /></div>
				<div><label for="attributeType" class="mb-1 block text-sm font-medium text-gray-700">속성유형</label><input id="attributeType" type="text" bind:value={formData.attributeType} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="속성유형 입력" /></div>
				<div><label for="requiredInput" class="mb-1 block text-sm font-medium text-gray-700">필수입력여부 <span class="text-red-500">*</span></label><select id="requiredInput" bind:value={formData.requiredInput} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.requiredInput ? 'border-red-500' : 'border-gray-300'}"><option value="">선택</option><option value="Y">Y</option><option value="N">N</option></select>{#if errors.requiredInput}<p class="mt-1 text-xs text-red-500">{errors.requiredInput}</p>{/if}</div>
				<div><label for="identifierFlag" class="mb-1 block text-sm font-medium text-gray-700">식별자여부</label><select id="identifierFlag" bind:value={formData.identifierFlag} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"><option value="">선택</option><option value="Y">Y</option><option value="N">N</option></select></div>
				<div><label for="refEntityName" class="mb-1 block text-sm font-medium text-gray-700">참조엔터티명 <span class="text-red-500">*</span></label><input id="refEntityName" type="text" bind:value={formData.refEntityName} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.refEntityName ? 'border-red-500' : 'border-gray-300'}" placeholder="참조엔터티명 입력" />{#if errors.refEntityName}<p class="mt-1 text-xs text-red-500">{errors.refEntityName}</p>{/if}</div>
				<div><label for="refAttributeName" class="mb-1 block text-sm font-medium text-gray-700">참조속성명</label><input id="refAttributeName" type="text" bind:value={formData.refAttributeName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="참조속성명 입력" /></div>
				<div><label for="attributeDescription" class="mb-1 block text-sm font-medium text-gray-700">속성설명</label><textarea id="attributeDescription" bind:value={formData.attributeDescription} rows="3" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="속성설명 입력"></textarea></div>
			</div>

			<div class="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
				<div>{#if isEditMode}{#if showDeleteConfirm}<div class="flex items-center gap-2"><span class="text-sm text-red-600">정말 삭제하시겠습니까?</span><button type="button" onclick={handleDelete} class="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">확인</button><button type="button" onclick={() => (showDeleteConfirm = false)} class="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200">취소</button></div>{:else}<button type="button" onclick={() => (showDeleteConfirm = true)} class="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">삭제</button>{/if}{/if}</div>
				<div class="flex items-center gap-3"><button type="button" onclick={handleCancel} class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">취소</button><button type="submit" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{isEditMode ? '수정' : '추가'}</button></div>
			</div>
		</form>
	</div>
</div>

