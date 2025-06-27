<script lang="ts">
	import { debounce } from '$lib/utils/debounce.ts';

	let sourceTerm = $state('');
	let convertedTerm = $state('');
	let direction = $state<'ko-to-en' | 'en-to-ko'>('ko-to-en');
	let loading = $state(false);
	let copied = $state(false);

	const convertTerm = async () => {
		if (!sourceTerm.trim()) {
			convertedTerm = '';
			return;
		}
		loading = true;
		try {
			const response = await fetch('/api/generator', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ term: sourceTerm, direction })
			});
			const result = await response.json();
			if (result.success) {
				convertedTerm = result.data.convertedTerm;
			} else {
				convertedTerm = '오류 발생';
			}
		} catch (error) {
			console.error('변환 오류:', error);
			convertedTerm = '서버 통신 오류';
		} finally {
			loading = false;
		}
	};

	const debouncedConvert = debounce(convertTerm, 300);

	$effect(() => {
		const term = sourceTerm;
		const dir = direction;
		debouncedConvert();
	});

	async function copyToClipboard() {
		if (!convertedTerm) return;
		try {
			await navigator.clipboard.writeText(convertedTerm);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (err) {
			console.error('클립보드 복사 실패:', err);
			alert('클립보드 복사에 실패했습니다.');
		}
	}

	function swapDirection() {
		const temp = sourceTerm;
		sourceTerm = convertedTerm;
		convertedTerm = temp;
		direction = direction === 'ko-to-en' ? 'en-to-ko' : 'ko-to-en';
	}
</script>

<div class="mx-auto w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg">
	<h2 class="mb-6 text-2xl font-bold text-gray-800">용어 변환기</h2>

	<div class="mb-6 flex items-center justify-start space-x-4">
		<label class="flex cursor-pointer items-center">
			<input
				type="radio"
				name="direction"
				bind:group={direction}
				value="ko-to-en"
				class="radio radio-primary"
			/>
			<span class="ml-2">한글 → 영문</span>
		</label>
		<label class="flex cursor-pointer items-center">
			<input
				type="radio"
				name="direction"
				bind:group={direction}
				value="en-to-ko"
				class="radio radio-primary"
			/>
			<span class="ml-2">영문 → 한글</span>
		</label>
	</div>

	<div class="grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr,auto,1fr]">
		<textarea
			bind:value={sourceTerm}
			placeholder={direction === 'ko-to-en' ? '도로명_주소' : 'RDNM_ADDR'}
			class="textarea textarea-bordered h-32 w-full rounded-xl border p-2"
		></textarea>

		<button onclick={swapDirection} class="btn btn-circle btn-ghost">
			<!-- Swap Icon -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
				/>
			</svg>
		</button>

		<div class="relative h-full w-full">
			<textarea
				bind:value={convertedTerm}
				placeholder={direction === 'ko-to-en' ? 'RDNM_ADDR' : '도로명_주소'}
				class="textarea textarea-bordered h-32 w-full rounded-xl border bg-gray-50 p-2"
				readonly
			></textarea>
			<button
				title="결과 복사"
				onclick={copyToClipboard}
				class="absolute right-2 top-2 rounded-full bg-gray-200/50 p-2 text-gray-600 transition hover:bg-gray-300/50 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={!convertedTerm || loading}
			>
				{#if copied}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5 text-green-500"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
							clip-rule="evenodd"
						/>
					</svg>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
						/>
					</svg>
				{/if}
			</button>
		</div>
	</div>

	{#if loading}
		<div class="mt-4 text-center">
			<span class="loading loading-dots loading-md"></span>
		</div>
	{/if}
</div>
