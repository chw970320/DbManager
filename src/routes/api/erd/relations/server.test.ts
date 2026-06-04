import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import { runDesignRelationValidation } from '$lib/utils/design-relation-service.js';

vi.mock('$lib/utils/design-relation-service.js', () => ({
	runDesignRelationValidation: vi.fn(),
	relationApiErrorStatus: vi.fn((error: unknown) =>
		error && typeof error === 'object' && 'status' in error ? Number(error.status) : 500
	)
}));

function createMockRequestEvent(options: { searchParams?: Record<string, string> }): RequestEvent {
	const url = new URL('http://localhost/api/erd/relations');
	if (options.searchParams) {
		for (const [k, v] of Object.entries(options.searchParams)) {
			url.searchParams.set(k, v);
		}
	}
	return { url, request: {} as Request } as RequestEvent;
}

describe('API: /api/erd/relations', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(runDesignRelationValidation).mockResolvedValue({
			files: { database: 'database.json' },
			sources: {
				vocabulary: 'missing',
				domain: 'missing',
				term: 'missing',
				database: 'default',
				entity: 'default',
				attribute: 'default',
				table: 'default',
				column: 'default'
			},
			validation: {
				specs: [],
				rules: [],
				summaries: [],
				issues: [],
				totals: {
					totalChecked: 0,
					matched: 0,
					unmatched: 0,
					errorCount: 0,
					warningCount: 0
				}
			}
		});
	});

	it('should return relation validation result through canonical service', async () => {
		const response = await GET(createMockRequestEvent({}));
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.files.database).toBe('database.json');
		expect(runDesignRelationValidation).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ requireStandardReferences: false })
		);
	});

	it('should pass explicit 8-type file parameters to canonical service', async () => {
		await GET(
			createMockRequestEvent({
				searchParams: {
					vocabularyFile: 'vocab-x.json',
					domainFile: 'domain-x.json',
					termFile: 'term-x.json',
					databaseFile: 'db-x.json',
					entityFile: 'entity-x.json',
					attributeFile: 'attribute-x.json',
					tableFile: 'table-x.json',
					columnFile: 'column-x.json',
					scopeType: 'column',
					scopeFile: 'column-x.json'
				}
			})
		);

		expect(runDesignRelationValidation).toHaveBeenCalledWith(
			expect.objectContaining({
				vocabularyFile: 'vocab-x.json',
				domainFile: 'domain-x.json',
				termFile: 'term-x.json',
				databaseFile: 'db-x.json',
				entityFile: 'entity-x.json',
				attributeFile: 'attribute-x.json',
				tableFile: 'table-x.json',
				columnFile: 'column-x.json',
				scopeType: 'column',
				scopeFile: 'column-x.json'
			}),
			expect.objectContaining({ requireStandardReferences: false })
		);
	});

	it('should return 500 on canonical service error', async () => {
		vi.mocked(runDesignRelationValidation).mockRejectedValue(new Error('failed'));

		const response = await GET(createMockRequestEvent({}));
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
		expect(result.error).toContain('failed');
	});
});
