<script lang="ts">
	import CopyToClipboard from 'svelte-copy-to-clipboard';
	import { debounce } from '$lib/utils/debounce';

	// --- Component State ---
	let sourceTerm = $state('');
	let direction = $state<'ko-to-en' | 'en-to-ko'>('ko-to-en');
	let segmentsList = $state<string[]>([]);
	let selectedSegment = $state('');
	let finalResults = $state<string[]>([]); // 단일 결과에서 복수 결과로 변경
	let error = $state<string | null>(null);
	let isLoadingCombinations = $state(false);
	let isLoadingResult = $state(false);
	let copiedResults = $state<Set<string>>(new Set()); // 복사된 결과들을 개별 관리
	let isExpanded = $state(true); // 토글 상태

	// 검색 입력 필드 참조
	let searchInput: HTMLInputElement | undefined;

	// --- Effects ---
	$effect(() => {
		sourceTerm;
		direction;
		debouncedFindCombinations();
	});

	async function findCombinations() {
		segmentsList = [];
		selectedSegment = '';
		finalResults = [];
		error = null;

		if (!sourceTerm.trim()) {
			return;
		}

		isLoadingCombinations = true;
		try {
			const response = await fetch('/api/generator/segment', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ term: sourceTerm, direction })
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `HTTP error: ${response.status}`);
			}
			const data = await response.json();
			segmentsList = data.segments || [];

			// 첫 번째 항목 자동 선택
			if (segmentsList.length > 0) {
				convertToFinal(segmentsList[0]);
			}
		} catch (e: any) {
			error = e.message;
		} finally {
			isLoadingCombinations = false;
		}
	}

	async function convertToFinal(segment: string) {
		// 사용자가 수동으로 선택한 경우 pending된 debounce 호출 취소
		debouncedFindCombinations.cancel();

		error = null;

		if (!segment) {
			finalResults = [];
			selectedSegment = '';
			return;
		}

		// 같은 세그먼트를 다시 클릭한 경우 중복 요청 방지
		if (selectedSegment === segment && finalResults.length > 0 && !isLoadingResult) {
			return;
		}

		selectedSegment = segment;

		isLoadingResult = true;
		try {
			const response = await fetch('/api/generator', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ term: segment, direction })
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `HTTP error: ${response.status}`);
			}
			const data = await response.json();
			// 성공적으로 데이터를 받은 후에만 결과 업데이트
			finalResults = data.results || [];
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
			error = errorMsg;
			finalResults = []; // 에러 시에만 결과 초기화
			console.error('Final conversion error:', err);
		} finally {
			isLoadingResult = false;
		}
	}

	function handleCopy(text: string) {
		copiedResults.add(text);
		copiedResults = new Set(copiedResults); // 즉시 반응성 트리거
		setTimeout(() => {
			copiedResults.delete(text);
			copiedResults = new Set(copiedResults); // 2초 후 제거
		}, 2000);
	}

	function clearSearch() {
		sourceTerm = '';
		if (searchInput) {
			searchInput.focus();
		}
	}

	/**
	 * 방향 전환 후 포커스 이동
	 */
	function handleDirectionChange() {
		direction = direction === 'ko-to-en' ? 'en-to-ko' : 'ko-to-en';
		// 검색 입력 필드에 포커스 이동
		if (searchInput) {
			searchInput.focus();
		}
	}

	/**
	 * 토글 상태 변경
	 */
	function toggleExpanded() {
		isExpanded = !isExpanded;
	}

	const debouncedFindCombinations = debounce(findCombinations, 300);
</script>

