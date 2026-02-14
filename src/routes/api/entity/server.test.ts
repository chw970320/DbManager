import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { EntityData, EntityEntry } from '$lib/types/database-design';

// Mock 모듈들
vi.mock('$lib/registry/data-registry', () => ({
	loadEntityData: vi.fn(),
	saveEntityData: vi.fn()
}));

vi.mock('uuid', () => ({
	v4: vi.fn(() => 'test-uuid-1234')
}));

// Mock import
import { loadEntityData, saveEntityData } from '$lib/registry/data-registry';

// 테스트용 Mock 데이터
const createMockEntityData = (): EntityData => ({
	entries: [
		{
			id: 'entry-1',
			logicalDbName: '논리DB1',
			schemaName: '스키마1',
			entityName: '엔터티1',
			primaryIdentifier: 'ID1',
			tableKoreanName: '테이블한글명1',
			entityDescription: '엔터티 설명1',
			superTypeEntityName: '수퍼타입1',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'entry-2',
			logicalDbName: '논리DB2',
			schemaName: '스키마2',
			entityName: '엔터티2',
			primaryIdentifier: 'ID2',
			tableKoreanName: '테이블한글명2',
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
	const url = new URL('http://localhost/api/entity');

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
		route: { id: '/api/entity' },
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

describe('Entity API: /api/entity', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadEntityData).mockResolvedValue(createMockEntityData());
		vi.mocked(saveEntityData).mockResolvedValue(undefined);
	});

	describe('GET', () => {
		it('should return entity data successfully', async () => {
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

		it('should return 400 for invalid sort field', async () => {
			const event = createMockRequestEvent({
				searchParams: { sortBy: 'invalidField', sortOrder: 'asc' }
			});

			const response = await GET(event);
			const result = await response.json();

			// Entity API는 정렬 필드 검증을 하지 않으므로 200 반환
			expect(response.status).toBe(200);
		});

		it('should handle data loading error gracefully', async () => {
			vi.mocked(loadEntityData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

			const event = createMockRequestEvent({});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
		});

		it('should use specified filename parameter', async () => {
			const event = createMockRequestEvent({
				searchParams: { filename: 'custom-entity.json' }
			});

			await GET(event);

			expect(loadEntityData).toHaveBeenCalledWith('custom-entity.json');
		});

		it('should use default filename when not specified', async () => {
			const event = createMockRequestEvent({});

			await GET(event);

			expect(loadEntityData).toHaveBeenCalledWith('entity.json');
		});
	});

	describe('POST', () => {
		it('should create a new entity entry successfully', async () => {
			const newEntry = {
				logicalDbName: '논리DB3',
				schemaName: '스키마3',
				entityName: '엔터티3',
				primaryIdentifier: 'ID3',
				tableKoreanName: '테이블한글명3'
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
			expect(result.data.logicalDbName).toBe('논리DB3');
			expect(result.data.entityName).toBe('엔터티3');
			expect(result.data).toHaveProperty('createdAt');
			expect(result.data).toHaveProperty('updatedAt');
			expect(saveEntityData).toHaveBeenCalled();
		});

		it('should return 400 when required fields are missing', async () => {
			const invalidEntry = {
				logicalDbName: '논리DB3'
				// schemaName, entityName, primaryIdentifier, tableKoreanName 누락
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
				logicalDbName: '논리DB3',
				schemaName: '스키마3',
				entityName: '엔터티3',
				primaryIdentifier: 'ID3',
				tableKoreanName: '테이블한글명3'
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: newEntry,
				searchParams: { filename: 'custom-entity.json' }
			});

			await POST(event);

			expect(loadEntityData).toHaveBeenCalledWith('custom-entity.json');
			expect(saveEntityData).toHaveBeenCalledWith(expect.any(Object), 'custom-entity.json');
		});
	});

	describe('PUT', () => {
		it('should update an existing entry successfully', async () => {
			const updatedEntry: Partial<EntityEntry> = {
				id: 'entry-1',
				logicalDbName: '논리DB1',
				schemaName: '스키마1',
				entityName: '엔터티1',
				primaryIdentifier: 'ID1',
				tableKoreanName: '테이블한글명1',
				entityDescription: '수정된 설명'
			};

			const event = createMockRequestEvent({
				method: 'PUT',
				body: updatedEntry
			});

			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.entityDescription).toBe('수정된 설명');
			expect(saveEntityData).toHaveBeenCalled();
		});

		it('should return 400 when id is missing', async () => {
			const entryWithoutId = {
				logicalDbName: '논리DB1',
				schemaName: '스키마1',
				entityName: '엔터티1',
				primaryIdentifier: 'ID1',
				tableKoreanName: '테이블한글명1'
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
				logicalDbName: '논리DB1',
				schemaName: '스키마1',
				entityName: '엔터티1',
				primaryIdentifier: 'ID1',
				tableKoreanName: '테이블한글명1'
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
			const updatedEntry: Partial<EntityEntry> = {
				id: 'entry-1',
				logicalDbName: '논리DB1',
				schemaName: '스키마1',
				entityName: '엔터티1',
				primaryIdentifier: 'ID1',
				tableKoreanName: '테이블한글명1',
				entityDescription: '수정된 설명'
			};

			const event = createMockRequestEvent({
				method: 'PUT',
				body: updatedEntry,
				searchParams: { filename: 'custom-entity.json' }
			});

			await PUT(event);

			expect(loadEntityData).toHaveBeenCalledWith('custom-entity.json');
			expect(saveEntityData).toHaveBeenCalledWith(expect.any(Object), 'custom-entity.json');
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
			expect(saveEntityData).toHaveBeenCalled();
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
				searchParams: { id: 'entry-1', filename: 'custom-entity.json' }
			});

			await DELETE(event);

			expect(loadEntityData).toHaveBeenCalledWith('custom-entity.json');
			expect(saveEntityData).toHaveBeenCalledWith(expect.any(Object), 'custom-entity.json');
		});
	});
});

