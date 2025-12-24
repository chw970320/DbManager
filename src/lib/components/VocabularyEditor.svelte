<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { VocabularyEntry } from '$lib/types/vocabulary';

	interface Props {
		entry?: Partial<VocabularyEntry>;
		isEditMode?: boolean;
		serverError?: string;
	}

	let { entry = {}, isEditMode = false, serverError = '' }: Props = $props();

	const dispatch = createEventDispatcher<{
		save: VocabularyEntry;
		cancel: void;
		delete: VocabularyEntry;
	}>();

	let formData = $state({
		standardName: entry.standardName || '',
		abbreviation: entry.abbreviation || '',
		englishName: entry.englishName || '',
		description: entry.description || '',
		domainCategory: entry.domainCategory || '',
		isFormalWord: entry.isFormalWord ?? false,
		synonyms: entry.synonyms?.join(', ') || '',
		forbiddenWords: entry.forbiddenWords?.join(', ') || ''
	});

	let errors = $state({
		standardName: '',
		abbreviation: '',
		englishName: ''
	});

	let isSubmitting = $state(false);
	let domainCategoryOptions = $state<string[]>([]);
	let isLoadingDomainCategories = $state(false);

	// 실시간 검증: 도메인/용어 에디터와 동일 패턴
	$effect(() => {
		errors.standardName = formData.standardName.trim() ? '' : '표준단어명은 필수 입력 항목입니다.';
	});

	$effect(() => {
		errors.abbreviation = formData.abbreviation.trim() ? '' : '영문약어는 필수 입력 항목입니다.';
	});

	$effect(() => {
		errors.englishName = formData.englishName.trim() ? '' : '영문명은 필수 입력 항목입니다.';
	});

	// 도메인분류명 목록 로드
	async function loadDomainCategories() {
		isLoadingDomainCategories = true;
		try {
			const response = await fetch('/api/domain/filter-options?filename=domain.json');
			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data && result.data.domainCategory) {
					domainCategoryOptions = result.data.domainCategory;
				}
			}
		} catch (err) {
			console.warn('도메인분류명 목록 로드 실패:', err);
		} finally {
			isLoadingDomainCategories = false;
		}
	}

	// 컴포넌트 마운트 시 도메인분류명 목록 로드
	$effect(() => {
		void loadDomainCategories();
	});

	$effect(() => {
		formData.standardName = entry.standardName || '';
		formData.abbreviation = entry.abbreviation || '';
		formData.englishName = entry.englishName || '';
		formData.description = entry.description || '';
		formData.domainCategory = entry.domainCategory || '';
		formData.isFormalWord = entry.isFormalWord ?? false;
		formData.synonyms = entry.synonyms?.join(', ') || '';
		formData.forbiddenWords = entry.forbiddenWords?.join(', ') || '';
	});

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

	function handleSubmit() {
		if (isSubmitting) return;
		if (!isFormValid()) return;

		isSubmitting = true;

		const now = new Date().toISOString();
		const synonyms = formData.synonyms
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		const forbiddenWords = formData.forbiddenWords
			.split(',')
			.map((f) => f.trim())
			.filter(Boolean);

		const editedEntry: VocabularyEntry = {
			id: entry.id || crypto.randomUUID(),
			standardName: formData.standardName.trim(),
			abbreviation: formData.abbreviation.trim(),
			englishName: formData.englishName.trim(),
			description: formData.description.trim(),
			domainCategory: formData.domainCategory.trim(),
			isFormalWord: formData.isFormalWord,
			synonyms: synonyms.length > 0 ? synonyms : undefined,
			forbiddenWords: forbiddenWords.length > 0 ? forbiddenWords : undefined,
			createdAt: entry.createdAt || now,
			updatedAt: now
		};

		dispatch('save', editedEntry);
		isSubmitting = false;
	}

	function handleCancel() {
		dispatch('cancel');
	}

	function handleDelete() {
		if (!entry.id) return;

		if (confirm('정말로 이 항목을 삭제하시겠습니까?')) {
			const entryToDelete: VocabularyEntry = {
				id: entry.id,
				standardName: formData.standardName.trim() || entry.standardName || '',
				abbreviation: formData.abbreviation.trim() || entry.abbreviation || '',
				englishName: formData.englishName.trim() || entry.englishName || '',
				description: formData.description?.trim() || entry.description || '',
				domainCategory: formData.domainCategory?.trim() || entry.domainCategory || '',
				isFormalWord: entry.isFormalWord ?? false,
				synonyms: entry.synonyms || [],
				forbiddenWords: entry.forbiddenWords || [],
				createdAt: entry.createdAt || '',
				updatedAt: entry.updatedAt || ''
			};
			dispatch('delete', entryToDelete);
		}
	}

	function handleBackgroundClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleCancel();
		}
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
	role="button"
	tabindex="-1"
	aria-label="배경 닫기"
	onclick={handleBackgroundClick}
	onkeydown={(e) => e.key === 'Escape' && handleCancel()}
