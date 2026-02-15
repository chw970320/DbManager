import { describe, expect, it, vi } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

function createEvent(fetchImpl: (input: RequestInfo | URL) => Promise<Response>): RequestEvent {
	return {
		url: new URL('http://localhost/api/validation/report?termFilename=term.json'),
		request: {} as Request,
		fetch: fetchImpl as RequestEvent['fetch']
	} as RequestEvent;
}

describe('Integration: validation/report (8-model reference flow)', () => {
	it('merges term(vocabulary+domain) and relation(5 definitions) to unified output', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const path = input.toString();
			if (path.includes('/api/term/validate-all')) {
				return jsonResponse({
					success: true,
					data: {
						totalCount: 3,
						passedCount: 2,
						failedCount: 1,
						failedEntries: [
							{
								entry: { id: 'term-1', termName: '없는_용어', columnName: 'NO_TERM', domainName: 'MISSING_DOM' },
								errors: [{ type: 'TERM_NAME_MAPPING', code: 'TERM_NAME_MAPPING', message: '용어 매핑 실패' }],
								suggestions: { actionType: 'ADD_VOCABULARY' }
							}
						]
					}
				});
			}
			if (path.includes('/api/erd/relations')) {
				return jsonResponse({
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
									totalChecked: 3,
									matched: 2,
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
											targetLabel: 'NO_TERM',
											expectedKey: 'A|B',
											reason: '참조 누락'
										}
									]
								}
							],
							totals: {
								totalChecked: 3,
								matched: 2,
								unmatched: 1,
								errorCount: 1,
								warningCount: 0
							}
						}
					}
				});
			}
			return jsonResponse({ success: false, error: 'unknown' }, 404);
		});

		const response = await GET(createEvent(fetchMock));
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.files.database).toBe('database.json');
		expect(result.data.files.term).toBe('term.json');
		expect(result.data.summary.termFailedCount).toBe(1);
		expect(result.data.summary.relationUnmatchedCount).toBe(1);
		expect(result.data.issues.length).toBe(2);
	});
});
