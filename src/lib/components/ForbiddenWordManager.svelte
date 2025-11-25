<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { ForbiddenWordEntry, ApiResponse } from '$lib/types/vocabulary';

	// Props
	interface Props {
		isOpen?: boolean;
	}

	let { isOpen = false }: Props = $props();

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	// State
	let forbiddenWords = $state<ForbiddenWordEntry[]>([]);
	let isLoading = $state(false);
	let error = $state('');
	let successMessage = $state('');
	let hasLoaded = $state(false); // 데이터 로드 완료 여부 추적
	let vocabularyFiles = $state<string[]>([]); // 사용 가능한 단어집 파일 목록
	let selectedScope = $state('global'); // 현재 선택된 범위 ('global' 또는 파일명)

	// Form state
	let formData = $state({
		keyword: '',
		type: 'standardName' as 'standardName' | 'abbreviation',
		reason: '',
		targetFile: undefined as string | undefined
	});
	let formErrors = $state({
		keyword: ''
	});
	let isSubmitting = $state(false);
	let editingId = $state<string | null>(null);

	// Form validation
	function validateKeyword(value: string): string {
		if (!value.trim()) {
			return '키워드는 필수 입력 항목입니다.';
		}
		if (value.trim().length < 1) {
			return '키워드는 최소 1자 이상 입력해야 합니다.';
		}
		return '';
	}

	// Real-time validation
	$effect(() => {
		formErrors.keyword = validateKeyword(formData.keyword);
	});

	// Form validation check
	function isFormValid(): boolean {
		return !formErrors.keyword && !!formData.keyword.trim();
	}

	// Load vocabulary files
	async function loadVocabularyFiles() {
		try {
			const response = await fetch('/api/vocabulary/files');
			const result: ApiResponse = await response.json();
			if (result.success && Array.isArray(result.data)) {
				vocabularyFiles = result.data as string[];
			}
		} catch (error) {
			console.error('파일 목록 로드 오류:', error);
		}
	}

	// Load forbidden words
	async function loadForbiddenWords() {
		if (isLoading || hasLoaded) return; // 이미 로딩 중이거나 로드 완료된 경우 중복 요청 방지

		isLoading = true;
		error = '';

		try {
			const params = new URLSearchParams();
			if (selectedScope) {
				params.set('scope', selectedScope);
			}
			const response = await fetch(`/api/forbidden-words?${params}`);
			const result: ApiResponse = await response.json();

			if (
				result.success &&
				result.data &&
				typeof result.data === 'object' &&
				'entries' in result.data
			) {
				const data = result.data as { entries: unknown };
				if (Array.isArray(data.entries)) {
					const entries = data.entries;
					const isValid =
						entries.length === 0 ||
						(typeof entries[0] === 'object' &&
							entries[0] !== null &&
							'keyword' in (entries[0] as Record<string, unknown>));

					if (isValid) {
						forbiddenWords = entries as ForbiddenWordEntry[];
						hasLoaded = true; // 로드 완료 표시
					} else {
						error = '잘못된 데이터 형식입니다.';
					}
				} else {
					error = '잘못된 데이터 형식입니다.';
				}
			} else {
				error = result.error || '금지어 목록을 불러오는데 실패했습니다.';
			}
		} catch {
			error = '서버 연결에 실패했습니다.';
		} finally {
			isLoading = false;
		}
	}

	// Add new forbidden word
	async function handleSave() {
		if (!isFormValid()) return;

		isSubmitting = true;
		error = '';
		successMessage = '';

		try {
			const method = editingId ? 'PUT' : 'POST';
			const body = editingId
				? {
						id: editingId,
						...formData,
						targetFile: selectedScope === 'global' ? undefined : selectedScope
					}
				: { ...formData, targetFile: selectedScope === 'global' ? undefined : selectedScope };

			const response = await fetch('/api/forbidden-words', {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			const result: ApiResponse = await response.json();

			if (result.success) {
				successMessage = editingId
					? '금지어가 성공적으로 수정되었습니다.'
					: '금지어가 성공적으로 추가되었습니다.';
				resetForm();
				// 캐시 무효화 후 새로고침
				hasLoaded = false;
				await loadForbiddenWords();
			} else {
				error = result.error || '금지어 처리에 실패했습니다.';
			}
		} catch {
			error = '서버 연결에 실패했습니다.';
		} finally {
			isSubmitting = false;
		}
	}

	// Edit forbidden word
	function handleEdit(word: ForbiddenWordEntry) {
		editingId = word.id;
		formData = {
			keyword: word.keyword,
			type: word.type,
			reason: word.reason || '',
			targetFile: word.targetFile
		};
		successMessage = '';
		error = '';
	}

	// Delete forbidden word
	async function handleDelete(id: string, keyword: string) {
		if (!confirm(`'${keyword}' 금지어를 삭제하시겠습니까?`)) return;

		isLoading = true;
		error = '';
		successMessage = '';

		try {
			const response = await fetch('/api/forbidden-words', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});

			const result: ApiResponse = await response.json();

			if (result.success) {
				successMessage = '금지어가 성공적으로 삭제되었습니다.';
				// 캐시 무효화 후 새로고침
				hasLoaded = false;
				await loadForbiddenWords();

				// 현재 수정 중인 항목을 삭제한 경우 폼 초기화
				if (editingId === id) {
					resetForm();
				}
			} else {
				error = result.error || '금지어 삭제에 실패했습니다.';
			}
		} catch {
			error = '서버 연결에 실패했습니다.';
		} finally {
			isLoading = false;
		}
	}

	// Reset form
	function resetForm() {
		formData = {
			keyword: '',
			type: 'standardName',
			reason: '',
			targetFile: undefined
		};
		editingId = null;
		formErrors = { keyword: '' };
	}

	// Close modal
	function handleClose() {
		resetForm();
		error = '';
		successMessage = '';
		// 모달 닫을 때 로드 상태 초기화하지 않음 (캐시 유지)
		dispatch('close');
	}

	// Handle background click
	function handleBackgroundClick(event: MouseEvent) {
		// 배경을 클릭했을 때만 모달 닫기 (이벤트 타켓이 배경 div인 경우)
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	// Load data when modal opens
	$effect(() => {
		if (isOpen && !hasLoaded) {
			loadVocabularyFiles();
			loadForbiddenWords();
		}
	});

	// Clear messages after 3 seconds
	$effect(() => {
		if (successMessage) {
			const timer = setTimeout(() => {
				successMessage = '';
			}, 3000);
			return () => clearTimeout(timer);
		}
	});
	function focus(el: HTMLElement, shouldFocus: boolean) {
		if (shouldFocus) el.focus();

		return {
			update(newShouldFocus: boolean) {
				if (newShouldFocus) el.focus();
			}
		};
	}
</script>

{#if isOpen}
	<!-- Modal overlay -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		onclick={handleBackgroundClick}
	>
		<div
			class="mx-4 w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="mb-4 flex items-center justify-between border-b pb-4">
				<h2 class="text-xl font-bold text-gray-900">금지어 관리</h2>
				<button
					onclick={handleClose}
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

			<!-- Scope Selection -->
			<div class="mb-8 rounded-xl border border-gray-100 bg-gray-50 p-5">
				<div class="mb-3 flex items-center justify-between">
					<label for="scope-select" class="block text-sm font-semibold text-gray-700"
						>관리 범위 선택</label
					>
				</div>
				<div class="relative">
					<select
						id="scope-select"
						bind:value={selectedScope}
						onchange={() => {
							hasLoaded = false;
							resetForm();
							loadForbiddenWords();
						}}
						class="block w-full appearance-none rounded-lg border-gray-300 bg-white py-3 pl-4 pr-10 text-gray-700 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
						disabled={isLoading || isSubmitting}
					>
						<option value="global">전체 (Global)</option>
						{#each vocabularyFiles as file}
							<option value={file}>{file}</option>
						{/each}
					</select>
					<div
						class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</div>
				</div>
				<div class="mt-3 flex items-start space-x-2">
					<svg
						class="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<p class="text-xs leading-relaxed text-gray-600">
						{selectedScope === 'global'
							? '모든 파일에 공통으로 적용되는 금지어입니다. 특정 파일에만 적용하려면 파일을 선택하세요.'
							: `'${selectedScope}' 파일에만 적용되는 금지어입니다. 전체 금지어는 포함되지 않습니다.`}
					</p>
				</div>
			</div>

			<!-- Error/Success Messages -->
			{#if error}
				<div class="mb-4 rounded-md bg-red-50 p-4">
					<p class="text-sm text-red-800">{error}</p>
				</div>
			{/if}
			{#if successMessage}
				<div class="mb-4 rounded-md bg-green-50 p-4">
					<p class="text-sm text-green-800">{successMessage}</p>
				</div>
			{/if}

			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<!-- Form Section -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-900">
						{editingId ? '금지어 수정' : '새 금지어 추가'}
					</h3>

					<form
						onsubmit={(e) => {
							e.preventDefault();
							handleSave();
						}}
						class="space-y-4"
					>
						<!-- 키워드 -->
						<div>
							<label for="keyword" class="mb-1 block text-sm font-medium text-gray-900">
								키워드 <span class="text-red-700">*</span>
							</label>
							<input
								id="keyword"
								type="text"
								bind:value={formData.keyword}
								use:focus={editingId !== null}
								placeholder="금지할 키워드를 입력하세요"
								class="input"
								class:input-error={formErrors.keyword}
								disabled={isSubmitting}
							/>
							{#if formErrors.keyword}
								<p class="text-error mt-1 text-sm">{formErrors.keyword}</p>
							{/if}
						</div>

						<!-- 타입 -->
						<div>
							<label class="mb-2 block text-sm font-medium text-gray-900">
								적용 타입 <span class="text-red-700">*</span>
							</label>
							<div class="space-y-2">
								<label class="flex items-center">
									<input
										type="radio"
										bind:group={formData.type}
										value="standardName"
										disabled={isSubmitting}
										class="mr-2"
									/>
									<span class="text-sm text-gray-700">표준단어명</span>
								</label>
								<label class="flex items-center">
									<input
										type="radio"
										bind:group={formData.type}
										value="abbreviation"
										disabled={isSubmitting}
										class="mr-2"
									/>
									<span class="text-sm text-gray-700">영문약어</span>
								</label>
							</div>
						</div>

						<!-- 사유 -->
						<div>
							<label for="reason" class="mb-1 block text-sm font-medium text-gray-900">
								사유 (선택사항)
							</label>
							<textarea
								id="reason"
								bind:value={formData.reason}
								placeholder="금지어로 선정된 이유를 입력하세요"
								rows="3"
								class="input resize-none"
								disabled={isSubmitting}
							></textarea>
						</div>

						<!-- 버튼 그룹 -->
						<div class="flex justify-end space-x-3 pt-4">
							<button
								type="button"
								onclick={resetForm}
								class="btn btn-secondary"
								disabled={isSubmitting}
							>
								초기화
							</button>
							<button
								type="submit"
								class="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
								disabled={!isFormValid() || isSubmitting}
							>
								{#if isSubmitting}
									{editingId ? '수정 중...' : '추가 중...'}
								{:else}
									{editingId ? '수정' : '추가'}
								{/if}
							</button>
						</div>
					</form>
				</div>

				<!-- List Section -->
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold text-gray-900">금지어 목록</h3>
						<button
							onclick={() => {
								hasLoaded = false; // 캐시 무효화
								loadForbiddenWords();
							}}
							class="btn btn-secondary text-sm"
							disabled={isLoading}
						>
							{isLoading ? '새로고침 중...' : '새로고침'}
						</button>
					</div>

					{#if isLoading}
						<div class="flex justify-center py-8">
							<div class="text-gray-500">로딩 중...</div>
						</div>
					{:else if forbiddenWords.length === 0}
						<div class="py-8 text-center text-gray-500">등록된 금지어가 없습니다.</div>
					{:else}
						<div class="max-h-96 overflow-y-auto rounded-lg border">
							<table class="w-full">
								<thead class="bg-gray-50">
									<tr>
										<th
											class="whitespace-nowrap px-4 py-2 text-left text-sm font-medium text-gray-900"
											>키워드</th
										>
										<th
											class="whitespace-nowrap px-4 py-2 text-left text-sm font-medium text-gray-900"
											>타입</th
										>
										<th
											class="whitespace-nowrap px-4 py-2 text-left text-sm font-medium text-gray-900"
											>사유</th
										>
										<th
											class="whitespace-nowrap px-4 py-2 text-center text-sm font-medium text-gray-900"
											>작업</th
										>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-200">
									{#each forbiddenWords as word (word.id)}
										<tr class="hover:bg-gray-50">
											<td class="px-4 py-2 text-sm font-medium text-gray-900">{word.keyword}</td>
											<td class="px-4 py-2 text-sm text-gray-600">
												{word.type === 'standardName' ? '표준단어명' : '영문약어'}
											</td>
											<td class="px-4 py-2 text-sm text-gray-600">
												{word.reason || '-'}
											</td>
											<td class="px-4 py-2 text-center">
												<div class="flex justify-center space-x-2">
													<button
														onclick={() => handleEdit(word)}
														class="whitespace-nowrap text-sm text-blue-600 hover:text-blue-800"
														disabled={isSubmitting}
													>
														수정
													</button>
													<button
														onclick={() => handleDelete(word.id, word.keyword)}
														class="whitespace-nowrap text-sm text-red-600 hover:text-red-800"
														disabled={isSubmitting}
													>
														삭제
													</button>
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</div>

			<!-- Close Button -->
			<div class="mt-6 flex justify-end border-t pt-4">
				<button onclick={handleClose} class="btn btn-secondary" disabled={isSubmitting}>
					닫기
				</button>
			</div>
		</div>
	</div>
{/if}
