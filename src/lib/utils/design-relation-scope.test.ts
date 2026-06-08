import { describe, expect, it } from 'vitest';
import type {
	DesignRelationValidationResult,
	RelationIssue,
	RelationValidationSummary
} from '$lib/types/design-relation.js';
import {
	relationIssueInvolvedTypes,
	relationIssueMatchesScope,
	scopeDesignRelationValidation
} from './design-relation-scope.js';

function issue(overrides: Partial<RelationIssue>): RelationIssue {
	return {
		issueId: 'issue-1',
		relationId: 'DATABASE_ENTITY_LOGICAL_DB',
		relationName: 'DB ↔ 엔터티',
		severity: 'error',
		sourceType: 'database',
		targetType: 'entity',
		targetId: 'entity-1',
		targetLabel: '회원',
		expectedKey: 'CRM',
		actualKey: 'UNKNOWN',
		reason: '논리 DB명이 단어집과 맞지 않습니다.',
		message: '논리 DB명이 단어집과 맞지 않습니다.',
		affectedRows: [],
		manualTargets: [],
		candidates: [],
		autoFixable: false,
		actionGuide: '수동 수정하세요.',
		participants: [
			{ type: 'database', label: 'CRM', file: 'database-a.json', role: 'source' },
			{ type: 'entity', id: 'entity-1', label: '회원', file: 'entity-a.json', role: 'target' }
		],
		involvedTypes: ['database', 'entity'],
		resolutionTargets: [],
		...overrides
	};
}

function validation(issues: RelationIssue[]): DesignRelationValidationResult {
	const summary: RelationValidationSummary = {
		relationId: 'DATABASE_ENTITY_LOGICAL_DB',
		relationName: 'DB ↔ 엔터티',
		totalChecked: 2,
		matched: 1,
		unmatched: issues.length,
		severity: 'error',
		mappingKey: 'logicalDbName',
		issues
	};
	return {
		specs: [],
		rules: [],
		summaries: [summary],
		issues,
		totals: {
			totalChecked: 2,
			matched: 1,
			unmatched: issues.length,
			errorCount: issues.length,
			warningCount: 0
		}
	};
}

describe('design relation scope utilities', () => {
	it('uses involvedTypes so a source definition can see a target-centered issue', () => {
		const targetCenteredIssue = issue({ targetType: 'entity' });

		expect(relationIssueInvolvedTypes(targetCenteredIssue)).toEqual(['database', 'entity']);
		expect(
			relationIssueMatchesScope(targetCenteredIssue, {
				scopeType: 'database',
				scopeFile: 'database-a.json'
			})
		).toBe(true);
	});

	it('falls back to source/target/manual/candidate types for legacy issues', () => {
		const legacyIssue = issue({
			participants: [],
			involvedTypes: [],
			manualTargets: [
				{
					targetType: 'database',
					targetId: 'database-1',
					targetLabel: 'CRM',
					file: 'database-a.json'
				}
			],
			candidates: [
				{
					candidateId: 'candidate-1',
					issueId: 'issue-1',
					targetType: 'entity',
					targetId: 'entity-1',
					targetLabel: '회원',
					patch: { targetType: 'entity', targetId: 'entity-1', fields: { logicalDbName: 'CRM' } },
					reason: 'DB 후보',
					confidence: 'high',
					previewText: 'logicalDbName 변경',
					autoFixable: true
				}
			]
		});

		expect(relationIssueInvolvedTypes(legacyIssue)).toEqual(['database', 'entity']);
		expect(relationIssueMatchesScope(legacyIssue, { scopeType: 'database' })).toBe(true);
	});

	it('filters by participant file when file metadata is present', () => {
		const scoped = scopeDesignRelationValidation(validation([issue({})]), {
			scopeType: 'entity',
			scopeFile: 'other-entity.json'
		});

		expect(scoped.issues).toHaveLength(0);
		expect(scoped.totals.unmatched).toBe(0);
		expect(scoped.scope).toEqual({ scoped: true, type: 'entity', file: 'other-entity.json' });
	});

	it('returns scoped issue summaries and totals', () => {
		const scoped = scopeDesignRelationValidation(validation([issue({})]), {
			scopeType: 'database',
			scopeFile: 'database-a.json'
		});

		expect(scoped.issues).toHaveLength(1);
		expect(scoped.summaries).toHaveLength(1);
		expect(scoped.totals).toMatchObject({
			totalChecked: 2,
			unmatched: 1,
			errorCount: 1,
			autoFixableCount: 0
		});
	});
});
