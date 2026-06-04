<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ValidationPanelShell from './ValidationPanelShell.svelte';
	import Icon from './Icon.svelte';
	import { DATA_TYPE_LABELS, type DataType } from '$lib/types/base.js';
	import type {
		DesignRelationApplyResult,
		DesignRelationCandidate,
		DesignRelationCorrectionPreview,
		DesignRelationManualTarget,
		DesignRelationRuleId,
		DesignRelationValidationResult,
		RelationIssue
	} from '$lib/types/design-relation.js';

	type CorrectionResponse<T> = {
		success: boolean;
		data?: T;
		error?: string;
	};

	type PreviewResponse = {
		issueId: string;
		candidateId: string;
		patch: DesignRelationCorrectionPreview['patch'];
		previewText: string;
		actionGuide: string;
	};

	interface Props {
		validation?: DesignRelationValidationResult | null;
		definitionType: DataType;
		currentFile: string;
		loading?: boolean;
		open?: boolean;
		error?: string;
		onclose?: () => void;
		onedit?: (detail: DesignRelationManualTarget & { issueId: string }) => void;
		onautofix?: (detail: {
			issueId: string;
			candidateId: string;
			result: DesignRelationApplyResult;
		}) => void;
	}

	let {
		validation = null,
		definitionType,
		currentFile,
		loading = false,
		open = false,
		error = '',
		onclose,
		onedit,
		onautofix
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		close: void;
		edit: DesignRelationManualTarget & { issueId: string };
		autofix: { issueId: string; candidateId: string; result: DesignRelationApplyResult };
	}>();

	let selectedRelationId = $state<DesignRelationRuleId | 'ALL'>('ALL');
	let searchQuery = $state('');
	let selectedCandidateIds = $state<Record<string, string>>({});
	let previewByIssue = $state<Record<string, PreviewResponse>>({});
	let pendingIssueId = $state<string | null>(null);
	let actionErrorByIssue = $state<Record<string, string>>({});

	const relationLabels: Record<DesignRelationRuleId, string> = {
		DATABASE_ENTITY_LOGICAL_DB: 'DB ↔ 엔터티',
		ENTITY_ATTRIBUTE_PRIMARY: '엔터티 ↔ 속성(PK)',
		ENTITY_TABLE_MAPPING: '엔터티 ↔ 테이블',
		TABLE_COLUMN_MAPPING: '테이블 ↔ 컬럼',
		ATTRIBUTE_COLUMN_KEY: '속성 ↔ 컬럼 키',
		STANDARD_REFERENCES: '표준 단어/용어/도메인'
	};

	let issues = $derived(validation?.issues ?? validation?.summaries.flatMap((s) => s.issues) ?? []);
	let relationTypes = $derived(
		Array.from(new Set(issues.map((issue) => issue.relationId))) as DesignRelationRuleId[]
	);

	function candidateForIssue(issue: RelationIssue): DesignRelationCandidate | undefined {
		if (issue.candidates.length === 0) return undefined;
		const selectedId = selectedCandidateIds[issue.issueId];
		return (
			issue.candidates.find((candidate) => candidate.candidateId === selectedId) ??
			(issue.candidates.length === 1 ? issue.candidates[0] : undefined)
		);
	}

	function getSearchText(issue: RelationIssue): string {
		return [
			issue.relationName,
			issue.targetLabel,
			issue.sourceLabel,
			issue.expectedKey,
			issue.actualKey,
			issue.reason,
			...issue.candidates.map((candidate) => candidate.targetLabel)
		]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();
	}

	let filteredIssues = $derived(
		issues.filter((issue) => {
			if (selectedRelationId !== 'ALL' && issue.relationId !== selectedRelationId) {
				return false;
			}
			const query = searchQuery.trim().toLowerCase();
			return query === '' || getSearchText(issue).includes(query);
		})
	);

	let totalCount = $derived(validation?.totals.totalChecked ?? 0);
	let failedCount = $derived(error ? 1 : (validation?.totals.failedCount ?? issues.length));
	let passedCount = $derived(validation?.totals.passedCount ?? validation?.totals.matched ?? 0);
	let autoFixableCount = $derived(
		validation?.totals.autoFixableCount ?? issues.filter((issue) => issue.autoFixable).length
	);
	let displayedCount = $derived(error ? 1 : filteredIssues.length);

	function requestPayload(issue: RelationIssue, candidateId?: string) {
		return {
			scopeType: definitionType,
			scopeFile: currentFile,
			[`${definitionType}File`]: currentFile,
			issueId: issue.issueId,
			candidateId
		};
	}

	function setIssueError(issueId: string, message: string) {
		actionErrorByIssue = { ...actionErrorByIssue, [issueId]: message };
	}

	function clearIssueError(issueId: string) {
		const { [issueId]: _removed, ...rest } = actionErrorByIssue;
		actionErrorByIssue = rest;
	}

	async function handlePreview(issue: RelationIssue) {
		const candidate = candidateForIssue(issue);
		if (!candidate) {
			setIssueError(issue.issueId, '수정 후보를 먼저 선택하세요.');
			return;
		}
		pendingIssueId = issue.issueId;
		clearIssueError(issue.issueId);
		try {
			const response = await fetch('/api/validation/design-relations/preview', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestPayload(issue, candidate.candidateId))
			});
			const result = (await response.json()) as CorrectionResponse<PreviewResponse>;
			if (!response.ok || !result.success || !result.data) {
				throw new Error(result.error || '수정 미리보기를 생성하지 못했습니다.');
			}
			previewByIssue = { ...previewByIssue, [issue.issueId]: result.data };
		} catch (error) {
			setIssueError(
				issue.issueId,
				error instanceof Error ? error.message : '수정 미리보기 중 오류가 발생했습니다.'
			);
		} finally {
			pendingIssueId = null;
		}
	}

	async function handleAutoFix(issue: RelationIssue) {
		const candidate = candidateForIssue(issue);
		if (!candidate) {
			setIssueError(issue.issueId, '자동 수정할 후보를 먼저 선택하세요.');
			return;
		}
		pendingIssueId = issue.issueId;
		clearIssueError(issue.issueId);
		try {
			const response = await fetch('/api/validation/design-relations/apply', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestPayload(issue, candidate.candidateId))
			});
			const result = (await response.json()) as CorrectionResponse<{
				apply: DesignRelationApplyResult;
			}>;
			if (!response.ok || !result.success || !result.data?.apply) {
				throw new Error(result.error || '자동 수정에 실패했습니다.');
			}
			const detail = {
				issueId: issue.issueId,
				candidateId: candidate.candidateId,
				result: result.data.apply
			};
			dispatch('autofix', detail);
			onautofix?.(detail);
		} catch (error) {
			setIssueError(
				issue.issueId,
				error instanceof Error ? error.message : '자동 수정 중 오류가 발생했습니다.'
			);
		} finally {
			pendingIssueId = null;
		}
	}

	function handleManualEdit(issue: RelationIssue) {
		const target =
			issue.manualTargets[0] ??
			issue.affectedRows[0] ??
			({
				targetType: issue.targetType,
				targetId: issue.targetId,
				targetLabel: issue.targetLabel
			} satisfies DesignRelationManualTarget);
		const detail = { ...target, issueId: issue.issueId };
		dispatch('edit', detail);
		onedit?.(detail);
	}

	function handleCandidateChange(issueId: string, candidateId: string) {
		selectedCandidateIds = { ...selectedCandidateIds, [issueId]: candidateId };
		const { [issueId]: _removed, ...rest } = previewByIssue;
		previewByIssue = rest;
		clearIssueError(issueId);
	}

	function handleClose() {
		dispatch('close');
		onclose?.();
	}

	function typeLabel(type: DataType): string {
		return DATA_TYPE_LABELS[type] ?? type;
	}

	function severityClass(issue: RelationIssue): string {
		return issue.severity === 'warning'
			? 'border-status-warning-border bg-status-warning-bg'
			: 'border-status-error-border bg-status-error-bg';
	}

	function severityBadge(issue: RelationIssue): string {
		return issue.severity === 'warning' ? 'badge-warning' : 'badge-error';
	}
