<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { EntityEntry } from '$lib/types/database-design.js';

	let props = $props<{
		entry?: Partial<EntityEntry>;
		isEditMode?: boolean;
		serverError?: string;
		filename?: string;
	}>();

	const dispatch = createEventDispatcher<{
		save: EntityEntry;
		delete: EntityEntry;
		cancel: void;
	}>();

	let entry = $derived(props.entry ?? {});
	let isEditMode = $derived(props.isEditMode ?? false);
	let serverError = $derived(props.serverError ?? '');

	let formData = $state({
		logicalDbName: '',
		schemaName: '',
		entityName: '',
		entityDescription: '',
		primaryIdentifier: '',
		superTypeEntityName: '',
		tableKoreanName: ''
	});

	let errors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);

	$effect(() => {
		formData.logicalDbName = entry.logicalDbName || '';
		formData.schemaName = entry.schemaName || '';
		formData.entityName = entry.entityName || '';
		formData.entityDescription = entry.entityDescription || '';
		formData.primaryIdentifier = entry.primaryIdentifier || '';
		formData.superTypeEntityName = entry.superTypeEntityName || '';
		formData.tableKoreanName = entry.tableKoreanName || '';
	});

	function validate(): boolean {
		const newErrors: Record<string, string> = {};
		if (!formData.logicalDbName?.trim()) newErrors.logicalDbName = '논리DB명은 필수입니다.';
		if (!formData.schemaName?.trim()) newErrors.schemaName = '스키마명은 필수입니다.';
		if (!formData.entityName?.trim()) newErrors.entityName = '엔터티명은 필수입니다.';
		if (!formData.primaryIdentifier?.trim()) newErrors.primaryIdentifier = '주식별자는 필수입니다.';
		if (!formData.tableKoreanName?.trim()) newErrors.tableKoreanName = '테이블한글명은 필수입니다.';
		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	function handleSave() {
		if (!validate()) return;
		const saveData: EntityEntry = {
			id: entry.id || crypto.randomUUID(),
			logicalDbName: formData.logicalDbName.trim(),
			schemaName: formData.schemaName.trim(),
			entityName: formData.entityName.trim(),
			primaryIdentifier: formData.primaryIdentifier.trim(),
			tableKoreanName: formData.tableKoreanName.trim(),
			entityDescription: formData.entityDescription.trim() || undefined,
			superTypeEntityName: formData.superTypeEntityName.trim(),
			createdAt: entry.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
		dispatch('save', saveData);
	}

	function handleDelete() {
		if (!entry.id) return;
		if (confirm('정말로 이 항목을 삭제하시겠습니까?')) {
			const entryToDelete: EntityEntry = {
				id: entry.id,
				superTypeEntityName: formData.superTypeEntityName.trim() || entry.superTypeEntityName || '',
				logicalDbName: formData.logicalDbName.trim() || entry.logicalDbName || undefined,
				schemaName: formData.schemaName.trim() || entry.schemaName || undefined,
				entityName: formData.entityName.trim() || entry.entityName || undefined,
				entityDescription:
					formData.entityDescription.trim() || entry.entityDescription || undefined,
				primaryIdentifier:
					formData.primaryIdentifier.trim() || entry.primaryIdentifier || undefined,
				tableKoreanName: formData.tableKoreanName.trim() || entry.tableKoreanName || undefined,
				createdAt: entry.createdAt || '',
				updatedAt: entry.updatedAt || ''
			};
			dispatch('delete', entryToDelete);
		}
	}
	function handleCancel() {
		dispatch('cancel');
	}
	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) handleCancel();
	}
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') handleCancel();
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
	onclick={handleBackdropClick}
	onkeydown={handleKeydown}
	role="dialog"
	aria-modal="true"
	aria-labelledby="modal-title"
	tabindex="-1"
