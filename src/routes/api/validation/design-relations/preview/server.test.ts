import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import { runDesignRelationPreview } from '$lib/utils/design-relation-service.js';

vi.mock('$lib/utils/design-relation-service.js', () => ({
	runDesignRelationPreview: vi.fn(),
	relationApiErrorStatus: vi.fn((error: unknown) =>
		error && typeof error === 'object' && 'status' in error ? Number(error.status) : 500
	)
}));

function event(body: unknown): RequestEvent {
	return {
		request: new Request('http://localhost/api/validation/design-relations/preview', {
			method: 'POST',
			body: JSON.stringify(body)
		})
	} as RequestEvent;
}

describe('API: /api/validation/design-relations/preview', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(runDesignRelationPreview).mockResolvedValue({
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
			issueId: 'issue-1',
			candidateId: 'candidate-1',
			patch: { targetType: 'column', targetId: 'col-1', fields: { tableEnglishName: 'USER' } },
			previewText: 'preview',
			actionGuide: 'guide'
		});
	});

	it('returns selected candidate preview', async () => {
		const response = await POST(
			event({ issueId: 'issue-1', candidateId: 'candidate-1', columnFile: 'column-a.json' })
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.data.patch.fields.tableEnglishName).toBe('USER');
		expect(runDesignRelationPreview).toHaveBeenCalledWith(
			expect.objectContaining({ issueId: 'issue-1', candidateId: 'candidate-1' })
		);
	});

	it('rejects missing issueId', async () => {
		const response = await POST(event({ candidateId: 'candidate-1' }));

		expect(response.status).toBe(400);
		expect(runDesignRelationPreview).not.toHaveBeenCalled();
	});
});
