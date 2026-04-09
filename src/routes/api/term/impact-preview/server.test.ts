import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

const { mockPlanCascadeUpdate } = vi.hoisted(() => ({
	mockPlanCascadeUpdate: vi.fn()
}));

vi.mock('$lib/utils/change-impact-preview.js', () => ({
	buildScopedTermImpactPreview: vi.fn()
}));

vi.mock('$lib/utils/cascade-update-plan.js', () => ({
	planCascadeUpdate: mockPlanCascadeUpdate
}));

function createEvent(body?: unknown): RequestEvent {
	return {
		url: new URL('http://localhost/api/term/impact-preview'),
		request: {
			json: vi.fn().mockResolvedValue(body || {})
		}
	} as unknown as RequestEvent;
}

describe('API: /api/term/impact-preview', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('proposedEntry가 없으면 400을 반환한다', async () => {
		const response = await POST(createEvent({ filename: 'term.json' }));
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
	});

	it('editor-save scope에서는 cascade preview를 반환한다', async () => {
		mockPlanCascadeUpdate.mockResolvedValue({
			blocked: false,
			sourceEntry: {} as never,
			preview: {
				sourceType: 'term',
				sourceFilename: 'term.json',
				sourceEntryId: 't1',
				sourceEntryName: '사용자_이름',
				mode: 'update',
				summary: {
					sourceChangeCount: 1,
					relatedChangeCount: 0,
					totalChangedFiles: 1,
					conflictCount: 0
				},
				fileSummaries: [],
				guidance: [],
				conflicts: [],
				blocked: false
			}
		} as never);

		const response = await POST(
			createEvent({
				filename: 'term.json',
				scope: 'editor-save',
				currentEntry: { id: 't1' },
				proposedEntry: {
					id: 't1',
					termName: '사용자_이름',
					columnName: 'USER_NAME',
					domainName: '사용자명_VARCHAR(50)'
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.sourceType).toBe('term');
	});
});
