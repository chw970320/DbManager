<script lang="ts">
	import type {
		ValidationResult,
		ValidationErrorType,
		ValidationError,
		AutoFixSuggestion
	} from '$lib/types/term.js';
	import { createEventDispatcher } from 'svelte';
	import ValidationPanelShell from './ValidationPanelShell.svelte';

	interface Props {
		results?: ValidationResult[];
		totalCount?: number;
		failedCount?: number;
		passedCount?: number;
		loading?: boolean;
		open?: boolean;
		onclose?: () => void;
		onedit?: (detail: { entryId: string; suggestions?: AutoFixSuggestion }) => void;
		onautofix?: (detail: {
			entryId: string;
			suggestions: AutoFixSuggestion;
			result: ValidationResult;
		}) => void;
	}

	let {
		results = [],
		totalCount = 0,
		failedCount = 0,
		passedCount = 0,
		loading = false,
		open = false,
		onclose,
		onedit,
		onautofix
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		close: void;
		edit: { entryId: string; suggestions?: AutoFixSuggestion };
		autofix: { entryId: string; suggestions: AutoFixSuggestion; result: ValidationResult };
	}>();

	let selectedErrorType = $state<ValidationErrorType | 'ALL'>('ALL');
	let searchQuery = $state('');

	const errorTypeLabels: Record<ValidationErrorType, string> = {
		TERM_NAME_LENGTH: '용어명 길이',
		TERM_NAME_SUFFIX: '용어명 접미사',
		TERM_NAME_DUPLICATE: '용어명 중복',
		TERM_UNIQUENESS: '용어 유일성',
		TERM_NAME_MAPPING: '용어명 매핑',
		COLUMN_NAME_MAPPING: '컬럼명 매핑',
		TERM_COLUMN_ORDER_MISMATCH: '용어명-컬럼명 순서',
		DOMAIN_NAME_MAPPING: '도메인명 매핑'
	};

	const severityLabels: Record<NonNullable<ValidationError['level']>, string> = {
		error: '오류',
		warning: '경고',
		info: '안내',
		'auto-fixable': '자동 수정 가능'
	};

	function getFilteredResults() {
		let filtered = results;

		if (selectedErrorType !== 'ALL') {
			filtered = filtered.filter((result) =>
				result.errors.some((error) => error.type === selectedErrorType)
			);
		}

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

	let filteredResults = $derived(getFilteredResults());

	function getErrorTypes() {
		const types = new Set<ValidationErrorType>();
		results.forEach((result) => {
			result.errors.forEach((error) => types.add(error.type));
		});
		return Array.from(types);
	}

	let errorTypes = $derived(getErrorTypes());

	function getErrorTypeLabel(type: ValidationErrorType): string {
		return errorTypeLabels[type] || type;
	}

	function getIssueSeverity(error: ValidationError) {
		return error.level ?? 'error';
	}

	function getIssueSeverityLabel(error: ValidationError) {
		return severityLabels[getIssueSeverity(error)] ?? '오류';
	}

	function getIssueSeverityClass(error: ValidationError): string {
		const severity = getIssueSeverity(error);
		if (severity === 'warning') return 'border-status-warning-border bg-status-warning-bg';
		if (severity === 'info' || severity === 'auto-fixable')
			return 'border-status-info-border bg-status-info-bg';
		return 'border-status-error-border bg-status-error-bg';
	}

	function getIssueTextClass(error: ValidationError): string {
		const severity = getIssueSeverity(error);
		if (severity === 'warning') return 'text-status-warning';
		if (severity === 'info' || severity === 'auto-fixable') return 'text-status-info';
		return 'text-status-error';
	}

	function getIssueBadgeClass(error: ValidationError): string {
		const severity = getIssueSeverity(error);
		if (severity === 'warning') return 'badge-warning';
		if (severity === 'info' || severity === 'auto-fixable') return 'badge-info';
		return 'badge-error';
	}

	function handleEdit(entryId: string, suggestions?: AutoFixSuggestion) {
		const detail = { entryId, suggestions };
		dispatch('edit', detail);
		onedit?.(detail);
	}

	function handleAutoFix(result: ValidationResult) {
		if (result.suggestions && result.suggestions.actionType) {
			const detail = {
				entryId: result.entry.id,
				suggestions: result.suggestions,
				result
			};
			dispatch('autofix', detail);
			onautofix?.(detail);
		}
	}

	function canAutoFix(suggestions?: AutoFixSuggestion): boolean {
		return !!suggestions?.actionType;
	}

	function handleClose() {
		dispatch('close');
		onclose?.();
	}

	let progressPercentage = $derived(
		totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0
	);
</script>

<ValidationPanelShell
	title="용어 유효성 검사 결과"
	{totalCount}
	{failedCount}
	{passedCount}
	{loading}
	{open}
	{errorTypes}
	{errorTypeLabels}
	bind:selectedErrorType
	bind:searchQuery
	searchPlaceholder="용어명, 컬럼명, 도메인명, 오류 메시지..."
	filteredCount={filteredResults.length}
	on:close={handleClose}
>
	<div class="space-y-4">
		<div class="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm">
			<div class="flex items-center justify-between gap-3">
				<span class="font-medium text-content">검증 진행률</span>
				<span class="text-content-secondary">{progressPercentage}%</span>
			</div>
			<div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
				<div
					class="h-full bg-status-success transition-all duration-300"
					style="width: {progressPercentage}%"
				></div>
			</div>
			<p class="mt-2 text-xs text-content-muted">
				표시 중: {filteredResults.length.toLocaleString()}개 / 전체:
				{results.length.toLocaleString()}개
			</p>
		</div>

		{#each filteredResults as result (result.entry.id)}
			<div class="rounded-lg border border-border bg-surface p-4">
				<div class="mb-3">
					<div class="font-medium text-content">{result.entry.termName}</div>
					<div class="mt-1 text-sm text-content-secondary">
						<span class="font-medium">컬럼명:</span>
						{result.entry.columnName}
					</div>
					<div class="mt-1 text-sm text-content-secondary">
						<span class="font-medium">도메인:</span>
						{result.entry.domainName}
					</div>
				</div>

				<div class="mb-3 space-y-2">
					{#if result.errors.length === 0}
						<div
							class="rounded-md border border-status-success-border bg-status-success-bg px-2 py-1.5 text-xs"
						>
							<span class="badge badge-success">심각도: 통과</span>
							<span class="ml-2 text-status-success">용어/컬럼/도메인 매핑이 통과했습니다.</span>
						</div>
					{:else}
						{#each result.errors as error (error.type + error.message)}
							<div class="rounded-md border px-2 py-1.5 text-xs {getIssueSeverityClass(error)}">
								<div class="flex flex-wrap items-center gap-2">
									<span class="badge {getIssueBadgeClass(error)}"
										>심각도: {getIssueSeverityLabel(error)}</span
									>
									<span class="font-medium {getIssueTextClass(error)}">
										{getErrorTypeLabel(error.type)}
										{#if error.code}
											· {error.code}{/if}
										{#if error.field}
											· {error.field}{/if}
									</span>
								</div>
								<div class="mt-1 {getIssueTextClass(error)}">{error.message}</div>
							</div>
						{/each}
					{/if}
				</div>

				{#if result.suggestions && result.suggestions.reason}
					<div class="mb-3 rounded-md border border-status-info-border bg-status-info-bg p-3">
						<div class="mb-2 flex items-center gap-2">
							<span class="badge badge-info">조치 가이드</span>
							<span class="text-sm font-medium text-status-info">자동 보정 후보 있음</span>
						</div>
						<p class="whitespace-pre-line text-xs leading-relaxed text-status-info">
							{result.suggestions.reason}
						</p>
					</div>
				{/if}

				<div class="flex items-center justify-end gap-2">
					{#if canAutoFix(result.suggestions)}
						<button
							type="button"
							onclick={() => handleAutoFix(result)}
							class="btn btn-outline btn-sm"
						>
							자동 수정
						</button>
					{/if}
					<button
						type="button"
						onclick={() => handleEdit(result.entry.id, result.suggestions)}
						class="btn btn-outline btn-sm"
					>
						용어 수정
					</button>
				</div>
			</div>
		{/each}
	</div>
</ValidationPanelShell>
