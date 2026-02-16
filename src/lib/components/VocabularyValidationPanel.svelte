<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { VocabularyEntry } from '$lib/types/vocabulary';
	import ValidationPanelShell from './ValidationPanelShell.svelte';

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

	function handleEdit(entryId: string) {
		dispatch('edit', { entryId });
	}
</script>

<ValidationPanelShell
	title="단어집 유효성 검사 결과"
	{totalCount}
	{failedCount}
	{passedCount}
	{loading}
	{open}
	{errorTypes}
	bind:selectedErrorType
	bind:searchQuery
	searchPlaceholder="표준단어명, 영문약어, 오류 메시지..."
	filteredCount={filteredResults.length}
	on:close
>
	<div class="space-y-4">
		{#each filteredResults as result (result.entry.id)}
			<div class="rounded-lg border border-gray-200 bg-white p-4">
				<div class="mb-2">
					<div class="font-medium text-content">{result.entry.standardName}</div>
					<div class="text-xs text-content-muted">약어: {result.entry.abbreviation}</div>
				</div>
				<div class="mb-3 space-y-1">
					{#each result.errors as error (error.type + error.message)}
						<div class="text-xs text-status-error">{error.message}</div>
					{/each}
				</div>
				<div class="flex justify-end">
					<button
						type="button"
						onclick={() => handleEdit(result.entry.id)}
						class="btn btn-outline btn-sm"
					>
						단어 수정
					</button>
				</div>
			</div>
		{/each}
	</div>
</ValidationPanelShell>
