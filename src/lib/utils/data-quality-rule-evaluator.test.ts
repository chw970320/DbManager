import { describe, expect, it } from 'vitest';
import { evaluateQualityRules } from './data-quality-rule-evaluator';
import type { DataSourceTableProfileResult } from '$lib/types/data-profiling.js';
import type { QualityRuleEntry } from '$lib/types/data-quality-rule.js';

const baseProfile: DataSourceTableProfileResult = {
	dataSourceId: 'source-1',
	dataSourceName: '운영 PostgreSQL',
	dataSourceType: 'postgresql',
	schema: 'public',
	table: 'customers',
	rowCount: 1200,
	profiledAt: '2026-03-12T00:00:00.000Z',
	columns: [
		{
			columnName: 'customer_id',
			ordinalPosition: 1,
			dataType: 'integer',
			isNullable: false,
			nullCount: 0,
			nullRatio: 0,
			distinctCount: 1200,
			distinctRatio: 1,
			minLength: 1,
			maxLength: 5
		},
		{
			columnName: 'email',
			ordinalPosition: 2,
			dataType: 'character varying(255)',
			isNullable: true,
			nullCount: 24,
			nullRatio: 0.02,
			distinctCount: 1175,
			distinctRatio: 0.9792,
			minLength: 12,
			maxLength: 48
		}
	]
};

describe('evaluateQualityRules', () => {
	it('should create a violation when a matched column rule fails', () => {
		const rules: QualityRuleEntry[] = [
			{
				id: 'rule-1',
				name: '이메일 NULL 비율 1% 이하',
				description: 'email 컬럼 NULL 비율 제한',
				enabled: true,
				severity: 'warning',
				scope: 'column',
				metric: 'nullRatio',
				operator: 'lte',
				threshold: 0.01,
				target: {
					schemaPattern: 'pub*',
					tablePattern: 'customer*',
					columnPattern: 'email'
				},
				createdAt: '2026-03-12T00:00:00.000Z',
				updatedAt: '2026-03-12T00:00:00.000Z'
			}
		];

		const result = evaluateQualityRules(baseProfile, rules);

		expect(result.summary.totalRules).toBe(1);
		expect(result.summary.matchedRules).toBe(1);
		expect(result.summary.failedRules).toBe(1);
		expect(result.summary.warningCount).toBe(1);
		expect(result.violations).toHaveLength(1);
		expect(result.violations[0].target.column).toBe('email');
	});

	it('should count a matched table rule as passed when the threshold is satisfied', () => {
		const rules: QualityRuleEntry[] = [
			{
				id: 'rule-2',
				name: '행 수 1건 이상',
				description: '빈 테이블 방지',
				enabled: true,
				severity: 'error',
				scope: 'table',
				metric: 'rowCount',
				operator: 'gte',
				threshold: 1,
				target: {
					schemaPattern: 'public',
					tablePattern: 'customers'
				},
				createdAt: '2026-03-12T00:00:00.000Z',
				updatedAt: '2026-03-12T00:00:00.000Z'
			}
		];

		const result = evaluateQualityRules(baseProfile, rules);

		expect(result.summary.totalRules).toBe(1);
		expect(result.summary.matchedRules).toBe(1);
		expect(result.summary.passedRules).toBe(1);
		expect(result.summary.failedRules).toBe(0);
		expect(result.violations).toHaveLength(0);
	});

	it('should ignore unmatched or disabled rules in matched counts', () => {
		const rules: QualityRuleEntry[] = [
			{
				id: 'rule-3',
				name: '다른 스키마 규칙',
				description: '',
				enabled: true,
				severity: 'info',
				scope: 'table',
				metric: 'rowCount',
				operator: 'gte',
				threshold: 1,
				target: {
					schemaPattern: 'audit',
					tablePattern: 'customers'
				},
				createdAt: '2026-03-12T00:00:00.000Z',
				updatedAt: '2026-03-12T00:00:00.000Z'
			},
			{
				id: 'rule-4',
				name: '비활성 규칙',
				description: '',
				enabled: false,
				severity: 'warning',
				scope: 'column',
				metric: 'nullRatio',
				operator: 'lte',
				threshold: 0.01,
				target: {
					schemaPattern: 'public',
					tablePattern: 'customers',
					columnPattern: 'email'
				},
				createdAt: '2026-03-12T00:00:00.000Z',
				updatedAt: '2026-03-12T00:00:00.000Z'
			}
		];

		const result = evaluateQualityRules(baseProfile, rules);

		expect(result.summary.totalRules).toBe(1);
		expect(result.summary.matchedRules).toBe(0);
		expect(result.summary.passedRules).toBe(0);
		expect(result.summary.failedRules).toBe(0);
		expect(result.violations).toHaveLength(0);
	});
});
