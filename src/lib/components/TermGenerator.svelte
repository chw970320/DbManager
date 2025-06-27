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

	// --- Effects ---
	$effect(() => {
		const term = sourceTerm;
		const dir = direction;
		segmentsList = [];
		selectedSegment = '';
		finalResult = '';
		error = null;
		debouncedFindCombinations();
	});

	async function findCombinations() {
		if (!sourceTerm.trim()) {
			segmentsList = [];
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
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `HTTP error: ${response.status}`);
			}
			const data = await response.json();
			segmentsList = data.segments;
		} catch (e: any) {
			error = e.message;
		} finally {
			isLoadingCombinations = false;
		}
	}

	async function generateResult(segment: string) {
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

	const debouncedFindCombinations = debounce(findCombinations, 300);
</script>

<div class="space-y-4 rounded-lg border border-gray-600 bg-gray-50 p-4">
	<h2 class="text-xl font-bold text-gray-800">Advanced Term Converter</h2>

	<!-- Input Section -->
	<div class="space-y-2">
		<div class="flex items-center space-x-2">
			<input
				type="text"
				bind:value={sourceTerm}
				placeholder={direction === 'ko-to-en' ? '한글 약어 입력...' : '영문 전체 단어 입력...'}
				class="input input-bordered w-full"
			/>
			<button
				onclick={() => (direction = direction === 'ko-to-en' ? 'en-to-ko' : 'ko-to-en')}
				class="btn btn-outline"
				title="방향 전환"
			>
				↔
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
			<div class="min-h-24 rounded-md border border-gray-600 bg-white p-2">
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
			<div class="relative min-h-24 rounded-md border border-gray-600 bg-white p-2">
				{#if isLoadingResult}
					<p class="text-center">생성 중...</p>
				{:else if finalResult}
					<p class="p-2">{finalResult}</p>
					<div class="absolute right-1 top-1">
						<CopyToClipboard text={finalResult} let:copy>
							<button onclick={copy} class="btn btn-ghost btn-sm p-1">
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
							</button>
						</CopyToClipboard>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
