import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './+server';

vi.mock('$lib/registry/shared-file-mapping-registry', () => ({
	loadSharedFileMappingRegistryData: vi.fn()
}));

import { loadSharedFileMappingRegistryData } from '$lib/registry/shared-file-mapping-registry';

const defaultBundle = {
	id: 'default-shared-file-mapping',
	name: '기본 공통 번들',
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
	createdAt: '2026-06-01T00:00:00.000Z',
	updatedAt: '2026-06-01T00:00:00.000Z'
};

const customBundle = {
	id: 'bio',
	name: 'biomimicry 번들',
	files: {
		vocabulary: 'biomimicry.json',
		domain: 'biomimicry.json',
		term: 'biomimicry.json',
		database: 'biomimicry.json',
		entity: 'biomimicry.json',
		attribute: 'biomimicry.json',
		table: 'biomimicry.json',
		column: 'biomimicry.json'
	},
	createdAt: '2026-06-01T00:00:00.000Z',
	updatedAt: '2026-06-01T00:00:00.000Z'
};

describe('API: /api/assistant/bundles', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns all bundles and recommends the first non-default bundle', async () => {
		vi.mocked(loadSharedFileMappingRegistryData).mockResolvedValue({
			version: '2.0',
			bundles: [defaultBundle, customBundle],
			lastUpdated: '2026-06-01T00:00:00.000Z'
		});

		const response = await GET();
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.bundles.map((bundle: { id: string }) => bundle.id)).toEqual([
			'default-shared-file-mapping',
			'bio'
		]);
		expect(result.data.recommendedBundleId).toBe('bio');
		expect(result.data.defaultBundleId).toBe('default-shared-file-mapping');
	});

	it('recommends the default bundle when it is the only bundle', async () => {
		vi.mocked(loadSharedFileMappingRegistryData).mockResolvedValue({
			version: '2.0',
			bundles: [defaultBundle],
			lastUpdated: '2026-06-01T00:00:00.000Z'
		});

		const response = await GET();
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.data.recommendedBundleId).toBe('default-shared-file-mapping');
	});
});
