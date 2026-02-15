import { describe, it, expect, vi } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

function makeJsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

function createEvent(options?: {
	searchParams?: Record<string, string>;
	fetchImpl?: (input: RequestInfo | URL) => Promise<Response>;
}): RequestEvent {
	const url = new URL('http://localhost/api/validation/report');
	if (options?.searchParams) {
		for (const [k, v] of Object.entries(options.searchParams)) {
			url.searchParams.set(k, v);
		}
	}

	return {
		url,
		request: {} as Request,
		fetch: (options?.fetchImpl ||
			(async () => makeJsonResponse({ success: true, data: {} }))) as RequestEvent['fetch']
	} as RequestEvent;
}

describe('API: /api/validation/report', () => {
	it('should build unified report from term and relation validations', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const path = input.toString();
			if (path.includes('/api/term/validate-all')) {
				return makeJsonResponse({
					success: true,
					data: {
						totalCount: 2,
						passedCount: 1,
						failedCount: 1,
						failedEntries: [
							{
								entry: { id: 'term-1', termName: '사용자_이름', columnName: 'USER_NAME' },
								errors: [
									{
										type: 'TERM_NAME_MAPPING',
										code: 'TERM_NAME_MAPPING',
										message: '용어명 매핑 실패',
										field: 'termName'
									}
								],
								suggestions: { actionType: 'ADD_VOCABULARY' }
							}
						]
					}
				});
			}
			if (path.includes('/api/erd/relations')) {
				return makeJsonResponse({
					success: true,
					data: {
						files: {
							database: 'database.json',
							entity: 'entity.json',
							attribute: 'attribute.json',
							table: 'table.json',
							column: 'column.json'
						},
						validation: {
							specs: [],
							summaries: [
								{
									relationId: 'TABLE_COLUMN',
									relationName: '테이블 -> 컬럼',
									totalChecked: 1,
									matched: 0,
									unmatched: 1,
									severity: 'error',
									mappingKey: 'schema+table',
									issues: [
										{
											relationId: 'TABLE_COLUMN',
											severity: 'error',
											sourceType: 'table',
											targetType: 'column',
											targetId: 'col-1',
											targetLabel: 'USER_NAME',
											expectedKey: 'A|B',
											reason: '테이블 참조 누락'
										}
									]
								}
							],
							totals: {
								totalChecked: 1,
								matched: 0,
								unmatched: 1,
								errorCount: 1,
								warningCount: 0
							}
						}
					}
				});
			}
			return makeJsonResponse({ success: false, error: 'unknown path' }, 404);
		});

		const response = await GET(
			createEvent({
				searchParams: { termFile: 'term-a.json', databaseFile: 'db-a.json' },
				fetchImpl: fetchMock
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.files.term).toBe('term-a.json');
		expect(result.data.summary.totalIssues).toBe(2);
		expect(result.data.summary.errorCount).toBe(1);
		expect(result.data.summary.autoFixableCount).toBe(1);
		expect(result.data.issues[0].source).toBe('relation');
		expect(result.data.issues[1].source).toBe('term');
	});

	it('should return failure when term validation fails', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const path = input.toString();
			if (path.includes('/api/term/validate-all')) {
				return makeJsonResponse({ success: false, error: 'term failed' }, 500);
			}
			return makeJsonResponse({ success: true, data: {} });
		});

		const response = await GET(createEvent({ fetchImpl: fetchMock }));
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
		expect(result.error).toContain('term failed');
	});

	it('should return failure when relation validation fails', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const path = input.toString();
			if (path.includes('/api/term/validate-all')) {
				return makeJsonResponse({
					success: true,
					data: { totalCount: 0, passedCount: 0, failedCount: 0, failedEntries: [] }
				});
			}
			if (path.includes('/api/erd/relations')) {
				return makeJsonResponse({ success: false, error: 'relation failed' }, 500);
			}
			return makeJsonResponse({ success: false, error: 'unknown' }, 404);
		});

		const response = await GET(createEvent({ fetchImpl: fetchMock }));
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
		expect(result.error).toContain('relation failed');
	});
});

