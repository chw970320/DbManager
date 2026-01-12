import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { DomainData } from '$lib/types/domain';

// Mock 모듈들
vi.mock('$lib/utils/file-handler.js', () => ({
	loadDomainData: vi.fn()
}));

import { loadDomainData } from '$lib/utils/file-handler.js';

// 테스트용 Mock 데이터
const createMockDomainData = (): DomainData => ({
	entries: [
		{
			id: 'entry-1',
			domainGroup: '공통표준도메인그룹',
			domainCategory: '사용자분류',
			standardDomainName: '사용자분류_VARCHAR(50)',
			physicalDataType: 'VARCHAR',
			dataLength: '50',
			revision: '1.0',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'entry-2',
			domainGroup: '공통표준도메인그룹',
			domainCategory: '상태분류',
			standardDomainName: '상태분류_INT',
			physicalDataType: 'INT',
			revision: null,
			createdAt: '2024-01-02T00:00:00.000Z',
			updatedAt: '2024-01-02T00:00:00.000Z'
		},
		{
			id: 'entry-3',
			domainGroup: '시스템도메인그룹',
			domainCategory: '시스템분류',
			standardDomainName: '시스템분류_DECIMAL',
			physicalDataType: 'DECIMAL',
			revision: '2.0',
			createdAt: '2024-01-03T00:00:00.000Z',
			updatedAt: '2024-01-03T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-03T00:00:00.000Z',
	totalCount: 3
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: { searchParams?: Record<string, string> }): RequestEvent {
	const url = new URL('http://localhost/api/domain/filter-options');

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
		route: { id: '/api/domain/filter-options' },
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

describe('Domain Filter Options API: /api/domain/filter-options', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadDomainData).mockResolvedValue(createMockDomainData());
	});

	it('should return filter options successfully', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data.domainGroup).toBeInstanceOf(Array);
		expect(result.data.domainCategory).toBeInstanceOf(Array);
		expect(result.data.physicalDataType).toBeInstanceOf(Array);
	});

	it('should return unique values for each filterable column', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.data.domainGroup).toHaveLength(2); // 공통표준도메인그룹, 시스템도메인그룹
		expect(result.data.domainCategory).toHaveLength(3); // 사용자분류, 상태분류, 시스템분류
		expect(result.data.physicalDataType).toHaveLength(3); // VARCHAR, INT, DECIMAL
	});

	it('should include "(빈값)" option for nullable fields', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		// revision은 nullable 필드이고 빈값이 있으므로 "(빈값)" 포함
		expect(result.data.revision).toContain('(빈값)');
	});

	it('should use specified filename parameter', async () => {
		const event = createMockRequestEvent({
			searchParams: { filename: 'custom-domain.json' }
		});

		await GET(event);

		expect(loadDomainData).toHaveBeenCalledWith('custom-domain.json');
	});

	it('should use default filename when not specified', async () => {
		const event = createMockRequestEvent({});

		await GET(event);

		expect(loadDomainData).toHaveBeenCalledWith('domain.json');
	});

	it('should return 500 on data load error', async () => {
		vi.mocked(loadDomainData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

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
		// domainGroup 정렬 확인
		const domainGroups = result.data.domainGroup;
		expect(domainGroups[0]).toBe('공통표준도메인그룹');
		expect(domainGroups[1]).toBe('시스템도메인그룹');
	});

	it('should handle empty entries array', async () => {
		const emptyData: DomainData = {
			entries: [],
			lastUpdated: '2024-01-01T00:00:00.000Z',
			totalCount: 0
		};
		vi.mocked(loadDomainData).mockResolvedValue(emptyData);

		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		// 모든 필터 옵션이 빈 배열이어야 함
		expect(result.data.domainGroup).toEqual([]);
		expect(result.data.domainCategory).toEqual([]);
	});
});
