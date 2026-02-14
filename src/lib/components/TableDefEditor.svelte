<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { TableEntry } from '$lib/types/database-design.js';

	let props = $props<{
		entry?: Partial<TableEntry>;
		isEditMode?: boolean;
		serverError?: string;
		filename?: string;
	}>();
	const dispatch = createEventDispatcher<{ save: TableEntry; delete: TableEntry; cancel: void }>();

	let entry = $derived(props.entry ?? {});
	let isEditMode = $derived(props.isEditMode ?? false);
	let serverError = $derived(props.serverError ?? '');

	let formData = $state({
		physicalDbName: '',
		tableOwner: '',
		subjectArea: '',
		schemaName: '',
		tableEnglishName: '',
		tableKoreanName: '',
		tableType: '',
		relatedEntityName: '',
		tableDescription: '',
		businessClassification: '',
		retentionPeriod: '',
		tableVolume: '',
		occurrenceCycle: '',
		publicFlag: '',
		nonPublicReason: '',
		openDataList: ''
	});

	let errors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);

	$effect(() => {
		formData.physicalDbName = entry.physicalDbName || '';
		formData.tableOwner = entry.tableOwner || '';
		formData.subjectArea = entry.subjectArea || '';
		formData.schemaName = entry.schemaName || '';
		formData.tableEnglishName = entry.tableEnglishName || '';
		formData.tableKoreanName = entry.tableKoreanName || '';
		formData.tableType = entry.tableType || '';
		formData.relatedEntityName = entry.relatedEntityName || '';
		formData.tableDescription = entry.tableDescription || '';
		formData.businessClassification = entry.businessClassification || '';
		formData.retentionPeriod = entry.retentionPeriod || '';
		formData.tableVolume = entry.tableVolume || '';
		formData.occurrenceCycle = entry.occurrenceCycle || '';
		formData.publicFlag = entry.publicFlag || '';
		formData.nonPublicReason = entry.nonPublicReason || '';
		formData.openDataList = entry.openDataList || '';
	});

	function validate(): boolean {
		const newErrors: Record<string, string> = {};
		if (!formData.physicalDbName?.trim()) newErrors.physicalDbName = '물리DB명은 필수입니다.';
		if (!formData.tableOwner?.trim()) newErrors.tableOwner = '테이블소유자는 필수입니다.';
		if (!formData.subjectArea?.trim()) newErrors.subjectArea = '주제영역은 필수입니다.';
		if (!formData.schemaName?.trim()) newErrors.schemaName = '스키마명은 필수입니다.';
		if (!formData.tableEnglishName?.trim())
			newErrors.tableEnglishName = '테이블영문명은 필수입니다.';
		if (!formData.tableKoreanName?.trim()) newErrors.tableKoreanName = '테이블한글명은 필수입니다.';
		if (!formData.tableType?.trim()) newErrors.tableType = '테이블유형은 필수입니다.';
		if (!formData.relatedEntityName?.trim())
			newErrors.relatedEntityName = '관련엔터티명은 필수입니다.';
		if (!formData.publicFlag?.trim()) newErrors.publicFlag = '공개/비공개여부는 필수입니다.';
		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	function handleSave() {
		if (!validate()) return;
		const saveData: TableEntry = {
			id: entry.id || crypto.randomUUID(),
			physicalDbName: formData.physicalDbName.trim(),
			tableOwner: formData.tableOwner.trim(),
			subjectArea: formData.subjectArea.trim(),
			schemaName: formData.schemaName.trim(),
			tableEnglishName: formData.tableEnglishName.trim(),
			tableKoreanName: formData.tableKoreanName.trim(),
			tableType: formData.tableType.trim(),
			relatedEntityName: formData.relatedEntityName.trim(),
			publicFlag: formData.publicFlag.trim(),
			tableDescription: formData.tableDescription.trim() || undefined,
			businessClassification: formData.businessClassification.trim(),
			retentionPeriod: formData.retentionPeriod.trim() || undefined,
			tableVolume: formData.tableVolume.trim(),
			occurrenceCycle: formData.occurrenceCycle.trim() || undefined,
			nonPublicReason: formData.nonPublicReason.trim(),
			openDataList: formData.openDataList.trim(),
			createdAt: entry.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
		dispatch('save', saveData);
	}

	function handleDelete() {
		if (!entry.id) return;
		if (confirm('정말로 이 항목을 삭제하시겠습니까?')) {
			const entryToDelete: TableEntry = {
				id: entry.id,
				businessClassification:
					formData.businessClassification.trim() || entry.businessClassification || '',
				tableVolume: formData.tableVolume.trim() || entry.tableVolume || '',
				nonPublicReason: formData.nonPublicReason.trim() || entry.nonPublicReason || '',
				openDataList: formData.openDataList.trim() || entry.openDataList || '',
				physicalDbName: formData.physicalDbName.trim() || entry.physicalDbName || undefined,
				tableOwner: formData.tableOwner.trim() || entry.tableOwner || undefined,
				subjectArea: formData.subjectArea.trim() || entry.subjectArea || undefined,
				schemaName: formData.schemaName.trim() || entry.schemaName || undefined,
				tableEnglishName: formData.tableEnglishName.trim() || entry.tableEnglishName || undefined,
				tableKoreanName: formData.tableKoreanName.trim() || entry.tableKoreanName || undefined,
				tableType: formData.tableType.trim() || entry.tableType || undefined,
				relatedEntityName:
					formData.relatedEntityName.trim() || entry.relatedEntityName || undefined,
				tableDescription: formData.tableDescription.trim() || entry.tableDescription || undefined,
				retentionPeriod: formData.retentionPeriod.trim() || entry.retentionPeriod || undefined,
				occurrenceCycle: formData.occurrenceCycle.trim() || entry.occurrenceCycle || undefined,
				publicFlag: formData.publicFlag.trim() || entry.publicFlag || undefined,
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
	<div class="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
		<div class="flex flex-shrink-0 items-center justify-between border-b p-6">
			<h2 id="modal-title" class="text-xl font-bold text-gray-900">
				{isEditMode ? '테이블 정의서 수정' : '새 테이블 정의서'}
			</h2>
			<button onclick={handleCancel} class="text-gray-400 hover:text-gray-600" aria-label="닫기"
				><svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/></svg
				></button
			>
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
						<label for="physicalDbName" class="mb-1 block text-sm font-medium text-gray-700"
							>물리DB명 <span class="text-red-500">*</span></label
						><input
							id="physicalDbName"
							type="text"
							bind:value={formData.physicalDbName}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.physicalDbName
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="물리DB명 입력"
						/>{#if errors.physicalDbName}<p class="mt-1 text-xs text-red-500">
								{errors.physicalDbName}
							</p>{/if}
					</div>
					<div>
						<label for="tableOwner" class="mb-1 block text-sm font-medium text-gray-700"
							>테이블소유자 <span class="text-red-500">*</span></label
						><input
							id="tableOwner"
							type="text"
							bind:value={formData.tableOwner}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.tableOwner
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="테이블소유자 입력"
						/>{#if errors.tableOwner}<p class="mt-1 text-xs text-red-500">
								{errors.tableOwner}
							</p>{/if}
					</div>
					<div>
						<label for="subjectArea" class="mb-1 block text-sm font-medium text-gray-700"
							>주제영역 <span class="text-red-500">*</span></label
						><input
							id="subjectArea"
							type="text"
							bind:value={formData.subjectArea}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.subjectArea
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="주제영역 입력"
						/>{#if errors.subjectArea}<p class="mt-1 text-xs text-red-500">
								{errors.subjectArea}
							</p>{/if}
					</div>
					<div>
						<label for="schemaName" class="mb-1 block text-sm font-medium text-gray-700"
							>스키마명 <span class="text-red-500">*</span></label
						><input
							id="schemaName"
							type="text"
							bind:value={formData.schemaName}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.schemaName
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="스키마명 입력"
						/>{#if errors.schemaName}<p class="mt-1 text-xs text-red-500">
								{errors.schemaName}
							</p>{/if}
					</div>
					<div>
						<label for="tableEnglishName" class="mb-1 block text-sm font-medium text-gray-700"
							>테이블영문명 <span class="text-red-500">*</span></label
						><input
							id="tableEnglishName"
							type="text"
							bind:value={formData.tableEnglishName}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.tableEnglishName
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="테이블영문명 입력"
						/>{#if errors.tableEnglishName}<p class="mt-1 text-xs text-red-500">
								{errors.tableEnglishName}
							</p>{/if}
					</div>
					<div>
						<label for="tableKoreanName" class="mb-1 block text-sm font-medium text-gray-700"
							>테이블한글명 <span class="text-red-500">*</span></label
						><input
							id="tableKoreanName"
							type="text"
							bind:value={formData.tableKoreanName}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.tableKoreanName
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="테이블한글명 입력"
						/>{#if errors.tableKoreanName}<p class="mt-1 text-xs text-red-500">
								{errors.tableKoreanName}
							</p>{/if}
					</div>
					<div>
						<label for="tableType" class="mb-1 block text-sm font-medium text-gray-700"
							>테이블유형 <span class="text-red-500">*</span></label
						><select
							id="tableType"
							bind:value={formData.tableType}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.tableType
								? 'border-red-500'
								: 'border-gray-300'}"
							><option value="">선택</option><option value="M">마스터(M)</option><option value="T"
								>트랜잭션(T)</option
							><option value="H">이력(H)</option><option value="R">참조(R)</option></select
						>{#if errors.tableType}<p class="mt-1 text-xs text-red-500">{errors.tableType}</p>{/if}
					</div>
					<div>
						<label for="relatedEntityName" class="mb-1 block text-sm font-medium text-gray-700"
							>관련엔터티명 <span class="text-red-500">*</span></label
						><input
							id="relatedEntityName"
							type="text"
							bind:value={formData.relatedEntityName}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.relatedEntityName
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="관련엔터티명 입력"
						/>{#if errors.relatedEntityName}<p class="mt-1 text-xs text-red-500">
								{errors.relatedEntityName}
							</p>{/if}
					</div>
					<div>
						<label for="publicFlag" class="mb-1 block text-sm font-medium text-gray-700"
							>공개/비공개여부 <span class="text-red-500">*</span></label
						><select
							id="publicFlag"
							bind:value={formData.publicFlag}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.publicFlag
								? 'border-red-500'
								: 'border-gray-300'}"
							><option value="">선택</option><option value="Y">공개(Y)</option><option value="N"
								>비공개(N)</option
							></select
						>{#if errors.publicFlag}<p class="mt-1 text-xs text-red-500">
								{errors.publicFlag}
							</p>{/if}
					</div>
					<div>
						<label for="businessClassification" class="mb-1 block text-sm font-medium text-gray-700"
							>업무분류체계</label
						><input
							id="businessClassification"
							type="text"
							bind:value={formData.businessClassification}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="업무분류체계 입력"
						/>
					</div>
					<div>
						<label for="retentionPeriod" class="mb-1 block text-sm font-medium text-gray-700"
							>보존기간</label
						><input
							id="retentionPeriod"
							type="text"
							bind:value={formData.retentionPeriod}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="보존기간 입력"
						/>
					</div>
					<div>
						<label for="tableDescription" class="mb-1 block text-sm font-medium text-gray-700"
							>테이블설명</label
						><textarea
							id="tableDescription"
							bind:value={formData.tableDescription}
							rows="3"
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="테이블설명 입력"
						></textarea>
					</div>
					<div>
						<label for="retentionPeriod" class="mb-1 block text-sm font-medium text-gray-700"
							>보존기간</label
						><input
							id="retentionPeriod"
							type="text"
							bind:value={formData.retentionPeriod}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="보존기간 입력"
						/>
					</div>
					<div>
						<label for="tableVolume" class="mb-1 block text-sm font-medium text-gray-700"
							>테이블볼륨</label
						><input
							id="tableVolume"
							type="text"
							bind:value={formData.tableVolume}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="테이블볼륨 입력"
						/>
					</div>
					<div>
						<label for="occurrenceCycle" class="mb-1 block text-sm font-medium text-gray-700"
							>발생주기</label
						><input
							id="occurrenceCycle"
							type="text"
							bind:value={formData.occurrenceCycle}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="발생주기 입력"
						/>
					</div>
					<div>
						<label for="nonPublicReason" class="mb-1 block text-sm font-medium text-gray-700"
							>비공개사유</label
						><input
							id="nonPublicReason"
							type="text"
							bind:value={formData.nonPublicReason}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="비공개사유 입력"
						/>
					</div>
					<div>
						<label for="openDataList" class="mb-1 block text-sm font-medium text-gray-700"
							>개방데이터목록</label
						><input
							id="openDataList"
							type="text"
							bind:value={formData.openDataList}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="개방데이터목록 입력"
						/>
					</div>
					<div>
						<label for="tableDescription" class="mb-1 block text-sm font-medium text-gray-700"
							>테이블설명</label
						><textarea
							id="tableDescription"
							bind:value={formData.tableDescription}
							rows="3"
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="테이블설명 입력"
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
