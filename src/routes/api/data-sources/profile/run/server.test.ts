import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/registry/data-source-registry', () => ({
	getDataSourceEntry: vi.fn()
}));

vi.mock('$lib/utils/data-source-profiling', () => ({
	profileDataSourceTable: vi.fn()
}));

vi.mock('$lib/registry/data-quality-rule-registry', () => ({
	loadQualityRuleData: vi.fn()
}));

vi.mock('$lib/utils/data-quality-rule-evaluator', () => ({
	evaluateQualityRules: vi.fn()
}));

import { getDataSourceEntry } from '$lib/registry/data-source-registry';
import { profileDataSourceTable } from '$lib/utils/data-source-profiling';
import { loadQualityRuleData } from '$lib/registry/data-quality-rule-registry';
import { evaluateQualityRules } from '$lib/utils/data-quality-rule-evaluator';

function createEvent(body: unknown): RequestEvent {
	const request = {
		method: 'POST',
		json: vi.fn().mockResolvedValue(body)
	} as unknown as Request;

	return {
		request,
		url: new URL('http://localhost/api/data-sources/profile/run')
	} as RequestEvent;
}

const storedEntry = {
	id: 'source-1',
	name: '운영 PostgreSQL',
	type: 'postgresql' as const,
	description: '운영 메타데이터 저장소',
	config: {
		host: 'db.internal',
		port: 5432,
		database: 'metadata',
		schema: 'public',
		username: 'dbadmin',
		password: 'secret',
		ssl: false,
		connectionTimeoutSeconds: 5
	},
	createdAt: '2026-03-12T00:00:00.000Z',
	updatedAt: '2026-03-12T00:00:00.000Z'
};

describe('API: /api/data-sources/profile/run', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getDataSourceEntry).mockResolvedValue(storedEntry);
		vi.mocked(profileDataSourceTable).mockResolvedValue({
			dataSourceId: 'source-1',
			dataSourceName: '운영 PostgreSQL',
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
				}
			]
		});
		vi.mocked(loadQualityRuleData).mockResolvedValue({
			entries: [
				{
					id: 'rule-1',
					name: '고객 이메일 NULL 비율 5% 이하',
					description: 'email 컬럼의 NULL 비율은 5%를 넘기면 안 됩니다.',
					enabled: true,
					severity: 'warning',
					scope: 'column',
					metric: 'nullRatio',
					operator: 'lte',
					threshold: 0.05,
					target: {
						schemaPattern: 'public',
						tablePattern: 'customers',
						columnPattern: 'email'
					},
					createdAt: '2026-03-12T00:00:00.000Z',
					updatedAt: '2026-03-12T00:00:00.000Z'
				}
			],
			lastUpdated: '2026-03-12T00:00:00.000Z',
			totalCount: 1
		});
		vi.mocked(evaluateQualityRules).mockReturnValue({
			evaluatedAt: '2026-03-12T00:00:00.000Z',
			summary: {
				totalRules: 1,
				matchedRules: 1,
				passedRules: 0,
				failedRules: 1,
				infoCount: 0,
				errorCount: 0,
				warningCount: 1
			},
			violations: [
				{
					ruleId: 'rule-1',
					ruleName: '고객 이메일 NULL 비율 5% 이하',
					severity: 'warning',
					scope: 'column',
					target: {
						schema: 'public',
						table: 'customers',
						column: 'email'
					},
					metric: 'nullRatio',
					operator: 'lte',
					threshold: 0.05,
					actualValue: 0.07,
					message: 'email 컬럼의 NULL 비율이 기준값을 초과했습니다.'
				}
			]
		});
	});

	it('should run table profiling for a saved PostgreSQL source', async () => {
		const response = await POST(
			createEvent({
				dataSourceId: 'source-1',
				schema: 'public',
				table: 'customers'
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(getDataSourceEntry).toHaveBeenCalledWith('source-1');
		expect(profileDataSourceTable).toHaveBeenCalledWith(storedEntry, {
			schema: 'public',
			table: 'customers'
		});
		expect(result.data.columns).toHaveLength(1);
		expect(result.data.qualityRuleEvaluation.summary.totalRules).toBe(1);
	});

	it('should include evaluated quality rule results when rules exist', async () => {
		const response = await POST(
			createEvent({
				dataSourceId: 'source-1',
				schema: 'public',
				table: 'customers'
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(loadQualityRuleData).toHaveBeenCalled();
		expect(evaluateQualityRules).toHaveBeenCalledWith(
			expect.objectContaining({
				table: 'customers'
			}),
			expect.arrayContaining([
				expect.objectContaining({
					id: 'rule-1'
				})
			])
		);
		expect(result.data.qualityRuleEvaluation.violations).toHaveLength(1);
	});

	it('should return 400 when required profiling fields are missing', async () => {
		const response = await POST(
			createEvent({
				dataSourceId: 'source-1',
				schema: '',
				table: 'customers'
			})
		);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(profileDataSourceTable).not.toHaveBeenCalled();
		expect(evaluateQualityRules).not.toHaveBeenCalled();
	});

	it('should return 404 when the data source does not exist', async () => {
		vi.mocked(getDataSourceEntry).mockResolvedValue(null);

		const response = await POST(
			createEvent({
				dataSourceId: 'missing',
				schema: 'public',
				table: 'customers'
			})
		);
		const result = await response.json();

		expect(response.status).toBe(404);
		expect(result.success).toBe(false);
		expect(profileDataSourceTable).not.toHaveBeenCalled();
	});
});
