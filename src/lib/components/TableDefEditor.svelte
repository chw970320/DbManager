<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { TableEntry } from '$lib/types/database-design.js';

	let props = $props<{ entry?: Partial<TableEntry>; isEditMode?: boolean; serverError?: string; filename?: string }>();
	const dispatch = createEventDispatcher<{ save: TableEntry; delete: TableEntry; cancel: void }>();

	let entry = $derived(props.entry ?? {});
	let isEditMode = $derived(props.isEditMode ?? false);
	let serverError = $derived(props.serverError ?? '');

	let formData = $state({
		physicalDbName: entry.physicalDbName || '', tableOwner: entry.tableOwner || '', subjectArea: entry.subjectArea || '',
		schemaName: entry.schemaName || '', tableEnglishName: entry.tableEnglishName || '', tableKoreanName: entry.tableKoreanName || '',
		tableType: entry.tableType || '', relatedEntityName: entry.relatedEntityName || '', tableDescription: entry.tableDescription || '',
		businessClassification: entry.businessClassification || '', retentionPeriod: entry.retentionPeriod || '', tableVolume: entry.tableVolume || '',
		occurrenceCycle: entry.occurrenceCycle || '', publicFlag: entry.publicFlag || '', nonPublicReason: entry.nonPublicReason || '',
		openDataList: entry.openDataList || ''
	});

	let errors = $state<Record<string, string>>({});
	let showDeleteConfirm = $state(false);

	$effect(() => {
		formData = { physicalDbName: entry.physicalDbName || '', tableOwner: entry.tableOwner || '', subjectArea: entry.subjectArea || '',
			schemaName: entry.schemaName || '', tableEnglishName: entry.tableEnglishName || '', tableKoreanName: entry.tableKoreanName || '',
			tableType: entry.tableType || '', relatedEntityName: entry.relatedEntityName || '', tableDescription: entry.tableDescription || '',
			businessClassification: entry.businessClassification || '', retentionPeriod: entry.retentionPeriod || '', tableVolume: entry.tableVolume || '',
			occurrenceCycle: entry.occurrenceCycle || '', publicFlag: entry.publicFlag || '', nonPublicReason: entry.nonPublicReason || '',
			openDataList: entry.openDataList || '' };
	});

	function validate(): boolean {
		const newErrors: Record<string, string> = {};
		if (!formData.businessClassification.trim()) newErrors.businessClassification = '업무분류체계는 필수입니다.';
		if (!formData.tableVolume.trim()) newErrors.tableVolume = '테이블볼륨은 필수입니다.';
		if (!formData.nonPublicReason.trim()) newErrors.nonPublicReason = '비공개사유는 필수입니다.';
		if (!formData.openDataList.trim()) newErrors.openDataList = '개방데이터목록은 필수입니다.';
		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	function handleSave() {
		if (!validate()) return;
		const saveData: TableEntry = {
			id: entry.id || crypto.randomUUID(),
			businessClassification: formData.businessClassification.trim(), tableVolume: formData.tableVolume.trim(),
			nonPublicReason: formData.nonPublicReason.trim(), openDataList: formData.openDataList.trim(),
			physicalDbName: formData.physicalDbName.trim() || undefined, tableOwner: formData.tableOwner.trim() || undefined,
			subjectArea: formData.subjectArea.trim() || undefined, schemaName: formData.schemaName.trim() || undefined,
			tableEnglishName: formData.tableEnglishName.trim() || undefined, tableKoreanName: formData.tableKoreanName.trim() || undefined,
			tableType: formData.tableType.trim() || undefined, relatedEntityName: formData.relatedEntityName.trim() || undefined,
			tableDescription: formData.tableDescription.trim() || undefined, retentionPeriod: formData.retentionPeriod.trim() || undefined,
			occurrenceCycle: formData.occurrenceCycle.trim() || undefined, publicFlag: formData.publicFlag.trim() || undefined,
			createdAt: entry.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString()
		};
		dispatch('save', saveData);
	}

	function handleDelete() { if (entry.id) dispatch('delete', entry as TableEntry); }
	function handleCancel() { dispatch('cancel'); }
	function handleBackdropClick(event: MouseEvent) { if (event.target === event.currentTarget) handleCancel(); }
	function handleKeydown(event: KeyboardEvent) { if (event.key === 'Escape') handleCancel(); }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onclick={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="modal-title">
	<div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onclick={(e) => e.stopPropagation()}>
		<div class="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
			<div class="flex items-center justify-between">
				<h2 id="modal-title" class="text-xl font-bold text-gray-900">{isEditMode ? '테이블 정의서 수정' : '새 테이블 정의서'}</h2>
				<button onclick={handleCancel} class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" aria-label="닫기"><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
			</div>
		</div>

		<form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="p-6">
			{#if serverError}<div class="mb-4 rounded-lg bg-red-50 p-4 text-red-700"><p class="text-sm">{serverError}</p></div>{/if}

			<div class="grid gap-4 md:grid-cols-3">
				<div><label for="physicalDbName" class="mb-1 block text-sm font-medium text-gray-700">물리DB명</label><input id="physicalDbName" type="text" bind:value={formData.physicalDbName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="물리DB명 입력" /></div>
				<div><label for="schemaName" class="mb-1 block text-sm font-medium text-gray-700">스키마명</label><input id="schemaName" type="text" bind:value={formData.schemaName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="스키마명 입력" /></div>
				<div><label for="tableOwner" class="mb-1 block text-sm font-medium text-gray-700">테이블소유자</label><input id="tableOwner" type="text" bind:value={formData.tableOwner} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="테이블소유자 입력" /></div>
				<div><label for="tableEnglishName" class="mb-1 block text-sm font-medium text-gray-700">테이블영문명</label><input id="tableEnglishName" type="text" bind:value={formData.tableEnglishName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="테이블영문명 입력" /></div>
				<div><label for="tableKoreanName" class="mb-1 block text-sm font-medium text-gray-700">테이블한글명</label><input id="tableKoreanName" type="text" bind:value={formData.tableKoreanName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="테이블한글명 입력" /></div>
				<div><label for="tableType" class="mb-1 block text-sm font-medium text-gray-700">테이블유형</label><select id="tableType" bind:value={formData.tableType} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"><option value="">선택</option><option value="M">마스터(M)</option><option value="T">트랜잭션(T)</option><option value="H">이력(H)</option><option value="R">참조(R)</option></select></div>
				<div><label for="subjectArea" class="mb-1 block text-sm font-medium text-gray-700">주제영역</label><input id="subjectArea" type="text" bind:value={formData.subjectArea} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="주제영역 입력" /></div>
				<div><label for="relatedEntityName" class="mb-1 block text-sm font-medium text-gray-700">관련엔터티명</label><input id="relatedEntityName" type="text" bind:value={formData.relatedEntityName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="관련엔터티명 입력" /></div>
				<div><label for="businessClassification" class="mb-1 block text-sm font-medium text-gray-700">업무분류체계 <span class="text-red-500">*</span></label><input id="businessClassification" type="text" bind:value={formData.businessClassification} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.businessClassification ? 'border-red-500' : 'border-gray-300'}" placeholder="업무분류체계 입력" />{#if errors.businessClassification}<p class="mt-1 text-xs text-red-500">{errors.businessClassification}</p>{/if}</div>
				<div><label for="retentionPeriod" class="mb-1 block text-sm font-medium text-gray-700">보존기간</label><input id="retentionPeriod" type="text" bind:value={formData.retentionPeriod} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="보존기간 입력" /></div>
				<div><label for="tableVolume" class="mb-1 block text-sm font-medium text-gray-700">테이블볼륨 <span class="text-red-500">*</span></label><input id="tableVolume" type="text" bind:value={formData.tableVolume} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.tableVolume ? 'border-red-500' : 'border-gray-300'}" placeholder="테이블볼륨 입력" />{#if errors.tableVolume}<p class="mt-1 text-xs text-red-500">{errors.tableVolume}</p>{/if}</div>
				<div><label for="occurrenceCycle" class="mb-1 block text-sm font-medium text-gray-700">발생주기</label><input id="occurrenceCycle" type="text" bind:value={formData.occurrenceCycle} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="발생주기 입력" /></div>
				<div><label for="publicFlag" class="mb-1 block text-sm font-medium text-gray-700">공개/비공개여부</label><select id="publicFlag" bind:value={formData.publicFlag} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"><option value="">선택</option><option value="공개">공개</option><option value="비공개">비공개</option></select></div>
				<div><label for="nonPublicReason" class="mb-1 block text-sm font-medium text-gray-700">비공개사유 <span class="text-red-500">*</span></label><input id="nonPublicReason" type="text" bind:value={formData.nonPublicReason} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.nonPublicReason ? 'border-red-500' : 'border-gray-300'}" placeholder="비공개사유 입력" />{#if errors.nonPublicReason}<p class="mt-1 text-xs text-red-500">{errors.nonPublicReason}</p>{/if}</div>
				<div><label for="openDataList" class="mb-1 block text-sm font-medium text-gray-700">개방데이터목록 <span class="text-red-500">*</span></label><input id="openDataList" type="text" bind:value={formData.openDataList} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.openDataList ? 'border-red-500' : 'border-gray-300'}" placeholder="개방데이터목록 입력" />{#if errors.openDataList}<p class="mt-1 text-xs text-red-500">{errors.openDataList}</p>{/if}</div>
				<div class="md:col-span-3"><label for="tableDescription" class="mb-1 block text-sm font-medium text-gray-700">테이블설명</label><textarea id="tableDescription" bind:value={formData.tableDescription} rows="3" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="테이블설명 입력"></textarea></div>
			</div>

			<div class="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
				<div>{#if isEditMode}{#if showDeleteConfirm}<div class="flex items-center gap-2"><span class="text-sm text-red-600">정말 삭제하시겠습니까?</span><button type="button" onclick={handleDelete} class="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">확인</button><button type="button" onclick={() => (showDeleteConfirm = false)} class="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200">취소</button></div>{:else}<button type="button" onclick={() => (showDeleteConfirm = true)} class="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">삭제</button>{/if}{/if}</div>
				<div class="flex items-center gap-3"><button type="button" onclick={handleCancel} class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">취소</button><button type="submit" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{isEditMode ? '수정' : '추가'}</button></div>
			</div>
		</form>
	</div>
</div>

