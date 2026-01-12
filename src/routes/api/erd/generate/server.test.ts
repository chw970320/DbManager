import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

// Mock 모듈들
vi.mock('$lib/utils/database-design-handler.js', () => ({
	loadDatabaseData: vi.fn(),
	loadEntityData: vi.fn(),
	loadAttributeData: vi.fn(),
	loadTableData: vi.fn(),
	loadColumnData: vi.fn(),
	listDatabaseFiles: vi.fn(),
	listEntityFiles: vi.fn(),
	listAttributeFiles: vi.fn(),
	listTableFiles: vi.fn(),
	listColumnFiles: vi.fn()
}));

vi.mock('$lib/utils/file-handler.js', () => ({
	loadDomainData: vi.fn(),
	listDomainFiles: vi.fn(),
	listVocabularyFiles: vi.fn()
}));

vi.mock('$lib/utils/cache.js', () => ({
	getCachedVocabularyData: vi.fn()
}));

vi.mock('$lib/utils/erd-generator.js', () => ({
	generateERDData: vi.fn()
}));

// Mock import
import {
	loadDatabaseData,
	loadEntityData,
	loadAttributeData,
	loadTableData,
	loadColumnData,
	listDatabaseFiles,
	listEntityFiles,
	listAttributeFiles,
	listTableFiles,
	listColumnFiles
} from '$lib/utils/database-design-handler.js';
import { loadDomainData, listDomainFiles, listVocabularyFiles } from '$lib/utils/file-handler.js';
import { getCachedVocabularyData } from '$lib/utils/cache.js';
import { generateERDData } from '$lib/utils/erd-generator.js';

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: { searchParams?: Record<string, string> }): RequestEvent {
	const url = new URL('http://localhost/api/erd/generate');

	if (options.searchParams) {
		Object.entries(options.searchParams).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});
	}

	return {
		url,
		request: {} as Request,
		params: {},
		locals: {},
		platform: undefined,
		route: { id: '/api/erd/generate' },
		cookies: {
			get: vi.fn(),
			getAll: vi.fn(),
			set: vi.fn(),
			delete: vi.fn(),
			serialize: vi.fn()
		},
		fetch: vi.fn(),
		getClientAddress: vi.fn(() => '127.0.0.1'),
		setHeaders: vi.fn(),
		isDataRequest: false,
		isSubRequest: false
	} as RequestEvent;
}

