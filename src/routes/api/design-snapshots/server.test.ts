import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, GET, POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/registry/design-snapshot-registry', () => ({
	listDesignSnapshotSummaries: vi.fn(),
	createDesignSnapshot: vi.fn(),
	deleteDesignSnapshot: vi.fn()
}));

vi.mock('$lib/registry/shared-file-mapping-registry', () => ({
	loadSharedFileMappingRegistryData: vi.fn()
}));

import {
	createDesignSnapshot,
	deleteDesignSnapshot,
	listDesignSnapshotSummaries
} from '$lib/registry/design-snapshot-registry';
import { loadSharedFileMappingRegistryData } from '$lib/registry/shared-file-mapping-registry';

function createEvent(options: { method?: string; body?: unknown } = {}): RequestEvent {
	return {
		request: {
			method: options.method || 'GET',
			json: vi.fn().mockResolvedValue(options.body || {})
		} as unknown as Request,
		url: new URL('http://localhost/api/design-snapshots')
	} as RequestEvent;
}

const mockBundle = {
	id: 'bundle-1',
	files: {
		vocabulary: 'vocabulary.json',
		domain: 'domain.json',
		term: 'term.json',
		database: 'database.json',
		entity: 'entity.json',
		attribute: 'attribute.json',
		table: 'table.json',
		column: 'column.json'
	},
	createdAt: '2026-03-13T01:00:00.000Z',
	updatedAt: '2026-03-13T01:00:00.000Z'
};

const mockSnapshotSummary = {
	id: 'snapshot-1',
	name: '기준 스냅샷',
	description: '복원 테스트용',
	bundle: mockBundle.files,
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
	updatedAt: '2026-03-13T01:00:00.000Z'
};

describe('API: /api/design-snapshots', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(listDesignSnapshotSummaries).mockResolvedValue([mockSnapshotSummary]);
		vi.mocked(loadSharedFileMappingRegistryData).mockResolvedValue({
			version: '1.0',
			bundles: [mockBundle],
			lastUpdated: '2026-03-13T01:00:00.000Z'
		});
		vi.mocked(createDesignSnapshot).mockResolvedValue({
			entry: mockSnapshotSummary,
			data: {
				entries: [],
				lastUpdated: '2026-03-13T01:00:00.000Z',
				totalCount: 1
			}
		});
		vi.mocked(deleteDesignSnapshot).mockResolvedValue({
			entry: mockSnapshotSummary,
			data: {
				entries: [],
				lastUpdated: '2026-03-13T01:00:00.000Z',
				totalCount: 0
			}
		});
	});

	it('GET should return snapshots and available bundles', async () => {
		const response = await GET();
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.snapshots).toEqual([mockSnapshotSummary]);
		expect(result.data.bundles).toEqual([mockBundle]);
	});

	it('POST should create a snapshot', async () => {
		const response = await POST(
			createEvent({
				method: 'POST',
				body: {
					name: '기준 스냅샷',
					description: '복원 테스트용',
					bundle: mockBundle.files
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(201);
		expect(result.success).toBe(true);
		expect(createDesignSnapshot).toHaveBeenCalledWith({
			name: '기준 스냅샷',
			description: '복원 테스트용',
			bundle: mockBundle.files
		});
	});

	it('DELETE should remove a snapshot', async () => {
		const response = await DELETE(
			createEvent({
				method: 'DELETE',
				body: {
					id: 'snapshot-1'
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(deleteDesignSnapshot).toHaveBeenCalledWith('snapshot-1');
	});

	it('DELETE should reject a missing id', async () => {
		const response = await DELETE(
			createEvent({
				method: 'DELETE',
				body: {}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
	});
});
