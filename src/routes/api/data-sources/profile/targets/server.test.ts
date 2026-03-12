import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/registry/data-source-registry', () => ({
	getDataSourceEntry: vi.fn()
}));

vi.mock('$lib/utils/data-source-profiling', () => ({
	listDataSourceProfileTargets: vi.fn()
}));

import { getDataSourceEntry } from '$lib/registry/data-source-registry';
import { listDataSourceProfileTargets } from '$lib/utils/data-source-profiling';

function createEvent(searchParams?: Record<string, string>): RequestEvent {
	const url = new URL('http://localhost/api/data-sources/profile/targets');

	if (searchParams) {
		for (const [key, value] of Object.entries(searchParams)) {
			url.searchParams.set(key, value);
		}
	}

	return {
		request: { method: 'GET' } as Request,
		url
	} as RequestEvent;
}

const storedEntry = {
	id: 'source-1',
	name: '운영 PostgreSQL',
	type: 'postgresql' as const,
	description: '운영 메타데이터 저장소',
	config: {
		host: 'db.internal',
		port: 5432,
		database: 'metadata',
		schema: 'public',
		username: 'dbadmin',
		password: 'secret',
		ssl: false,
		connectionTimeoutSeconds: 5
	},
	createdAt: '2026-03-12T00:00:00.000Z',
	updatedAt: '2026-03-12T00:00:00.000Z'
};

describe('API: /api/data-sources/profile/targets', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getDataSourceEntry).mockResolvedValue(storedEntry);
		vi.mocked(listDataSourceProfileTargets).mockResolvedValue({
			dataSourceId: 'source-1',
			dataSourceName: '운영 PostgreSQL',
			defaultSchema: 'public',
			schemas: ['audit', 'public'],
			tables: [
				{
					schema: 'public',
					table: 'customers',
					tableType: 'BASE TABLE',
					estimatedRowCount: 1200,
					columnCount: 8
				}
			]
		});
	});

	it('should return profile targets for a saved PostgreSQL data source', async () => {
		const response = await GET(
			createEvent({
				dataSourceId: 'source-1'
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(getDataSourceEntry).toHaveBeenCalledWith('source-1');
		expect(listDataSourceProfileTargets).toHaveBeenCalledWith(storedEntry);
		expect(result.data.tables).toHaveLength(1);
	});

	it('should return 400 when dataSourceId is missing', async () => {
		const response = await GET(createEvent());
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(listDataSourceProfileTargets).not.toHaveBeenCalled();
	});

	it('should return 404 when the data source does not exist', async () => {
		vi.mocked(getDataSourceEntry).mockResolvedValue(null);

		const response = await GET(
			createEvent({
				dataSourceId: 'missing'
			})
		);
		const result = await response.json();

		expect(response.status).toBe(404);
		expect(result.success).toBe(false);
		expect(listDataSourceProfileTargets).not.toHaveBeenCalled();
	});
});
