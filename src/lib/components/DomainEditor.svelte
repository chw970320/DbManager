<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { tick } from 'svelte';
	import type { DomainEntry } from '$lib/types/domain';
	import { generateStandardDomainName } from '$lib/utils/validation';
	import { v4 as uuidv4 } from 'uuid';

	// Props
	interface Props {
		entry?: Partial<DomainEntry>;
		isEditMode?: boolean;
		serverError?: string;
		filename?: string; // 현재 선택된 도메인 파일명
	}

	let {
		entry = {},
		isEditMode = false,
		serverError = '',
		filename = 'domain.json'
	}: Props = $props();

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		save: DomainEntry;
		cancel: void;
		delete: DomainEntry;
	}>();

	// Form data
	let formData = $state({
		domainGroup: entry.domainGroup || '',
		domainCategory: entry.domainCategory || '',
		physicalDataType: entry.physicalDataType || '',
		dataLength: entry.dataLength || '',
		decimalPlaces: entry.decimalPlaces || '',
		measurementUnit: entry.measurementUnit || '',
		revision: entry.revision || '',
		description: entry.description || '',
		storageFormat: entry.storageFormat || '',
		displayFormat: entry.displayFormat || '',
		allowedValues: entry.allowedValues || ''
	});

	// 생성된 도메인명 (파생 상태)
	let generatedDomainName = $derived(
		generateStandardDomainName(
			formData.domainCategory,
			formData.physicalDataType,
			formData.dataLength,
			formData.decimalPlaces
		)
	);

	// Validation errors
	let errors = $state({
		domainGroup: '',
		domainCategory: '',
		physicalDataType: ''
	});

	// Form state
	let isSubmitting = $state(false);

	// Update formData when entry prop changes
	$effect(() => {
		if (entry) {
			formData.domainGroup = entry.domainGroup || '';
			formData.domainCategory = entry.domainCategory || '';
			formData.physicalDataType = entry.physicalDataType || '';
			formData.dataLength = entry.dataLength || '';
			formData.decimalPlaces = entry.decimalPlaces || '';
			formData.measurementUnit = entry.measurementUnit || '';
			formData.revision = entry.revision || '';
			formData.description = entry.description || '';
			formData.storageFormat = entry.storageFormat || '';
			formData.displayFormat = entry.displayFormat || '';
			formData.allowedValues = entry.allowedValues || '';
		}
	});

	// Validation functions
	function validateDomainGroup(value: string): string {
		if (!value.trim()) {
			return '도메인그룹은 필수 입력 항목입니다.';
		}
		return '';
	}

	function validateDomainCategory(value: string): string {
		if (!value.trim()) {
			return '도메인 분류명은 필수 입력 항목입니다.';
		}
		return '';
	}

	function validatePhysicalDataType(value: string): string {
		if (!value.trim()) {
			return '물리 데이터타입은 필수 입력 항목입니다.';
		}
		return '';
	}

	// Real-time validation
	$effect(() => {
		errors.domainGroup = validateDomainGroup(formData.domainGroup);
	});

	$effect(() => {
		errors.domainCategory = validateDomainCategory(formData.domainCategory);
	});

	$effect(() => {
		errors.physicalDataType = validatePhysicalDataType(formData.physicalDataType);
	});

	// Form validation
	function isFormValid(): boolean {
		return (
			!errors.domainGroup &&
			!errors.domainCategory &&
			!errors.physicalDataType &&
			!!formData.domainGroup.trim() &&
			!!formData.domainCategory.trim() &&
			!!formData.physicalDataType.trim()
		);
	}

	// Handle save
	async function handleSave() {
		if (!isFormValid()) {
			// 모든 에러 메시지 수집
			const errorMessages: string[] = [];
			if (errors.domainGroup) {
				errorMessages.push(errors.domainGroup);
			}
			if (errors.domainCategory) {
				errorMessages.push(errors.domainCategory);
			}
			if (errors.physicalDataType) {
				errorMessages.push(errors.physicalDataType);
			}

			// 에러 팝업 표시
			if (errorMessages.length > 0) {
				await tick();
				alert('입력 오류\n\n' + errorMessages.join('\n'));
			}
			return;
		}

		// 전송 전 서버 validation 수행 (도메인명 중복 검사)
		isSubmitting = true;
		try {
			const validationErrors: string[] = [];

			// 도메인명 중복 검사
			try {
				const validationResponse = await fetch(
					`/api/domain/validate?filename=${encodeURIComponent(filename)}`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							domainCategory: formData.domainCategory.trim(),
							physicalDataType: formData.physicalDataType.trim(),
							dataLength: formData.dataLength.trim() || undefined,
							decimalPlaces: formData.decimalPlaces.trim() || undefined,
							entryId: entry.id && entry.id.trim() ? entry.id : undefined // 수정 모드인 경우에만 ID 전달
						})
					}
				);

				if (validationResponse.ok) {
					const validationResult = await validationResponse.json();
					if (!validationResult.success) {
						if (validationResult.error) {
							validationErrors.push(validationResult.error);
						}
					}
				}
			} catch (validationErr) {
				console.warn('Validation API 호출 실패:', validationErr);
				// validation API 실패 시에도 계속 진행 (서버에서 다시 검증)
			}

			// validation 에러가 있으면 팝업 표시하고 전송 중단
			if (validationErrors.length > 0) {
				await tick();
				alert('입력 오류\n\n' + validationErrors.join('\n'));
				isSubmitting = false;
				return;
			}
		} catch (err) {
			console.warn('전송 전 validation 중 오류:', err);
			// validation 실패 시에도 계속 진행 (서버에서 다시 검증)
		}

		const editedEntry: DomainEntry = {
			id: entry.id || uuidv4(),
			domainGroup: formData.domainGroup.trim(),
			domainCategory: formData.domainCategory.trim(),
			standardDomainName: generatedDomainName, // 자동 생성된 도메인명 사용
			physicalDataType: formData.physicalDataType.trim(),
			dataLength: formData.dataLength.trim() || undefined,
			decimalPlaces: formData.decimalPlaces.trim() || undefined,
			measurementUnit: formData.measurementUnit.trim() || undefined,
			revision: formData.revision.trim() || undefined,
			description: formData.description.trim() || undefined,
			storageFormat: formData.storageFormat.trim() || undefined,
			displayFormat: formData.displayFormat.trim() || undefined,
			allowedValues: formData.allowedValues.trim() || undefined,
			createdAt: entry.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		dispatch('save', editedEntry);
		isSubmitting = false;
	}

	// Handle cancel
	function handleCancel() {
		dispatch('cancel');
	}

	// Handle delete
	function handleDelete() {
		if (!entry.id) {
			return;
		}

		if (confirm('정말로 이 항목을 삭제하시겠습니까?')) {
			const entryToDelete: DomainEntry = {
				id: entry.id,
				domainGroup: formData.domainGroup.trim() || entry.domainGroup || '',
				domainCategory: formData.domainCategory.trim() || entry.domainCategory || '',
				standardDomainName: generatedDomainName || entry.standardDomainName || '',
				physicalDataType: formData.physicalDataType.trim() || entry.physicalDataType || '',
				dataLength: formData.dataLength.trim() || entry.dataLength || undefined,
				decimalPlaces: formData.decimalPlaces.trim() || entry.decimalPlaces || undefined,
				measurementUnit: formData.measurementUnit.trim() || entry.measurementUnit || undefined,
				revision: formData.revision.trim() || entry.revision || undefined,
				description: formData.description.trim() || entry.description || undefined,
				storageFormat: formData.storageFormat.trim() || entry.storageFormat || undefined,
				displayFormat: formData.displayFormat.trim() || entry.displayFormat || undefined,
				allowedValues: formData.allowedValues.trim() || entry.allowedValues || undefined,
				createdAt: entry.createdAt || '',
				updatedAt: entry.updatedAt || ''
			};
			dispatch('delete', entryToDelete);
		}
	}

	// Handle background click
	function handleBackgroundClick(event: MouseEvent) {
		// 배경을 클릭했을 때만 모달 닫기 (이벤트 타켓이 배경 div인 경우)
		if (event.target === event.currentTarget) {
			handleCancel();
		}
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
	onclick={handleBackgroundClick}
	role="dialog"
	aria-modal="true"
	aria-label={isEditMode ? '도메인 수정' : '새 도메인 추가'}
>
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div
		class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="flex flex-shrink-0 items-center justify-between border-b p-6">
			<h2 class="text-xl font-bold text-gray-900">
				{isEditMode ? '도메인 수정' : '새 도메인 추가'}
			</h2>
			<button
				onclick={handleCancel}
				class="text-gray-400 hover:text-gray-600"
				disabled={isSubmitting}
				aria-label={isEditMode ? '도메인 수정 닫기' : '새 도메인 추가 닫기'}
			>
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					></path>
				</svg>
			</button>
		</div>

		<!-- 스크롤 가능한 내부 컨텐츠 -->
		<div class="flex-1 overflow-y-auto p-6">
			<!-- 서버 에러 메시지 -->
			{#if serverError}
				<div class="bg-error mb-4 rounded-md p-3">
					<div class="flex items-center">
						<svg
							class="mr-2 h-5 w-5 text-red-700"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<p class="text-error text-sm font-medium">{serverError}</p>
					</div>
				</div>
			{/if}

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSave();
				}}
				class="space-y-4"
			>
				<!-- 필수 필드 섹션 -->
				<div class="space-y-4 border-b border-gray-200 pb-4">
					<h3 class="text-sm font-semibold text-gray-700">필수 정보</h3>

					<!-- 도메인그룹 -->
					<div>
						<label for="domainGroup" class="mb-1 block text-sm font-medium text-gray-900">
							도메인그룹 <span class="text-red-700">*</span>
							{#if isEditMode}
								<span class="ml-2 text-xs font-normal text-gray-500">(수정 불가)</span>
							{/if}
						</label>
						<input
							id="domainGroup"
							type="text"
							bind:value={formData.domainGroup}
							placeholder="예: 공통표준도메인그룹명"
							class="input"
							class:input-error={errors.domainGroup}
							class:bg-gray-50={isEditMode}
							disabled={isSubmitting || isEditMode}
							readonly={isEditMode}
						/>
						{#if errors.domainGroup}
							<p class="text-error mt-1 text-sm">{errors.domainGroup}</p>
						{/if}
						{#if isEditMode}
							<p class="mt-1 text-xs text-gray-500">
								도메인그룹은 validation 처리되는 값으로 수정할 수 없습니다.
							</p>
						{/if}
					</div>

					<!-- 도메인 분류명 -->
					<div>
						<label for="domainCategory" class="mb-1 block text-sm font-medium text-gray-900">
							도메인 분류명 <span class="text-red-700">*</span>
							{#if isEditMode}
								<span class="ml-2 text-xs font-normal text-gray-500">(수정 불가)</span>
							{/if}
						</label>
						<input
							id="domainCategory"
							type="text"
							bind:value={formData.domainCategory}
							placeholder="예: 공통표준도메인분류명"
							class="input"
							class:input-error={errors.domainCategory}
							class:bg-gray-50={isEditMode}
							disabled={isSubmitting || isEditMode}
							readonly={isEditMode}
						/>
						{#if errors.domainCategory}
							<p class="text-error mt-1 text-sm">{errors.domainCategory}</p>
						{/if}
						{#if isEditMode}
							<p class="mt-1 text-xs text-gray-500">
								도메인 분류명은 validation 처리되는 값으로 수정할 수 없습니다.
							</p>
						{/if}
					</div>

					<!-- 표준 도메인명 (자동 생성, 읽기 전용) -->
					<div>
						<label for="standardDomainName" class="mb-1 block text-sm font-medium text-gray-900">
							표준 도메인명 <span class="text-red-700">*</span>
							<span class="ml-2 text-xs font-normal text-gray-500"
								>(자동 생성{#if isEditMode}, 수정 불가{/if})</span
							>
						</label>
						<div
							class="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700"
						>
							{generatedDomainName || '(입력 필요)'}
						</div>
						<p class="mt-1 text-xs text-gray-500">
							{#if isEditMode}
								표준 도메인명은 validation 처리되는 값으로 수정할 수 없습니다.
							{:else}
								도메인분류명, 물리데이터타입, 데이터길이, 소수점자리수로 자동 생성됩니다.
							{/if}
						</p>
					</div>

					<!-- 물리 데이터타입 -->
					<div>
						<label for="physicalDataType" class="mb-1 block text-sm font-medium text-gray-900">
							물리 데이터타입 <span class="text-red-700">*</span>
							{#if isEditMode}
								<span class="ml-2 text-xs font-normal text-gray-500">(수정 불가)</span>
							{/if}
						</label>
						<input
							id="physicalDataType"
							type="text"
							bind:value={formData.physicalDataType}
							placeholder="예: VARCHAR, NUMBER 등"
							class="input"
							class:input-error={errors.physicalDataType}
							class:bg-gray-50={isEditMode}
							disabled={isSubmitting || isEditMode}
							readonly={isEditMode}
						/>
						{#if errors.physicalDataType}
							<p class="text-error mt-1 text-sm">{errors.physicalDataType}</p>
						{/if}
						{#if isEditMode}
							<p class="mt-1 text-xs text-gray-500">
								물리 데이터타입은 validation 처리되는 값으로 수정할 수 없습니다.
							</p>
						{/if}
					</div>
				</div>

				<!-- 선택 필드 섹션 -->
				<div class="space-y-4 border-b border-gray-200 pb-4 pt-4">
					<h3 class="text-sm font-semibold text-gray-700">데이터 타입 정보</h3>

					<!-- 데이터 길이 -->
					<div>
						<label for="dataLength" class="mb-1 block text-sm font-medium text-gray-900">
							데이터 길이
							{#if isEditMode}
								<span class="ml-2 text-xs font-normal text-gray-500">(수정 불가)</span>
							{/if}
						</label>
						<input
							id="dataLength"
							type="text"
							bind:value={formData.dataLength}
							placeholder="예: 255"
							class="input"
							class:bg-gray-50={isEditMode}
							disabled={isSubmitting || isEditMode}
							readonly={isEditMode}
						/>
						{#if isEditMode}
							<p class="mt-1 text-xs text-gray-500">
								데이터 길이는 validation 처리되는 값으로 수정할 수 없습니다.
							</p>
						{/if}
					</div>

					<!-- 소수점자리수 -->
					<div>
						<label for="decimalPlaces" class="mb-1 block text-sm font-medium text-gray-900">
							소수점자리수
							{#if isEditMode}
								<span class="ml-2 text-xs font-normal text-gray-500">(수정 불가)</span>
							{/if}
						</label>
						<input
							id="decimalPlaces"
							type="text"
							bind:value={formData.decimalPlaces}
							placeholder="예: 2"
							class="input"
							class:bg-gray-50={isEditMode}
							disabled={isSubmitting || isEditMode}
							readonly={isEditMode}
						/>
						{#if isEditMode}
							<p class="mt-1 text-xs text-gray-500">
								소수점자리수는 validation 처리되는 값으로 수정할 수 없습니다.
							</p>
						{/if}
					</div>

					<!-- 측정단위 -->
					<div>
						<label for="measurementUnit" class="mb-1 block text-sm font-medium text-gray-900">
							측정단위
						</label>
						<input
							id="measurementUnit"
							type="text"
							bind:value={formData.measurementUnit}
							placeholder="예: kg, m 등"
							class="input"
							disabled={isSubmitting}
						/>
					</div>
				</div>

				<!-- 추가 정보 섹션 -->
				<div class="space-y-4 pt-4">
					<h3 class="text-sm font-semibold text-gray-700">추가 정보</h3>

					<!-- 재정차수 -->
					<div>
						<label for="revision" class="mb-1 block text-sm font-medium text-gray-900">
							재정차수
						</label>
						<input
							id="revision"
							type="text"
							bind:value={formData.revision}
							placeholder="예: 1"
							class="input"
							disabled={isSubmitting}
						/>
					</div>

					<!-- 설명 -->
					<div>
						<label for="description" class="mb-1 block text-sm font-medium text-gray-900">
							설명
						</label>
						<textarea
							id="description"
							bind:value={formData.description}
							placeholder="도메인에 대한 상세 설명을 입력하세요"
							rows="3"
							class="input resize-none"
							disabled={isSubmitting}
						></textarea>
					</div>

					<!-- 저장 형식 -->
					<div>
						<label for="storageFormat" class="mb-1 block text-sm font-medium text-gray-900">
							저장 형식
						</label>
						<input
							id="storageFormat"
							type="text"
							bind:value={formData.storageFormat}
							placeholder="예: YYYY-MM-DD"
							class="input"
							disabled={isSubmitting}
						/>
					</div>

					<!-- 표현 형식 -->
					<div>
						<label for="displayFormat" class="mb-1 block text-sm font-medium text-gray-900">
							표현 형식
						</label>
						<input
							id="displayFormat"
							type="text"
							bind:value={formData.displayFormat}
							placeholder="예: YYYY년 MM월 DD일"
							class="input"
							disabled={isSubmitting}
						/>
					</div>

					<!-- 허용값 -->
					<div>
						<label for="allowedValues" class="mb-1 block text-sm font-medium text-gray-900">
							허용값
						</label>
						<textarea
							id="allowedValues"
							bind:value={formData.allowedValues}
							placeholder="예: Y, N 또는 값1, 값2, 값3"
							rows="2"
							class="input resize-none"
							disabled={isSubmitting}
						></textarea>
					</div>
				</div>

				<!-- 버튼 그룹 -->
				<div class="flex justify-between border-t border-gray-200 pt-4">
					{#if isEditMode && entry.id}
						<button
							type="button"
							onclick={handleDelete}
							class="group inline-flex items-center space-x-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 shadow-sm transition-all duration-200 hover:border-red-400 hover:bg-red-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-red-300 disabled:hover:bg-red-50 disabled:hover:shadow-sm"
							disabled={isSubmitting}
						>
							<svg
								class="h-4 w-4 transition-transform duration-200 group-hover:scale-110"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
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
							disabled={isSubmitting}
						>
							취소
						</button>
						<button
							type="submit"
							class="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
							disabled={!isFormValid() || isSubmitting}
						>
							{#if isSubmitting}
								저장 중...
							{:else}
								{isEditMode ? '수정' : '저장'}
							{/if}
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
</div>
