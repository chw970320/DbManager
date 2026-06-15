<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ValidationPanelShell from './ValidationPanelShell.svelte';
	import Icon from './Icon.svelte';
	import { DATA_TYPE_LABELS, type DataType } from '$lib/types/base.js';
	import type {
		DesignRelationApplyResult,
		DesignRelationRuleId,
		DesignRelationValidationResult,
		RelationIssue,
		RelationResolutionTarget
	} from '$lib/types/design-relation.js';
	import { showConfirm } from '$lib/stores/confirm-store.js';
	import { relationResolutionTargets } from '$lib/utils/design-relation-display.js';
	import { relationIssueInvolvedTypes } from '$lib/utils/design-relation-scope.js';

	type CorrectionResponse<T> = {
		success: boolean;
		data?: T;
		error?: string;
	};

	type RelationEditTarget = RelationResolutionTarget & { issueId: string };

	interface Props {
		validation?: DesignRelationValidationResult | null;
		definitionType: DataType;
		currentFile: string;
		loading?: boolean;
		open?: boolean;
		error?: string;
		onclose?: () => void;
		onedit?: (detail: RelationEditTarget) => void;
		onautofix?: (detail: {
			issueId: string;
			candidateId: string;
			resolutionTargetId?: string;
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
		edit: RelationEditTarget;
		autofix: {
			issueId: string;
			candidateId: string;
			resolutionTargetId?: string;
			result: DesignRelationApplyResult;
		};
	}>();

	let selectedRelationId = $state<DesignRelationRuleId | 'ALL'>('ALL');
	let searchQuery = $state('');
	let selectedTargetIds = $state<Record<string, string>>({});
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

	let allIssues = $derived(
		validation?.issues ?? validation?.summaries.flatMap((s) => s.issues) ?? []
	);
	let issues = $derived(
		allIssues.filter((issue) => relationIssueInvolvedTypes(issue).includes(definitionType))
	);
	let relationTypes = $derived(
		Array.from(new Set(issues.map((issue) => issue.relationId))) as DesignRelationRuleId[]
	);

	function targetsForIssue(issue: RelationIssue): RelationResolutionTarget[] {
		return relationResolutionTargets(issue);
	}

	function targetForIssue(issue: RelationIssue): RelationResolutionTarget | undefined {
		const targets = targetsForIssue(issue);
		if (targets.length === 0) return undefined;
		const selectedId = selectedTargetIds[issue.issueId];
		return targets.find((target) => target.resolutionTargetId === selectedId) ?? targets[0];
	}

	function targetIsAutoFixable(target?: RelationResolutionTarget): boolean {
		return Boolean(
			target?.mode === 'auto_patch' &&
				target.autoFixable &&
				target.candidateId &&
				target.patch &&
				target.targetId
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
			...(issue.participants ?? []).map((participant) => participant.label),
			...(issue.participants ?? []).flatMap((participant) =>
				(participant.identityFields ?? []).flatMap((field) => [field.label, field.value])
			),
			...targetsForIssue(issue).map((target) => `${target.targetLabel} ${target.reason}`)
		]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();
	}

	function problemLocationParticipants(issue: RelationIssue) {
		return (issue.participants ?? []).filter((participant) => participant.identityFields?.length);
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
	let displayedCount = $derived(error ? 1 : filteredIssues.length);
	let progressPercentage = $derived(
		totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0
	);
	let issueCount = $derived(error ? 1 : issues.length);

	function requestPayload(issue: RelationIssue, target: RelationResolutionTarget) {
		return {
			scopeType: definitionType,
			scopeFile: currentFile,
			[`${definitionType}File`]: currentFile,
			issueId: issue.issueId,
			candidateId: target.candidateId,
			resolutionTargetId: target.resolutionTargetId
		};
	}

	function setIssueError(issueId: string, message: string) {
		actionErrorByIssue = { ...actionErrorByIssue, [issueId]: message };
	}

	function clearIssueError(issueId: string) {
		const { [issueId]: _removed, ...rest } = actionErrorByIssue;
		actionErrorByIssue = rest;
	}

	async function handleAutoFix(issue: RelationIssue) {
		const target = targetForIssue(issue);
		if (!target || !targetIsAutoFixable(target)) {
			setIssueError(issue.issueId, '자동 수정할 수정 대상을 먼저 선택하세요.');
			return;
		}
		const confirmed = await showConfirm({
			title: '정의서 관계 자동 수정',
			message: '선택한 조치 대상에 자동 수정 내용을 적용하시겠습니까?',
			confirmText: '자동 수정'
		});
		if (!confirmed) {
			return;
		}
		pendingIssueId = issue.issueId;
		clearIssueError(issue.issueId);
		try {
			const response = await fetch('/api/validation/design-relations/apply', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestPayload(issue, target))
			});
			const result = (await response.json()) as CorrectionResponse<{
				apply: DesignRelationApplyResult;
			}>;
			if (!response.ok || !result.success || !result.data?.apply) {
				throw new Error(result.error || '자동 수정에 실패했습니다.');
			}
			const detail = {
				issueId: issue.issueId,
				candidateId: target.candidateId ?? result.data.apply.candidateId,
				resolutionTargetId: target.resolutionTargetId,
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
		const selectedTarget =
			targetForIssue(issue) ??
			({
				resolutionTargetId: `manual:${issue.targetType}:${issue.targetId}:${issue.issueId}`,
				targetType: issue.targetType,
				targetId: issue.targetId,
				targetLabel: issue.targetLabel,
				mode: 'edit',
				autoFixable: false,
				reason: issue.reason,
				previewText: '수동 수정으로 대상 정의서 항목을 확인합니다.'
			} satisfies RelationResolutionTarget);
		const detail = { ...selectedTarget, issueId: issue.issueId };
		dispatch('edit', detail);
		onedit?.(detail);
	}

	function handleTargetChange(issueId: string, resolutionTargetId: string) {
		selectedTargetIds = { ...selectedTargetIds, [issueId]: resolutionTargetId };
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

	function modeLabel(mode: RelationResolutionTarget['mode']): string {
		if (mode === 'auto_patch') return '자동 수정';
		if (mode === 'create') return '신규 추가';
		return '수동 수정';
	}

	function manualActionLabel(target?: RelationResolutionTarget): string {
		if (target?.mode === 'create') return '신규 추가';
		return '수동 수정';
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
				표시 중: {displayedCount.toLocaleString()}개 / 전체:
				{issueCount.toLocaleString()}개
			</p>
		</div>

		{#each filteredIssues as issue (issue.issueId)}
			{@const issueTargets = targetsForIssue(issue)}
			{@const selectedTarget = targetForIssue(issue)}
			{@const problemLocations = problemLocationParticipants(issue)}
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
				</div>

				{#if problemLocations.length}
					<section
						class="mt-3 border-y border-border bg-surface-muted/60 px-3 py-2"
						aria-label="문제 위치"
					>
						<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
							<p class="text-xs font-semibold text-content">문제 위치</p>
							<p class="text-xs text-content-muted">정의서 최소 식별 키</p>
						</div>
						<div class="mt-2 divide-y divide-border">
							{#each problemLocations as participant, index (`${participant.type}-${participant.id ?? participant.label}-${index}`)}
								<div
									class="grid gap-1.5 py-2 first:pt-0 last:pb-0 sm:grid-cols-[5.5rem_minmax(0,1fr)]"
								>
									<p class="text-xs font-medium text-content-secondary">
										{typeLabel(participant.type)}
									</p>
									<dl class="flex min-w-0 flex-wrap gap-x-3 gap-y-1">
										{#each participant.identityFields ?? [] as field (`${field.key}-${field.value}`)}
											<div class="inline-flex min-w-0 items-baseline gap-1 text-xs">
												<dt class="shrink-0 text-content-muted">{field.label}</dt>
												<dd class="min-w-0 break-all font-medium text-content">{field.value}</dd>
											</div>
										{/each}
									</dl>
								</div>
							{/each}
						</div>
					</section>
				{/if}

				<div class="mt-3 rounded-md border px-3 py-2 text-xs {severityClass(issue)}">
					<div class="grid grid-cols-1 gap-2">
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
								조치 대상 선택
							</label>
							{#if issueTargets.length > 1}
								<select
									id="candidate-{issue.issueId}"
									class="input mt-1 text-sm"
									value={selectedTarget?.resolutionTargetId ?? ''}
									onchange={(event) =>
										handleTargetChange(
											issue.issueId,
											(event.currentTarget as HTMLSelectElement).value
										)}
								>
									{#each issueTargets as target (target.resolutionTargetId)}
										<option value={target.resolutionTargetId}>
											{typeLabel(target.targetType)} · {target.targetLabel} ·
											{modeLabel(target.mode)}
										</option>
									{/each}
								</select>
							{:else if issueTargets.length === 1}
								<p class="mt-1 text-sm text-content">
									{typeLabel(issueTargets[0].targetType)} · {issueTargets[0].targetLabel} ·
									{modeLabel(issueTargets[0].mode)}
								</p>
							{:else}
								<p class="mt-1 text-sm text-content-muted">수정 대상 없음 · 수동 확인 필요</p>
							{/if}
						</div>

						{#if selectedTarget}
							<div class="rounded-md border border-status-info-border bg-status-info-bg p-3">
								<p class="text-xs font-medium text-status-info">조치 가이드</p>
								<p class="mt-1 text-sm text-content">{selectedTarget.previewText}</p>
								<p class="mt-2 text-xs text-content-secondary">
									선택 근거: {selectedTarget.reason || issue.actionGuide}
								</p>
								<p class="mt-1 text-xs text-content-muted">
									선택 대상: {typeLabel(selectedTarget.targetType)} ·
									{modeLabel(selectedTarget.mode)}
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
							{#if targetIsAutoFixable(selectedTarget)}
								<button
									type="button"
									class="btn btn-outline btn-sm"
									disabled={pendingIssueId === issue.issueId}
									onclick={() => handleAutoFix(issue)}
								>
									<Icon
										name={pendingIssueId === issue.issueId ? 'spinner' : 'check-circle'}
										size="sm"
									/>
									자동 수정
								</button>
							{/if}
							<button
								type="button"
								class="btn btn-outline btn-sm"
								disabled={pendingIssueId === issue.issueId}
								onclick={() => handleManualEdit(issue)}
							>
								{manualActionLabel(selectedTarget)}
							</button>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
</ValidationPanelShell>
