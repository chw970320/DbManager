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

vi.mock('$lib/registry/db-design-file-mapping', () => ({
	resolveDbDesignFileMappingBundle: vi.fn()
}));

vi.mock('$lib/utils/erd-generator.js', () => ({
	generateERDData: vi.fn()
}));

vi.mock('$lib/utils/design-relation-service.js', () => ({
	validateLoadedDesignRelationContext: vi.fn()
}));

import { loadData, listFiles } from '$lib/registry/data-registry';
import { getCachedData } from '$lib/registry/cache-registry';
import { resolveDbDesignFileMappingBundle } from '$lib/registry/db-design-file-mapping';
import { generateERDData } from '$lib/utils/erd-generator.js';
import { validateLoadedDesignRelationContext } from '$lib/utils/design-relation-service.js';

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
		vi.mocked(resolveDbDesignFileMappingBundle).mockResolvedValue({
			vocabulary: 'mapped-vocabulary.json',
			domain: 'mapped-domain.json',
			term: 'mapped-term.json',
			database: 'mapped-database.json',
			entity: 'mapped-entity.json',
			attribute: 'mapped-attribute.json',
			table: 'mapped-table.json',
			column: 'custom-column.json'
		});
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
		vi.mocked(validateLoadedDesignRelationContext).mockReturnValue({
			specs: [],
			rules: [],
			summaries: [],
			issues: [],
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
			expect(validateLoadedDesignRelationContext).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({ complete: false }),
				expect.objectContaining({
					files: expect.objectContaining({
						database: 'database.json',
						entity: 'entity.json',
						attribute: 'attribute.json',
						table: 'table.json',
						column: 'column.json',
						domain: 'domain.json',
						vocabulary: 'vocabulary.json'
					})
				})
			);
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

		it('should resolve mapped definition files from columnFile parameter', async () => {
			const requestEvent = createMockRequestEvent({
				searchParams: { columnFile: 'custom-column.json' }
			});
			await GET(requestEvent);

			expect(resolveDbDesignFileMappingBundle).toHaveBeenCalledWith('column', 'custom-column.json');
			expect(loadData).toHaveBeenCalledWith('database', 'mapped-database.json');
			expect(loadData).toHaveBeenCalledWith('entity', 'mapped-entity.json');
			expect(loadData).toHaveBeenCalledWith('attribute', 'mapped-attribute.json');
			expect(loadData).toHaveBeenCalledWith('table', 'mapped-table.json');
			expect(loadData).toHaveBeenCalledWith('column', 'custom-column.json');
			expect(getCachedData).toHaveBeenCalledWith('vocabulary', 'mapped-vocabulary.json');
			expect(validateLoadedDesignRelationContext).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({ complete: true }),
				expect.objectContaining({
					files: expect.objectContaining({
						database: 'mapped-database.json',
						entity: 'mapped-entity.json',
						attribute: 'mapped-attribute.json',
						table: 'mapped-table.json',
						column: 'custom-column.json',
						domain: 'mapped-domain.json',
						term: 'mapped-term.json',
						vocabulary: 'mapped-vocabulary.json'
					})
				})
			);
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

		it('should pass Graphviz-aligned filters to ERD data generation', async () => {
			const requestEvent = createMockRequestEvent({
				searchParams: {
					subjectArea: '회원',
					schema: 'bksp',
					q: '고객',
					scopeFlag: 'Y',
					includeExternalReferences: 'false',
					tableIds: 'table-1,table-2'
				}
			});
			await GET(requestEvent);

			expect(generateERDData).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({
					tableIds: ['table-1', 'table-2'],
					subjectAreas: ['회원'],
					schemas: ['bksp'],
					tableSearch: '고객',
					scopeFlags: ['Y'],
					includeExternalReferences: false
				})
			);
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
