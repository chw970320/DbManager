import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/registry/data-registry', () => ({
	loadDomainData: vi.fn()
}));

vi.mock('$lib/registry/domain-data-type-mapping-registry', () => ({
	loadDomainDataTypeMappingData: vi.fn()
}));

import { loadDomainData } from '$lib/registry/data-registry';
import { loadDomainDataTypeMappingData } from '$lib/registry/domain-data-type-mapping-registry';

function createEvent(searchParams?: Record<string, string>): RequestEvent {
	const url = new URL('http://localhost/api/domain/validate-all');
	if (searchParams) {
		for (const [key, value] of Object.entries(searchParams)) {
			url.searchParams.set(key, value);
		}
	}
	return { url } as RequestEvent;
}

describe('API: /api/domain/validate-all', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadDomainDataTypeMappingData).mockResolvedValue({
			entries: [{ id: 'map-1', dataType: 'VARCHAR', abbreviation: 'V', createdAt: '', updatedAt: '' }],
			lastUpdated: '2024-01-01T00:00:00.000Z',
			totalCount: 1
		});
		vi.mocked(loadDomainData).mockResolvedValue({
			entries: [
				{
					id: 'd1',
					domainGroup: 'G',
					domainCategory: '회원',
					standardDomainName: '회원_VARCHAR(10)',
					physicalDataType: 'VARCHAR',
					dataLength: '10',
					createdAt: '',
					updatedAt: ''
				},
				{
					id: 'd2',
					domainGroup: 'G',
					domainCategory: '회원',
					standardDomainName: 'WRONG',
					physicalDataType: 'VARCHAR',
					dataLength: '10',
					createdAt: '',
					updatedAt: ''
				}
			],
			lastUpdated: '',
			totalCount: 2
		});
	});

	it('should return validation summary', async () => {
		const response = await GET(createEvent({ filename: 'domain.json' }));
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.totalCount).toBe(2);
		expect(result.data.failedCount).toBeGreaterThan(0);
	});

	it('should return 500 on error', async () => {
		vi.mocked(loadDomainData).mockRejectedValue(new Error('failed'));

		const response = await GET(createEvent());
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
	});
});
