<script lang="ts">
	import CopyToClipboard from 'svelte-copy-to-clipboard';
	import { debounce } from '$lib/utils/debounce';

	// --- Component State ---
	let sourceTerm = $state('');
	let direction = $state<'ko-to-en' | 'en-to-ko'>('ko-to-en');
	let segmentsList = $state<string[]>([]);
	let selectedSegment = $state('');
	let finalResult = $state('');
	let error = $state<string | null>(null);
	let isLoadingCombinations = $state(false);
	let isLoadingResult = $state(false);
	let justCopied = $state(false);
	let copyTimeout: ReturnType<typeof setTimeout>;

	// 검색 입력 필드 참조
	let searchInput: HTMLInputElement | undefined;

	// --- Effects ---
	$effect(() => {
		sourceTerm;
		direction;
		debouncedFindCombinations();
		return () => clearTimeout(copyTimeout);
	});

	async function findCombinations() {
		segmentsList = [];
		selectedSegment = '';
		finalResult = '';
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
		} catch (e: any) {
			error = e.message;
		} finally {
			isLoadingCombinations = false;
		}
	}

	async function generateResult(segment: string) {
		debouncedFindCombinations.cancel();

		isLoadingResult = true;
		selectedSegment = segment;
		error = null;
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
			finalResult = data.result;
		} catch (e: any) {
			error = e.message;
		} finally {
			isLoadingResult = false;
		}
	}

	function handleCopy() {
		justCopied = true;
		clearTimeout(copyTimeout);
		copyTimeout = setTimeout(() => {
			justCopied = false;
		}, 1000);
	}

	/**
	 * 검색어 초기화
	 */
	function clearSearch() {
		sourceTerm = '';
		// 검색 입력 필드에 포커스 이동
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

	const debouncedFindCombinations = debounce(findCombinations, 300);
</script>

<div class="space-y-4 rounded-lg border bg-gray-50 p-4">
	<h2 class="text-xl font-bold text-gray-900">용어 변환기</h2>

	<!-- Input Section -->
	<div class="relative">
		<div class="flex items-center space-x-2">
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

				<!-- X 버튼 -->
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
			<button onclick={handleDirectionChange} class="btn btn-outline w-36" title="방향 전환">
				{#if direction === 'ko-to-en'}
					<span class="font-bold">한</span>
					<span>→</span>
					<span class="font-bold">영</span>
				{:else}
					<span class="font-bold">영</span>
					<span>→</span>
					<span class="font-bold">한</span>
				{/if}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="lucide lucide-repeat"
					><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path
						d="m7 22-4-4 4-4"
					/><path d="M21 13v1a4 4 0 0 1-4 4H3" /></svg
				>
			</button>
		</div>
	</div>

	<!-- Loading/Error Section -->
	{#if isLoadingCombinations}
		<div class="text-center">분석 중...</div>
	{:else if error}
		<div class="text-center text-red-500">{error}</div>
	{/if}

	<!-- Results Section -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<!-- Combinations -->
		<div class="space-y-2">
			<h3 class="font-semibold text-gray-900">단어 조합</h3>
			<div class="min-h-24 rounded-md border bg-white p-2">
				{#if segmentsList.length > 0}
					<ul class="space-y-1">
						{#each segmentsList as segment}
							<li>
								<button
									class="w-full rounded p-2 text-left hover:bg-gray-200"
									class:bg-blue-200={selectedSegment === segment}
									onclick={() => generateResult(segment)}
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
			<div class="relative min-h-24 rounded-md border bg-white p-2">
				{#if isLoadingResult}
					<p class="text-center">생성 중...</p>
				{:else if finalResult}
					<p class="p-2">{finalResult}</p>
					<div class="absolute right-1 top-1">
						<CopyToClipboard text={finalResult} let:copy>
							<button
								onclick={() => {
									copy();
									handleCopy();
								}}
								class="btn btn-ghost btn-sm p-1"
								title={justCopied ? '복사됨!' : '클립보드에 복사'}
							>
								{#if justCopied}
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
										class="lucide lucide-check text-green-500"
										><path d="M20 6 9 17l-5-5"></path></svg
									>
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
										class="lucide lucide-clipboard-copy"
										><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path
											d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
										></path><path
											d="M15 11h-1.1a.9.9 0 0 0-.9.9v1.1c0 .5.4.9.9.9H15a.9.9 0 0 0 .9-.9v-1.1a.9.9 0 0 0-.9-.9Z"
										></path></svg
									>
								{/if}
							</button>
						</CopyToClipboard>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
