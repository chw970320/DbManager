<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { get } from 'svelte/store';
	import { vocabularyStore } from '$lib/stores/vocabularyStore';
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
		domainGroup: entry.domainGroup || '',
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

	// Domain autocomplete state
	let domainOptions = $state<{ category: string; group: string }[]>([]);
	let domainWarning = $state('');
	let isLoadingDomains = $state(false);
	let selectedDomainFilename = $state('domain.json');

	// Update formData when entry prop changes
	$effect(() => {
		if (entry) {
			formData.standardName = entry.standardName || '';
			formData.abbreviation = entry.abbreviation || '';
			formData.englishName = entry.englishName || '';
			formData.description = entry.description || '';
			formData.isFormalWord = entry.isFormalWord ? 'Y' : 'N';
			formData.domainCategory = entry.domainCategory || '';
			formData.domainGroup = entry.domainGroup || '';
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

	async function loadDomainOptions() {
		isLoadingDomains = true;
		try {
			const storeValue = get(vocabularyStore);
			const currentDomainFilename = storeValue.selectedDomainFilename || 'domain.json';

			// 도메인 파일이 변경되었거나 옵션이 비어있을 때만 로드
			if (domainOptions.length > 0 && selectedDomainFilename === currentDomainFilename) {
				isLoadingDomains = false;
				return;
			}

			selectedDomainFilename = currentDomainFilename;

			// 모든 페이지를 순회하여 데이터 수집
			const allEntries: { domainCategory: string; domainGroup: string }[] = [];
			let page = 1;
			let hasMore = true;
			const limit = 100; // API 최대 제한

			while (hasMore) {
				const params = new URLSearchParams({
					filename: selectedDomainFilename,
					page: page.toString(),
					limit: limit.toString()
				});
				const response = await fetch(`/api/domain?${params}`);
				const result = await response.json();

				if (result.success && result.data && Array.isArray(result.data.entries)) {
					const entries = result.data.entries as { domainCategory: string; domainGroup: string }[];
					allEntries.push(...entries);

					// 다음 페이지가 있는지 확인
					hasMore = result.data.pagination?.hasNextPage || false;
					page++;
				} else {
					hasMore = false;
				}
			}

			// 중복 제거: domainCategory를 키로 사용하여 Map으로 관리
			// key: 소문자 category, value: { originalCategory, group }
			const categoryMap = new Map<string, { originalCategory: string; group: string }>();
			allEntries
				.filter((d) => d.domainCategory && d.domainGroup)
				.forEach((d) => {
					const key = d.domainCategory.trim().toLowerCase();
					// 이미 존재하지 않으면 추가 (첫 번째 매칭 항목 사용)
					if (!categoryMap.has(key)) {
						categoryMap.set(key, {
							originalCategory: d.domainCategory.trim(),
							group: d.domainGroup.trim()
						});
					}
				});

			// Map을 배열로 변환
			domainOptions = Array.from(categoryMap.values()).map((item) => ({
				category: item.originalCategory,
				group: item.group
			}));
		} catch (err) {
			console.warn('도메인 목록 로드 실패:', err);
		} finally {
			isLoadingDomains = false;
		}
	}

	function applyDomainMapping() {
		if (!formData.domainCategory) {
			formData.domainGroup = '';
			domainWarning = '';
			return;
		}
		const key = formData.domainCategory.trim().toLowerCase();
		const matched = domainOptions.find(
			(opt) => opt.category && opt.category.trim().toLowerCase() === key
		);
		if (matched) {
			formData.domainGroup = matched.group;
			domainWarning = '';
		} else {
			formData.domainGroup = '';
			domainWarning = '매핑된 도메인 그룹을 찾지 못했습니다 (저장은 가능)';
		}
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

	$effect(() => {
		void loadDomainOptions();
	});

	$effect(() => {
		applyDomainMapping();
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
			domainGroup: formData.domainGroup.trim() || undefined,
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
				domainGroup: formData.domainGroup.trim() || entry.domainGroup || undefined,
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
		class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="flex flex-shrink-0 items-center justify-between border-b p-6">
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
					<label for="description" class="mb-1 block text-sm font-medium text-gray-900">
						설명
					</label>
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
					<div class="relative">
						<input
							id="domainCategory"
							type="text"
							bind:value={formData.domainCategory}
							list="domainCategoryOptions"
							placeholder="예: 데이터베이스"
							class="input pr-8"
							disabled={isSubmitting}
						/>
						<!-- 화살표 영역을 덮는 요소 (input의 border와 배경색과 일치) -->
						<div
							class="pointer-events-none absolute right-0 top-0 flex h-full w-0 items-center justify-center border-l border-gray-400 bg-white"
							class:bg-gray-100={isSubmitting}
						></div>
					</div>
					<datalist id="domainCategoryOptions">
						{#each domainOptions as option (option.category)}
							<option value={option.category}>{option.category}</option>
						{/each}
					</datalist>
					{#if formData.domainGroup}
						<p class="mt-1 text-xs text-green-700">매핑된 도메인그룹: {formData.domainGroup}</p>
					{:else if domainWarning}
						<p class="mt-1 text-xs text-amber-700">{domainWarning}</p>
					{/if}
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
</div>
