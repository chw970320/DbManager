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

function event(path = '/api/validation/design-relations'): RequestEvent {
	return { url: new URL(`http://localhost${path}`), request: {} as Request } as RequestEvent;
}

describe('API: /api/validation/design-relations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(runDesignRelationValidation).mockResolvedValue({
			files: { database: 'database-a.json', term: 'term-a.json' },
			sources: {
				vocabulary: 'shared-bundle',
				domain: 'shared-bundle',
				term: 'explicit',
				database: 'explicit',
				entity: 'shared-bundle',
				attribute: 'shared-bundle',
				table: 'shared-bundle',
				column: 'shared-bundle'
			},
			validation: {
				specs: [],
				rules: [],
				summaries: [],
				issues: [],
				totals: { totalChecked: 0, matched: 0, unmatched: 0, errorCount: 0, warningCount: 0 }
			}
		});
	});

	it('loads canonical relation validation with explicit 8-type query params', async () => {
		const response = await GET(
			event(
				'/api/validation/design-relations?databaseFile=database-a.json&termFile=term-a.json&scopeType=database&scopeFile=database-a.json'
			)
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(runDesignRelationValidation).toHaveBeenCalledWith(
			expect.objectContaining({
				databaseFile: 'database-a.json',
				termFile: 'term-a.json',
				scopeType: 'database',
				scopeFile: 'database-a.json',
				requireStandardReferences: true
			}),
			expect.objectContaining({ requireStandardReferences: true })
		);
	});

	it('returns canonical 400 error from unresolved STANDARD_REFERENCES input', async () => {
		vi.mocked(runDesignRelationValidation).mockRejectedValue(
			Object.assign(new Error('missing standards'), { status: 400 })
		);

		const response = await GET(event());
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(result.error).toContain('missing standards');
	});
});
