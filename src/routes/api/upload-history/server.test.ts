import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/registry/upload-history-registry', () => ({
	listUploadHistoryEntries: vi.fn()
}));

import { listUploadHistoryEntries } from '$lib/registry/upload-history-registry';

function createEvent(search = ''): RequestEvent {
	return {
		request: { method: 'GET' } as unknown as Request,
		url: new URL(`http://localhost/api/upload-history${search}`)
	} as RequestEvent;
}

describe('API: /api/upload-history', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(listUploadHistoryEntries).mockResolvedValue([
			{
				id: 'history-1',
				dataType: 'vocabulary',
				filename: 'vocabulary.json',
				reason: 'upload-replace',
				createdAt: '2026-04-09T00:00:00.000Z',
				expiresAt: '2026-05-09T00:00:00.000Z',
				entryCount: 0
			}
		]);
	});

	it('dataType과 filename 기준 이력 목록을 반환한다', async () => {
		const response = await GET(createEvent('?dataType=vocabulary&filename=vocabulary.json'));
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.entries).toHaveLength(1);
		expect(listUploadHistoryEntries).toHaveBeenCalledWith('vocabulary', 'vocabulary.json');
	});

	it('잘못된 dataType은 400을 반환한다', async () => {
		const response = await GET(createEvent('?dataType=invalid&filename=vocabulary.json'));
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
	});
});
