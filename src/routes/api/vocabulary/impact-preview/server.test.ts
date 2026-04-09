import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/utils/cascade-update-plan.js', () => ({
	planCascadeUpdate: vi.fn()
}));

import { planCascadeUpdate } from '$lib/utils/cascade-update-plan.js';

function createEvent(body?: unknown): RequestEvent {
	return {
		url: new URL('http://localhost/api/vocabulary/impact-preview'),
		request: {
			json: vi.fn().mockResolvedValue(body || {})
		}
	} as unknown as RequestEvent;
}

describe('API: /api/vocabulary/impact-preview', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('proposedEntry가 없으면 400을 반환한다', async () => {
		const response = await POST(createEvent({ filename: 'vocabulary.json' }));
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
	});

	it('editor-save preview를 반환한다', async () => {
		vi.mocked(planCascadeUpdate).mockResolvedValue({
			blocked: false,
			plan: {} as never,
			sourceType: 'vocabulary',
			sourceEntry: {} as never,
			preview: {
				sourceType: 'vocabulary',
				sourceFilename: 'vocabulary.json',
				sourceEntryId: 'v1',
				sourceEntryName: '이름',
				mode: 'update',
				summary: {
					sourceChangeCount: 1,
					relatedChangeCount: 1,
					totalChangedFiles: 2,
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
				filename: 'vocabulary.json',
				currentEntry: { id: 'v1' },
				proposedEntry: {
					id: 'v1',
					standardName: '이름',
					abbreviation: 'NAME',
					englishName: 'Name'
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.sourceType).toBe('vocabulary');
	});
});
