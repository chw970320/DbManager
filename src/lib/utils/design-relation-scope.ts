import type { DataType } from '$lib/types/base.js';
import type {
	DesignRelationValidationResult,
	RelationIssue,
	RelationValidationSummary
} from '$lib/types/design-relation.js';

export type DesignRelationScope = {
	scopeType?: DataType;
	scopeFile?: string | null;
};

function uniqueTypes(types: Array<DataType | undefined>): DataType[] {
	return Array.from(new Set(types.filter((type): type is DataType => Boolean(type))));
}

export function relationIssueInvolvedTypes(issue: RelationIssue): DataType[] {
	if (issue.involvedTypes?.length) return uniqueTypes(issue.involvedTypes);

	return uniqueTypes([
		...(issue.participants ?? []).map((participant) => participant.type),
		issue.sourceType,
		issue.targetType,
		...(issue.manualTargets ?? []).map((target) => target.targetType),
		...(issue.affectedRows ?? []).map((target) => target.targetType),
		...(issue.candidates ?? []).map((candidate) => candidate.targetType),
		...(issue.resolutionTargets ?? []).map((target) => target.targetType)
	]);
}

function relationIssueFiles(issue: RelationIssue, scopeType?: DataType): Set<string> {
	const files = new Set<string>();
	for (const participant of issue.participants ?? []) {
		if ((!scopeType || participant.type === scopeType) && participant.file) {
			files.add(participant.file);
		}
	}
	for (const target of issue.resolutionTargets ?? []) {
		if ((!scopeType || target.targetType === scopeType) && target.file) {
			files.add(target.file);
		}
	}
	for (const target of issue.manualTargets ?? []) {
		if ((!scopeType || target.targetType === scopeType) && target.file) {
			files.add(target.file);
		}
	}
	return files;
}

export function relationIssueMatchesScope(issue: RelationIssue, scope: DesignRelationScope): boolean {
	if (!scope.scopeType) return true;
	if (!relationIssueInvolvedTypes(issue).includes(scope.scopeType)) return false;

	const scopeFile = scope.scopeFile?.trim();
	if (!scopeFile) return true;

	const files = relationIssueFiles(issue, scope.scopeType);
	return files.size === 0 || files.has(scopeFile);
}

function summaryMatchesScope(summary: RelationValidationSummary, scope: DesignRelationScope): boolean {
	if (!scope.scopeType) return true;
	return summary.issues.some((issue) => relationIssueMatchesScope(issue, scope));
}

function recalculateTotals(
	summaries: RelationValidationSummary[]
): DesignRelationValidationResult['totals'] {
	const issues = summaries.flatMap((summary) => summary.issues);
	const base = summaries.reduce(
		(acc, summary) => {
			acc.totalChecked += summary.totalChecked;
			acc.matched += summary.matched;
			acc.unmatched += summary.unmatched;
			return acc;
		},
		{ totalChecked: 0, matched: 0, unmatched: 0 }
	);

	return {
		...base,
		errorCount: issues.filter((issue) => issue.severity === 'error').length,
		warningCount: issues.filter((issue) => issue.severity === 'warning').length,
		failedCount: base.unmatched,
		passedCount: base.matched,
		totalIssues: issues.length,
		autoFixableCount: issues.filter((issue) => issue.autoFixable).length
	};
}

export function scopeDesignRelationValidation(
	validation: DesignRelationValidationResult,
	scope: DesignRelationScope = {}
): DesignRelationValidationResult {
	if (!scope.scopeType) {
		return {
			...validation,
			scope: { scoped: false }
		};
	}

	const summaries = validation.summaries
		.map((summary) => {
			const issues = summary.issues.filter((issue) => relationIssueMatchesScope(issue, scope));
			if (issues.length === summary.issues.length) return { ...summary, issues };
			return {
				...summary,
				issues,
				unmatched: issues.length,
				matched: Math.max(0, summary.totalChecked - issues.length)
			};
		})
		.filter((summary) => summary.issues.length > 0);
	const issues = summaries.flatMap((summary) => summary.issues);

	return {
		...validation,
		summaries,
		issues,
		scope: {
			scoped: true,
			type: scope.scopeType,
			file: scope.scopeFile ?? null
		},
		totals: recalculateTotals(summaries)
	};
}
