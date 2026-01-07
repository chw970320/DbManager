<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { EntityEntry } from '$lib/types/database-design.js';

	let props = $props<{
		entry?: Partial<EntityEntry>;
		isEditMode?: boolean;
		serverError?: string;
		filename?: string;
	}>();

	const dispatch = createEventDispatcher<{ save: EntityEntry; delete: EntityEntry; cancel: void }>();

	let entry = $derived(props.entry ?? {});
	let isEditMode = $derived(props.isEditMode ?? false);
	let serverError = $derived(props.serverError ?? '');

	let formData = $state({
		logicalDbName: entry.logicalDbName || '',
		schemaName: entry.schemaName || '',
		entityName: entry.entityName || '',
		entityDescription: entry.entityDescription || '',
		primaryIdentifier: entry.primaryIdentifier || '',
		superTypeEntityName: entry.superTypeEntityName || '',
		tableKoreanName: entry.tableKoreanName || ''
	});

	let errors = $state<Record<string, string>>({});
	let showDeleteConfirm = $state(false);

	$effect(() => {
		formData = {
			logicalDbName: entry.logicalDbName || '',
			schemaName: entry.schemaName || '',
			entityName: entry.entityName || '',
			entityDescription: entry.entityDescription || '',
			primaryIdentifier: entry.primaryIdentifier || '',
			superTypeEntityName: entry.superTypeEntityName || '',
			tableKoreanName: entry.tableKoreanName || ''
		};
	});

	function validate(): boolean {
		const newErrors: Record<string, string> = {};
		if (!formData.superTypeEntityName.trim()) newErrors.superTypeEntityName = '수퍼타입엔터티명은 필수입니다.';
		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	function handleSave() {
		if (!validate()) return;
		const saveData: EntityEntry = {
			id: entry.id || crypto.randomUUID(),
			superTypeEntityName: formData.superTypeEntityName.trim(),
			logicalDbName: formData.logicalDbName.trim() || undefined,
			schemaName: formData.schemaName.trim() || undefined,
			entityName: formData.entityName.trim() || undefined,
			entityDescription: formData.entityDescription.trim() || undefined,
			primaryIdentifier: formData.primaryIdentifier.trim() || undefined,
			tableKoreanName: formData.tableKoreanName.trim() || undefined,
			createdAt: entry.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
		dispatch('save', saveData);
	}

	function handleDelete() { if (entry.id) dispatch('delete', entry as EntityEntry); }
	function handleCancel() { dispatch('cancel'); }
	function handleBackdropClick(event: MouseEvent) { if (event.target === event.currentTarget) handleCancel(); }
	function handleKeydown(event: KeyboardEvent) { if (event.key === 'Escape') handleCancel(); }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onclick={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="modal-title">
	<div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onclick={(e) => e.stopPropagation()}>
		<div class="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
			<div class="flex items-center justify-between">
				<h2 id="modal-title" class="text-xl font-bold text-gray-900">{isEditMode ? '엔터티 정의서 수정' : '새 엔터티 정의서'}</h2>
				<button onclick={handleCancel} class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" aria-label="닫기">
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</div>
		</div>

		<form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="p-6">
			{#if serverError}<div class="mb-4 rounded-lg bg-red-50 p-4 text-red-700"><p class="text-sm">{serverError}</p></div>{/if}

			<div class="grid gap-4 md:grid-cols-2">
				<div>
					<label for="logicalDbName" class="mb-1 block text-sm font-medium text-gray-700">논리DB명</label>
					<input id="logicalDbName" type="text" bind:value={formData.logicalDbName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="논리DB명 입력" />
				</div>
				<div>
					<label for="schemaName" class="mb-1 block text-sm font-medium text-gray-700">스키마명</label>
					<input id="schemaName" type="text" bind:value={formData.schemaName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="스키마명 입력" />
				</div>
				<div>
					<label for="entityName" class="mb-1 block text-sm font-medium text-gray-700">엔터티명</label>
					<input id="entityName" type="text" bind:value={formData.entityName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="엔터티명 입력" />
				</div>
				<div>
					<label for="primaryIdentifier" class="mb-1 block text-sm font-medium text-gray-700">주식별자</label>
					<input id="primaryIdentifier" type="text" bind:value={formData.primaryIdentifier} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="주식별자 입력" />
				</div>
				<div>
					<label for="superTypeEntityName" class="mb-1 block text-sm font-medium text-gray-700">수퍼타입엔터티명 <span class="text-red-500">*</span></label>
					<input id="superTypeEntityName" type="text" bind:value={formData.superTypeEntityName} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.superTypeEntityName ? 'border-red-500' : 'border-gray-300'}" placeholder="수퍼타입엔터티명 입력" />
					{#if errors.superTypeEntityName}<p class="mt-1 text-xs text-red-500">{errors.superTypeEntityName}</p>{/if}
				</div>
				<div>
					<label for="tableKoreanName" class="mb-1 block text-sm font-medium text-gray-700">테이블한글명</label>
					<input id="tableKoreanName" type="text" bind:value={formData.tableKoreanName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="테이블한글명 입력" />
				</div>
				<div class="md:col-span-2">
					<label for="entityDescription" class="mb-1 block text-sm font-medium text-gray-700">엔터티설명</label>
					<textarea id="entityDescription" bind:value={formData.entityDescription} rows="3" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="엔터티설명 입력"></textarea>
				</div>
			</div>

			<div class="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
				<div>
					{#if isEditMode}
						{#if showDeleteConfirm}
							<div class="flex items-center gap-2">
								<span class="text-sm text-red-600">정말 삭제하시겠습니까?</span>
								<button type="button" onclick={handleDelete} class="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">확인</button>
								<button type="button" onclick={() => (showDeleteConfirm = false)} class="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200">취소</button>
							</div>
						{:else}
							<button type="button" onclick={() => (showDeleteConfirm = true)} class="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">삭제</button>
						{/if}
					{/if}
				</div>
				<div class="flex items-center gap-3">
					<button type="button" onclick={handleCancel} class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">취소</button>
					<button type="submit" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{isEditMode ? '수정' : '추가'}</button>
				</div>
			</div>
		</form>
	</div>
</div>

