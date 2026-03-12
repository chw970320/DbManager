import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, GET, POST, PUT } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/registry/data-quality-rule-registry', () => ({
	loadQualityRuleData: vi.fn(),
	createQualityRule: vi.fn(),
	updateQualityRule: vi.fn(),
	deleteQualityRule: vi.fn()
}));

import {
	createQualityRule,
	deleteQualityRule,
	loadQualityRuleData,
	updateQualityRule
} from '$lib/registry/data-quality-rule-registry';

function createEvent(options: { method?: string; body?: unknown } = {}): RequestEvent {
	const request = {
		method: options.method || 'GET',
		json: vi.fn().mockResolvedValue(options.body || {})
	} as unknown as Request;

	return {
		request,
		url: new URL('http://localhost/api/quality-rules')
	} as RequestEvent;
}

const mockRuleEntry = {
	id: 'rule-1',
	name: '고객 이메일 NULL 비율 5% 이하',
	description: 'email 컬럼의 NULL 비율은 5%를 넘기면 안 됩니다.',
	enabled: true,
	severity: 'warning' as const,
	scope: 'column' as const,
	metric: 'nullRatio' as const,
	operator: 'lte' as const,
	threshold: 0.05,
	target: {
		schemaPattern: 'public',
		tablePattern: 'customers',
		columnPattern: 'email'
	},
	createdAt: '2026-03-12T00:00:00.000Z',
	updatedAt: '2026-03-12T00:00:00.000Z'
};

const mockRuleData = {
	entries: [mockRuleEntry],
	lastUpdated: '2026-03-12T00:00:00.000Z',
	totalCount: 1
};

describe('API: /api/quality-rules', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadQualityRuleData).mockResolvedValue(mockRuleData);
		vi.mocked(createQualityRule).mockResolvedValue({
			entry: mockRuleEntry,
			data: mockRuleData
		});
		vi.mocked(updateQualityRule).mockResolvedValue({
			entry: mockRuleEntry,
			data: mockRuleData
		});
		vi.mocked(deleteQualityRule).mockResolvedValue({
			data: {
				entries: [],
				lastUpdated: '2026-03-12T00:00:00.000Z',
				totalCount: 0
			}
		});
	});

	it('GET should return quality rule data', async () => {
		const response = await GET();
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.entries).toEqual([mockRuleEntry]);
		expect(loadQualityRuleData).toHaveBeenCalled();
	});

	it('POST should create a quality rule', async () => {
		const payload = {
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
			}
		};

		const response = await POST(
			createEvent({
				method: 'POST',
				body: payload
			})
		);
		const result = await response.json();

		expect(response.status).toBe(201);
		expect(result.success).toBe(true);
		expect(createQualityRule).toHaveBeenCalledWith(payload);
	});

	it('POST should reject missing required fields', async () => {
		const response = await POST(
			createEvent({
				method: 'POST',
				body: {
					name: '',
					scope: 'column'
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(result.error).toContain('필수');
	});

	it('PUT should update a quality rule', async () => {
		const payload = {
			id: 'rule-1',
			name: '고객 이메일 NULL 비율 3% 이하',
			description: 'email 컬럼의 NULL 비율 상한을 강화합니다.',
			enabled: true,
			severity: 'error',
			scope: 'column',
			metric: 'nullRatio',
			operator: 'lte',
			threshold: 0.03,
			target: {
				schemaPattern: 'public',
				tablePattern: 'customers',
				columnPattern: 'email'
			}
		};

		const response = await PUT(
			createEvent({
				method: 'PUT',
				body: payload
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(updateQualityRule).toHaveBeenCalledWith('rule-1', {
			name: payload.name,
			description: payload.description,
			enabled: payload.enabled,
			severity: payload.severity,
			scope: payload.scope,
			metric: payload.metric,
			operator: payload.operator,
			threshold: payload.threshold,
			target: payload.target
		});
	});

	it('PUT should return 404 when the quality rule is missing', async () => {
		vi.mocked(updateQualityRule).mockRejectedValueOnce(
			new Error('수정할 품질 규칙을 찾을 수 없습니다.')
		);

		const response = await PUT(
			createEvent({
				method: 'PUT',
				body: {
					id: 'missing',
					name: '누락',
					enabled: true,
					severity: 'warning',
					scope: 'column',
					metric: 'nullRatio',
					operator: 'lte',
					threshold: 0.05
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(404);
		expect(result.success).toBe(false);
	});

	it('DELETE should remove a quality rule', async () => {
		const response = await DELETE(
			createEvent({
				method: 'DELETE',
				body: {
					id: 'rule-1'
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(deleteQualityRule).toHaveBeenCalledWith('rule-1');
	});
});