>
	<div
		class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
	>
		<div class="flex flex-shrink-0 items-center justify-between border-b p-6">
			<h2 class="text-xl font-bold text-gray-900">{isEditMode ? '단어 수정' : '새 단어 추가'}</h2>
			<button
				onclick={handleCancel}
				class="text-gray-400 hover:text-gray-600"
				disabled={isSubmitting}
				aria-label="닫기"
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

		<div class="flex-1 overflow-y-auto p-6">
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
					handleSubmit();
				}}
				class="space-y-4"
			>
				<div class="space-y-4 border-b border-gray-200 pb-4">
					<h3 class="text-sm font-semibold text-gray-700">필수 정보</h3>
					<div class="space-y-4">
						<div>
							<label for="standardName" class="mb-1 block text-sm font-medium text-gray-900">
								표준단어명 <span class="text-red-700">*</span>
								{#if isEditMode}
									<span class="ml-2 text-xs font-normal text-gray-500">(수정 불가)</span>
								{/if}
							</label>
							<input
								id="standardName"
								type="text"
								class="input"
								class:input-error={errors.standardName}
								class:bg-gray-50={isEditMode}
								bind:value={formData.standardName}
								placeholder="예: 사용자"
								disabled={isSubmitting || isEditMode}
								readonly={isEditMode}
								required
							/>
							{#if errors.standardName}
								<p class="text-error mt-1 text-sm">{errors.standardName}</p>
							{/if}
							{#if isEditMode}
								<p class="mt-1 text-xs text-gray-500">
									표준단어명은 validation 처리되는 값으로 수정할 수 없습니다.
								</p>
							{/if}
						</div>

						<div>
							<label for="abbreviation" class="mb-1 block text-sm font-medium text-gray-900">
								영문약어 <span class="text-red-700">*</span>
								{#if isEditMode}
									<span class="ml-2 text-xs font-normal text-gray-500">(수정 불가)</span>
								{/if}
							</label>
							<input
								id="abbreviation"
								type="text"
								class="input"
								class:input-error={errors.abbreviation}
								class:bg-gray-50={isEditMode}
								bind:value={formData.abbreviation}
								placeholder="예: user"
								disabled={isSubmitting || isEditMode}
								readonly={isEditMode}
								required
							/>
							{#if errors.abbreviation}
								<p class="text-error mt-1 text-sm">{errors.abbreviation}</p>
							{/if}
							{#if isEditMode}
								<p class="mt-1 text-xs text-gray-500">
									영문약어는 validation 처리되는 값으로 수정할 수 없습니다.
								</p>
							{/if}
						</div>

						<div>
							<label for="englishName" class="mb-1 block text-sm font-medium text-gray-900">
								영문명 <span class="text-red-700">*</span>
								{#if isEditMode}
									<span class="ml-2 text-xs font-normal text-gray-500">(수정 불가)</span>
								{/if}
							</label>
							<input
								id="englishName"
								type="text"
								class="input"
								class:input-error={errors.englishName}
								class:bg-gray-50={isEditMode}
								bind:value={formData.englishName}
								placeholder="예: User"
								disabled={isSubmitting || isEditMode}
								readonly={isEditMode}
								required
							/>
							{#if errors.englishName}
								<p class="text-error mt-1 text-sm">{errors.englishName}</p>
							{/if}
							{#if isEditMode}
								<p class="mt-1 text-xs text-gray-500">
									영문명은 validation 처리되는 값으로 수정할 수 없습니다.
								</p>
							{/if}
						</div>
						<div>
							<label for="domainCategory" class="mb-1 block text-sm font-medium text-gray-900">
								도메인분류명
								<span class="ml-2 text-xs font-normal text-gray-500">(선택만 가능)</span>
								{#if isEditMode}
									<span class="ml-2 text-xs font-normal text-gray-500">(수정 불가)</span>
								{/if}
							</label>
							{#if isLoadingDomainCategories}
								<div class="input bg-gray-50">
									<span class="text-sm text-gray-500">도메인분류명 목록을 불러오는 중...</span>
								</div>
							{:else}
								<select
									id="domainCategory"
									class="input"
									class:bg-gray-50={isEditMode}
									bind:value={formData.domainCategory}
									disabled={isSubmitting || isEditMode}
								>
									<option value="">선택 안 함</option>
									{#each domainCategoryOptions as option (option)}
										<option value={option}>{option}</option>
									{/each}
								</select>
							{/if}
							{#if isEditMode}
								<p class="mt-1 text-xs text-gray-500">
									도메인분류명은 validation 처리되는 값으로 수정할 수 없습니다.
								</p>
							{:else}
								<p class="mt-1 text-xs text-gray-500">
									도메인 데이터에서 등록된 도메인분류명만 선택할 수 있습니다.
								</p>
							{/if}
						</div>
					</div>
				</div>

				<div class="space-y-4 border-b border-gray-200 pb-4">
					<h3 class="text-sm font-semibold text-gray-700">추가 정보</h3>
					<div class="space-y-4">
						<div>
							<label for="description" class="mb-1 block text-sm font-medium text-gray-900">
								설명
							</label>
							<textarea
								id="description"
								class="input resize-none"
								rows="3"
								bind:value={formData.description}
								placeholder="단어에 대한 상세 설명을 입력하세요"
								disabled={isSubmitting}
							></textarea>
						</div>

						<div class="flex items-center space-x-2">
							<input
								id="isFormalWord"
								type="checkbox"
								bind:checked={formData.isFormalWord}
								disabled={isSubmitting}
							/>
							<label for="isFormalWord" class="text-sm text-gray-700">형식단어 여부</label>
						</div>
						<div>
							<label for="synonyms" class="mb-1 block text-sm font-medium text-gray-900">
								이음동의어 (쉼표 구분)
								{#if isEditMode}
									<span class="ml-2 text-xs font-normal text-gray-500">(수정 불가)</span>
								{/if}
							</label>
							<input
								id="synonyms"
								type="text"
								class="input"
								class:bg-gray-50={isEditMode}
								bind:value={formData.synonyms}
								placeholder="예: 고객, 사용자"
								disabled={isSubmitting || isEditMode}
								readonly={isEditMode}
							/>
							{#if isEditMode}
								<p class="mt-1 text-xs text-gray-500">
									이음동의어는 validation 처리되는 값으로 수정할 수 없습니다.
								</p>
							{/if}
						</div>
						<div>
							<label for="forbiddenWords" class="mb-1 block text-sm font-medium text-gray-900">
								금칙어 (쉼표 구분)
								{#if isEditMode}
									<span class="ml-2 text-xs font-normal text-gray-500">(수정 불가)</span>
								{/if}
							</label>
							<input
								id="forbiddenWords"
								type="text"
								class="input"
								class:bg-gray-50={isEditMode}
								bind:value={formData.forbiddenWords}
								placeholder="예: 테스트, 샘플"
								disabled={isSubmitting || isEditMode}
								readonly={isEditMode}
							/>
							<p class="mt-1 text-xs text-gray-500">
								{#if isEditMode}
									금칙어는 validation 처리되는 값으로 수정할 수 없습니다.
								{:else}
									이 단어집 파일에만 적용되는 금칙어 목록입니다.
								{/if}
							</p>
						</div>
					</div>
				</div>

				<div class="flex items-center justify-between pt-2">
					{#if isEditMode}
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