describe('API: /api/erd/generate', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// 기본 Mock 설정
		vi.mocked(listDatabaseFiles).mockResolvedValue(['database.json']);
		vi.mocked(listEntityFiles).mockResolvedValue(['entity.json']);
		vi.mocked(listAttributeFiles).mockResolvedValue(['attribute.json']);
		vi.mocked(listTableFiles).mockResolvedValue(['table.json']);
		vi.mocked(listColumnFiles).mockResolvedValue(['column.json']);
		vi.mocked(listDomainFiles).mockResolvedValue(['domain.json']);
		vi.mocked(listVocabularyFiles).mockResolvedValue(['vocabulary.json']);

		vi.mocked(loadDatabaseData).mockResolvedValue({ entries: [], lastUpdated: '', totalCount: 0 });
		vi.mocked(loadEntityData).mockResolvedValue({ entries: [], lastUpdated: '', totalCount: 0 });
		vi.mocked(loadAttributeData).mockResolvedValue({ entries: [], lastUpdated: '', totalCount: 0 });
		vi.mocked(loadTableData).mockResolvedValue({ entries: [], lastUpdated: '', totalCount: 0 });
		vi.mocked(loadColumnData).mockResolvedValue({ entries: [], lastUpdated: '', totalCount: 0 });
		vi.mocked(loadDomainData).mockResolvedValue({ entries: [], lastUpdated: '', totalCount: 0 });
		vi.mocked(getCachedVocabularyData).mockResolvedValue({
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
	});

	describe('GET', () => {
		it('should return ERD data successfully', async () => {
			const requestEvent = createMockRequestEvent({});
			const response = await GET(requestEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.data.nodes).toBeDefined();
			expect(result.data.edges).toBeDefined();
		});

		it('should return ERD data with all nodes and edges', async () => {
			const mockERDData = {
				nodes: [{ id: 'node-1', type: 'table' }],
				edges: [{ source: 'node-1', target: 'node-2' }],
				mappings: [],
				metadata: {
					generatedAt: new Date().toISOString(),
					totalNodes: 1,
					totalEdges: 1,
					totalMappings: 0,
					logicalNodes: 0,
					physicalNodes: 1,
					domainNodes: 0
				}
			};
			vi.mocked(generateERDData).mockReturnValue(mockERDData);

			const requestEvent = createMockRequestEvent({});
			const response = await GET(requestEvent);
			const result = await response.json();

			expect(result.data.nodes.length).toBe(1);
			expect(result.data.edges.length).toBe(1);
		});

		it('should filter by tableIds when provided', async () => {
			const requestEvent = createMockRequestEvent({
				searchParams: { tableIds: 'table-1,table-2' }
			});
			const response = await GET(requestEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(generateERDData).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({
					tableIds: ['table-1', 'table-2']
				})
			);
		});

		it('should include related entities when includeRelated is true', async () => {
			const requestEvent = createMockRequestEvent({
				searchParams: { tableIds: 'table-1', includeRelated: 'true' }
			});
			const response = await GET(requestEvent);

			expect(response.status).toBe(200);
			expect(generateERDData).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({
					includeRelated: true
				})
			);
		});

		it('should exclude related entities when includeRelated is false', async () => {
			const requestEvent = createMockRequestEvent({
				searchParams: { tableIds: 'table-1', includeRelated: 'false' }
			});
			const response = await GET(requestEvent);

			expect(response.status).toBe(200);
			expect(generateERDData).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({
					includeRelated: false
				})
			);
		});

		it('should handle empty data gracefully', async () => {
			vi.mocked(listDatabaseFiles).mockResolvedValue([]);
			vi.mocked(listEntityFiles).mockResolvedValue([]);
			vi.mocked(listTableFiles).mockResolvedValue([]);

			const requestEvent = createMockRequestEvent({});
			const response = await GET(requestEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.nodes.length).toBe(0);
		});

		it('should use specified file parameters', async () => {
			const requestEvent = createMockRequestEvent({
				searchParams: {
					databaseFile: 'custom-db.json',
					entityFile: 'custom-entity.json'
				}
			});
			const response = await GET(requestEvent);

			expect(response.status).toBe(200);
			expect(loadDatabaseData).toHaveBeenCalledWith('custom-db.json');
			expect(loadEntityData).toHaveBeenCalledWith('custom-entity.json');
		});

		it('should use first files when no parameters provided', async () => {
			const requestEvent = createMockRequestEvent({});
			await GET(requestEvent);

			expect(loadDatabaseData).toHaveBeenCalledWith('database.json');
			expect(loadEntityData).toHaveBeenCalledWith('entity.json');
		});

		it('should handle data loading errors gracefully', async () => {
			vi.mocked(loadDatabaseData).mockRejectedValue(new Error('File not found'));

			const requestEvent = createMockRequestEvent({});
			const response = await GET(requestEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should generate metadata correctly', async () => {
			const mockERDData = {
				nodes: [],
				edges: [],
				mappings: [],
				metadata: {
					generatedAt: new Date().toISOString(),
					totalNodes: 10,
					totalEdges: 5,
					totalMappings: 5,
					logicalNodes: 3,
					physicalNodes: 5,
					domainNodes: 2
				}
			};
			vi.mocked(generateERDData).mockReturnValue(mockERDData);

			const requestEvent = createMockRequestEvent({});
			const response = await GET(requestEvent);
			const result = await response.json();

			expect(result.data.metadata.totalNodes).toBe(10);
			expect(result.data.metadata.totalEdges).toBe(5);
			expect(result.data.metadata.logicalNodes).toBe(3);
		});

		it('should handle invalid tableIds parameter', async () => {
			const requestEvent = createMockRequestEvent({
				searchParams: { tableIds: '' }
			});
			const response = await GET(requestEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			// 빈 tableIds는 필터 옵션이 undefined가 되어야 함
			expect(generateERDData).toHaveBeenCalledWith(expect.any(Object), undefined);
		});

		it('should include domain mappings when available', async () => {
			vi.mocked(getCachedVocabularyData).mockResolvedValue({
				entries: [
					{
						id: 'vocab-1',
						standardName: 'ID',
						abbreviation: 'ID',
						englishName: 'Identifier',
						description: '',
						domainCategory: '사용자ID',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				],
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 1
			});

			const requestEvent = createMockRequestEvent({});
			const response = await GET(requestEvent);

			expect(response.status).toBe(200);
			expect(getCachedVocabularyData).toHaveBeenCalled();
		});
	});
});