</script>

<ValidationPanelShell
	title="정의서 관계 유효성 검사 결과"
	{totalCount}
	{failedCount}
	{passedCount}
	{loading}
	{open}
	errorTypes={relationTypes}
	errorTypeLabels={relationLabels}
	bind:selectedErrorType={selectedRelationId}
	bind:searchQuery
	searchPlaceholder="관계, 대상, 기대값, 사유 검색..."
	filteredCount={displayedCount}
	on:close={handleClose}
>
	<div class="space-y-4">
		{#if error}
			<div
				class="rounded-lg border border-status-error-border bg-status-error-bg px-4 py-3 text-sm text-status-error"
			>
				<p class="font-medium">관계 유효성 검사를 불러오지 못했습니다.</p>
				<p class="mt-1">{error}</p>
			</div>
		{/if}

		<div class="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p class="font-medium text-content">현재 검증 기준</p>
					<p class="mt-1 text-xs text-content-muted">
						{typeLabel(definitionType)} · {currentFile}
					</p>
				</div>
				<span class="badge {autoFixableCount > 0 ? 'badge-info' : 'badge-ghost'}">
					자동 수정 가능 {autoFixableCount.toLocaleString()}건
				</span>
			</div>
			<p class="mt-2 text-xs text-content-muted">
				후보가 여러 개인 경우 수정 정의서를 선택하면 미리보기와 조치 가이드가 해당 후보 기준으로
				바뀝니다. 후보가 없는 항목은 수동 수정만 가능합니다.
			</p>
		</div>

		{#each filteredIssues as issue (issue.issueId)}
			{@const selectedCandidate = candidateForIssue(issue)}
			{@const preview = previewByIssue[issue.issueId]}
			<div class="rounded-lg border border-border bg-surface p-4">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<div class="flex flex-wrap items-center gap-2">
							<span class="badge {severityBadge(issue)}">
								심각도: {issue.severity === 'warning' ? '경고' : '오류'}
							</span>
							<span class="badge badge-ghost">{relationLabels[issue.relationId]}</span>
						</div>
						<h3 class="mt-2 font-medium text-content">{issue.targetLabel}</h3>
						<p class="mt-1 text-sm text-content-secondary">{issue.message || issue.reason}</p>
					</div>
					<button
						type="button"
						class="btn btn-secondary btn-sm"
						onclick={() => handleManualEdit(issue)}
					>
						수동 수정
					</button>
				</div>

				<div class="mt-3 rounded-md border px-3 py-2 text-xs {severityClass(issue)}">
					<div class="grid gap-2 sm:grid-cols-2">
						<div>
							<span class="font-medium">기대값</span>
							<p class="mt-1 break-all">{issue.expectedKey}</p>
						</div>
						<div>
							<span class="font-medium">현재값</span>
							<p class="mt-1 break-all">{issue.actualKey || '미매칭'}</p>
						</div>
					</div>
				</div>

				<div class="mt-3 rounded-md border border-border bg-surface-muted p-3">
					<div class="flex flex-col gap-3">
						<div>
							<label
								for="candidate-{issue.issueId}"
								class="block text-xs font-medium text-content-secondary"
							>
								수정 정의서 선택
							</label>
							{#if issue.candidates.length > 1}
								<select
									id="candidate-{issue.issueId}"
									class="input mt-1 text-sm"
									value={selectedCandidate?.candidateId ?? ''}
									onchange={(event) =>
										handleCandidateChange(
											issue.issueId,
											(event.currentTarget as HTMLSelectElement).value
										)}
								>
									<option value="" disabled>후보 선택</option>
									{#each issue.candidates as candidate (candidate.candidateId)}
										<option value={candidate.candidateId}>
											{typeLabel(candidate.targetType)} · {candidate.targetLabel} ·
											{candidate.confidence}
										</option>
									{/each}
								</select>
							{:else if issue.candidates.length === 1}
								<p class="mt-1 text-sm text-content">
									{typeLabel(issue.candidates[0].targetType)} · {issue.candidates[0].targetLabel}
								</p>
							{:else}
								<p class="mt-1 text-sm text-content-muted">
									자동 수정 후보 없음 · 수동 수정만 가능
								</p>
							{/if}
						</div>

						{#if selectedCandidate}
							<div class="rounded-md border border-status-info-border bg-status-info-bg p-3">
								<p class="text-xs font-medium text-status-info">미리보기</p>
								<p class="mt-1 text-sm text-content">
									{preview?.previewText ?? selectedCandidate.previewText}
								</p>
								<p class="mt-2 text-xs text-content-secondary">
									조치 가이드: {preview?.actionGuide ?? issue.actionGuide}
								</p>
							</div>
						{:else if issue.actionGuide}
							<div class="rounded-md border border-border bg-surface p-3">
								<p class="text-xs font-medium text-content-secondary">조치 가이드</p>
								<p class="mt-1 text-sm text-content-muted">{issue.actionGuide}</p>
							</div>
						{/if}

						{#if actionErrorByIssue[issue.issueId]}
							<p class="text-sm text-status-error">{actionErrorByIssue[issue.issueId]}</p>
						{/if}

						<div class="flex flex-wrap justify-end gap-2">
							<button
								type="button"
								class="btn btn-outline btn-sm"
								disabled={!selectedCandidate?.autoFixable || pendingIssueId === issue.issueId}
								onclick={() => handlePreview(issue)}
							>
								<Icon name={pendingIssueId === issue.issueId ? 'spinner' : 'search'} size="sm" />
								수정 미리보기
							</button>
							<button
								type="button"
								class="btn btn-primary btn-sm"
								disabled={!selectedCandidate?.autoFixable || pendingIssueId === issue.issueId}
								onclick={() => handleAutoFix(issue)}
							>
								<Icon
									name={pendingIssueId === issue.issueId ? 'spinner' : 'check-circle'}
									size="sm"
								/>
								자동 수정
							</button>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
</ValidationPanelShell>
