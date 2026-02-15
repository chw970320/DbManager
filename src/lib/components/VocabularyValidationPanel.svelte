<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { VocabularyEntry } from '$lib/types/vocabulary';

	type ValidationIssue = {
		type: string;
		code: string;
		message: string;
		field?: string;
		priority: number;
	};

	type ValidationResult = {
		entry: VocabularyEntry;
		errors: ValidationIssue[];
	};

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
		edit: { entryId: string };
	}>();

	let selectedErrorType = $state<string>('ALL');
	let searchQuery = $state('');

	function getErrorTypes() {
		const types = new Set<string>();
		for (const result of results) {
			for (const error of result.errors) types.add(error.type);
		}
		return Array.from(types);
	}

	let errorTypes = $derived(getErrorTypes());

	function getFilteredResults() {
		let filtered = results;
		if (selectedErrorType !== 'ALL') {
			filtered = filtered.filter((result) => result.errors.some((error) => error.type === selectedErrorType));
		}
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(result) =>
					result.entry.standardName.toLowerCase().includes(query) ||
					result.entry.abbreviation.toLowerCase().includes(query) ||
					result.errors.some((error) => error.message.toLowerCase().includes(query))
			);
		}
		return filtered;
	}

	let filteredResults = $derived(getFilteredResults());

	function handleClose() {
		dispatch('close');
	}

	function handleEdit(entryId: string) {
		dispatch('edit', { entryId });
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 bg-black bg-opacity-50 transition-opacity"
		onclick={handleClose}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === 'Escape' && handleClose()}
	></div>

	<div
		class="fixed right-0 top-0 z-50 flex h-full w-full max-w-4xl flex-col bg-white shadow-xl sm:w-2/3 lg:w-1/2"
		role="dialog"
		aria-modal="true"
	>
		<div class="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
			<div>
				<h2 class="text-lg font-semibold text-gray-900">단어집 유효성 검사 결과</h2>
				<p class="mt-1 text-sm text-gray-500">
					전체 {totalCount.toLocaleString()}개 중 {passedCount.toLocaleString()}개 통과,
					{failedCount.toLocaleString()}개 실패
				</p>
			</div>
			<button
				type="button"
				onclick={handleClose}
				class="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
				aria-label="닫기"
			>
				×
			</button>
		</div>

		<div class="border-b border-gray-200 bg-white px-6 py-4">
			<div class="flex flex-col gap-4 sm:flex-row">
				<div class="flex-1">
					<label for="vocab-error-filter" class="block text-xs font-medium text-gray-700">오류 유형</label>
					<select
						id="vocab-error-filter"
						bind:value={selectedErrorType}
						class="mt-1 block w-full rounded-md border-gray-300 text-sm"
					>
						<option value="ALL">전체</option>
						{#each errorTypes as type (type)}
							<option value={type}>{type}</option>
						{/each}
					</select>
				</div>
				<div class="flex-1">
					<label for="vocab-search" class="block text-xs font-medium text-gray-700">검색</label>
					<input
						id="vocab-search"
						type="text"
						bind:value={searchQuery}
						placeholder="표준단어명, 영문약어, 오류 메시지..."
						class="mt-1 block w-full rounded-md border-gray-300 text-sm"
					/>
				</div>
			</div>
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
			{#if loading}
				<div class="py-12 text-center text-sm text-gray-500">검사 중...</div>
			{:else if filteredResults.length === 0}
				<div class="py-12 text-center text-sm text-gray-500">
					{failedCount === 0 ? '모든 항목이 통과했습니다.' : '표시할 항목이 없습니다.'}
				</div>
			{:else}
				<div class="space-y-4">
					{#each filteredResults as result (result.entry.id)}
						<div class="rounded-lg border border-gray-200 bg-white p-4">
							<div class="mb-2">
								<div class="font-medium text-gray-900">{result.entry.standardName}</div>
								<div class="text-xs text-gray-600">약어: {result.entry.abbreviation}</div>
							</div>
							<div class="mb-3 space-y-1">
								{#each result.errors as error (error.type + error.message)}
									<div class="text-xs text-red-700">{error.message}</div>
								{/each}
							</div>
							<div class="flex justify-end">
								<button
									type="button"
									onclick={() => handleEdit(result.entry.id)}
									class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
								>
									단어 수정
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}
