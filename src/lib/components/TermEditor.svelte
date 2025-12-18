<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { get } from 'svelte/store';
	import { vocabularyStore } from '$lib/stores/vocabulary-store';
	import { domainStore } from '$lib/stores/domain-store';
	import { termStore } from '$lib/stores/term-store';
	import type { TermEntry } from '$lib/types/term';
	import { debounce } from '$lib/utils/debounce';

	// Props
	interface Props {
		entry?: Partial<TermEntry>;
		isEditMode?: boolean;
		serverError?: string;
	}

	let { entry = {}, isEditMode = false, serverError = '' }: Props = $props();

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		save: TermEntry;
		cancel: void;
		delete: TermEntry;
	}>();

	// Form data
	let formData = $state({
		termName: entry.termName || '',
		columnName: entry.columnName || '',
		domainName: entry.domainName || ''
	});

	// Validation errors
	let errors = $state({
		termName: '',
		columnName: '',
		domainName: ''
	});

	// Form state
	let isSubmitting = $state(false);

	// Autocomplete state
	let termNameSuggestions = $state<string[]>([]);
	let columnNameSuggestions = $state<string[]>([]);
	let domainNameSuggestions = $state<string[]>([]);
	let showTermNameSuggestions = $state(false);
	let showColumnNameSuggestions = $state(false);
	let showDomainNameSuggestions = $state(false);

	// Domain options for select (based on termName's last segment)
	let domainOptions = $state<string[]>([]);
	let isLoadingDomainOptions = $state(false);

	// Mapping info state
	let termMapping = $state<{ vocabulary: string; domain: string } | null>(null);
	let isMappingLoading = $state(false);

	// Input refs
	let termNameInput: HTMLInputElement | undefined;
	let columnNameInput: HTMLInputElement | undefined;
	let domainNameInput: HTMLInputElement | HTMLSelectElement | undefined;

	// Update formData when entry prop changes
	$effect(() => {
		if (entry) {
			formData.termName = entry.termName || '';
			formData.columnName = entry.columnName || '';
			formData.domainName = entry.domainName || '';
			// 엔트리가 변경되면 도메인 옵션 업데이트
			debouncedUpdateDomainOptions();
		}
	});

	// Load mapping info when component mounts or term file changes
	$effect(() => {
		loadTermMapping();
	});

	// Subscribe to termStore changes
	$effect(() => {
		const unsubscribe = termStore.subscribe(() => {
			loadTermMapping();
		});
		return unsubscribe;
	});

	// 용어명 변경 시 도메인 옵션 자동 업데이트
	$effect(() => {
		void formData.termName;
		debouncedUpdateDomainOptions();
	});

	// Load term mapping info
	async function loadTermMapping() {
		const storeValue = get(termStore);
		const termFilename = storeValue.selectedFilename || 'term.json';

		isMappingLoading = true;
		try {
			const response = await fetch(
				`/api/term/files/mapping?filename=${encodeURIComponent(termFilename)}`
			);
			const result = await response.json();
			if (result.success && result.data && result.data.mapping) {
				termMapping = result.data.mapping;
			} else {
				// 기본값 설정
				termMapping = {
					vocabulary: 'vocabulary.json',
					domain: 'domain.json'
				};
			}
		} catch (err) {
			console.warn('매핑 정보 로드 실패:', err);
			// 기본값 설정
			termMapping = {
				vocabulary: 'vocabulary.json',
				domain: 'domain.json'
			};
		} finally {
			isMappingLoading = false;
		}
	}

	// Load vocabulary filename from mapping
	function getVocabularyFilename(): string {
		if (termMapping) {
			return termMapping.vocabulary;
		}
		return 'vocabulary.json';
	}

	// Load domain filename from mapping
	function getDomainFilename(): string {
		if (termMapping) {
			return termMapping.domain;
		}
		return 'domain.json';
	}

	// Load term name suggestions (from vocabulary standardName)
	async function loadTermNameSuggestions(query: string) {
		if (!query || query.trim().length < 1) {
			termNameSuggestions = [];
			showTermNameSuggestions = false;
			return;
		}

		try {
			const filename = getVocabularyFilename();
			const response = await fetch(`/api/search?filename=${encodeURIComponent(filename)}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: query.trim(), limit: 20 })
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success && Array.isArray(result.data)) {
					// standardName만 필터링
					const suggestions = new Set<string>();
					result.data.forEach((item: string) => {
						suggestions.add(item);
					});
					termNameSuggestions = Array.from(suggestions).slice(0, 20);
					showTermNameSuggestions = termNameSuggestions.length > 0;
				} else {
					termNameSuggestions = [];
					showTermNameSuggestions = false;
				}
			}
		} catch (err) {
			console.warn('용어명 자동완성 로드 실패:', err);
			termNameSuggestions = [];
			showTermNameSuggestions = false;
		}
	}

	// Load column name suggestions (from vocabulary abbreviation)
	async function loadColumnNameSuggestions(query: string) {
		if (!query || query.trim().length < 1) {
			columnNameSuggestions = [];
			showColumnNameSuggestions = false;
			return;
		}

		try {
			const filename = getVocabularyFilename();
			const response = await fetch(`/api/search?filename=${encodeURIComponent(filename)}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: query.trim(), limit: 20 })
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success && Array.isArray(result.data)) {
					// abbreviation만 필터링
					const suggestions = new Set<string>();
					result.data.forEach((item: string) => {
						suggestions.add(item);
					});
					columnNameSuggestions = Array.from(suggestions).slice(0, 20);
					showColumnNameSuggestions = columnNameSuggestions.length > 0;
				} else {
					columnNameSuggestions = [];
					showColumnNameSuggestions = false;
				}
			}
		} catch (err) {
			console.warn('컬럼명 자동완성 로드 실패:', err);
			columnNameSuggestions = [];
			showColumnNameSuggestions = false;
		}
	}

	// Load domain name suggestions (from domain standardDomainName)
	async function loadDomainNameSuggestions(query: string) {
		if (!query || query.trim().length < 1) {
			domainNameSuggestions = [];
			showDomainNameSuggestions = false;
			return;
		}

		try {
			const filename = getDomainFilename();
			const params = new URLSearchParams({
				filename,
				query: query.trim(),
				field: 'standardDomainName',
				page: '1',
				limit: '20'
			});
			const response = await fetch(`/api/domain?${params}`);

			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data && Array.isArray(result.data.entries)) {
					const suggestions = result.data.entries.map(
						(entry: { standardDomainName: string }) => entry.standardDomainName
					);
					domainNameSuggestions = [...new Set(suggestions)].slice(0, 20);
					showDomainNameSuggestions = domainNameSuggestions.length > 0;
				} else {
					domainNameSuggestions = [];
					showDomainNameSuggestions = false;
				}
			}
		} catch (err) {
			console.warn('도메인명 자동완성 로드 실패:', err);
			domainNameSuggestions = [];
			showDomainNameSuggestions = false;
		}
	}

	// Debounced autocomplete functions
	const debouncedTermNameSearch = debounce(loadTermNameSuggestions, 300);
	const debouncedColumnNameSearch = debounce(loadColumnNameSuggestions, 300);
	const debouncedDomainNameSearch = debounce(loadDomainNameSuggestions, 300);
	const debouncedUpdateDomainOptions = debounce(updateDomainOptions, 300);

	// Handle term name input
	function handleTermNameInput() {
		const query = formData.termName;
		debouncedTermNameSearch(query);
		showTermNameSuggestions = true;
		// 용어명 변경 시 도메인 옵션 업데이트 (debounced)
		debouncedUpdateDomainOptions();
	}

	/**
	 * 용어명의 마지막 부분(underscore split)을 추출
	 */
	function getLastSegment(termName: string): string {
		if (!termName || !termName.trim()) {
			return '';
		}
		const parts = termName
			.split('_')
			.map((p) => p.trim())
			.filter((p) => p.length > 0);
		return parts.length > 0 ? parts[parts.length - 1] : '';
	}

	/**
	 * 용어명의 마지막 부분에 해당하는 도메인 찾기
	 */
	async function updateDomainOptions() {
		const lastSegment = getLastSegment(formData.termName);
		if (!lastSegment) {
			domainOptions = [];
			// 관련 도메인이 없으면 선택값도 초기화
			formData.domainName = '';
			return;
		}

		isLoadingDomainOptions = true;
		try {
			const filename = getDomainFilename();
			// domainCategory로 검색
			const params = new URLSearchParams({
				filename,
				query: lastSegment,
				field: 'domainCategory',
				page: '1',
				limit: '100' // 충분히 많은 옵션을 가져오기 위해
			});
			const response = await fetch(`/api/domain?${params}`);

			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data && Array.isArray(result.data.entries)) {
					// standardDomainName만 추출하고 중복 제거
					const domainNames = result.data.entries.map(
						(entry: { standardDomainName: string }) => entry.standardDomainName
					);
					domainOptions = [...new Set(domainNames)];
				} else {
					domainOptions = [];
				}
			} else {
				domainOptions = [];
			}
		} catch (err) {
			console.warn('도메인 옵션 로드 실패:', err);
			domainOptions = [];
		} finally {
			// 옵션 리스트와 선택 값 동기화
			if (domainOptions.length > 0) {
				// 현재 선택된 값이 없거나, 새 옵션 목록에 포함되지 않으면 첫 번째 값으로 선택
				if (!formData.domainName || !domainOptions.includes(formData.domainName)) {
					formData.domainName = domainOptions[0];
				}
			} else {
				formData.domainName = '';
			}

			isLoadingDomainOptions = false;
		}
	}

	// Handle column name input
	function handleColumnNameInput() {
		const query = formData.columnName;
		debouncedColumnNameSearch(query);
		showColumnNameSuggestions = true;
	}

	// Handle domain name input
	function handleDomainNameInput() {
		const query = formData.domainName;
		debouncedDomainNameSearch(query);
		showDomainNameSuggestions = true;
	}

	// Select suggestion
	function selectTermNameSuggestion(suggestion: string) {
		formData.termName = suggestion;
		showTermNameSuggestions = false;
		termNameSuggestions = [];
	}

	function selectColumnNameSuggestion(suggestion: string) {
		formData.columnName = suggestion;
		showColumnNameSuggestions = false;
		columnNameSuggestions = [];
	}

	function selectDomainNameSuggestion(suggestion: string) {
		formData.domainName = suggestion;
		showDomainNameSuggestions = false;
		domainNameSuggestions = [];
	}

	// Validation functions
	function validateTermName(value: string): string {
		if (!value.trim()) {
			return '용어명은 필수 입력 항목입니다.';
		}
		return '';
	}

	function validateColumnName(value: string): string {
		if (!value.trim()) {
			return '컬럼명은 필수 입력 항목입니다.';
		}
		return '';
	}

	function validateDomainName(value: string): string {
		if (!value.trim()) {
			return '도메인명은 필수 입력 항목입니다.';
		}
		return '';
	}

	// Real-time validation
	$effect(() => {
		errors.termName = validateTermName(formData.termName);
	});

	$effect(() => {
		errors.columnName = validateColumnName(formData.columnName);
	});

	$effect(() => {
		errors.domainName = validateDomainName(formData.domainName);
	});

	// Form validation
	function isFormValid(): boolean {
		return (
			!errors.termName &&
			!errors.columnName &&
			!errors.domainName &&
			!!formData.termName.trim() &&
			!!formData.columnName.trim() &&
			!!formData.domainName.trim()
		);
	}

	// Handle save
	function handleSave() {
		if (!isFormValid()) {
			return;
		}

		isSubmitting = true;

		const editedEntry: TermEntry = {
			id: entry.id || '',
			termName: formData.termName.trim(),
			columnName: formData.columnName.trim(),
			domainName: formData.domainName.trim(),
			isMappedTerm: entry.isMappedTerm || false,
			isMappedColumn: entry.isMappedColumn || false,
			isMappedDomain: entry.isMappedDomain || false,
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
			const entryToDelete: TermEntry = {
				id: entry.id,
				termName: formData.termName.trim() || entry.termName || '',
				columnName: formData.columnName.trim() || entry.columnName || '',
				domainName: formData.domainName.trim() || entry.domainName || '',
				isMappedTerm: entry.isMappedTerm || false,
				isMappedColumn: entry.isMappedColumn || false,
				isMappedDomain: entry.isMappedDomain || false,
				createdAt: entry.createdAt || '',
				updatedAt: entry.updatedAt || ''
			};
			dispatch('delete', entryToDelete);
		}
	}

	// Handle background click
	function handleBackgroundClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleCancel();
		}
	}

	// Close suggestions when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.autocomplete-container') && !target.closest('.autocomplete-input')) {
			showTermNameSuggestions = false;
			showColumnNameSuggestions = false;
			showDomainNameSuggestions = false;
		}
	}

	// Close suggestions on escape
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			showTermNameSuggestions = false;
			showColumnNameSuggestions = false;
			showDomainNameSuggestions = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

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
				{isEditMode ? '용어 수정' : '새 용어 추가'}
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
				<!-- 용어명 -->
				<div class="autocomplete-container relative">
					<label for="termName" class="mb-1 block text-sm font-medium text-gray-900">
						용어명 <span class="text-red-700">*</span>
					</label>
					<input
						id="termName"
						bind:this={termNameInput}
						type="text"
						bind:value={formData.termName}
						oninput={handleTermNameInput}
						onfocus={() => {
							if (formData.termName.trim()) {
								handleTermNameInput();
							}
						}}
						placeholder="예: 데이터베이스_관리자"
						class="autocomplete-input input"
						class:input-error={errors.termName}
						disabled={isSubmitting}
					/>
					{#if errors.termName}
						<p class="text-error mt-1 text-sm">{errors.termName}</p>
					{/if}
					{#if showTermNameSuggestions && termNameSuggestions.length > 0}
						<div
							class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg"
						>
							{#each termNameSuggestions as suggestion}
								<button
									type="button"
									class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
									onclick={() => selectTermNameSuggestion(suggestion)}
								>
									{suggestion}
								</button>
							{/each}
						</div>
					{/if}
					<p class="mt-1 text-xs text-gray-500">
						단어집의 표준단어명을 언더스코어(_)로 연결하여 입력하세요
					</p>
				</div>

				<!-- 컬럼명 -->
				<div class="autocomplete-container relative">
					<label for="columnName" class="mb-1 block text-sm font-medium text-gray-900">
						컬럼명 <span class="text-red-700">*</span>
					</label>
					<input
						id="columnName"
						bind:this={columnNameInput}
						type="text"
						bind:value={formData.columnName}
						oninput={handleColumnNameInput}
						onfocus={() => {
							if (formData.columnName.trim()) {
								handleColumnNameInput();
							}
						}}
						placeholder="예: DB_ADMIN"
						class="autocomplete-input input uppercase"
						class:input-error={errors.columnName}
						disabled={isSubmitting}
					/>
					{#if errors.columnName}
						<p class="text-error mt-1 text-sm">{errors.columnName}</p>
					{/if}
					{#if showColumnNameSuggestions && columnNameSuggestions.length > 0}
						<div
							class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg"
						>
							{#each columnNameSuggestions as suggestion}
								<button
									type="button"
									class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
									onclick={() => selectColumnNameSuggestion(suggestion)}
								>
									{suggestion}
								</button>
							{/each}
						</div>
					{/if}
					<p class="mt-1 text-xs text-gray-500">
						단어집의 영문약어를 언더스코어(_)로 연결하여 입력하세요
					</p>
				</div>

				<!-- 도메인명 -->
				<div class="autocomplete-container relative">
					<label for="domainName" class="mb-1 block text-sm font-medium text-gray-900">
						도메인명 <span class="text-red-700">*</span>
					</label>
					<select
						id="domainName"
						bind:this={domainNameInput}
						bind:value={formData.domainName}
						class="autocomplete-input input"
						class:input-error={errors.domainName}
						disabled={isSubmitting || isLoadingDomainOptions || domainOptions.length === 0}
					>
						{#if domainOptions.length > 0}
							{#each domainOptions as option}
								<option value={option}>{option}</option>
							{/each}
						{:else}
							<option value="">관련된 도메인이 없습니다.</option>
						{/if}
					</select>
					{#if errors.domainName}
						<p class="text-error mt-1 text-sm">{errors.domainName}</p>
					{/if}
					{#if isLoadingDomainOptions}
						<p class="mt-1 text-xs text-gray-500">도메인 옵션을 불러오는 중...</p>
					{:else if domainOptions.length === 0 && formData.termName.trim()}
						<p class="mt-1 text-xs text-gray-500">
							({getLastSegment(formData.termName) || '없음'})에 해당하는 도메인이 없습니다.
						</p>
					{:else if domainOptions.length > 0}
						<p class="mt-1 text-xs text-gray-500">
							({getLastSegment(formData.termName)})에 해당하는 도메인 {domainOptions.length}개
						</p>
					{:else}
						<p class="mt-1 text-xs text-gray-500">용어명을 입력하면 도메인 옵션이 표시됩니다</p>
					{/if}
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

<style>
	.uppercase {
		text-transform: uppercase;
	}
</style>
