<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { VocabularyEntry } from '$lib/types/vocabulary';

	// Props
	interface Props {
		entry?: Partial<VocabularyEntry>;
		isEditMode?: boolean;
		serverError?: string;
	}

	let { entry = {}, isEditMode = false, serverError = '' }: Props = $props();

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		save: VocabularyEntry;
		cancel: void;
	}>();

	// Form data
	let formData = $state({
		standardName: entry.standardName || '',
		abbreviation: entry.abbreviation || '',
		englishName: entry.englishName || '',
		description: entry.description || ''
	});

	// Validation errors
	let errors = $state({
		standardName: '',
		abbreviation: '',
		englishName: ''
	});

	// Form state
	let isSubmitting = $state(false);

	// Validation functions
	function validateStandardName(value: string): string {
		if (!value.trim()) {
			return '표준단어명은 필수 입력 항목입니다.';
		}
		return '';
	}

	function validateAbbreviation(value: string): string {
		if (!value.trim()) {
			return '영문약어는 필수 입력 항목입니다.';
		}
		if (!/^[A-Z][A-Z0-9_]*$/.test(value.trim())) {
			return '영문약어는 대문자와 숫자, 언더스코어(_)만 사용 가능하며 대문자로 시작해야 합니다.';
		}
		return '';
	}

	function validateEnglishName(value: string): string {
		if (!value.trim()) {
			return '영문명은 필수 입력 항목입니다.';
		}
		if (value.trim().length < 2) {
			return '영문명은 최소 2자 이상 입력해야 합니다.';
		}
		return '';
	}

	// Real-time validation
	$effect(() => {
		errors.standardName = validateStandardName(formData.standardName);
	});

	$effect(() => {
		errors.abbreviation = validateAbbreviation(formData.abbreviation);
	});

	$effect(() => {
		errors.englishName = validateEnglishName(formData.englishName);
	});

	// Form validation
	function isFormValid(): boolean {
		return (
			!errors.standardName &&
			!errors.abbreviation &&
			!errors.englishName &&
			!!formData.standardName.trim() &&
			!!formData.abbreviation.trim() &&
			!!formData.englishName.trim()
		);
	}

	// Handle save
	function handleSave() {
		if (!isFormValid()) {
			return;
		}

		isSubmitting = true;

		const editedEntry: VocabularyEntry = {
			id: entry.id || '',
			standardName: formData.standardName.trim(),
			abbreviation: formData.abbreviation.trim(),
			englishName: formData.englishName.trim(),
			description: formData.description.trim(),
			createdAt: entry.createdAt || '',
			updatedAt: entry.updatedAt || ''
		};

		dispatch('save', editedEntry);
		isSubmitting = false;
	}

	// Handle cancel
	function handleCancel() {
		dispatch('cancel');
	}

	// Handle background click
	function handleBackgroundClick(event: MouseEvent) {
		// 배경을 클릭했을 때만 모달 닫기 (이벤트 타켓이 배경 div인 경우)
		if (event.target === event.currentTarget) {
			handleCancel();
		}
	}

	// Handle input changes with uppercase conversion for abbreviation
	function handleAbbreviationInput(event: Event) {
		const target = event.target as HTMLInputElement;
		formData.abbreviation = target.value.toUpperCase();
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
	onclick={handleBackgroundClick}
>
	<div
		class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-bold text-gray-900">
				{isEditMode ? '단어 수정' : '새 단어 추가'}
			</h2>
			<button
				onclick={handleCancel}
				class="text-gray-400 hover:text-gray-600"
				disabled={isSubmitting}
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
			<!-- 표준단어명 -->
			<div>
				<label for="standardName" class="mb-1 block text-sm font-medium text-gray-900">
					표준단어명 <span class="text-red-700">*</span>
				</label>
				<input
					id="standardName"
					type="text"
					bind:value={formData.standardName}
					placeholder="예: 데이터베이스"
					class="input"
					class:input-error={errors.standardName}
					disabled={isSubmitting}
				/>
				{#if errors.standardName}
					<p class="text-error mt-1 text-sm">{errors.standardName}</p>
				{/if}
			</div>

			<!-- 영문약어 -->
			<div>
				<label for="abbreviation" class="mb-1 block text-sm font-medium text-gray-900">
					영문약어 <span class="text-red-700">*</span>
				</label>
				<input
					id="abbreviation"
					type="text"
					value={formData.abbreviation}
					oninput={handleAbbreviationInput}
					placeholder="예: DB"
					class="input"
					class:input-error={errors.abbreviation}
					disabled={isSubmitting}
				/>
				{#if errors.abbreviation}
					<p class="text-error mt-1 text-sm">{errors.abbreviation}</p>
				{/if}
			</div>

			<!-- 영문명 -->
			<div>
				<label for="englishName" class="mb-1 block text-sm font-medium text-gray-900">
					영문명 <span class="text-red-700">*</span>
				</label>
				<input
					id="englishName"
					type="text"
					bind:value={formData.englishName}
					placeholder="예: Database"
					class="input"
					class:input-error={errors.englishName}
					disabled={isSubmitting}
				/>
				{#if errors.englishName}
					<p class="text-error mt-1 text-sm">{errors.englishName}</p>
				{/if}
			</div>

			<!-- 설명 -->
			<div>
				<label for="description" class="mb-1 block text-sm font-medium text-gray-900"> 설명 </label>
				<textarea
					id="description"
					bind:value={formData.description}
					placeholder="단어에 대한 상세 설명을 입력하세요 (선택사항)"
					rows="3"
					class="input resize-none"
					disabled={isSubmitting}
				></textarea>
			</div>

			<!-- 버튼 그룹 -->
			<div class="flex justify-end space-x-3 pt-4">
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
		</form>
	</div>
</div>
