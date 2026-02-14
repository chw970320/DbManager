import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { AttributeData } from '$lib/types/database-design';

// Mock 모듈들
vi.mock('$lib/registry/data-registry', () => ({
	loadAttributeData: vi.fn()
}));

import { loadAttributeData } from '$lib/registry/data-registry';

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
		},
		{
			id: 'entry-3',
			schemaName: '스키마1',
			entityName: '엔터티3',
			attributeName: '속성3',
			attributeType: 'VARCHAR',
			requiredInput: 'Y',
			refEntityName: '',
			createdAt: '2024-01-03T00:00:00.000Z',
			updatedAt: '2024-01-03T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-03T00:00:00.000Z',
	totalCount: 3
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: { searchParams?: Record<string, string> }): RequestEvent {
	const url = new URL('http://localhost/api/attribute/filter-options');

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
		route: { id: '/api/attribute/filter-options' },
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

describe('Attribute Filter Options API: /api/attribute/filter-options', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadAttributeData).mockResolvedValue(createMockAttributeData());
	});

	it('should return filter options successfully', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data.schemaName).toBeInstanceOf(Array);
		expect(result.data.entityName).toBeInstanceOf(Array);
		expect(result.data.attributeName).toBeInstanceOf(Array);
	});

	it('should return unique values for each filterable column', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.data.schemaName).toHaveLength(2); // 스키마1, 스키마2
		expect(result.data.entityName).toHaveLength(3); // 엔터티1, 엔터티2, 엔터티3
		expect(result.data.attributeName).toHaveLength(3); // 속성1, 속성2, 속성3
	});

	it('should include "(빈값)" option for nullable fields', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		// identifierFlag는 nullable 필드이고 빈값이 있으므로 "(빈값)" 포함 가능
		expect(result.data.identifierFlag).toBeInstanceOf(Array);
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

	it('should return 500 on data load error', async () => {
		vi.mocked(loadAttributeData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

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
		// schemaName 정렬 확인
		const schemaNames = result.data.schemaName;
		expect(schemaNames[0]).toBe('스키마1');
		expect(schemaNames[1]).toBe('스키마2');
	});

	it('should handle empty entries array', async () => {
		const emptyData: AttributeData = {
			entries: [],
			lastUpdated: '2024-01-01T00:00:00.000Z',
			totalCount: 0
		};
		vi.mocked(loadAttributeData).mockResolvedValue(emptyData);

		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.schemaName).toEqual([]);
		expect(result.data.entityName).toEqual([]);
	});
});

