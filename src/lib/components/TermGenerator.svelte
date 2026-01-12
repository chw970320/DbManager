<script lang="ts">
	import { debounce } from '$lib/utils/debounce';
	import { createEventDispatcher } from 'svelte';

	// Props
	interface Props {
		filename?: string; // 현재 선택된 용어 파일명
	}

	let { filename = 'term.json' }: Props = $props();

	// --- Component State ---
	let sourceTerm = $state('');
	const direction = 'ko-to-en' as const; // 한영 변환만 지원
	let segmentsList = $state<string[]>([]);
	let selectedSegment = $state('');
	let finalResults = $state<string[]>([]); // 단일 결과에서 복수 결과로 변경
	let error = $state<string | null>(null);
	let isLoadingCombinations = $state(false);
	let isLoadingResult = $state(false);
	let copiedResults = $state<Set<string>>(new Set()); // 복사된 결과들을 개별 관리
	let isExpanded = $state(true); // 토글 상태
	let forbiddenWordInfo = $state<{
		isForbidden: boolean;
		isSynonym: boolean;
		recommendations: string[];
		recommendationMappings?: Array<{ recommendation: string; originalPart: string }>;
	} | null>(null);
	// 각 결과에 대한 validation 상태 저장
	let validationResults = $state<Map<string, { isValid: boolean; error?: string }>>(new Map());

	// 검색 입력 필드 참조
	let searchInput: HTMLInputElement | undefined;

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		addTerm: { termName: string; columnName: string };
	}>();

	// --- Effects ---
	$effect(() => {
		void sourceTerm;
		debouncedFindCombinations();
	});

	async function findCombinations() {
		segmentsList = [];
		selectedSegment = '';
		finalResults = [];
		error = null;
		forbiddenWordInfo = null;

		if (!sourceTerm.trim()) {
			return;
		}

		isLoadingCombinations = true;
		try {
			const response = await fetch(
				`/api/generator/segment?filename=${encodeURIComponent(filename)}`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ term: sourceTerm, direction })
				}
			);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `HTTP error: ${response.status}`);
			}
			const data = await response.json();
			segmentsList = data.segments || [];
			forbiddenWordInfo = data.forbiddenWordInfo || null;

			// 첫 번째 항목 자동 선택
			if (segmentsList.length > 0) {
				convertToFinal(segmentsList[0]);
			}
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.';
		} finally {
			isLoadingCombinations = false;
		}
	}

	async function convertToFinal(segment: string) {
		// 사용자가 수동으로 선택한 경우 pending된 debounce 호출 취소
		debouncedFindCombinations.cancel();

		error = null;
		validationResults = new Map();

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
			const response = await fetch(`/api/generator?filename=${encodeURIComponent(filename)}`, {
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

			// 각 결과에 대해 접미사 validation 수행
			if (finalResults.length > 0) {
				await validateSegmentResults(segment);
			}
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
			error = errorMsg;
			finalResults = []; // 에러 시에만 결과 초기화
			console.error('Final conversion error:', err);
		} finally {
			isLoadingResult = false;
		}
	}

	// 단어 조합에 대한 접미사 validation 수행
	async function validateSegmentResults(segment: string) {
		// columnName이 없으면 validation 건너뛰기
		const columnName = finalResults[0] || '';
		if (!columnName || !columnName.trim()) {
			return;
		}

		// termName이 2단어 이상의 조합인지 사전 확인 (언더스코어로 분리)
		const termParts = segment
			.trim()
			.split('_')
			.map((p) => p.trim())
			.filter((p) => p.length > 0);
		if (termParts.length < 2) {
			// 단일 단어는 validation 대상이 아님
			return;
		}

		try {
			const response = await fetch(
				`/api/term/validate?filename=${encodeURIComponent(filename)}`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						termName: segment,
						columnName: columnName,
						domainName: ''
					})
				}
			);

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					// validation 통과
					validationResults.set(segment, { isValid: true });
				} else {
					// validation 실패 - API에서 반환된 오류 메시지 사용
					const errorMessage = result.error || result.message || 'Validation 확인 실패';
					validationResults.set(segment, { isValid: false, error: errorMessage });
				}
			} else {
				// API 호출 실패 시 응답 본문에서 오류 메시지 추출 시도
				try {
					const errorData = await response.json();
					const errorMessage =
						errorData.error ||
						errorData.message ||
						`Validation 확인 실패 (HTTP ${response.status})`;
					validationResults.set(segment, { isValid: false, error: errorMessage });
				} catch {
					// JSON 파싱 실패 시 기본 메시지 사용
					validationResults.set(segment, {
						isValid: false,
						error: `Validation 확인 실패 (HTTP ${response.status})`
					});
				}
			}
		} catch (err) {
			// 네트워크 오류 등 예외 상황은 조용히 처리 (validation은 선택적 기능)
			// 콘솔 에러는 출력하지 않음 (사용자 경험에 영향을 주지 않도록)
		}
		validationResults = new Map(validationResults); // 반응성 트리거
	}

	/**
	 * 클립보드에 텍스트 복사 (fallback 포함)
	 */
	async function copyToClipboard(text: string): Promise<boolean> {
		try {
			// Modern Clipboard API 사용 (HTTPS 환경)
			if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(text);
				return true;
			}
		} catch (err) {
			console.warn('Clipboard API 실패, fallback 사용:', err);
		}

		// Fallback: execCommand 사용 (구형 브라우저 지원)
		try {
			const textArea = document.createElement('textarea');
			textArea.value = text;
			textArea.style.position = 'fixed';
			textArea.style.left = '-999999px';
			textArea.style.top = '-999999px';
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();

			const successful = document.execCommand('copy');
			document.body.removeChild(textArea);

			if (successful) {
				return true;
			}
		} catch (err) {
			console.warn('execCommand fallback 실패:', err);
		}

		// 모든 방법 실패 시 사용자에게 알림
		alert(`복사 실패: ${text}\n\n수동으로 복사해주세요.`);
		return false;
	}

	function handleCopy(text: string) {
		// 복사 시도
		copyToClipboard(text).then((success) => {
			if (success) {
				copiedResults.add(text);
				copiedResults = new Set(copiedResults); // 즉시 반응성 트리거
				setTimeout(() => {
					copiedResults.delete(text);
					copiedResults = new Set(copiedResults); // 2초 후 제거
				}, 2000);
			}
		});
	}

	/**
	 * 새 용어 추가 버튼 클릭 처리
	 */
	function handleAddTerm(result: string) {
		if (selectedSegment) {
			dispatch('addTerm', {
				termName: selectedSegment,
				columnName: result
			});
		}
	}

	function clearSearch() {
		sourceTerm = '';
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
						placeholder="한글 약어 입력..."
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
			</div>
		</div>

		<!-- 금칙어 및 이음동의어 경고 -->
		{#if forbiddenWordInfo && (forbiddenWordInfo.isForbidden || forbiddenWordInfo.isSynonym)}
			<div class="rounded-md border border-yellow-300 bg-yellow-50 p-3">
				<div class="flex items-start">
					<svg
						class="mr-2 h-5 w-5 flex-shrink-0 text-yellow-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
					<div class="flex-1">
						<p class="text-sm font-medium text-yellow-800">
							{forbiddenWordInfo.isForbidden
								? '금칙어가 입력되었습니다.'
								: '이음동의어가 입력되었습니다.'}
						</p>
						{#if forbiddenWordInfo.recommendations.length > 0}
							<p class="mt-1 text-xs text-yellow-700">
								다음 표준단어명을 사용하는 것을 권장합니다:
							</p>
							<div class="mt-2 flex flex-wrap gap-2">
								{#each forbiddenWordInfo.recommendations as rec (rec)}
									{@const mapping = forbiddenWordInfo.recommendationMappings?.find(
										(m) => m.recommendation === rec
									)}
									{@const originalPart = mapping?.originalPart || rec}
									<button
										type="button"
										class="rounded border border-yellow-300 bg-yellow-100 px-2 py-1 text-xs text-yellow-800 hover:bg-yellow-200"
										onclick={() => {
											// 합성 단어인 경우 해당 부분만 교체
											if (mapping && originalPart !== sourceTerm) {
												// 원본 문자열에서 해당 부분을 찾아서 추천 단어로 교체 (대소문자 구분 없이)
												const originalPartEscaped = originalPart.replace(
													/[.*+?^${}()|[\]\\]/g,
													'\\$&'
												);
												const regex = new RegExp(originalPartEscaped, 'gi');
												// 원본 문자열에서 실제로 매칭되는 부분을 찾아서 그 부분만 교체
												const match = sourceTerm.match(regex);
												if (match) {
													// 첫 번째 매칭된 부분의 원본 문자열(대소문자 포함)을 추천 단어로 교체
													sourceTerm = sourceTerm.replace(regex, rec);
												} else {
													// 매칭 실패 시 전체 교체
													sourceTerm = rec;
												}
											} else {
												// 단일 단어이거나 매핑 정보가 없는 경우 전체 교체
												sourceTerm = rec;
											}
											forbiddenWordInfo = null;
										}}
									>
										{rec}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- 가로 배치: 단어 조합 + 변환 결과 -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Combinations -->
			<div class="space-y-2">
				<h3 class="font-semibold text-gray-900">단어 조합</h3>
				<div class="h-48 overflow-y-auto rounded-md border bg-white p-2">
					{#if segmentsList.length > 0}
						<ul class="space-y-1">
							{#each segmentsList as segment (segment)}
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
					{:else}
						<p class="text-gray-500">용어를 입력하세요</p>
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
									<div class="flex items-center space-x-1">
										<button
											type="button"
											onclick={() => handleCopy(result)}
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
														<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
														></path>
													</svg>
												{/if}
											</button>
										{#if selectedSegment}
											{@const validation = validationResults.get(selectedSegment)}
											{#if validation?.isValid === true}
												<!-- Validation 통과: + 버튼 -->
												<button
													type="button"
													onclick={() => handleAddTerm(result)}
													class="rounded p-1 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
													aria-label="새 용어 추가"
													title="새 용어 추가"
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
													>
														<line x1="12" y1="5" x2="12" y2="19"></line>
														<line x1="5" y1="12" x2="19" y2="12"></line>
													</svg>
												</button>
											{:else if validation?.isValid === false}
												<!-- Validation 실패: 금지 버튼 -->
												<button
													type="button"
													disabled
													class="cursor-not-allowed rounded p-1 text-red-600 opacity-50"
													aria-label="Validation 실패"
													title={validation.error || 'Validation 확인 실패'}
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
													>
														<circle cx="12" cy="12" r="10"></circle>
														<line x1="12" y1="8" x2="12" y2="12"></line>
														<line x1="12" y1="16" x2="12.01" y2="16"></line>
													</svg>
												</button>
											{:else}
												<!-- Validation 진행 중: 로딩 표시 -->
												<div class="rounded p-1 text-gray-400">
													<svg
														class="h-5 w-5 animate-spin"
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
											{/if}
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{:else if error}
						<p class="text-red-600">{error}</p>
					{:else if selectedSegment}
						<p class="text-gray-700">변환할 수 없습니다.</p>
					{:else}
						<p class="text-gray-500">단어 조합을 선택하세요</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
	<!-- 토글 가능한 내용 끝 -->
</div>
