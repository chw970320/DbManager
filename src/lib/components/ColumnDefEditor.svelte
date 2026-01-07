<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { ColumnEntry } from '$lib/types/database-design.js';

	let props = $props<{ entry?: Partial<ColumnEntry>; isEditMode?: boolean; serverError?: string; filename?: string }>();
	const dispatch = createEventDispatcher<{ save: ColumnEntry; delete: ColumnEntry; cancel: void }>();

	let entry = $derived(props.entry ?? {});
	let isEditMode = $derived(props.isEditMode ?? false);
	let serverError = $derived(props.serverError ?? '');

	let formData = $state({
		scopeFlag: entry.scopeFlag || '', subjectArea: entry.subjectArea || '', schemaName: entry.schemaName || '',
		tableEnglishName: entry.tableEnglishName || '', columnEnglishName: entry.columnEnglishName || '', columnKoreanName: entry.columnKoreanName || '',
		columnDescription: entry.columnDescription || '', relatedEntityName: entry.relatedEntityName || '', dataType: entry.dataType || '',
		dataLength: entry.dataLength || '', dataDecimalLength: entry.dataDecimalLength || '', dataFormat: entry.dataFormat || '',
		notNullFlag: entry.notNullFlag || '', pkInfo: entry.pkInfo || '', fkInfo: entry.fkInfo || '', indexName: entry.indexName || '',
		indexOrder: entry.indexOrder || '', akInfo: entry.akInfo || '', constraint: entry.constraint || '',
		personalInfoFlag: entry.personalInfoFlag || '', encryptionFlag: entry.encryptionFlag || '', publicFlag: entry.publicFlag || ''
	});

	let errors = $state<Record<string, string>>({});
	let showDeleteConfirm = $state(false);

	$effect(() => {
		formData = { scopeFlag: entry.scopeFlag || '', subjectArea: entry.subjectArea || '', schemaName: entry.schemaName || '',
			tableEnglishName: entry.tableEnglishName || '', columnEnglishName: entry.columnEnglishName || '', columnKoreanName: entry.columnKoreanName || '',
			columnDescription: entry.columnDescription || '', relatedEntityName: entry.relatedEntityName || '', dataType: entry.dataType || '',
			dataLength: entry.dataLength || '', dataDecimalLength: entry.dataDecimalLength || '', dataFormat: entry.dataFormat || '',
			notNullFlag: entry.notNullFlag || '', pkInfo: entry.pkInfo || '', fkInfo: entry.fkInfo || '', indexName: entry.indexName || '',
			indexOrder: entry.indexOrder || '', akInfo: entry.akInfo || '', constraint: entry.constraint || '',
			personalInfoFlag: entry.personalInfoFlag || '', encryptionFlag: entry.encryptionFlag || '', publicFlag: entry.publicFlag || '' };
	});

	function validate(): boolean {
		const newErrors: Record<string, string> = {};
		if (!formData.dataLength.trim()) newErrors.dataLength = '자료길이는 필수입니다.';
		if (!formData.dataDecimalLength.trim()) newErrors.dataDecimalLength = '자료소수점길이는 필수입니다.';
		if (!formData.dataFormat.trim()) newErrors.dataFormat = '자료형식은 필수입니다.';
		if (!formData.pkInfo.trim()) newErrors.pkInfo = 'PK정보는 필수입니다.';
		if (!formData.indexName.trim()) newErrors.indexName = '인덱스명은 필수입니다.';
		if (!formData.indexOrder.trim()) newErrors.indexOrder = '인덱스순번은 필수입니다.';
		if (!formData.akInfo.trim()) newErrors.akInfo = 'AK정보는 필수입니다.';
		if (!formData.constraint.trim()) newErrors.constraint = '제약조건은 필수입니다.';
		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	function handleSave() {
		if (!validate()) return;
		const saveData: ColumnEntry = {
			id: entry.id || crypto.randomUUID(),
			dataLength: formData.dataLength.trim(), dataDecimalLength: formData.dataDecimalLength.trim(),
			dataFormat: formData.dataFormat.trim(), pkInfo: formData.pkInfo.trim(), indexName: formData.indexName.trim(),
			indexOrder: formData.indexOrder.trim(), akInfo: formData.akInfo.trim(), constraint: formData.constraint.trim(),
			scopeFlag: formData.scopeFlag.trim() || undefined, subjectArea: formData.subjectArea.trim() || undefined,
			schemaName: formData.schemaName.trim() || undefined, tableEnglishName: formData.tableEnglishName.trim() || undefined,
			columnEnglishName: formData.columnEnglishName.trim() || undefined, columnKoreanName: formData.columnKoreanName.trim() || undefined,
			columnDescription: formData.columnDescription.trim() || undefined, relatedEntityName: formData.relatedEntityName.trim() || undefined,
			dataType: formData.dataType.trim() || undefined, notNullFlag: formData.notNullFlag.trim() || undefined,
			fkInfo: formData.fkInfo.trim() || undefined, personalInfoFlag: formData.personalInfoFlag.trim() || undefined,
			encryptionFlag: formData.encryptionFlag.trim() || undefined, publicFlag: formData.publicFlag.trim() || undefined,
			createdAt: entry.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString()
		};
		dispatch('save', saveData);
	}

	function handleDelete() { if (entry.id) dispatch('delete', entry as ColumnEntry); }
	function handleCancel() { dispatch('cancel'); }
	function handleBackdropClick(event: MouseEvent) { if (event.target === event.currentTarget) handleCancel(); }
	function handleKeydown(event: KeyboardEvent) { if (event.key === 'Escape') handleCancel(); }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onclick={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="modal-title">
	<div class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onclick={(e) => e.stopPropagation()}>
		<div class="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
			<div class="flex items-center justify-between">
				<h2 id="modal-title" class="text-xl font-bold text-gray-900">{isEditMode ? '컬럼 정의서 수정' : '새 컬럼 정의서'}</h2>
				<button onclick={handleCancel} class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" aria-label="닫기"><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
			</div>
		</div>

		<form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="p-6">
			{#if serverError}<div class="mb-4 rounded-lg bg-red-50 p-4 text-red-700"><p class="text-sm">{serverError}</p></div>{/if}

			<div class="grid gap-4 md:grid-cols-4">
				<div><label for="schemaName" class="mb-1 block text-sm font-medium text-gray-700">스키마명</label><input id="schemaName" type="text" bind:value={formData.schemaName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="스키마명" /></div>
				<div><label for="tableEnglishName" class="mb-1 block text-sm font-medium text-gray-700">테이블영문명</label><input id="tableEnglishName" type="text" bind:value={formData.tableEnglishName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="테이블영문명" /></div>
				<div><label for="columnEnglishName" class="mb-1 block text-sm font-medium text-gray-700">컬럼영문명</label><input id="columnEnglishName" type="text" bind:value={formData.columnEnglishName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="컬럼영문명" /></div>
				<div><label for="columnKoreanName" class="mb-1 block text-sm font-medium text-gray-700">컬럼한글명</label><input id="columnKoreanName" type="text" bind:value={formData.columnKoreanName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="컬럼한글명" /></div>
				<div><label for="subjectArea" class="mb-1 block text-sm font-medium text-gray-700">주제영역</label><input id="subjectArea" type="text" bind:value={formData.subjectArea} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="주제영역" /></div>
				<div><label for="relatedEntityName" class="mb-1 block text-sm font-medium text-gray-700">연관엔터티명</label><input id="relatedEntityName" type="text" bind:value={formData.relatedEntityName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="연관엔터티명" /></div>
				<div><label for="dataType" class="mb-1 block text-sm font-medium text-gray-700">자료타입</label><select id="dataType" bind:value={formData.dataType} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"><option value="">선택</option><option value="VARCHAR">VARCHAR</option><option value="NUMBER">NUMBER</option><option value="DATE">DATE</option><option value="CHAR">CHAR</option><option value="CLOB">CLOB</option><option value="BLOB">BLOB</option></select></div>
				<div><label for="dataLength" class="mb-1 block text-sm font-medium text-gray-700">자료길이 <span class="text-red-500">*</span></label><input id="dataLength" type="text" bind:value={formData.dataLength} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.dataLength ? 'border-red-500' : 'border-gray-300'}" placeholder="자료길이" />{#if errors.dataLength}<p class="mt-1 text-xs text-red-500">{errors.dataLength}</p>{/if}</div>
				<div><label for="dataDecimalLength" class="mb-1 block text-sm font-medium text-gray-700">소수점길이 <span class="text-red-500">*</span></label><input id="dataDecimalLength" type="text" bind:value={formData.dataDecimalLength} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.dataDecimalLength ? 'border-red-500' : 'border-gray-300'}" placeholder="소수점길이" />{#if errors.dataDecimalLength}<p class="mt-1 text-xs text-red-500">{errors.dataDecimalLength}</p>{/if}</div>
				<div><label for="dataFormat" class="mb-1 block text-sm font-medium text-gray-700">자료형식 <span class="text-red-500">*</span></label><input id="dataFormat" type="text" bind:value={formData.dataFormat} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.dataFormat ? 'border-red-500' : 'border-gray-300'}" placeholder="자료형식" />{#if errors.dataFormat}<p class="mt-1 text-xs text-red-500">{errors.dataFormat}</p>{/if}</div>
				<div><label for="notNullFlag" class="mb-1 block text-sm font-medium text-gray-700">NOT NULL</label><select id="notNullFlag" bind:value={formData.notNullFlag} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"><option value="">선택</option><option value="Y">Y</option><option value="N">N</option></select></div>
				<div><label for="pkInfo" class="mb-1 block text-sm font-medium text-gray-700">PK정보 <span class="text-red-500">*</span></label><input id="pkInfo" type="text" bind:value={formData.pkInfo} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.pkInfo ? 'border-red-500' : 'border-gray-300'}" placeholder="PK정보" />{#if errors.pkInfo}<p class="mt-1 text-xs text-red-500">{errors.pkInfo}</p>{/if}</div>
				<div><label for="fkInfo" class="mb-1 block text-sm font-medium text-gray-700">FK정보</label><input id="fkInfo" type="text" bind:value={formData.fkInfo} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="FK정보" /></div>
				<div><label for="indexName" class="mb-1 block text-sm font-medium text-gray-700">인덱스명 <span class="text-red-500">*</span></label><input id="indexName" type="text" bind:value={formData.indexName} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.indexName ? 'border-red-500' : 'border-gray-300'}" placeholder="인덱스명" />{#if errors.indexName}<p class="mt-1 text-xs text-red-500">{errors.indexName}</p>{/if}</div>
				<div><label for="indexOrder" class="mb-1 block text-sm font-medium text-gray-700">인덱스순번 <span class="text-red-500">*</span></label><input id="indexOrder" type="text" bind:value={formData.indexOrder} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.indexOrder ? 'border-red-500' : 'border-gray-300'}" placeholder="인덱스순번" />{#if errors.indexOrder}<p class="mt-1 text-xs text-red-500">{errors.indexOrder}</p>{/if}</div>
				<div><label for="akInfo" class="mb-1 block text-sm font-medium text-gray-700">AK정보 <span class="text-red-500">*</span></label><input id="akInfo" type="text" bind:value={formData.akInfo} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.akInfo ? 'border-red-500' : 'border-gray-300'}" placeholder="AK정보" />{#if errors.akInfo}<p class="mt-1 text-xs text-red-500">{errors.akInfo}</p>{/if}</div>
				<div><label for="constraint" class="mb-1 block text-sm font-medium text-gray-700">제약조건 <span class="text-red-500">*</span></label><input id="constraint" type="text" bind:value={formData.constraint} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.constraint ? 'border-red-500' : 'border-gray-300'}" placeholder="제약조건" />{#if errors.constraint}<p class="mt-1 text-xs text-red-500">{errors.constraint}</p>{/if}</div>
				<div><label for="scopeFlag" class="mb-1 block text-sm font-medium text-gray-700">사업범위여부</label><select id="scopeFlag" bind:value={formData.scopeFlag} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"><option value="">선택</option><option value="Y">Y</option><option value="N">N</option></select></div>
				<div><label for="personalInfoFlag" class="mb-1 block text-sm font-medium text-gray-700">개인정보여부</label><select id="personalInfoFlag" bind:value={formData.personalInfoFlag} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"><option value="">선택</option><option value="Y">Y</option><option value="N">N</option></select></div>
				<div><label for="encryptionFlag" class="mb-1 block text-sm font-medium text-gray-700">암호화여부</label><select id="encryptionFlag" bind:value={formData.encryptionFlag} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"><option value="">선택</option><option value="Y">Y</option><option value="N">N</option></select></div>
				<div><label for="publicFlag" class="mb-1 block text-sm font-medium text-gray-700">공개여부</label><select id="publicFlag" bind:value={formData.publicFlag} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"><option value="">선택</option><option value="공개">공개</option><option value="비공개">비공개</option></select></div>
				<div class="md:col-span-4"><label for="columnDescription" class="mb-1 block text-sm font-medium text-gray-700">컬럼설명</label><textarea id="columnDescription" bind:value={formData.columnDescription} rows="2" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="컬럼설명 입력"></textarea></div>
			</div>

			<div class="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
				<div>{#if isEditMode}{#if showDeleteConfirm}<div class="flex items-center gap-2"><span class="text-sm text-red-600">정말 삭제하시겠습니까?</span><button type="button" onclick={handleDelete} class="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">확인</button><button type="button" onclick={() => (showDeleteConfirm = false)} class="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200">취소</button></div>{:else}<button type="button" onclick={() => (showDeleteConfirm = true)} class="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">삭제</button>{/if}{/if}</div>
				<div class="flex items-center gap-3"><button type="button" onclick={handleCancel} class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">취소</button><button type="submit" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{isEditMode ? '수정' : '추가'}</button></div>
			</div>
		</form>
	</div>
</div>

