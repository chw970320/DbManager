import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/registry/data-registry', () => ({
	loadData: vi.fn(),
	listFiles: vi.fn()
}));

vi.mock('$lib/registry/cache-registry', () => ({
	getCachedData: vi.fn()
}));

vi.mock('$lib/utils/erd-generator.js', () => ({
	generateERDData: vi.fn()
}));

vi.mock('$lib/utils/design-relation-validator.js', () => ({
	validateDesignRelations: vi.fn()
}));

import { loadData, listFiles } from '$lib/registry/data-registry';
import { getCachedData } from '$lib/registry/cache-registry';
import { generateERDData } from '$lib/utils/erd-generator.js';
import { validateDesignRelations } from '$lib/utils/design-relation-validator.js';

function createMockRequestEvent(options: { searchParams?: Record<string, string> }): RequestEvent {
	const url = new URL('http://localhost/api/erd/generate');

	if (options.searchParams) {
		Object.entries(options.searchParams).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});
	}

	return {
		url,
		request: {} as Request
	} as RequestEvent;
}

describe('API: /api/erd/generate', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(listFiles).mockImplementation(async (type: string) => {
			if (type === 'database') return ['database.json'];
			if (type === 'entity') return ['entity.json'];
			if (type === 'attribute') return ['attribute.json'];
			if (type === 'table') return ['table.json'];
			if (type === 'column') return ['column.json'];
			if (type === 'domain') return ['domain.json'];
			if (type === 'vocabulary') return ['vocabulary.json'];
			return [];
		});

		vi.mocked(loadData).mockResolvedValue({ entries: [], lastUpdated: '', totalCount: 0 });
		vi.mocked(getCachedData).mockResolvedValue({
			entries: [],
			lastUpdated: '',
			totalCount: 0
		});

		vi.mocked(generateERDData).mockReturnValue({
			nodes: [],
			edges: [],
			mappings: [],
			metadata: {
				generatedAt: new Date().toISOString(),
				totalNodes: 0,
				totalEdges: 0,
				totalMappings: 0,
				logicalNodes: 0,
				physicalNodes: 0,
				domainNodes: 0
			}
		});
		vi.mocked(validateDesignRelations).mockReturnValue({
			specs: [],
			summaries: [],
			totals: {
				totalChecked: 0,
				matched: 0,
				unmatched: 0,
				errorCount: 0,
				warningCount: 0
			}
		});
	});

	describe('GET', () => {
		it('should return ERD data successfully', async () => {
			const requestEvent = createMockRequestEvent({});
			const response = await GET(requestEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.data.relationValidation).toBeDefined();
			expect(validateDesignRelations).toHaveBeenCalledWith(expect.any(Object));
		});

		it('should filter by tableIds when provided', async () => {
			const requestEvent = createMockRequestEvent({
				searchParams: { tableIds: 'table-1,table-2' }
			});
			await GET(requestEvent);

			expect(generateERDData).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({
					tableIds: ['table-1', 'table-2']
				})
			);
		});

		it('should include/exclude related entities based on includeRelated', async () => {
			await GET(
				createMockRequestEvent({
					searchParams: { tableIds: 'table-1', includeRelated: 'true' }
				})
			);
			expect(generateERDData).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({ includeRelated: true })
			);

			await GET(
				createMockRequestEvent({
					searchParams: { tableIds: 'table-1', includeRelated: 'false' }
				})
			);
			expect(generateERDData).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({ includeRelated: false })
			);
		});

		it('should use specified file parameters', async () => {
			const requestEvent = createMockRequestEvent({
				searchParams: {
					databaseFile: 'custom-db.json',
					entityFile: 'custom-entity.json'
				}
			});
			await GET(requestEvent);

			expect(loadData).toHaveBeenCalledWith('database', 'custom-db.json');
			expect(loadData).toHaveBeenCalledWith('entity', 'custom-entity.json');
		});

		it('should use first files when no parameters provided', async () => {
			const requestEvent = createMockRequestEvent({});
			await GET(requestEvent);

			expect(listFiles).toHaveBeenCalledWith('database');
			expect(loadData).toHaveBeenCalledWith('database', 'database.json');
		});

		it('should handle data loading errors gracefully', async () => {
			vi.mocked(loadData).mockRejectedValue(new Error('File not found'));

			const requestEvent = createMockRequestEvent({});
			const response = await GET(requestEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should pass undefined filter options for empty tableIds', async () => {
			const requestEvent = createMockRequestEvent({
				searchParams: { tableIds: '' }
			});
			await GET(requestEvent);

			expect(generateERDData).toHaveBeenCalledWith(expect.any(Object), undefined);
		});

		it('should include vocabulary mappings when available', async () => {
			vi.mocked(getCachedData).mockResolvedValue({
				entries: [
					{
						id: 'vocab-1',
						standardName: 'ID',
						abbreviation: 'ID',
						englishName: 'Identifier',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				],
				lastUpdated: '',
				totalCount: 1
			});

			const requestEvent = createMockRequestEvent({});
			const response = await GET(requestEvent);

			expect(response.status).toBe(200);
			expect(getCachedData).toHaveBeenCalledWith('vocabulary', 'vocabulary.json');
		});
	});
});
