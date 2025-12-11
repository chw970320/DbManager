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
		delete: VocabularyEntry;
	}>();

	// Form data
	let formData = $state({
		standardName: entry.standardName || '',
		abbreviation: entry.abbreviation || '',
		englishName: entry.englishName || '',
		description: entry.description || '',
		isFormalWord: entry.isFormalWord ? 'Y' : 'N',
		domainCategory: entry.domainCategory || '',
		synonyms: entry.synonyms?.join(', ') || '',
		forbiddenWords: entry.forbiddenWords?.join(', ') || '',
		source: entry.source || ''
	});

	// Validation errors
	let errors = $state({
		standardName: '',
		abbreviation: '',
		englishName: ''
	});

	// Form state
	let isSubmitting = $state(false);

	// Update formData when entry prop changes
	$effect(() => {
		if (entry) {
			formData.standardName = entry.standardName || '';
			formData.abbreviation = entry.abbreviation || '';
			formData.englishName = entry.englishName || '';
			formData.description = entry.description || '';
			formData.isFormalWord = entry.isFormalWord ? 'Y' : 'N';
			formData.domainCategory = entry.domainCategory || '';
			formData.synonyms = entry.synonyms?.join(', ') || '';
			formData.forbiddenWords = entry.forbiddenWords?.join(', ') || '';
			formData.source = entry.source || '';
		}
	});

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

	// Helper function to parse comma-separated string to array
	function parseArrayField(value: string): string[] | undefined {
		if (!value || !value.trim()) return undefined;
		const items = value
			.split(',')
			.map((item) => item.trim())
			.filter((item) => item.length > 0);
		return items.length > 0 ? items : undefined;
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
			isFormalWord: formData.isFormalWord === 'Y',
			domainCategory: formData.domainCategory.trim() || undefined,
			synonyms: parseArrayField(formData.synonyms),
			forbiddenWords: parseArrayField(formData.forbiddenWords),
			source: formData.source.trim() || undefined,
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

	// Handle delete
	function handleDelete() {
		if (!entry.id) {
			return;
		}

		if (confirm('정말로 이 항목을 삭제하시겠습니까?')) {
			const entryToDelete: VocabularyEntry = {
				id: entry.id,
				standardName: formData.standardName.trim() || entry.standardName || '',
				abbreviation: formData.abbreviation.trim() || entry.abbreviation || '',
				englishName: formData.englishName.trim() || entry.englishName || '',
				description: formData.description.trim() || entry.description || '',
				isFormalWord: formData.isFormalWord === 'Y' || entry.isFormalWord || false,
				domainCategory: formData.domainCategory.trim() || entry.domainCategory || undefined,
				synonyms: parseArrayField(formData.synonyms) || entry.synonyms || undefined,
				forbiddenWords:
					parseArrayField(formData.forbiddenWords) || entry.forbiddenWords || undefined,
				source: formData.source.trim() || entry.source || undefined,
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
		class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
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

			<!-- 형식단어여부 -->
			<div>
				<label for="isFormalWord" class="mb-1 block text-sm font-medium text-gray-900">
					형식단어여부
				</label>
				<select
					id="isFormalWord"
					bind:value={formData.isFormalWord}
					class="input"
					disabled={isSubmitting}
				>
					<option value="N">N</option>
					<option value="Y">Y</option>
				</select>
			</div>

			<!-- 도메인분류명 -->
			<div>
				<label for="domainCategory" class="mb-1 block text-sm font-medium text-gray-900">
					도메인분류명
				</label>
				<input
					id="domainCategory"
					type="text"
					bind:value={formData.domainCategory}
					placeholder="예: 데이터베이스"
					class="input"
					disabled={isSubmitting}
				/>
			</div>

			<!-- 이음동의어 -->
			<div>
				<label for="synonyms" class="mb-1 block text-sm font-medium text-gray-900">
					이음동의어
				</label>
				<input
					id="synonyms"
					type="text"
					bind:value={formData.synonyms}
					placeholder="쉼표로 구분하여 입력 (예: 동의어1, 동의어2)"
					class="input"
					disabled={isSubmitting}
				/>
				<p class="mt-1 text-xs text-gray-500">여러 개의 동의어를 쉼표로 구분하여 입력하세요</p>
			</div>

			<!-- 금칙어 -->
			<div>
				<label for="forbiddenWords" class="mb-1 block text-sm font-medium text-gray-900">
					금칙어
				</label>
				<input
					id="forbiddenWords"
					type="text"
					bind:value={formData.forbiddenWords}
					placeholder="쉼표로 구분하여 입력 (예: 금칙어1, 금칙어2)"
					class="input"
					disabled={isSubmitting}
				/>
				<p class="mt-1 text-xs text-gray-500">여러 개의 금칙어를 쉼표로 구분하여 입력하세요</p>
			</div>

			<!-- 출처 -->
			<div>
				<label for="source" class="mb-1 block text-sm font-medium text-gray-900"> 출처 </label>
				<input
					id="source"
					type="text"
					bind:value={formData.source}
					placeholder="예: 출처명 또는 URL"
					class="input"
					disabled={isSubmitting}
				/>
			</div>

			<!-- 버튼 그룹 -->
			<div class="flex justify-between pt-4">
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
