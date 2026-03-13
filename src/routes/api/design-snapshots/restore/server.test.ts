import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/registry/design-snapshot-registry', () => ({
	restoreDesignSnapshot: vi.fn()
}));

import { restoreDesignSnapshot } from '$lib/registry/design-snapshot-registry';

function createEvent(body?: unknown): RequestEvent {
	return {
		request: {
			method: 'POST',
			json: vi.fn().mockResolvedValue(body || {})
		} as unknown as Request,
		url: new URL('http://localhost/api/design-snapshots/restore')
	} as RequestEvent;
}

const mockSummary = {
	id: 'snapshot-1',
	name: '기준 스냅샷',
	description: '복원 테스트용',
	bundle: {
		vocabulary: 'vocabulary.json',
		domain: 'domain.json',
		term: 'term.json',
		database: 'database.json',
		entity: 'entity.json',
		attribute: 'attribute.json',
		table: 'table.json',
		column: 'column.json'
	},
	counts: {
		vocabulary: 1,
		domain: 1,
		term: 1,
		database: 1,
		entity: 1,
		attribute: 1,
		table: 1,
		column: 1
	},
	createdAt: '2026-03-13T01:00:00.000Z',
	updatedAt: '2026-03-13T01:00:00.000Z',
	restoredAt: '2026-03-13T02:00:00.000Z'
};

describe('API: /api/design-snapshots/restore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(restoreDesignSnapshot).mockResolvedValue({
			entry: mockSummary,
			data: {
				entries: [],
				lastUpdated: '2026-03-13T02:00:00.000Z',
				totalCount: 1
			}
		});
	});

	it('POST should restore a snapshot', async () => {
		const response = await POST(createEvent({ id: 'snapshot-1' }));
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.entry.restoredAt).toBe('2026-03-13T02:00:00.000Z');
		expect(restoreDesignSnapshot).toHaveBeenCalledWith('snapshot-1');
	});

	it('POST should reject a missing id', async () => {
		const response = await POST(createEvent({}));
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
	});
});
