import { json, type RequestEvent } from '@sveltejs/kit';
import type { ValidationError, ValidationResult } from '$lib/types/term.js';
import type { DesignRelationValidationResult, RelationIssue } from '$lib/types/design-relation.js';

type UnifiedIssueLevel = 'error' | 'warning' | 'info' | 'auto-fixable';
type UnifiedIssueSource = 'term' | 'relation';

type UnifiedValidationIssue = {
	source: UnifiedIssueSource;
	level: UnifiedIssueLevel;
	code: string;
	message: string;
	entryId: string;
	label: string;
	field?: string;
	priority: number;
	metadata?: Record<string, unknown>;
};

type TermValidationData = {
	totalCount: number;
	failedCount: number;
	passedCount: number;
	failedEntries: ValidationResult[];
};

type RelationValidationData = {
	files: {
		database: string | null;
		entity: string | null;
		attribute: string | null;
		table: string | null;
		column: string | null;
	};
	validation: DesignRelationValidationResult;
};

const TERM_ERROR_PRIORITY: Record<string, number> = {
	TERM_NAME_LENGTH: 1,
	TERM_NAME_DUPLICATE: 2,
	TERM_UNIQUENESS: 3,
	TERM_NAME_MAPPING: 4,
	COLUMN_NAME_MAPPING: 5,
	TERM_COLUMN_ORDER_MISMATCH: 6,
	TERM_NAME_SUFFIX: 7,
	DOMAIN_NAME_MAPPING: 8
};

const LEVEL_ORDER: Record<UnifiedIssueLevel, number> = {
	error: 1,
	'auto-fixable': 2,
	warning: 3,
	info: 4
};

function toTermIssues(results: ValidationResult[]): UnifiedValidationIssue[] {
	const issues: UnifiedValidationIssue[] = [];

	for (const result of results) {
		const hasAutoFix = !!result.suggestions?.actionType;
		for (const err of result.errors) {
			issues.push({
				source: 'term',
				level: hasAutoFix ? 'auto-fixable' : (err.level as UnifiedIssueLevel) || 'error',
				code: err.code || err.type,
				message: err.message,
				entryId: result.entry.id,
				label: result.entry.termName || result.entry.columnName || result.entry.id,
				field: err.field,
				priority: err.priority ?? TERM_ERROR_PRIORITY[err.type] ?? 999,
				metadata: result.suggestions
					? {
							actionType: result.suggestions.actionType
						}
					: undefined
			});
		}
	}

	return issues;
}

function relationPriority(severity: RelationIssue['severity']): number {
	return severity === 'error' ? 100 : 200;
}

function toRelationIssues(validation: DesignRelationValidationResult): UnifiedValidationIssue[] {
	const issues: UnifiedValidationIssue[] = [];

	for (const summary of validation.summaries) {
		for (const issue of summary.issues) {
			issues.push({
				source: 'relation',
				level: issue.severity,
				code: `RELATION_${issue.relationId}`,
				message: issue.reason,
				entryId: issue.targetId,
				label: issue.targetLabel,
				priority: relationPriority(issue.severity),
				metadata: {
					relationId: issue.relationId,
					expectedKey: issue.expectedKey,
					sourceType: issue.sourceType,
					targetType: issue.targetType
				}
			});
		}
	}

	return issues;
}

function sortIssues(issues: UnifiedValidationIssue[]): UnifiedValidationIssue[] {
	return [...issues].sort((a, b) => {
		const levelDiff = LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
		if (levelDiff !== 0) return levelDiff;
		if (a.priority !== b.priority) return a.priority - b.priority;
		return a.code.localeCompare(b.code);
	});
}

function mapTermFilename(url: URL): string {
	const filename = url.searchParams.get('termFile') || url.searchParams.get('termFilename');
	return filename && filename.trim() !== '' ? filename : 'term.json';
}

function buildRelationQuery(url: URL): string {
	const params = new URLSearchParams();
	const keys = ['databaseFile', 'entityFile', 'attributeFile', 'tableFile', 'columnFile'];
	for (const key of keys) {
		const value = url.searchParams.get(key);
		if (value && value.trim() !== '') {
			params.set(key, value);
		}
	}
	return params.toString();
}

export async function GET({ url, fetch }: RequestEvent) {
	try {
		const termFilename = mapTermFilename(url);
		const relationQuery = buildRelationQuery(url);
		const relationUrl = relationQuery ? `/api/erd/relations?${relationQuery}` : '/api/erd/relations';

		const [termResponse, relationResponse] = await Promise.all([
			fetch(`/api/term/validate-all?filename=${encodeURIComponent(termFilename)}`),
			fetch(relationUrl)
		]);

		const [termResult, relationResult] = await Promise.all([
			termResponse.json(),
			relationResponse.json()
		]);

		if (!termResponse.ok || !termResult?.success) {
			return json(
				{
					success: false,
					error: termResult?.error || '용어 검증 결과를 가져오지 못했습니다.',
					message: 'Failed to load term validation'
				} as ApiResponse,
				{ status: termResponse.status || 500 }
			);
		}

		if (!relationResponse.ok || !relationResult?.success) {
			return json(
				{
					success: false,
					error: relationResult?.error || '관계 검증 결과를 가져오지 못했습니다.',
					message: 'Failed to load relation validation'
				} as ApiResponse,
				{ status: relationResponse.status || 500 }
			);
		}

		const termData = termResult.data as TermValidationData;
		const relationData = relationResult.data as RelationValidationData;

		const termIssues = toTermIssues(termData.failedEntries || []);
		const relationIssues = toRelationIssues(relationData.validation);
		const issues = sortIssues([...relationIssues, ...termIssues]);

		const summary = {
			totalIssues: issues.length,
			errorCount: issues.filter((i) => i.level === 'error').length,
			autoFixableCount: issues.filter((i) => i.level === 'auto-fixable').length,
			warningCount: issues.filter((i) => i.level === 'warning').length,
			infoCount: issues.filter((i) => i.level === 'info').length,
			termFailedCount: termData.failedCount,
			relationUnmatchedCount: relationData.validation.totals.unmatched
		};

		return json(
			{
				success: true,
				data: {
					files: {
						term: termFilename,
						...relationData.files
					},
					summary,
					sections: {
						term: {
							totalCount: termData.totalCount,
							passedCount: termData.passedCount,
							failedCount: termData.failedCount
						},
						relation: relationData.validation.totals
					},
					issues
				},
				message: '통합 진단 리포트 생성 완료'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('통합 진단 리포트 생성 오류:', error);
		return json(
			{
				success: false,
				error: '통합 진단 리포트 생성 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}
