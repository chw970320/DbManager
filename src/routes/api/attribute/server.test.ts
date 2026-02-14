import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { AttributeData, AttributeEntry } from '$lib/types/database-design';

// Mock 모듈들
vi.mock('$lib/registry/data-registry', () => ({
	loadAttributeData: vi.fn(),
	saveAttributeData: vi.fn()
}));

vi.mock('uuid', () => ({
	v4: vi.fn(() => 'test-uuid-1234')
}));

// Mock import
import { loadAttributeData, saveAttributeData } from '$lib/registry/data-registry';

// 테스트용 Mock 데이터
const createMockAttributeData = (): AttributeData => ({
	entries: [
		{
			id: 'entry-1',
			schemaName: '스키마1',
			entityName: '엔터티1',
			attributeName: '속성1',
			attributeType: 'VARCHAR',
			requiredInput: 'Y',
			identifierFlag: 'Y',
			refEntityName: '엔터티2',
			refAttributeName: '속성2',
			attributeDescription: '속성 설명1',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'entry-2',
			schemaName: '스키마2',
			entityName: '엔터티2',
			attributeName: '속성2',
			attributeType: 'INTEGER',
			requiredInput: 'N',
			refEntityName: '',
			createdAt: '2024-01-02T00:00:00.000Z',
			updatedAt: '2024-01-02T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-02T00:00:00.000Z',
	totalCount: 2
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: {
	method?: string;
	body?: unknown;
	searchParams?: Record<string, string>;
}): RequestEvent {
	const url = new URL('http://localhost/api/attribute');

	if (options.searchParams) {
		Object.entries(options.searchParams).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});
	}

	const request = {
		json: vi.fn().mockResolvedValue(options.body || {}),
		method: options.method || 'GET'
	} as unknown as Request;

	return {
		url,
		request,
		params: {},
		locals: {},
		platform: undefined,
		route: { id: '/api/attribute' },
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
	} as unknown as RequestEvent;
}

describe('Attribute API: /api/attribute', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadAttributeData).mockResolvedValue(createMockAttributeData());
		vi.mocked(saveAttributeData).mockResolvedValue(undefined);
	});

	describe('GET', () => {
		it('should return attribute data successfully', async () => {
			const event = createMockRequestEvent({});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.entries).toHaveLength(2);
			expect(result.data.pagination).toBeDefined();
			expect(result.data.pagination.totalCount).toBe(2);
		});

		it('should return paginated data correctly', async () => {
			const event = createMockRequestEvent({
				searchParams: { page: '1', limit: '1' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.entries).toHaveLength(1);
			expect(result.data.pagination.currentPage).toBe(1);
			expect(result.data.pagination.totalPages).toBe(2);
			expect(result.data.pagination.hasNextPage).toBe(true);
		});

		it('should return 400 for invalid pagination parameters', async () => {
			const event = createMockRequestEvent({
				searchParams: { page: '0', limit: '100' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('잘못된 페이지네이션');
		});

		it('should handle data loading error gracefully', async () => {
			vi.mocked(loadAttributeData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

			const event = createMockRequestEvent({});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
		});

		it('should use specified filename parameter', async () => {
			const event = createMockRequestEvent({
				searchParams: { filename: 'custom-attribute.json' }
			});

			await GET(event);

			expect(loadAttributeData).toHaveBeenCalledWith('custom-attribute.json');
		});

		it('should use default filename when not specified', async () => {
			const event = createMockRequestEvent({});

			await GET(event);

			expect(loadAttributeData).toHaveBeenCalledWith('attribute.json');
		});
	});

	describe('POST', () => {
		it('should create a new attribute entry successfully', async () => {
			const newEntry = {
				schemaName: '스키마3',
				entityName: '엔터티3',
				attributeName: '속성3',
				attributeType: 'VARCHAR'
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: newEntry
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(201);
			expect(result.success).toBe(true);
			expect(result.data.id).toBe('test-uuid-1234');
			expect(result.data.schemaName).toBe('스키마3');
			expect(result.data.entityName).toBe('엔터티3');
			expect(result.data).toHaveProperty('createdAt');
			expect(result.data).toHaveProperty('updatedAt');
			expect(saveAttributeData).toHaveBeenCalled();
		});

		it('should return 400 when required fields are missing', async () => {
			const invalidEntry = {
				schemaName: '스키마3'
				// entityName, attributeName, attributeType 누락
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: invalidEntry
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('필수 필드가 누락되었습니다');
		});

		it('should use specified filename parameter', async () => {
			const newEntry = {
				schemaName: '스키마3',
				entityName: '엔터티3',
				attributeName: '속성3',
				attributeType: 'VARCHAR'
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: newEntry,
				searchParams: { filename: 'custom-attribute.json' }
			});

			await POST(event);

			expect(loadAttributeData).toHaveBeenCalledWith('custom-attribute.json');
			expect(saveAttributeData).toHaveBeenCalledWith(expect.any(Object), 'custom-attribute.json');
		});
	});

	describe('PUT', () => {
		it('should update an existing entry successfully', async () => {
			const updatedEntry: Partial<AttributeEntry> = {
				id: 'entry-1',
				schemaName: '스키마1',
				entityName: '엔터티1',
				attributeName: '속성1',
				attributeType: 'VARCHAR',
				attributeDescription: '수정된 설명'
			};

			const event = createMockRequestEvent({
				method: 'PUT',
				body: updatedEntry
			});

			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.attributeDescription).toBe('수정된 설명');
			expect(saveAttributeData).toHaveBeenCalled();
		});

		it('should return 400 when id is missing', async () => {
			const entryWithoutId = {
				schemaName: '스키마1',
				entityName: '엔터티1',
				attributeName: '속성1',
				attributeType: 'VARCHAR'
			};

			const event = createMockRequestEvent({
				method: 'PUT',
				body: entryWithoutId
			});

			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('ID');
		});

		it('should return 404 when entry not found', async () => {
			const nonExistentEntry = {
				id: 'non-existent-id',
				schemaName: '스키마1',
				entityName: '엔터티1',
				attributeName: '속성1',
				attributeType: 'VARCHAR'
			};

			const event = createMockRequestEvent({
				method: 'PUT',
				body: nonExistentEntry
			});

			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(404);
			expect(result.success).toBe(false);
			expect(result.error).toContain('찾을 수 없습니다');
		});

		it('should use specified filename parameter', async () => {
			const updatedEntry: Partial<AttributeEntry> = {
				id: 'entry-1',
				schemaName: '스키마1',
				entityName: '엔터티1',
				attributeName: '속성1',
				attributeType: 'VARCHAR',
				attributeDescription: '수정된 설명'
			};

			const event = createMockRequestEvent({
				method: 'PUT',
				body: updatedEntry,
				searchParams: { filename: 'custom-attribute.json' }
			});

			await PUT(event);

			expect(loadAttributeData).toHaveBeenCalledWith('custom-attribute.json');
			expect(saveAttributeData).toHaveBeenCalledWith(expect.any(Object), 'custom-attribute.json');
		});
	});

	describe('DELETE', () => {
		it('should delete an existing entry successfully', async () => {
			const event = createMockRequestEvent({
				searchParams: { id: 'entry-1' }
			});

			const response = await DELETE(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.message).toContain('삭제');
			expect(saveAttributeData).toHaveBeenCalled();
		});

		it('should return 400 when id is missing', async () => {
			const event = createMockRequestEvent({
				searchParams: {}
			});

			const response = await DELETE(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('ID');
		});

		it('should return 404 when entry not found', async () => {
			const event = createMockRequestEvent({
				searchParams: { id: 'non-existent-id' }
			});

			const response = await DELETE(event);
			const result = await response.json();

			expect(response.status).toBe(404);
			expect(result.success).toBe(false);
			expect(result.error).toContain('찾을 수 없습니다');
		});

		it('should use specified filename parameter', async () => {
			const event = createMockRequestEvent({
				searchParams: { id: 'entry-1', filename: 'custom-attribute.json' }
			});

			await DELETE(event);

			expect(loadAttributeData).toHaveBeenCalledWith('custom-attribute.json');
			expect(saveAttributeData).toHaveBeenCalledWith(expect.any(Object), 'custom-attribute.json');
		});
	});
});

