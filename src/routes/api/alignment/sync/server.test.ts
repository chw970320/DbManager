import { describe, it, expect, vi } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

function makeJsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

function createPostEvent(options?: {
	body?: Record<string, unknown>;
	searchParams?: Record<string, string>;
	fetchImpl?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}): RequestEvent {
	const url = new URL('http://localhost/api/alignment/sync');
	if (options?.searchParams) {
		for (const [key, value] of Object.entries(options.searchParams)) {
			url.searchParams.set(key, value);
		}
	}

	return {
		url,
		request: {
			json: async () => options?.body || {}
		} as Request,
		fetch: (options?.fetchImpl ||
			(async () => makeJsonResponse({ success: true, data: {} }))) as RequestEvent['fetch']
	} as RequestEvent;
}

describe('API: /api/alignment/sync', () => {
	it('should execute vocabulary -> term -> relation -> column -> validation sequence and return summary', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const path = input.toString();
			if (path.includes('/api/vocabulary/sync-domain')) {
				return makeJsonResponse({
					success: true,
					data: {
						mode: 'apply',
						updated: 2
					}
				});
			}
			if (path.includes('/api/term/sync')) {
				return makeJsonResponse({
					success: true,
					data: {
						mode: 'apply',
						updated: 5
					}
				});
			}
			if (path.includes('/api/erd/relations/sync')) {
				return makeJsonResponse({
					success: true,
					data: {
						mode: 'apply',
						counts: { appliedTotalUpdates: 3 }
					}
				});
			}
			if (path.includes('/api/column/sync-term')) {
				return makeJsonResponse({
					success: true,
					data: {
						mode: 'apply',
						updated: 7
					}
				});
			}
			if (path.includes('/api/validation/report')) {
				return makeJsonResponse({
					success: true,
					data: {
						summary: {
							totalIssues: 4,
							relationUnmatchedCount: 1,
							termFailedCount: 2
						}
					}
				});
			}
			return makeJsonResponse({ success: false, error: 'unknown path' }, 404);
		});

		const response = await POST(
			createPostEvent({
				body: { apply: true, termFilename: 'term-custom.json' },
				fetchImpl: fetchMock
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.summary.appliedVocabularyUpdates).toBe(2);
		expect(result.data.summary.appliedTermUpdates).toBe(5);
		expect(result.data.summary.appliedRelationUpdates).toBe(3);
		expect(result.data.summary.appliedColumnUpdates).toBe(7);
		expect(result.data.summary.remainingTermFailed).toBe(2);
		expect(result.data.summary.totalIssues).toBe(4);
		expect(fetchMock).toHaveBeenCalledTimes(5);
		expect(fetchMock.mock.calls[0][0].toString()).toContain('/api/vocabulary/sync-domain');
		expect(fetchMock.mock.calls[1][0].toString()).toContain('/api/term/sync');
		expect(fetchMock.mock.calls[2][0].toString()).toContain('/api/erd/relations/sync');
		expect(fetchMock.mock.calls[3][0].toString()).toContain('/api/column/sync-term');
		expect(fetchMock.mock.calls[4][0].toString()).toContain('/api/validation/report');
	});

	it('should fail when relation sync fails', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const path = input.toString();
			if (path.includes('/api/vocabulary/sync-domain')) {
				return makeJsonResponse({ success: true, data: { updated: 0 } });
			}
			if (path.includes('/api/term/sync')) {
				return makeJsonResponse({ success: true, data: { updated: 0 } });
			}
			if (path.includes('/api/erd/relations/sync')) {
				return makeJsonResponse({ success: false, error: 'relation failed' }, 500);
			}
			return makeJsonResponse({ success: true, data: {} });
		});

		const response = await POST(createPostEvent({ fetchImpl: fetchMock }));
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
		expect(result.data.failedStep).toBe('relation');
	});

	it('should fail when validation report fails', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const path = input.toString();
			if (path.includes('/api/vocabulary/sync-domain')) {
				return makeJsonResponse({ success: true, data: { updated: 0 } });
			}
			if (path.includes('/api/term/sync')) {
				return makeJsonResponse({ success: true, data: { updated: 0 } });
			}
			if (path.includes('/api/erd/relations/sync')) {
				return makeJsonResponse({ success: true, data: { counts: { appliedTotalUpdates: 0 } } });
			}
			if (path.includes('/api/column/sync-term')) {
				return makeJsonResponse({ success: true, data: { updated: 0 } });
			}
			if (path.includes('/api/validation/report')) {
				return makeJsonResponse({ success: false, error: 'report failed' }, 500);
			}
			return makeJsonResponse({ success: false, error: 'unknown path' }, 404);
		});

		const response = await POST(createPostEvent({ fetchImpl: fetchMock }));
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
		expect(result.data.failedStep).toBe('validation');
	});
});
