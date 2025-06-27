<script lang="ts">
	import CopyToClipboard from 'svelte-copy-to-clipboard';
	import { debounce } from '$lib/utils/debounce';

	// --- Component State ---
	let stage = $state<'input' | 'select' | 'result'>('input');
	let sourceTerm = $state('');
	let direction = $state<'ko-to-en' | 'en-to-ko'>('ko-to-en');
	let segmentsList = $state<string[]>([]);
	let selectedSegment = $state('');
	let finalResult = $state('');
	let error = $state<string | null>(null);
	let isLoadingCombinations = $state(false);
	let isLoadingResult = $state(false);

	// --- Effects ---
	$effect(() => {
		// Reset logic when sourceTerm or direction changes
		const term = sourceTerm; // to trigger effect
		const dir = direction; // to trigger effect
		stage = 'input';
		segmentsList = [];
		selectedSegment = '';
		finalResult = '';
		error = null;
		debouncedFindCombinations();
	});

	// --- Functions ---
	const findCombinations = async () => {
		if (!sourceTerm.trim()) {
			segmentsList = [];
			selectedSegment = '';
			finalResult = '';
			return;
		}
		isLoadingCombinations = true;
		error = null;

		try {
			const response = await fetch('/api/generator/segment', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ term: sourceTerm, direction })
			});
			const result = await response.json();
			if (result.success) {
				segmentsList = result.data;
				if (segmentsList.length === 0) {
					error = '유효한 조합을 찾지 못했습니다.';
				}
			} else {
				throw new Error(result.error || '분석 중 오류 발생');
			}
		} catch (e: any) {
			error = e.message;
		} finally {
			isLoadingCombinations = false;
		}
	};

	async function selectCombination(segment: string) {
		selectedSegment = segment;
		if (!selectedSegment) return;
		isLoadingResult = true;
		error = null;

		try {
			const response = await fetch('/api/generator', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ term: selectedSegment, direction })
			});
			const result = await response.json();
			if (result.success) {
				finalResult = result.data.convertedTerm;
			} else {
				throw new Error(result.error || '최종 변환 중 오류 발생');
			}
		} catch (e: any) {
			error = e.message;
		} finally {
			isLoadingResult = false;
		}
	}

	const debouncedFindCombinations = debounce(findCombinations, 300);
</script>

<div class="container mx-auto space-y-6 p-4">
	<!-- Input Section -->
	<div class="rounded-lg border p-6 shadow-md">
		<h2 class="mb-4 text-2xl font-bold">용어 변환기</h2>
		<textarea
			bind:value={sourceTerm}
			class="w-full rounded border p-2"
			rows="3"
			placeholder="변환할 용어를 입력하세요 (예: 도로명주소)"
		></textarea>
		<div class="mt-4 flex items-center space-x-4">
			<label
				><input type="radio" bind:group={direction} value="ko-to-en" name="direction" /> 한영</label
			>
			<label
				><input type="radio" bind:group={direction} value="en-to-ko" name="direction" /> 영한</label
			>
		</div>
	</div>

	<!-- Combinations & Result Section -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		<!-- Combinations -->
		<div class="rounded-lg border p-6 shadow-md">
			<h3 class="mb-4 text-xl font-bold">단어 조합</h3>
			{#if isLoadingCombinations}
				<p>조합을 찾는 중...</p>
			{:else if segmentsList.length > 0}
				<div class="space-y-2">
					{#each segmentsList as segment}
						<button
							onclick={() => selectCombination(segment)}
							class="w-full rounded-lg border p-3 text-left hover:bg-gray-100"
							class:!bg-blue-100={selectedSegment === segment}
						>
							{segment}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Result -->
		<div class="rounded-lg border p-6 shadow-md">
			<h3 class="mb-4 text-xl font-bold">변환 결과</h3>
			<div class="relative">
				<textarea
					bind:value={finalResult}
					class="w-full rounded border bg-gray-50 p-2"
					rows="3"
					readonly
					placeholder="단어 조합을 선택하세요"
				></textarea>
				{#if finalResult}
					<div class="absolute right-2 top-2">
						<CopyToClipboard text={finalResult} let:copy>
							<button onclick={copy} class="rounded-full p-2 hover:bg-gray-200" title="결과 복사">
								<svg
									class="h-6 w-6 text-gray-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
									/>
								</svg>
							</button>
						</CopyToClipboard>
					</div>
				{/if}
			</div>
			{#if isLoadingResult}
				<p class="mt-2">결과를 변환하는 중...</p>
			{/if}
		</div>
	</div>
	{#if error}<p class="mt-4 text-center text-red-500">{error}</p>{/if}
</div>
