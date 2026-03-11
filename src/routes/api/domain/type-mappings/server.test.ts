import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, GET, POST, PUT } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/registry/domain-data-type-mapping-registry', () => ({
	loadDomainDataTypeMappingData: vi.fn(),
	createDomainDataTypeMapping: vi.fn(),
	updateDomainDataTypeMapping: vi.fn(),
	deleteDomainDataTypeMapping: vi.fn()
}));

import {
	loadDomainDataTypeMappingData,
	createDomainDataTypeMapping,
	updateDomainDataTypeMapping,
	deleteDomainDataTypeMapping
} from '$lib/registry/domain-data-type-mapping-registry';

function createEvent(options: { method?: string; body?: unknown } = {}): RequestEvent {
	const request = {
		method: options.method || 'GET',
		json: vi.fn().mockResolvedValue(options.body || {})
	} as unknown as Request;

	return {
		request,
		url: new URL('http://localhost/api/domain/type-mappings')
	} as RequestEvent;
}

const mockData = {
	entries: [
		{
			id: 'map-1',
			dataType: 'VARCHAR',
			abbreviation: 'V',
			createdAt: '2026-03-11T00:00:00.000Z',
			updatedAt: '2026-03-11T00:00:00.000Z'
		}
	],
	lastUpdated: '2026-03-11T00:00:00.000Z',
	totalCount: 1
};

const mockSync = {
	domainFilesUpdated: 1,
	domainsUpdated: 3,
	termFilesUpdated: 1,
	termsUpdated: 2,
	columnFilesUpdated: 1,
	columnsUpdated: 2
};

describe('API: /api/domain/type-mappings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadDomainDataTypeMappingData).mockResolvedValue(mockData);
		vi.mocked(createDomainDataTypeMapping).mockResolvedValue({
			entry: mockData.entries[0],
			data: mockData,
			sync: mockSync
		});
		vi.mocked(updateDomainDataTypeMapping).mockResolvedValue({
			entry: mockData.entries[0],
			data: mockData,
			sync: mockSync
		});
		vi.mocked(deleteDomainDataTypeMapping).mockResolvedValue({
			data: { ...mockData, entries: [], totalCount: 0 },
			sync: mockSync
		});
	});

	it('GET should return mapping list', async () => {
		const response = await GET();
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.entries).toHaveLength(1);
		expect(loadDomainDataTypeMappingData).toHaveBeenCalled();
	});

	it('POST should create mapping', async () => {
		const response = await POST(
			createEvent({
				method: 'POST',
				body: {
					dataType: 'TIMESTAMP',
					abbreviation: 'TS'
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(201);
		expect(result.success).toBe(true);
		expect(result.data.sync).toEqual(mockSync);
		expect(createDomainDataTypeMapping).toHaveBeenCalledWith('TIMESTAMP', 'TS');
	});

	it('POST should reject missing fields', async () => {
		const response = await POST(
			createEvent({
				method: 'POST',
				body: {
					dataType: 'TIMESTAMP'
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(result.error).toContain('필수');
	});

	it('PUT should update mapping', async () => {
		const response = await PUT(
			createEvent({
				method: 'PUT',
				body: {
					id: 'map-1',
					dataType: 'VARCHAR',
					abbreviation: 'VC'
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(updateDomainDataTypeMapping).toHaveBeenCalledWith('map-1', 'VARCHAR', 'VC');
	});

	it('PUT should return 404 when mapping is missing', async () => {
		vi.mocked(updateDomainDataTypeMapping).mockRejectedValue(
			new Error('수정할 데이터타입 매핑을 찾을 수 없습니다.')
		);

		const response = await PUT(
			createEvent({
				method: 'PUT',
				body: {
					id: 'missing',
					dataType: 'VARCHAR',
					abbreviation: 'VC'
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(404);
		expect(result.success).toBe(false);
	});

	it('DELETE should remove mapping', async () => {
		const response = await DELETE(
			createEvent({
				method: 'DELETE',
				body: {
					id: 'map-1'
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(deleteDomainDataTypeMapping).toHaveBeenCalledWith('map-1');
		expect(result.data.data.totalCount).toBe(0);
	});
});
