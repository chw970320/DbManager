import type {
	RelationIssue,
	RelationParticipant,
	RelationResolutionTarget
} from '$lib/types/design-relation.js';

export function relationParticipantSummary(issue: RelationIssue): string {
	const participants = issue.participants ?? [];
	if (!participants.length) {
		return `${issue.sourceLabel ?? issue.sourceType} → ${issue.targetLabel}`;
	}
	return participants
		.map((participant: RelationParticipant) => `${participant.type}:${participant.label}`)
		.join(' / ');
}

export function relationResolutionTargets(issue: RelationIssue): RelationResolutionTarget[] {
	const targets = issue.resolutionTargets?.length
		? issue.resolutionTargets
		: [
		...(issue.manualTargets ?? []).map((target) => ({
			resolutionTargetId: `manual:${target.targetType}:${target.targetId}:${target.field ?? 'row'}`,
			targetType: target.targetType,
			targetId: target.targetId,
			targetLabel: target.targetLabel,
			mode: 'edit' as const,
			file: target.file,
			field: target.field,
			autoFixable: false,
			reason: issue.reason,
			previewText: '수동 수정으로 대상 정의서 항목을 확인합니다.',
			route: target.route
		})),
		...(issue.candidates ?? []).map((candidate) => ({
			resolutionTargetId: candidate.candidateId,
			targetType: candidate.targetType,
			targetId: candidate.targetId,
			targetLabel: candidate.targetLabel,
			mode: candidate.autoFixable ? ('auto_patch' as const) : ('edit' as const),
			candidateId: candidate.candidateId,
			patch: candidate.patch,
			autoFixable: candidate.autoFixable,
			reason: candidate.reason,
			previewText: candidate.previewText
		}))
	];
	return sortRelationResolutionTargets(issue, targets);
}

function relationTargetPriority(
	issue: RelationIssue,
	target: RelationResolutionTarget,
	index: number
): number {
	const candidate = issue.candidates?.find(
		(candidate) => candidate.candidateId === target.candidateId
	);
	const confidenceRank =
		candidate?.confidence === 'high' ? 0 : candidate?.confidence === 'medium' ? 1 : 2;
	const modeRank =
		target.mode === 'create' ? 0 : target.mode === 'auto_patch' ? 1 : target.candidateId ? 2 : 3;
	return modeRank * 100 + confidenceRank * 10 + index;
}

function sortRelationResolutionTargets(
	issue: RelationIssue,
	targets: RelationResolutionTarget[]
): RelationResolutionTarget[] {
	return targets
		.map((target, index) => ({ target, index }))
		.sort(
			(left, right) =>
				relationTargetPriority(issue, left.target, left.index) -
				relationTargetPriority(issue, right.target, right.index)
		)
		.map(({ target }) => target);
}

export function relationResolutionTargetSummary(target: RelationResolutionTarget): string {
	const modeLabel =
		target.mode === 'auto_patch' ? '자동 수정' : target.mode === 'create' ? '신규 추가' : '수동 수정';
	return `${target.targetType}:${target.targetLabel}(${modeLabel})`;
}

export function relationActionStateSummary(issue: RelationIssue): string {
	const targets = relationResolutionTargets(issue);
	const autoCount = targets.filter((target) => target.mode === 'auto_patch' && target.autoFixable).length;
	const createCount = targets.filter((target) => target.mode === 'create').length;
	const editCount = targets.filter((target) => target.mode === 'edit').length;
	return `자동 ${autoCount}건 · 수동 ${editCount}건 · 신규 ${createCount}건`;
}
