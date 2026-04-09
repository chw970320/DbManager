import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

const { mockPlanCascadeUpdate } = vi.hoisted(() => ({
	mockPlanCascadeUpdate: vi.fn()
}));

vi.mock('$lib/utils/change-impact-preview.js', () => ({
	buildScopedDomainImpactPreview: vi.fn()
}));

vi.mock('$lib/utils/cascade-update-plan.js', () => ({
	planCascadeUpdate: mockPlanCascadeUpdate
}));

function createEvent(body?: unknown): RequestEvent {
	return {
		url: new URL('http://localhost/api/domain/impact-preview'),
		request: {
			json: vi.fn().mockResolvedValue(body || {})
		}
	} as unknown as RequestEvent;
}

describe('API: /api/domain/impact-preview', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('editor-save scope에서는 cascade preview를 반환한다', async () => {
		mockPlanCascadeUpdate.mockResolvedValue({
			blocked: false,
			sourceEntry: {} as never,
			preview: {
				sourceType: 'domain',
				sourceFilename: 'domain.json',
				sourceEntryId: 'd1',
				sourceEntryName: '사용자명_VARCHAR(50)',
				mode: 'update',
				summary: {
					sourceChangeCount: 1,
					relatedChangeCount: 2,
					totalChangedFiles: 3,
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
				scope: 'editor-save',
				currentEntry: { id: 'd1' },
				proposedEntry: {
					id: 'd1',
					domainGroup: '공통',
					domainCategory: '사용자명',
					standardDomainName: '사용자명_VARCHAR(50)',
					physicalDataType: 'VARCHAR'
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.sourceType).toBe('domain');
	});
});
