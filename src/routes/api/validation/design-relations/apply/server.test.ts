import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import { runDesignRelationApply } from '$lib/utils/design-relation-service.js';

vi.mock('$lib/utils/design-relation-service.js', () => ({
	runDesignRelationApply: vi.fn(),
	relationApiErrorStatus: vi.fn((error: unknown) =>
		error && typeof error === 'object' && 'status' in error ? Number(error.status) : 500
	)
}));

function event(body: unknown): RequestEvent {
	return {
		request: new Request('http://localhost/api/validation/design-relations/apply', {
			method: 'POST',
			body: JSON.stringify(body)
		})
	} as RequestEvent;
}

describe('API: /api/validation/design-relations/apply', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(runDesignRelationApply).mockResolvedValue({
			files: { column: 'column-a.json' },
			sources: {
				vocabulary: 'explicit',
				domain: 'explicit',
				term: 'explicit',
				database: 'explicit',
				entity: 'explicit',
				attribute: 'explicit',
				table: 'explicit',
				column: 'explicit'
			},
			validation: {
				specs: [],
				rules: [],
				summaries: [],
				issues: [],
				totals: { totalChecked: 0, matched: 0, unmatched: 0, errorCount: 0, warningCount: 0 }
			},
			apply: {
				issueId: 'issue-1',
				candidateId: 'candidate-1',
				applied: true,
				patch: { targetType: 'column', targetId: 'col-1', fields: { tableEnglishName: 'USER' } },
				updatedEntryId: 'col-1',
				targetType: 'column',
				targetFile: 'column-a.json',
				previewText: 'preview'
			}
		});
	});

	it('applies selected candidate and returns refreshed validation', async () => {
		const response = await POST(
			event({ issueId: 'issue-1', candidateId: 'candidate-1', columnFile: 'column-a.json' })
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.data.apply).toMatchObject({ applied: true, targetFile: 'column-a.json' });
		expect(runDesignRelationApply).toHaveBeenCalledWith(
			expect.objectContaining({ issueId: 'issue-1', candidateId: 'candidate-1' })
		);
	});

	it('rejects missing issueId', async () => {
		const response = await POST(event({ candidateId: 'candidate-1' }));

		expect(response.status).toBe(400);
		expect(runDesignRelationApply).not.toHaveBeenCalled();
	});
});
