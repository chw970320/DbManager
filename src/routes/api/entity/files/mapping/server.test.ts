import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { GET, PUT } from './+server';
import type { EntityData } from '$lib/types/database-design';

vi.mock('$lib/registry/data-registry', () => ({
	loadData: vi.fn(),
	saveData: vi.fn()
}));

vi.mock('$lib/registry/mapping-registry', () => ({
	resolveRelatedFilenames: vi.fn(),
	getMappingsFor: vi.fn(),
	updateMapping: vi.fn(),
	addMapping: vi.fn()
}));

import { loadData, saveData } from '$lib/registry/data-registry';
import {
	resolveRelatedFilenames,
	getMappingsFor,
	updateMapping,
	addMapping
} from '$lib/registry/mapping-registry';

const createMockData = (
	mapping?: { database: string; attribute: string }
): EntityData => ({
	entries: [],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 0,
	mapping
});

function createMockRequestEvent(options: {
	method?: string;
	body?: unknown;
	searchParams?: Record<string, string>;
}): RequestEvent {
	const url = new URL('http://localhost/api/entity/files/mapping');
	if (options.searchParams) {
		for (const [key, value] of Object.entries(options.searchParams)) {
			url.searchParams.set(key, value);
		}
	}

	const request = {
		json: vi.fn().mockResolvedValue(options.body || {}),
		method: options.method || 'GET'
	} as unknown as Request;

	return { url, request } as RequestEvent;
}

describe('Entity Mapping API: /api/entity/files/mapping', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(resolveRelatedFilenames).mockResolvedValue(
			new Map([
				['database', 'database.json'],
				['attribute', 'attribute.json']
			])
		);
		vi.mocked(getMappingsFor).mockResolvedValue([]);
	});

	it('GET should return mapping data', async () => {
		vi.mocked(loadData).mockResolvedValue(
			createMockData({ database: 'database-a.json', attribute: 'attribute-a.json' })
		);
		vi.mocked(resolveRelatedFilenames).mockResolvedValue(
			new Map([
				['database', 'database-a.json'],
				['attribute', 'attribute-a.json']
			])
		);

		const response = await GET(createMockRequestEvent({}));
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.mapping).toEqual({
			database: 'database-a.json',
			attribute: 'attribute-a.json'
		});
	});

	it('PUT should save mapping and dual-write registry', async () => {
		vi.mocked(loadData).mockResolvedValue(createMockData());

		const response = await PUT(
			createMockRequestEvent({
				method: 'PUT',
				body: {
					filename: 'entity.json',
					mapping: { database: 'database-b.json', attribute: 'attribute-b.json' }
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(saveData).toHaveBeenCalledWith(
			'entity',
			expect.objectContaining({
				mapping: { database: 'database-b.json', attribute: 'attribute-b.json' }
			}),
			'entity.json'
		);
		expect(addMapping).toHaveBeenCalledTimes(2);
	});

	it('PUT should return 400 on invalid mapping', async () => {
		const response = await PUT(
			createMockRequestEvent({
				method: 'PUT',
				body: { filename: 'entity.json', mapping: { database: 'database-only.json' } }
			})
		);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
	});

	it('PUT should keep success when registry update fails', async () => {
		vi.mocked(loadData).mockResolvedValue(createMockData());
		vi.mocked(getMappingsFor).mockRejectedValue(new Error('registry failed'));

		const response = await PUT(
			createMockRequestEvent({
				method: 'PUT',
				body: {
					filename: 'entity.json',
					mapping: { database: 'database-x.json', attribute: 'attribute-x.json' }
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(saveData).toHaveBeenCalled();
	});
});
