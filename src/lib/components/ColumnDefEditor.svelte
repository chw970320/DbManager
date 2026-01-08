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
	let isSubmitting = $state(false);

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
		if (!formData.scopeFlag?.trim()) newErrors.scopeFlag = '사업범위여부는 필수입니다.';
		if (!formData.subjectArea?.trim()) newErrors.subjectArea = '주제영역은 필수입니다.';
		if (!formData.schemaName?.trim()) newErrors.schemaName = '스키마명은 필수입니다.';
		if (!formData.tableEnglishName?.trim()) newErrors.tableEnglishName = '테이블영문명은 필수입니다.';
		if (!formData.columnEnglishName?.trim()) newErrors.columnEnglishName = '컬럼영문명은 필수입니다.';
		if (!formData.columnKoreanName?.trim()) newErrors.columnKoreanName = '컬럼한글명은 필수입니다.';
		if (!formData.relatedEntityName?.trim()) newErrors.relatedEntityName = '연관엔터티명은 필수입니다.';
		if (!formData.dataType?.trim()) newErrors.dataType = '자료타입은 필수입니다.';
		if (!formData.notNullFlag?.trim()) newErrors.notNullFlag = 'NOTNULL여부는 필수입니다.';
		if (!formData.personalInfoFlag?.trim()) newErrors.personalInfoFlag = '개인정보여부는 필수입니다.';
		if (!formData.encryptionFlag?.trim()) newErrors.encryptionFlag = '암호화여부는 필수입니다.';
		if (!formData.publicFlag?.trim()) newErrors.publicFlag = '공개/비공개여부는 필수입니다.';
		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	function handleSave() {
		if (!validate()) return;
		const saveData: ColumnEntry = {
			id: entry.id || crypto.randomUUID(),
			scopeFlag: formData.scopeFlag.trim(),
			subjectArea: formData.subjectArea.trim(),
			schemaName: formData.schemaName.trim(),
			tableEnglishName: formData.tableEnglishName.trim(),
			columnEnglishName: formData.columnEnglishName.trim(),
			columnKoreanName: formData.columnKoreanName.trim(),
			relatedEntityName: formData.relatedEntityName.trim(),
			dataType: formData.dataType.trim(),
			notNullFlag: formData.notNullFlag.trim(),
			personalInfoFlag: formData.personalInfoFlag.trim(),
			encryptionFlag: formData.encryptionFlag.trim(),
			publicFlag: formData.publicFlag.trim(),
			columnDescription: formData.columnDescription.trim() || undefined,
			dataLength: formData.dataLength.trim() || undefined,
			dataDecimalLength: formData.dataDecimalLength.trim() || undefined,
			dataFormat: formData.dataFormat.trim() || undefined,
			pkInfo: formData.pkInfo.trim() || undefined,
			fkInfo: formData.fkInfo.trim() || undefined,
			indexName: formData.indexName.trim() || undefined,
			indexOrder: formData.indexOrder.trim() || undefined,
			akInfo: formData.akInfo.trim() || undefined,
			constraint: formData.constraint.trim() || undefined,
			createdAt: entry.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
		dispatch('save', saveData);
	}

	function handleDelete() {
		if (!entry.id) return;
		if (confirm('정말로 이 항목을 삭제하시겠습니까?')) {
			const entryToDelete: ColumnEntry = {
				id: entry.id,
				dataLength: formData.dataLength.trim() || entry.dataLength || '',
				dataDecimalLength: formData.dataDecimalLength.trim() || entry.dataDecimalLength || '',
				dataFormat: formData.dataFormat.trim() || entry.dataFormat || '',
				pkInfo: formData.pkInfo.trim() || entry.pkInfo || '',
				indexName: formData.indexName.trim() || entry.indexName || '',
				indexOrder: formData.indexOrder.trim() || entry.indexOrder || '',
				akInfo: formData.akInfo.trim() || entry.akInfo || '',
				constraint: formData.constraint.trim() || entry.constraint || '',
				scopeFlag: formData.scopeFlag.trim() || entry.scopeFlag || undefined,
				subjectArea: formData.subjectArea.trim() || entry.subjectArea || undefined,
				schemaName: formData.schemaName.trim() || entry.schemaName || undefined,
				tableEnglishName: formData.tableEnglishName.trim() || entry.tableEnglishName || undefined,
				columnEnglishName: formData.columnEnglishName.trim() || entry.columnEnglishName || undefined,
				columnKoreanName: formData.columnKoreanName.trim() || entry.columnKoreanName || undefined,
				columnDescription: formData.columnDescription.trim() || entry.columnDescription || undefined,
				relatedEntityName: formData.relatedEntityName.trim() || entry.relatedEntityName || undefined,
				dataType: formData.dataType.trim() || entry.dataType || undefined,
				notNullFlag: formData.notNullFlag.trim() || entry.notNullFlag || undefined,
				fkInfo: formData.fkInfo.trim() || entry.fkInfo || undefined,
				personalInfoFlag: formData.personalInfoFlag.trim() || entry.personalInfoFlag || undefined,
				encryptionFlag: formData.encryptionFlag.trim() || entry.encryptionFlag || undefined,
				publicFlag: formData.publicFlag.trim() || entry.publicFlag || undefined,
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
	<div class="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl" onclick={(e) => e.stopPropagation()}>
		<div class="flex flex-shrink-0 items-center justify-between border-b p-6">
			<h2 id="modal-title" class="text-xl font-bold text-gray-900">{isEditMode ? '컬럼 정의서 수정' : '새 컬럼 정의서'}</h2>
			<button onclick={handleCancel} class="text-gray-400 hover:text-gray-600" aria-label="닫기"><svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
		</div>

		<div class="flex-1 overflow-y-auto p-6">
			<form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
			{#if serverError}<div class="mb-4 rounded-lg bg-red-50 p-4 text-red-700"><p class="text-sm">{serverError}</p></div>{/if}

			<div class="space-y-4">
				<div><label for="scopeFlag" class="mb-1 block text-sm font-medium text-gray-700">사업범위여부 <span class="text-red-500">*</span></label><select id="scopeFlag" bind:value={formData.scopeFlag} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.scopeFlag ? 'border-red-500' : 'border-gray-300'}"><option value="">선택</option><option value="Y">Y</option><option value="N">N</option></select>{#if errors.scopeFlag}<p class="mt-1 text-xs text-red-500">{errors.scopeFlag}</p>{/if}</div>
				<div><label for="subjectArea" class="mb-1 block text-sm font-medium text-gray-700">주제영역 <span class="text-red-500">*</span></label><input id="subjectArea" type="text" bind:value={formData.subjectArea} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.subjectArea ? 'border-red-500' : 'border-gray-300'}" placeholder="주제영역" />{#if errors.subjectArea}<p class="mt-1 text-xs text-red-500">{errors.subjectArea}</p>{/if}</div>
				<div><label for="schemaName" class="mb-1 block text-sm font-medium text-gray-700">스키마명 <span class="text-red-500">*</span></label><input id="schemaName" type="text" bind:value={formData.schemaName} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.schemaName ? 'border-red-500' : 'border-gray-300'}" placeholder="스키마명" />{#if errors.schemaName}<p class="mt-1 text-xs text-red-500">{errors.schemaName}</p>{/if}</div>
				<div><label for="tableEnglishName" class="mb-1 block text-sm font-medium text-gray-700">테이블영문명 <span class="text-red-500">*</span></label><input id="tableEnglishName" type="text" bind:value={formData.tableEnglishName} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.tableEnglishName ? 'border-red-500' : 'border-gray-300'}" placeholder="테이블영문명" />{#if errors.tableEnglishName}<p class="mt-1 text-xs text-red-500">{errors.tableEnglishName}</p>{/if}</div>
				<div><label for="columnEnglishName" class="mb-1 block text-sm font-medium text-gray-700">컬럼영문명 <span class="text-red-500">*</span></label><input id="columnEnglishName" type="text" bind:value={formData.columnEnglishName} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.columnEnglishName ? 'border-red-500' : 'border-gray-300'}" placeholder="컬럼영문명" />{#if errors.columnEnglishName}<p class="mt-1 text-xs text-red-500">{errors.columnEnglishName}</p>{/if}</div>
				<div><label for="columnKoreanName" class="mb-1 block text-sm font-medium text-gray-700">컬럼한글명 <span class="text-red-500">*</span></label><input id="columnKoreanName" type="text" bind:value={formData.columnKoreanName} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.columnKoreanName ? 'border-red-500' : 'border-gray-300'}" placeholder="컬럼한글명" />{#if errors.columnKoreanName}<p class="mt-1 text-xs text-red-500">{errors.columnKoreanName}</p>{/if}</div>
				<div><label for="relatedEntityName" class="mb-1 block text-sm font-medium text-gray-700">연관엔터티명 <span class="text-red-500">*</span></label><input id="relatedEntityName" type="text" bind:value={formData.relatedEntityName} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.relatedEntityName ? 'border-red-500' : 'border-gray-300'}" placeholder="연관엔터티명" />{#if errors.relatedEntityName}<p class="mt-1 text-xs text-red-500">{errors.relatedEntityName}</p>{/if}</div>
				<div><label for="dataType" class="mb-1 block text-sm font-medium text-gray-700">자료타입 <span class="text-red-500">*</span></label><select id="dataType" bind:value={formData.dataType} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.dataType ? 'border-red-500' : 'border-gray-300'}"><option value="">선택</option><option value="VARCHAR">VARCHAR</option><option value="NUMBER">NUMBER</option><option value="DATE">DATE</option><option value="CHAR">CHAR</option><option value="CLOB">CLOB</option><option value="BLOB">BLOB</option></select>{#if errors.dataType}<p class="mt-1 text-xs text-red-500">{errors.dataType}</p>{/if}</div>
				<div><label for="dataLength" class="mb-1 block text-sm font-medium text-gray-700">자료길이</label><input id="dataLength" type="text" bind:value={formData.dataLength} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="자료길이" /></div>
				<div><label for="dataDecimalLength" class="mb-1 block text-sm font-medium text-gray-700">소수점길이</label><input id="dataDecimalLength" type="text" bind:value={formData.dataDecimalLength} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="소수점길이" /></div>
				<div><label for="dataFormat" class="mb-1 block text-sm font-medium text-gray-700">자료형식</label><input id="dataFormat" type="text" bind:value={formData.dataFormat} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="자료형식" /></div>
				<div><label for="notNullFlag" class="mb-1 block text-sm font-medium text-gray-700">NOT NULL <span class="text-red-500">*</span></label><select id="notNullFlag" bind:value={formData.notNullFlag} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.notNullFlag ? 'border-red-500' : 'border-gray-300'}"><option value="">선택</option><option value="Y">Y</option><option value="N">N</option></select>{#if errors.notNullFlag}<p class="mt-1 text-xs text-red-500">{errors.notNullFlag}</p>{/if}</div>
				<div><label for="pkInfo" class="mb-1 block text-sm font-medium text-gray-700">PK정보</label><input id="pkInfo" type="text" bind:value={formData.pkInfo} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="PK정보" /></div>
				<div><label for="fkInfo" class="mb-1 block text-sm font-medium text-gray-700">FK정보</label><input id="fkInfo" type="text" bind:value={formData.fkInfo} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="FK정보" /></div>
				<div><label for="indexName" class="mb-1 block text-sm font-medium text-gray-700">인덱스명</label><input id="indexName" type="text" bind:value={formData.indexName} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="인덱스명" /></div>
				<div><label for="indexOrder" class="mb-1 block text-sm font-medium text-gray-700">인덱스순번</label><input id="indexOrder" type="text" bind:value={formData.indexOrder} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="인덱스순번" /></div>
				<div><label for="akInfo" class="mb-1 block text-sm font-medium text-gray-700">AK정보</label><input id="akInfo" type="text" bind:value={formData.akInfo} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="AK정보" /></div>
				<div><label for="constraint" class="mb-1 block text-sm font-medium text-gray-700">제약조건</label><input id="constraint" type="text" bind:value={formData.constraint} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="제약조건" /></div>
				<div><label for="personalInfoFlag" class="mb-1 block text-sm font-medium text-gray-700">개인정보여부 <span class="text-red-500">*</span></label><select id="personalInfoFlag" bind:value={formData.personalInfoFlag} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.personalInfoFlag ? 'border-red-500' : 'border-gray-300'}"><option value="">선택</option><option value="Y">Y</option><option value="N">N</option></select>{#if errors.personalInfoFlag}<p class="mt-1 text-xs text-red-500">{errors.personalInfoFlag}</p>{/if}</div>
				<div><label for="encryptionFlag" class="mb-1 block text-sm font-medium text-gray-700">암호화여부 <span class="text-red-500">*</span></label><select id="encryptionFlag" bind:value={formData.encryptionFlag} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.encryptionFlag ? 'border-red-500' : 'border-gray-300'}"><option value="">선택</option><option value="Y">Y</option><option value="N">N</option></select>{#if errors.encryptionFlag}<p class="mt-1 text-xs text-red-500">{errors.encryptionFlag}</p>{/if}</div>
				<div><label for="publicFlag" class="mb-1 block text-sm font-medium text-gray-700">공개/비공개여부 <span class="text-red-500">*</span></label><select id="publicFlag" bind:value={formData.publicFlag} class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.publicFlag ? 'border-red-500' : 'border-gray-300'}"><option value="">선택</option><option value="Y">공개</option><option value="N">비공개</option></select>{#if errors.publicFlag}<p class="mt-1 text-xs text-red-500">{errors.publicFlag}</p>{/if}</div>
				<div><label for="columnDescription" class="mb-1 block text-sm font-medium text-gray-700">컬럼설명</label><textarea id="columnDescription" bind:value={formData.columnDescription} rows="2" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="컬럼설명 입력"></textarea></div>
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

