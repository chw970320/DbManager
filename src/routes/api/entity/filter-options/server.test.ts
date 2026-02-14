import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { EntityData } from '$lib/types/database-design';

// Mock 모듈들
vi.mock('$lib/registry/data-registry', () => ({
	loadEntityData: vi.fn()
}));

import { loadEntityData } from '$lib/registry/data-registry';

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
			superTypeEntityName: '',
			createdAt: '2024-01-02T00:00:00.000Z',
			updatedAt: '2024-01-02T00:00:00.000Z'
		},
		{
			id: 'entry-3',
			logicalDbName: '논리DB1',
			schemaName: '스키마3',
			entityName: '엔터티3',
			primaryIdentifier: 'ID3',
			tableKoreanName: '테이블한글명3',
			superTypeEntityName: '수퍼타입2',
			createdAt: '2024-01-03T00:00:00.000Z',
			updatedAt: '2024-01-03T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-03T00:00:00.000Z',
	totalCount: 3
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: { searchParams?: Record<string, string> }): RequestEvent {
	const url = new URL('http://localhost/api/entity/filter-options');

	if (options.searchParams) {
		Object.entries(options.searchParams).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});
	}

	return {
		url,
		request: new Request(url),
		params: {},
		locals: {},
		platform: undefined,
		route: { id: '/api/entity/filter-options' },
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

describe('Entity Filter Options API: /api/entity/filter-options', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadEntityData).mockResolvedValue(createMockEntityData());
	});

	it('should return filter options successfully', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data.logicalDbName).toBeInstanceOf(Array);
		expect(result.data.schemaName).toBeInstanceOf(Array);
		expect(result.data.entityName).toBeInstanceOf(Array);
	});

	it('should return unique values for each filterable column', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.data.logicalDbName).toHaveLength(2); // 논리DB1, 논리DB2
		expect(result.data.schemaName).toHaveLength(3); // 스키마1, 스키마2, 스키마3
		expect(result.data.entityName).toHaveLength(3); // 엔터티1, 엔터티2, 엔터티3
	});

	it('should include "(빈값)" option for nullable fields', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		// superTypeEntityName은 nullable 필드이고 빈값이 있으므로 "(빈값)" 포함
		expect(result.data.superTypeEntityName).toContain('(빈값)');
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

	it('should return 500 on data load error', async () => {
		vi.mocked(loadEntityData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
		expect(result.error).toBe('파일을 찾을 수 없습니다');
	});

	it('should sort filter options alphabetically', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		// logicalDbName 정렬 확인
		const logicalDbNames = result.data.logicalDbName;
		expect(logicalDbNames[0]).toBe('논리DB1');
		expect(logicalDbNames[1]).toBe('논리DB2');
	});

	it('should handle empty entries array', async () => {
		const emptyData: EntityData = {
			entries: [],
			lastUpdated: '2024-01-01T00:00:00.000Z',
			totalCount: 0
		};
		vi.mocked(loadEntityData).mockResolvedValue(emptyData);

		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		// 모든 필터 옵션이 빈 배열이어야 함
		expect(result.data.logicalDbName).toEqual([]);
		expect(result.data.schemaName).toEqual([]);
	});
});