<div class="space-y-4 rounded-lg border bg-gray-50 p-4">
	<!-- 토글 가능한 헤더 -->
	<button
		type="button"
		onclick={toggleExpanded}
		class="flex w-full items-center justify-between rounded-md px-2 py-1 text-left transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1"
		aria-expanded={isExpanded}
		aria-controls="term-generator-content"
	>
		<h2 class="text-xl font-bold text-gray-900">용어 변환기</h2>
		<svg
			class="h-5 w-5 text-gray-600 transition-transform duration-200 {isExpanded
				? 'rotate-180'
				: ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	<!-- 토글 가능한 내용 -->
	<div
		id="term-generator-content"
		class="space-y-4 overflow-hidden transition-all duration-300 {isExpanded
			? 'max-h-[2000px] opacity-100'
			: 'max-h-0 opacity-0'}"
	>
		<!-- Input Section -->
		<div class="relative">
			<div class="flex items-center space-x-2">
				<!-- Search Input -->
				<div class="relative flex-1">
					<!-- Search Icon -->
					<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
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
						bind:value={sourceTerm}
						placeholder={direction === 'ko-to-en' ? '한글 약어 입력...' : '영문 전체 단어 입력...'}
						class="input pl-10 pr-10"
					/>

					<!-- Clear Button -->
					{#if sourceTerm}
						<button
							type="button"
							onclick={clearSearch}
							class="absolute inset-y-0 right-0 flex items-center rounded pr-3 text-gray-600 transition-colors hover:text-gray-800 focus:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1"
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

				<!-- Direction Toggle -->
				<button onclick={handleDirectionChange} class="btn btn-outline w-36" title="방향 전환">
					{#if direction === 'ko-to-en'}
						<span class="font-bold">한</span>
						<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
								clip-rule="evenodd"
							/>
						</svg>
						<span class="font-bold">영</span>
					{:else}
						<span class="font-bold">영</span>
						<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
								clip-rule="evenodd"
							/>
						</svg>
						<span class="font-bold">한</span>
					{/if}
				</button>
			</div>
		</div>

		<!-- 가로 배치: 단어 조합 + 변환 결과 -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Combinations -->
			<div class="space-y-2">
				<h3 class="font-semibold text-gray-900">단어 조합</h3>
				<div class="h-48 overflow-y-auto rounded-md border bg-white p-2">
					{#if segmentsList.length > 0}
						<ul class="space-y-1">
							{#each segmentsList as segment}
								<li>
									<button
										type="button"
										onclick={() => convertToFinal(segment)}
										class="w-full rounded p-2 text-left transition-colors {selectedSegment ===
										segment
											? 'bg-blue-100 text-blue-800'
											: 'hover:bg-gray-100'}"
									>
										{segment}
									</button>
								</li>
							{/each}
						</ul>
					{:else if !isLoadingCombinations && sourceTerm}
						<p class="p-2 text-gray-700">결과를 찾을 수 없습니다.</p>
					{/if}
				</div>
			</div>

			<!-- Final Result -->
			<div class="space-y-2">
				<h3 class="font-semibold text-gray-900">변환 결과</h3>
				<div class="relative h-48 overflow-y-auto rounded-md border bg-white p-2">
					{#if isLoadingResult}
						<div class="flex items-center justify-center p-4">
							<svg
								class="h-6 w-6 animate-spin text-blue-600"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						</div>
					{:else if finalResults.length > 0}
						<!-- 통일된 목록 형태 -->
						<div class="space-y-1">
							{#each finalResults as result (result)}
								<div
									class="flex items-center justify-between rounded-md border border-gray-200 p-2 hover:bg-gray-50"
								>
									<span class="font-mono text-lg">{result}</span>
									<CopyToClipboard text={result} let:copy>
										<button
											type="button"
											onclick={() => {
												copy();
												handleCopy(result);
											}}
											class="rounded p-1 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
											aria-label="결과 복사"
										>
											{#if copiedResults.has(result)}
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="20"
													height="20"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
													class="text-green-600"
												>
													<polyline points="20,6 9,17 4,12"></polyline>
												</svg>
											{:else}
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="20"
													height="20"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												>
													<rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
													<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
												</svg>
											{/if}
										</button>
									</CopyToClipboard>
								</div>
							{/each}
						</div>
					{:else if error}
						<p class="text-red-600">{error}</p>
					{:else if selectedSegment}
						<p class="text-gray-700">변환할 수 없습니다.</p>
					{:else}
						<p class="text-gray-500">위에서 단어 조합을 선택하세요</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
	<!-- 토글 가능한 내용 끝 -->
</div>
