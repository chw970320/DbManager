<script lang="ts">
	import CopyToClipboard from 'svelte-copy-to-clipboard';
	import { debounce } from '$lib/utils/debounce';
	import { createEventDispatcher } from 'svelte';

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

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		addterm: { standardName: string; abbreviation: string; englishName: string };
	}>();

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

	function handleAddToTerminology() {
		if (!selectedSegment || !finalResult || finalResult.includes('##')) return;

		// 방향에 따라 표준단어명과 영문약어 결정
		let standardName = '';
		let abbreviation = '';
		let englishName = '';

		if (direction === 'ko-to-en') {
			// 한글 → 영문: 선택된 조합이 표준단어명, 결과가 영문약어
			standardName = selectedSegment.replace(/_/g, ' '); // 언더스코어를 공백으로 변환
			abbreviation = finalResult.replace(/ /g, '_').toUpperCase(); // 공백을 언더스코어로, 대문자로 변환
			englishName = ''; // 영문명은 사용자가 입력
		} else {
			// 영문 → 한글: 선택된 조합이 영문약어, 결과가 표준단어명
			abbreviation = selectedSegment.replace(/ /g, '_').toUpperCase();
			standardName = finalResult.replace(/_/g, ' ');
			englishName = ''; // 영문명은 사용자가 입력
		}

		dispatch('addterm', {
			standardName,
			abbreviation,
			englishName
		});
	}

	// 용어 추가 버튼 활성화 조건 확인
	let canAddToTerminology = $derived(
		selectedSegment && finalResult && !finalResult.includes('##') && !selectedSegment.includes('##')
	);

	const debouncedFindCombinations = debounce(findCombinations, 300);
</script>

<div class="space-y-4 rounded-lg border bg-gray-50 p-4">
	<h2 class="text-xl font-bold text-gray-800">용어 변환기</h2>

	<!-- Input Section -->
	<div class="relative">
		<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
			<svg
				class="h-5 w-5 text-gray-400"
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
		<div class="flex items-center space-x-2">
			<input
				type="text"
				bind:value={sourceTerm}
				placeholder={direction === 'ko-to-en' ? '한글 약어 입력...' : '영문 전체 단어 입력...'}
				class="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 leading-5 placeholder-gray-500 focus:border-blue-500 focus:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
			/>
			<button
				onclick={() => (direction = direction === 'ko-to-en' ? 'en-to-ko' : 'ko-to-en')}
				class="btn btn-outline flex w-36 items-center justify-center space-x-2"
				title="방향 전환"
			>
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
			<h3 class="font-semibold">단어 조합</h3>
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
					<p class="p-2 text-gray-500">결과를 찾을 수 없습니다.</p>
				{/if}
			</div>
		</div>

		<!-- Final Result -->
		<div class="space-y-2">
			<h3 class="font-semibold">변환 결과</h3>
			<div class="relative min-h-24 rounded-md border bg-white p-2">
				{#if isLoadingResult}
					<p class="text-center">생성 중...</p>
				{:else if finalResult}
					<p class="p-2">{finalResult}</p>
					<div class="absolute right-1 top-1 flex items-center space-x-1">
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
						<button
							onclick={handleAddToTerminology}
							class="btn btn-ghost btn-sm p-1"
							class:opacity-50={!canAddToTerminology}
							class:cursor-not-allowed={!canAddToTerminology}
							disabled={!canAddToTerminology}
							title={canAddToTerminology
								? '용어집에 추가'
								: '##가 포함된 결과는 추가할 수 없습니다'}
						>
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
								class="lucide lucide-book-plus"
								><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /><path
									d="M9 10h6"
								/><path d="M12 7v6" /></svg
							>
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
