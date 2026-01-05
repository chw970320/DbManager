<script lang="ts">
	// @ts-nocheck
	import { createEventDispatcher } from 'svelte';
	import { tick } from 'svelte';
	import { get } from 'svelte/store';
	import { vocabularyStore } from '$lib/stores/vocabulary-store';
	import { domainStore } from '$lib/stores/domain-store';
	import { termStore } from '$lib/stores/term-store';
	import type { TermEntry } from '$lib/types/term';
	import { debounce } from '$lib/utils/debounce';

	// Props
	interface Props {
		entry?: Partial<TermEntry>;
		serverError?: string;
		filename?: string; // 현재 선택된 용어 파일명
	}

	let { entry = {}, serverError = '', filename = 'term.json' }: Props = $props();

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		save: TermEntry;
		cancel: void;
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

	// Domain recommendations (based on termName's last segment & vocabulary/domain mapping)
	let domainRecommendations = $state<string[]>([]);
	let isLoadingDomainRecommendations = $state(false);

	// Mapping info state
	let termMapping = $state<{ vocabulary: string; domain: string } | null>(null);
	let isMappingLoading = $state(false);

	// Input refs
	let termNameInput: HTMLInputElement | undefined;
	let columnNameInput: HTMLInputElement | undefined;
	let domainNameInput: HTMLInputElement | undefined;

	// Update formData when entry prop changes
	$effect(() => {
		if (entry) {
			formData.termName = entry.termName || '';
			formData.columnName = entry.columnName || '';
			formData.domainName = entry.domainName || '';
			// 엔트리가 변경되면 도메인 추천 업데이트
			debouncedUpdateDomainRecommendations();
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

	// 용어명 변경 시 도메인 추천 자동 업데이트
	$effect(() => {
		void formData.termName;
		debouncedUpdateDomainRecommendations();
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
					const suggestions: string[] = result.data.entries.map(
						(entry: { standardDomainName: string }) => entry.standardDomainName
					);
					domainNameSuggestions = [...new Set<string>(suggestions)].slice(0, 20);
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

	// Debounced autocomplete functions (타입 호환을 위해 래퍼 함수 사용)
	const debouncedTermNameSearch = debounce((query: string) => {
		void loadTermNameSuggestions(query);
	}, 300);

	const debouncedColumnNameSearch = debounce((query: string) => {
		void loadColumnNameSuggestions(query);
	}, 300);

	const debouncedDomainNameSearch = debounce((query: string) => {
		void loadDomainNameSuggestions(query);
	}, 300);

	const debouncedUpdateDomainRecommendations = debounce(() => {
		void updateDomainRecommendations();
	}, 300);

	// Handle term name input
	function handleTermNameInput() {
		const query = formData.termName;
		debouncedTermNameSearch(query);
		showTermNameSuggestions = true;
		// 용어명 변경 시 도메인 추천 업데이트 (debounced)
		debouncedUpdateDomainRecommendations();
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
	 * 용어명의 마지막 부분에 해당하는 도메인 추천 조회
	 */
	async function updateDomainRecommendations() {
		const termName = formData.termName;
		if (!termName || !termName.trim()) {
			domainRecommendations = [];
			return;
		}

		isLoadingDomainRecommendations = true;
		try {
			// 현재 선택된 용어 파일명은 termStore에서 가져옴
			const storeValue = get(termStore);
			const termFilename = storeValue.selectedFilename || 'term.json';

			const response = await fetch('/api/term/recommend', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					filename: termFilename,
					termName
				})
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data && Array.isArray(result.data.recommendations)) {
					domainRecommendations = result.data.recommendations as string[];
				} else {
					domainRecommendations = [];
				}
			} else {
				domainRecommendations = [];
			}
		} catch (err) {
			console.warn('도메인 추천 로드 실패:', err);
			domainRecommendations = [];
		} finally {
			isLoadingDomainRecommendations = false;
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
		// 추천 목록에서만 선택 가능
		if (domainRecommendations.length > 0 && !domainRecommendations.includes(value.trim())) {
			return '도메인명은 추천 목록에서 선택해야 합니다.';
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
		const hasValidDomainName =
			formData.domainName.trim() &&
			(domainRecommendations.length === 0 ||
				domainRecommendations.includes(formData.domainName.trim()));

		return (
			!errors.termName &&
			!errors.columnName &&
			!errors.domainName &&
			!!formData.termName.trim() &&
			!!formData.columnName.trim() &&
			hasValidDomainName
		);
	}

	// Handle save
	async function handleSave() {
		if (!isFormValid()) {
			// 모든 에러 메시지 수집
			const errorMessages: string[] = [];
			if (errors.termName) {
				errorMessages.push(errors.termName);
			}
			if (errors.columnName) {
				errorMessages.push(errors.columnName);
			}
			if (errors.domainName) {
				errorMessages.push(errors.domainName);
			}

			// 에러 팝업 표시
			if (errorMessages.length > 0) {
				await tick();
				alert('입력 오류\n\n' + errorMessages.join('\n'));
			}
			return;
		}

		// 전송 전 서버 validation 수행 (용어명 접미사, 유일성 검사)
		isSubmitting = true;
		try {
			const validationErrors: string[] = [];

			// 용어명 접미사 및 유일성 validation
			try {
				const validationResponse = await fetch(
					`/api/term/validate?filename=${encodeURIComponent(filename)}`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							termName: formData.termName.trim(),
							columnName: formData.columnName.trim(),
							domainName: formData.domainName.trim()
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

		const editedEntry: TermEntry = {
			id: '',
			termName: formData.termName.trim(),
			columnName: formData.columnName.trim(),
			domainName: formData.domainName.trim(),
			isMappedTerm: false,
			isMappedColumn: false,
			isMappedDomain: false,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
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
	class="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50"
	onclick={handleBackgroundClick}
	role="button"
	tabindex="0"
	aria-label="배경을 클릭하거나 Esc 키로 닫기"
	onkeydown={(event) => {
		// 입력 필드에서의 스페이스/엔터는 모달을 닫지 않도록 방지
		const target = event.target as HTMLElement;
		const isFormElement =
			target.tagName === 'INPUT' ||
			target.tagName === 'TEXTAREA' ||
			target.tagName === 'SELECT' ||
			target.isContentEditable;

		// 오버레이 자체에 포커스가 있을 때만 키보드로 닫기 처리
		if (!isFormElement && event.currentTarget === event.target) {
			if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				handleCancel();
			}
		}
	}}
>
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div
		class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="flex flex-shrink-0 items-center justify-between border-b p-6">
			<h2 class="text-xl font-bold text-gray-900">새 용어 추가</h2>
			<button
				onclick={handleCancel}
				class="text-gray-400 hover:text-gray-600"
				disabled={isSubmitting}
				aria-label="편집 창 닫기"
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
							<!-- eslint-disable-next-line svelte/require-each-key -->
							{#each termNameSuggestions as suggestion (suggestion)}
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
							<!-- eslint-disable-next-line svelte/require-each-key -->
							{#each columnNameSuggestions as suggestion (suggestion)}
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
						<span class="ml-2 text-xs font-normal text-gray-500">(추천 목록에서만 선택 가능)</span>
					</label>
					{#if domainRecommendations.length > 0}
						<div class="mt-2 flex flex-wrap gap-2">
							<!-- eslint-disable-next-line svelte/require-each-key -->
							{#each domainRecommendations as rec (rec)}
								<button
									type="button"
									class="rounded-full border px-3 py-1 text-xs transition-colors {formData.domainName ===
									rec
										? 'border-blue-500 bg-blue-100 text-blue-800'
										: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}"
									onclick={() => (formData.domainName = rec)}
									disabled={isSubmitting}
								>
									{rec}
								</button>
							{/each}
						</div>
						{#if formData.domainName && !domainRecommendations.includes(formData.domainName)}
							<p class="mt-1 text-xs text-red-600">
								선택한 도메인명이 추천 목록에 없습니다. 추천 목록에서 선택해주세요.
							</p>
						{/if}
					{:else if isLoadingDomainRecommendations}
						<p class="mt-1 text-xs text-gray-500">도메인 추천을 불러오는 중...</p>
					{:else if formData.termName.trim()}
						<p class="mt-1 text-xs text-gray-500">
							({getLastSegment(formData.termName) || '없음'})에 매핑된 도메인이 없습니다. 용어명을
							확인해주세요.
						</p>
					{:else}
						<p class="mt-1 text-xs text-gray-500">
							용어명을 입력하면 단어집 표준단어명과 매핑된 도메인을 자동으로 추천합니다.
						</p>
					{/if}
					<input id="domainName" type="hidden" bind:value={formData.domainName} />
					{#if errors.domainName}
						<p class="text-error mt-1 text-sm">{errors.domainName}</p>
					{/if}
				</div>

				<!-- 버튼 그룹 -->
				<div class="flex justify-end border-t border-gray-200 pt-4">
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
								저장
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
