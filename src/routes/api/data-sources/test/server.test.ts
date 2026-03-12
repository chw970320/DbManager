import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/registry/data-source-registry', () => ({
	getDataSourceEntry: vi.fn()
}));

vi.mock('$lib/utils/data-source-connection', () => ({
	testDataSourceConnection: vi.fn()
}));

import { getDataSourceEntry } from '$lib/registry/data-source-registry';
import { testDataSourceConnection } from '$lib/utils/data-source-connection';

function createEvent(body: unknown): RequestEvent {
	const request = {
		method: 'POST',
		json: vi.fn().mockResolvedValue(body)
	} as unknown as Request;

	return {
		request,
		url: new URL('http://localhost/api/data-sources/test')
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

describe('API: /api/data-sources/test', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getDataSourceEntry).mockResolvedValue(storedEntry);
		vi.mocked(testDataSourceConnection).mockResolvedValue({
			success: true,
			message: '연결에 성공했습니다.',
			details: {
				database: 'metadata',
				schema: 'public',
				serverVersion: 'PostgreSQL 16.2'
			},
			latencyMs: 12,
			testedAt: '2026-03-12T00:00:00.000Z'
		});
	});

	it('should test a stored data source by id', async () => {
		const response = await POST(
			createEvent({
				id: 'source-1'
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(getDataSourceEntry).toHaveBeenCalledWith('source-1');
		expect(testDataSourceConnection).toHaveBeenCalledWith(storedEntry);
	});

	it('should test a direct PostgreSQL payload without saving it', async () => {
		const payload = {
			type: 'postgresql',
			config: {
				host: 'localhost',
				port: 5432,
				database: 'metadata',
				schema: 'public',
				username: 'dbadmin',
				password: 'secret',
				ssl: false,
				connectionTimeoutSeconds: 5
			}
		};

		const response = await POST(createEvent(payload));
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(testDataSourceConnection).toHaveBeenCalledWith({
			name: '',
			type: 'postgresql',
			description: undefined,
			config: payload.config
		});
	});

	it('should reuse the stored password when testing an edited connection with blank password', async () => {
		const response = await POST(
			createEvent({
				id: 'source-1',
				type: 'postgresql',
				config: {
					host: 'db.internal',
					port: 5433,
					database: 'metadata',
					schema: 'audit',
					username: 'dbadmin',
					password: '',
					ssl: true,
					connectionTimeoutSeconds: 10
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(testDataSourceConnection).toHaveBeenCalledWith({
			name: storedEntry.name,
			type: 'postgresql',
			description: storedEntry.description,
			config: {
				host: 'db.internal',
				port: 5433,
				database: 'metadata',
				schema: 'audit',
				username: 'dbadmin',
				password: 'secret',
				ssl: true,
				connectionTimeoutSeconds: 10
			}
		});
	});

	it('should return 404 when the stored data source does not exist', async () => {
		vi.mocked(getDataSourceEntry).mockResolvedValue(null);

		const response = await POST(
			createEvent({
				id: 'missing'
			})
		);
		const result = await response.json();

		expect(response.status).toBe(404);
		expect(result.success).toBe(false);
	});

	it('should return 400 when the payload is incomplete', async () => {
		const response = await POST(
			createEvent({
				type: 'postgresql',
				config: {
					host: '',
					port: 5432,
					database: 'metadata',
					username: 'dbadmin',
					password: 'secret',
					ssl: false
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(testDataSourceConnection).not.toHaveBeenCalled();
	});
});
