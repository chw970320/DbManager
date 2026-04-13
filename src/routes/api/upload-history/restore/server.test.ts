import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/registry/upload-history-registry', () => ({
	restoreUploadHistoryEntry: vi.fn()
}));

import { restoreUploadHistoryEntry } from '$lib/registry/upload-history-registry';

function createEvent(body?: unknown): RequestEvent {
	return {
		request: {
			method: 'POST',
			json: vi.fn().mockResolvedValue(body || {})
		} as unknown as Request,
		url: new URL('http://localhost/api/upload-history/restore')
	} as RequestEvent;
}

describe('API: /api/upload-history/restore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(restoreUploadHistoryEntry).mockResolvedValue({
			id: 'history-1',
			dataType: 'term',
			filename: 'term.json',
			reason: 'upload-replace',
			createdAt: '2026-04-09T00:00:00.000Z',
			expiresAt: '2026-05-09T00:00:00.000Z',
			entryCount: 0
		});
	});

	it('이력 복원을 수행한다', async () => {
		const response = await POST(createEvent({ dataType: 'term', id: 'history-1' }));
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(restoreUploadHistoryEntry).toHaveBeenCalledWith('term', 'history-1');
		expect(result.data.entry.id).toBe('history-1');
	});

	it('필수 입력 누락은 400을 반환한다', async () => {
		const response = await POST(createEvent({ id: 'history-1' }));
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
	});
});
