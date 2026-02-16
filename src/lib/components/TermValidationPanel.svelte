<script lang="ts">
	import type {
		ValidationResult,
		ValidationErrorType,
		AutoFixSuggestion
	} from '$lib/types/term.js';
	import { createEventDispatcher } from 'svelte';

	interface Props {
		results?: ValidationResult[];
		totalCount?: number;
		failedCount?: number;
		passedCount?: number;
		loading?: boolean;
		open?: boolean;
	}

	let {
		results = [],
		totalCount = 0,
		failedCount = 0,
		passedCount = 0,
		loading = false,
		open = false
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		close: void;
		edit: { entryId: string; suggestions?: AutoFixSuggestion };
		autofix: { entryId: string; suggestions: AutoFixSuggestion; result: ValidationResult };
	}>();

	// 디버깅: props 확인
	$effect(() => {
		if (open) {
			console.log('TermValidationPanel - Props:', {
				resultsLength: results?.length || 0,
				results: results,
				totalCount,
				failedCount,
				passedCount,
				loading,
				open
			});
		}
	});

	// 필터 상태
	let selectedErrorType = $state<ValidationErrorType | 'ALL'>('ALL');
	let searchQuery = $state('');

	// 필터링 함수
	function getFilteredResults() {
		let filtered = results;

		// 오류 유형 필터
		if (selectedErrorType !== 'ALL') {
			filtered = filtered.filter((result) =>
				result.errors.some((error) => error.type === selectedErrorType)
			);
		}

		// 검색 필터
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(result) =>
					result.entry.termName.toLowerCase().includes(query) ||
					result.entry.columnName.toLowerCase().includes(query) ||
					result.entry.domainName.toLowerCase().includes(query) ||
					result.errors.some((error) => error.message.toLowerCase().includes(query))
			);
		}

		return filtered;
	}

	// 필터링된 결과
	let filteredResults = $derived(getFilteredResults());

	// 오류 유형 목록 함수
	function getErrorTypes() {
		const types = new Set<ValidationErrorType>();
		results.forEach((result) => {
			result.errors.forEach((error) => types.add(error.type));
		});
		return Array.from(types);
	}

	// 오류 유형 목록
	let errorTypes = $derived(getErrorTypes());

	// 오류 유형 한글명
	function getErrorTypeLabel(type: ValidationErrorType): string {
		const labels: Record<ValidationErrorType, string> = {
			TERM_NAME_LENGTH: '용어명 길이',
			TERM_NAME_SUFFIX: '용어명 접미사',
			TERM_NAME_DUPLICATE: '용어명 중복',
			TERM_UNIQUENESS: '용어 유일성',
			TERM_NAME_MAPPING: '용어명 매핑',
			COLUMN_NAME_MAPPING: '컬럼명 매핑',
			TERM_COLUMN_ORDER_MISMATCH: '용어명-컬럼명 순서',
			DOMAIN_NAME_MAPPING: '도메인명 매핑'
		};
		return labels[type] || type;
	}

	// 오류 유형 색상
	function getErrorTypeColor(type: ValidationErrorType): string {
		const colors: Record<ValidationErrorType, string> = {
			TERM_NAME_LENGTH: 'bg-red-100 text-red-800',
			TERM_NAME_SUFFIX: 'bg-orange-100 text-orange-800',
			TERM_NAME_DUPLICATE: 'bg-yellow-100 text-yellow-800',
			TERM_UNIQUENESS: 'bg-yellow-100 text-yellow-800',
			TERM_NAME_MAPPING: 'bg-blue-100 text-blue-800',
			COLUMN_NAME_MAPPING: 'bg-purple-100 text-purple-800',
			TERM_COLUMN_ORDER_MISMATCH: 'bg-indigo-100 text-indigo-800',
			DOMAIN_NAME_MAPPING: 'bg-pink-100 text-pink-800'
		};
		return colors[type] || 'bg-gray-100 text-gray-800';
	}

	function handleEdit(entryId: string, suggestions?: AutoFixSuggestion) {
		dispatch('edit', { entryId, suggestions });
	}

	function handleAutoFix(result: ValidationResult) {
		if (result.suggestions && result.suggestions.actionType) {
			dispatch('autofix', {
				entryId: result.entry.id,
				suggestions: result.suggestions,
				result
			});
		}
	}

	function canAutoFix(suggestions?: AutoFixSuggestion): boolean {
		return !!suggestions?.actionType;
	}

	function handleClose() {
		dispatch('close');
	}

	// 진행률 계산
	let progressPercentage = $derived(
		totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0
	);
</script>