>
	<div class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
		<div class="flex flex-shrink-0 items-center justify-between border-b p-6">
			<h2 id="modal-title" class="text-xl font-bold text-gray-900">
				{isEditMode ? '엔터티 정의서 수정' : '새 엔터티 정의서'}
			</h2>
			<button onclick={handleCancel} class="text-gray-400 hover:text-gray-600" aria-label="닫기">
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/></svg
				>
			</button>
		</div>

		<div class="flex-1 overflow-y-auto p-6">
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSave();
				}}
			>
				{#if serverError}<div class="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
						<p class="text-sm">{serverError}</p>
					</div>{/if}

				<div class="space-y-4">
					<div>
						<label for="logicalDbName" class="mb-1 block text-sm font-medium text-gray-700"
							>논리DB명 <span class="text-red-500">*</span></label
						>
						<input
							id="logicalDbName"
							type="text"
							bind:value={formData.logicalDbName}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.logicalDbName
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="논리DB명 입력"
						/>
						{#if errors.logicalDbName}<p class="mt-1 text-xs text-red-500">
								{errors.logicalDbName}
							</p>{/if}
					</div>
					<div>
						<label for="schemaName" class="mb-1 block text-sm font-medium text-gray-700"
							>스키마명 <span class="text-red-500">*</span></label
						>
						<input
							id="schemaName"
							type="text"
							bind:value={formData.schemaName}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.schemaName
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="스키마명 입력"
						/>
						{#if errors.schemaName}<p class="mt-1 text-xs text-red-500">{errors.schemaName}</p>{/if}
					</div>
					<div>
						<label for="entityName" class="mb-1 block text-sm font-medium text-gray-700"
							>엔터티명 <span class="text-red-500">*</span></label
						>
						<input
							id="entityName"
							type="text"
							bind:value={formData.entityName}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.entityName
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="엔터티명 입력"
						/>
						{#if errors.entityName}<p class="mt-1 text-xs text-red-500">{errors.entityName}</p>{/if}
					</div>
					<div>
						<label for="primaryIdentifier" class="mb-1 block text-sm font-medium text-gray-700"
							>주식별자 <span class="text-red-500">*</span></label
						>
						<input
							id="primaryIdentifier"
							type="text"
							bind:value={formData.primaryIdentifier}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.primaryIdentifier
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="주식별자 입력"
						/>
						{#if errors.primaryIdentifier}<p class="mt-1 text-xs text-red-500">
								{errors.primaryIdentifier}
							</p>{/if}
					</div>
					<div>
						<label for="superTypeEntityName" class="mb-1 block text-sm font-medium text-gray-700"
							>수퍼타입엔터티명</label
						>
						<input
							id="superTypeEntityName"
							type="text"
							bind:value={formData.superTypeEntityName}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="수퍼타입엔터티명 입력"
						/>
					</div>
					<div>
						<label for="tableKoreanName" class="mb-1 block text-sm font-medium text-gray-700"
							>테이블한글명 <span class="text-red-500">*</span></label
						>
						<input
							id="tableKoreanName"
							type="text"
							bind:value={formData.tableKoreanName}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.tableKoreanName
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="테이블한글명 입력"
						/>
						{#if errors.tableKoreanName}<p class="mt-1 text-xs text-red-500">
								{errors.tableKoreanName}
							</p>{/if}
					</div>
					<div>
						<label for="entityDescription" class="mb-1 block text-sm font-medium text-gray-700"
							>엔터티설명</label
						>
						<textarea
							id="entityDescription"
							bind:value={formData.entityDescription}
							rows="3"
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="엔터티설명 입력"
						></textarea>
					</div>
				</div>

				<div class="flex justify-between border-t border-gray-200 pt-4">
					{#if isEditMode && entry.id}
						<button
							type="button"
							onclick={handleDelete}
							class="group inline-flex items-center space-x-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 shadow-sm transition-all duration-200 hover:border-red-400 hover:bg-red-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={isSubmitting}
						>
							<svg
								class="h-4 w-4 transition-transform duration-200 group-hover:scale-110"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/></svg
							>
							<span>삭제</span>
						</button>
					{:else}
						<div></div>
					{/if}
					<div class="flex space-x-3">
						<button
							type="button"
							onclick={handleCancel}
							class="btn btn-secondary"
							disabled={isSubmitting}>취소</button
						>
						<button
							type="submit"
							class="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
							disabled={isSubmitting}
							>{#if isSubmitting}저장 중...{:else}{isEditMode ? '수정' : '저장'}{/if}</button
						>
					</div>
				</div>
			</form>
		</div>
	</div>
</div>
