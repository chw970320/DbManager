import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, GET, POST, PUT } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/registry/data-source-registry', () => ({
	listDataSourceSummaries: vi.fn(),
	createDataSource: vi.fn(),
	updateDataSource: vi.fn(),
	deleteDataSource: vi.fn()
}));

import {
	createDataSource,
	deleteDataSource,
	listDataSourceSummaries,
	updateDataSource
} from '$lib/registry/data-source-registry';

function createEvent(options: { method?: string; body?: unknown } = {}): RequestEvent {
	const request = {
		method: options.method || 'GET',
		json: vi.fn().mockResolvedValue(options.body || {})
	} as unknown as Request;

	return {
		request,
		url: new URL('http://localhost/api/data-sources')
	} as RequestEvent;
}

const mockSummaryEntry = {
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
		ssl: false,
		connectionTimeoutSeconds: 5,
		hasPassword: true
	},
	createdAt: '2026-03-12T00:00:00.000Z',
	updatedAt: '2026-03-12T00:00:00.000Z'
};

describe('API: /api/data-sources', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(listDataSourceSummaries).mockResolvedValue([mockSummaryEntry]);
		vi.mocked(createDataSource).mockResolvedValue({
			entry: mockSummaryEntry,
			data: {
				entries: [],
				lastUpdated: '2026-03-12T00:00:00.000Z',
				totalCount: 1
			}
		});
		vi.mocked(updateDataSource).mockResolvedValue({
			entry: mockSummaryEntry,
			data: {
				entries: [],
				lastUpdated: '2026-03-12T00:00:00.000Z',
				totalCount: 1
			}
		});
		vi.mocked(deleteDataSource).mockResolvedValue({
			data: {
				entries: [],
				lastUpdated: '2026-03-12T00:00:00.000Z',
				totalCount: 0
			}
		});
	});

	it('GET should return sanitized data source summaries', async () => {
		const response = await GET();
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data).toEqual([mockSummaryEntry]);
	});

	it('POST should create a PostgreSQL data source', async () => {
		const payload = {
			name: '운영 PostgreSQL',
			type: 'postgresql',
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
			}
		};

		const response = await POST(
			createEvent({
				method: 'POST',
				body: payload
			})
		);
		const result = await response.json();

		expect(response.status).toBe(201);
		expect(result.success).toBe(true);
		expect(createDataSource).toHaveBeenCalledWith(payload);
	});

	it('POST should reject missing required fields', async () => {
		vi.mocked(createDataSource).mockRejectedValueOnce(new Error('호스트는 필수입니다.'));

		const response = await POST(
			createEvent({
				method: 'POST',
				body: {
					name: '운영 PostgreSQL',
					type: 'postgresql',
					config: {
						host: '',
						port: 5432,
						database: 'metadata',
						username: 'dbadmin',
						password: 'secret',
						ssl: false
					}
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(result.error).toContain('필수');
	});

	it('POST should return 409 when the name is duplicated', async () => {
		vi.mocked(createDataSource).mockRejectedValueOnce(new Error('이미 존재하는 연결 이름입니다.'));

		const response = await POST(
			createEvent({
				method: 'POST',
				body: {
					name: '운영 PostgreSQL',
					type: 'postgresql',
					config: {
						host: 'db.internal',
						port: 5432,
						database: 'metadata',
						username: 'dbadmin',
						password: 'secret',
						ssl: false
					}
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(409);
		expect(result.success).toBe(false);
		expect(result.error).toBe('이미 존재하는 연결 이름입니다.');
	});

	it('PUT should update a data source', async () => {
		const payload = {
			id: 'source-1',
			name: '운영 PostgreSQL',
			type: 'postgresql',
			description: '설명 수정',
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
		};

		const response = await PUT(
			createEvent({
				method: 'PUT',
				body: payload
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(updateDataSource).toHaveBeenCalledWith('source-1', {
			name: '운영 PostgreSQL',
			type: 'postgresql',
			description: '설명 수정',
			config: payload.config
		});
	});

	it('PUT should return 404 when data source is missing', async () => {
		vi.mocked(updateDataSource).mockRejectedValue(
			new Error('수정할 데이터 소스를 찾을 수 없습니다.')
		);

		const response = await PUT(
			createEvent({
				method: 'PUT',
				body: {
					id: 'missing',
					name: '누락',
					type: 'postgresql',
					config: {
						host: 'db.internal',
						port: 5432,
						database: 'metadata',
						username: 'dbadmin',
						password: '',
						ssl: false
					}
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(404);
		expect(result.success).toBe(false);
	});

	it('DELETE should remove a data source', async () => {
		const response = await DELETE(
			createEvent({
				method: 'DELETE',
				body: {
					id: 'source-1'
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(deleteDataSource).toHaveBeenCalledWith('source-1');
	});
});
