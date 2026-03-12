import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/registry/data-source-registry', () => ({
	getDataSourceEntry: vi.fn()
}));

vi.mock('$lib/utils/data-source-profiling', () => ({
	profileDataSourceTable: vi.fn()
}));

import { getDataSourceEntry } from '$lib/registry/data-source-registry';
import { profileDataSourceTable } from '$lib/utils/data-source-profiling';

function createEvent(body: unknown): RequestEvent {
	const request = {
		method: 'POST',
		json: vi.fn().mockResolvedValue(body)
	} as unknown as Request;

	return {
		request,
		url: new URL('http://localhost/api/data-sources/profile/run')
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

describe('API: /api/data-sources/profile/run', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getDataSourceEntry).mockResolvedValue(storedEntry);
		vi.mocked(profileDataSourceTable).mockResolvedValue({
			dataSourceId: 'source-1',
			dataSourceName: '운영 PostgreSQL',
			schema: 'public',
			table: 'customers',
			rowCount: 1200,
			profiledAt: '2026-03-12T00:00:00.000Z',
			columns: [
				{
					columnName: 'customer_id',
					ordinalPosition: 1,
					dataType: 'integer',
					isNullable: false,
					nullCount: 0,
					nullRatio: 0,
					distinctCount: 1200,
					distinctRatio: 1,
					minLength: 1,
					maxLength: 5
				}
			]
		});
	});

	it('should run table profiling for a saved PostgreSQL source', async () => {
		const response = await POST(
			createEvent({
				dataSourceId: 'source-1',
				schema: 'public',
				table: 'customers'
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(getDataSourceEntry).toHaveBeenCalledWith('source-1');
		expect(profileDataSourceTable).toHaveBeenCalledWith(storedEntry, {
			schema: 'public',
			table: 'customers'
		});
		expect(result.data.columns).toHaveLength(1);
	});

	it('should return 400 when required profiling fields are missing', async () => {
		const response = await POST(
			createEvent({
				dataSourceId: 'source-1',
				schema: '',
				table: 'customers'
			})
		);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(profileDataSourceTable).not.toHaveBeenCalled();
	});

	it('should return 404 when the data source does not exist', async () => {
		vi.mocked(getDataSourceEntry).mockResolvedValue(null);

		const response = await POST(
			createEvent({
				dataSourceId: 'missing',
				schema: 'public',
				table: 'customers'
			})
		);
		const result = await response.json();

		expect(response.status).toBe(404);
		expect(result.success).toBe(false);
		expect(profileDataSourceTable).not.toHaveBeenCalled();
	});
});