{#if open}
	<!-- 오버레이 -->
	<div
		class="fixed inset-0 z-50 bg-black bg-opacity-50 transition-opacity"
		onclick={handleClose}
		role="button"
		tabindex="0"
		onkeydown={(e) => {
			if (e.key === 'Escape') handleClose();
		}}
	></div>

	<!-- 패널 -->
	<div
		class="fixed right-0 top-0 z-50 flex h-full w-full max-w-4xl flex-col bg-white shadow-xl transition-transform sm:w-2/3 lg:w-1/2"
		role="dialog"
		aria-modal="true"
		aria-labelledby="validation-panel-title"
	>
		<!-- 헤더 -->
		<div class="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
			<div>
				<h2 id="validation-panel-title" class="text-lg font-semibold text-gray-900">
					유효성 검사 결과
				</h2>
				<p class="mt-1 text-sm text-gray-500">
					전체 {totalCount.toLocaleString()}개 중 {passedCount.toLocaleString()}개 통과,
					{failedCount.toLocaleString()}개 실패
				</p>
			</div>
			<button
				type="button"
				onclick={handleClose}
				class="rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-500"
				aria-label="닫기"
			>
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>

		<!-- 진행률 바 -->
		<div class="border-b border-gray-200 bg-white px-6 py-3">
			<div class="flex items-center justify-between text-sm">
				<span class="font-medium text-gray-700">진행률</span>
				<span class="text-gray-500">{progressPercentage}%</span>
			</div>
			<div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
				<div
					class="h-full bg-green-500 transition-all duration-300"
					style="width: {progressPercentage}%"
				></div>
			</div>
		</div>

		<!-- 필터 및 검색 -->
		<div class="border-b border-gray-200 bg-white px-6 py-4">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
				<!-- 오류 유형 필터 -->
				<div class="flex-1">
					<label for="error-type-filter" class="block text-xs font-medium text-gray-700">
						오류 유형
					</label>
					<select
						id="error-type-filter"
						bind:value={selectedErrorType}
						class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
					>
						<option value="ALL">전체</option>
						{#each errorTypes as type (type)}
							<option value={type}>{getErrorTypeLabel(type)}</option>
						{/each}
					</select>
				</div>

				<!-- 검색 -->
				<div class="flex-1">
					<label for="search" class="block text-xs font-medium text-gray-700">검색</label>
					<input
						id="search"
						type="text"
						bind:value={searchQuery}
						placeholder="용어명, 컬럼명, 도메인명, 오류 메시지..."
						class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
					/>
				</div>
			</div>
		</div>

		<!-- 결과 목록 -->
		<div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
			{#if loading}
				<div class="flex items-center justify-center py-12">
					<div class="text-center">
						<div
							class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
						></div>
						<p class="mt-4 text-sm text-gray-500">검사 중...</p>
					</div>
				</div>
			{:else if !results || results.length === 0}
				<div class="py-12 text-center">
					<p class="text-gray-500">
						{#if failedCount === 0}
							모든 항목이 유효성 검사를 통과했습니다!
						{:else}
							결과를 불러올 수 없습니다.
							<br />
							<small class="text-xs text-gray-600">
								results: {results?.length || 0}, failedCount: {failedCount}, totalCount: {totalCount}
							</small>
						{/if}
					</p>
				</div>
			{:else if filteredResults.length === 0}
				<div class="py-12 text-center">
					<p class="text-gray-500">
						{#if results.length === 0}
							모든 항목이 유효성 검사를 통과했습니다!
						{:else}
							검색 조건에 맞는 결과가 없습니다.
						{/if}
					</p>
				</div>
			{:else}
				<div class="space-y-4">
					<p class="mb-4 text-xs text-gray-500">
						표시 중: {filteredResults.length}개 / 전체: {results.length}개
					</p>
					{#each filteredResults as result (result.entry.id)}
						<div
							class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:border-gray-300 hover:shadow-md"
						>
							<!-- 항목 정보 -->
							<div class="mb-3">
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<h3 class="font-medium text-gray-900">{result.entry.termName}</h3>
										<div class="mt-1 text-sm text-gray-600">
											<span class="font-medium">컬럼명:</span>
											{result.entry.columnName}
										</div>
										<div class="mt-1 text-sm text-gray-600">
											<span class="font-medium">도메인:</span>
											{result.entry.domainName}
										</div>
									</div>
								</div>
							</div>

							<!-- 오류 목록 -->
							<div class="mb-3 space-y-2">
								{#each result.errors as error (error.type)}
									<div class="flex items-start gap-2">
										<span
											class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getErrorTypeColor(
												error.type
											)}"
										>
											{getErrorTypeLabel(error.type)}
										</span>
										<span class="flex-1 text-sm text-gray-700">{error.message}</span>
									</div>
								{/each}
							</div>

							<!-- 수정 가이드 -->
							{#if result.suggestions && result.suggestions.reason}
								<div class="mb-3 rounded-md bg-blue-50 p-3">
									<div class="mb-2 flex items-center gap-2">
										<svg
											class="h-5 w-5 text-blue-600"
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
										<span class="text-sm font-medium text-blue-900">수정 가이드</span>
									</div>
									<p class="whitespace-pre-line text-xs leading-relaxed text-blue-800">
										{result.suggestions.reason}
									</p>
								</div>
							{/if}

							<!-- 액션 버튼 -->
							<div class="flex items-center justify-end gap-2">
								{#if canAutoFix(result.suggestions)}
									<button
										type="button"
										onclick={() => handleAutoFix(result)}
										class="inline-flex items-center rounded-md border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
									>
										자동 수정
									</button>
								{/if}
								<button
									type="button"
									onclick={() => handleEdit(result.entry.id, result.suggestions)}
									class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
								>
									용어 수정
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}
