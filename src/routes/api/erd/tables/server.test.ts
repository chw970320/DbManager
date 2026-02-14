import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

// Mock 모듈들
vi.mock('$lib/registry/data-registry', () => ({
	loadTableData: vi.fn(),
	listTableFiles: vi.fn()
}));

// Mock import
import { loadTableData, listTableFiles } from '$lib/registry/data-registry';

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: { searchParams?: Record<string, string> }): RequestEvent {
	const url = new URL('http://localhost/api/erd/tables');

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
		route: { id: '/api/erd/tables' },
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

describe('API: /api/erd/tables', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// 기본 Mock 설정
		vi.mocked(listTableFiles).mockResolvedValue(['table.json']);
		vi.mocked(loadTableData).mockResolvedValue({
			entries: [
				{
					id: 'table-1',
					tableEnglishName: 'users',
					tableKoreanName: '사용자',
					schemaName: 'public',
					physicalDbName: 'test_db',
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z'
				},
				{
					id: 'table-2',
					tableEnglishName: 'products',
					tableKoreanName: '상품',
					schemaName: 'public',
					physicalDbName: 'test_db',
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z'
				}
			],
			lastUpdated: '2024-01-01T00:00:00.000Z',
			totalCount: 2
		});
	});

	describe('GET', () => {
		it('should return table list successfully', async () => {
			const requestEvent = createMockRequestEvent({});
			const response = await GET(requestEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(Array.isArray(result.data)).toBe(true);
			expect(result.data.length).toBe(2);
		});

		it('should filter tables by search query', async () => {
			const requestEvent = createMockRequestEvent({
				searchParams: { q: 'user' }
			});
			const response = await GET(requestEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.length).toBe(1);
			expect(result.data[0].tableEnglishName).toBe('users');
		});

		it('should sort tables by English name', async () => {
			vi.mocked(loadTableData).mockResolvedValue({
				entries: [
					{
						id: 'table-2',
						tableEnglishName: 'products',
						schemaName: 'public',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					},
					{
						id: 'table-1',
						tableEnglishName: 'users',
						schemaName: 'public',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-01T00:00:00.000Z'
					}
				],
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 2
			});

			const requestEvent = createMockRequestEvent({});
			const response = await GET(requestEvent);
			const result = await response.json();

			expect(result.data[0].tableEnglishName).toBe('products');
			expect(result.data[1].tableEnglishName).toBe('users');
		});

		it('should use specified filename parameter', async () => {
			const requestEvent = createMockRequestEvent({
				searchParams: { filename: 'custom-table.json' }
			});
			vi.mocked(listTableFiles).mockResolvedValue(['custom-table.json', 'table.json']);

			await GET(requestEvent);

			expect(loadTableData).toHaveBeenCalledWith('custom-table.json');
		});

		it('should use default filename when not specified', async () => {
			const requestEvent = createMockRequestEvent({});
			await GET(requestEvent);

			expect(loadTableData).toHaveBeenCalledWith('table.json');
		});

		it('should return empty array when no tables exist', async () => {
			vi.mocked(listTableFiles).mockResolvedValue([]);

			const requestEvent = createMockRequestEvent({});
			const response = await GET(requestEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data).toEqual([]);
		});

		it('should handle data loading errors gracefully', async () => {
			vi.mocked(loadTableData).mockRejectedValue(new Error('File not found'));

			const requestEvent = createMockRequestEvent({});
			const response = await GET(requestEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should include all required table fields', async () => {
			const requestEvent = createMockRequestEvent({});
			const response = await GET(requestEvent);
			const result = await response.json();

			expect(result.data[0]).toHaveProperty('id');
			expect(result.data[0]).toHaveProperty('tableEnglishName');
			expect(result.data[0]).toHaveProperty('schemaName');
			expect(result.data[0]).toHaveProperty('physicalDbName');
		});
	});
});

