<script lang="ts">
	import { debounce } from '$lib/utils/debounce.ts';

	type SearchEvent = {
		query: string;
		field: string;
		exact: boolean;
	};

	let {
		placeholder = '용어를 검색하세요...',
		disabled = false,
		loading = false,
		query = $bindable(''),
		field = $bindable('all'),
		exact = $bindable(false),
		onsearch,
		onclear
	}: {
		placeholder?: string;
		disabled?: boolean;
		loading?: boolean;
		query?: string;
		field?: string;
		exact?: boolean;
		onsearch: (detail: SearchEvent) => void;
		onclear: () => void;
	} = $props();

	let showAdvanced = $state(false);

	// 검색 입력 필드 참조
	let searchInput: HTMLInputElement | undefined;

	// 검색 필드 옵션
	const searchFields = [
		{ value: 'all', label: '전체' },
		{ value: 'standardName', label: '표준단어명' },
		{ value: 'abbreviation', label: '영문약어' },
		{ value: 'englishName', label: '영문명' }
	];

	// 디바운스된 검색 함수
	const debouncedSearch = debounce((q: string, f: string, e: boolean) => {
		if (q.trim().length > 0) {
			onsearch({ query: q.trim(), field: f, exact: e });
		} else {
			onclear();
		}
	}, 300);

	/**
	 * 검색어 입력 처리
	 */
	function handleInput() {
		debouncedSearch(query, field, exact);
	}

	/**
	 * 검색 필드 변경 처리
	 */
	function handleFieldChange() {
		if (query.trim().length > 0) {
			debouncedSearch(query, field, exact);
		}
	}

	/**
	 * 정확 일치 옵션 변경 처리
	 */
	function handleExactChange() {
		if (query.trim().length > 0) {
			debouncedSearch(query, field, exact);
		}
	}

	/**
	 * 검색어 초기화
	 */
	function clearSearch() {
		query = '';
		field = 'all';
		exact = false;
		onclear();
		// 검색 입력 필드에 포커스 이동
		if (searchInput) {
			searchInput.focus();
		}
	}

	/**
	 * Enter 키 처리
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			debouncedSearch(query, field, exact);
		} else if (event.key === 'Escape') {
			clearSearch();
		}
	}
</script>

<!-- 검색바 컴포넌트 -->
<div class="w-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
	<!-- 메인 검색 영역 -->
	<div class="flex flex-col gap-4 lg:flex-row lg:items-center">
		<!-- 검색 입력 -->
		<div class="relative flex-1">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				<!-- 검색 아이콘 -->
				<svg
					class="h-5 w-5 text-gray-600"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					aria-hidden="true"
				>
					<path
						fill-rule="evenodd"
						d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>

			<input
				bind:this={searchInput}
				type="text"
				bind:value={query}
				oninput={handleInput}
				onkeydown={handleKeydown}
				{placeholder}
				{disabled}
				class="input pl-10 pr-10"
			/>

			<!-- 로딩 스피너 / 클리어 버튼 -->
			<div class="absolute inset-y-0 right-0 flex items-center pr-3">
				{#if loading}
					<svg
						class="h-4 w-4 animate-spin text-gray-600"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
				{:else if query}
					<button
						type="button"
						onclick={clearSearch}
						class="rounded text-gray-600 transition-colors hover:text-gray-800 focus:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1"
						aria-label="검색어 지우기"
					>
						<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
				{/if}
			</div>
		</div>

		<!-- 고급 검색 토글 -->
		<button
			type="button"
			onclick={() => (showAdvanced = !showAdvanced)}
			class="btn btn-outline text-sm"
		>
			<svg
				class="mr-2 h-4 w-4 transition-transform {showAdvanced ? 'rotate-180' : ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
			고급 검색
		</button>
	</div>

	<!-- 고급 검색 옵션 -->
	{#if showAdvanced}
		<div class="mt-4 border-t border-gray-200 pt-4">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<!-- 검색 필드 선택 -->
				<div>
					<label for="search-field" class="mb-1 block text-sm font-medium text-gray-900">
						검색 범위
					</label>
					<select
						id="search-field"
						bind:value={field}
						onchange={handleFieldChange}
						{disabled}
						class="input"
					>
						{#each searchFields as field}
							<option value={field.value}>{field.label}</option>
						{/each}
					</select>
				</div>

				<!-- 검색 옵션 -->
				<div class="flex items-end">
					<label class="flex cursor-pointer items-center space-x-2">
						<input
							type="checkbox"
							bind:checked={exact}
							onchange={handleExactChange}
							{disabled}
							class="h-4 w-4 rounded border-gray-400 text-blue-700 focus:ring-blue-600"
						/>
						<span class="text-sm text-gray-900">정확히 일치</span>
					</label>
				</div>
			</div>

			<!-- 검색 통계 정보 -->
			{#if query}
				<div class="mt-3 text-sm text-gray-500">
					<span class="font-medium">"{query}"</span>
					{field !== 'all' ? `(${searchFields.find((f) => f.value === field)?.label})` : ''}
					{exact ? '(정확 일치)' : ''}로 검색 중...
				</div>
			{/if}
		</div>
	{/if}
</div>
