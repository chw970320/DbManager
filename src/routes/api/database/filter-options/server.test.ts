import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { DatabaseData, DatabaseEntry } from '$lib/types/database-design';

// Mock 모듈들
vi.mock('$lib/registry/data-registry', () => ({
	loadDatabaseData: vi.fn()
}));

import { loadDatabaseData } from '$lib/registry/data-registry';

// 테스트용 Mock 데이터
const createMockDatabaseData = (): DatabaseData => ({
	entries: [
		{
			id: 'entry-1',
			organizationName: '기관1',
			departmentName: '부서1',
			appliedTask: '업무1',
			relatedLaw: '법령1',
			logicalDbName: '논리DB1',
			physicalDbName: '물리DB1',
			buildDate: '2024-01-01',
			dbDescription: '설명1',
			dbmsInfo: 'MySQL',
			osInfo: 'Linux',
			exclusionReason: '',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'entry-2',
			organizationName: '기관2',
			departmentName: '부서2',
			appliedTask: '업무2',
			relatedLaw: '법령2',
			logicalDbName: '논리DB2',
			physicalDbName: '물리DB2',
			buildDate: '2024-01-02',
			dbDescription: '설명2',
			dbmsInfo: 'PostgreSQL',
			osInfo: 'Windows',
			exclusionReason: '',
			createdAt: '2024-01-02T00:00:00.000Z',
			updatedAt: '2024-01-02T00:00:00.000Z'
		},
		{
			id: 'entry-3',
			organizationName: '기관1',
			departmentName: '부서1',
			appliedTask: '업무3',
			relatedLaw: '',
			logicalDbName: undefined,
			physicalDbName: undefined,
			buildDate: '2024-01-03',
			dbDescription: '설명3',
			dbmsInfo: undefined,
			osInfo: 'Linux',
			exclusionReason: '',
			createdAt: '2024-01-03T00:00:00.000Z',
			updatedAt: '2024-01-03T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-03T00:00:00.000Z',
	totalCount: 3
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: { searchParams?: Record<string, string> }): RequestEvent {
	const url = new URL('http://localhost/api/database/filter-options');

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
		route: { id: '/api/database/filter-options' },
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

describe('Database Filter Options API: /api/database/filter-options', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadDatabaseData).mockResolvedValue(createMockDatabaseData());
	});

	it('필터 옵션 조회 성공', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data.organizationName).toBeInstanceOf(Array);
		expect(result.data.dbmsInfo).toBeInstanceOf(Array);
	});

	it('고유값만 반환', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		// organizationName은 '기관1', '기관2' 두 개만 (중복 제거)
		expect(result.data.organizationName).toHaveLength(2);
		expect(result.data.organizationName).toContain('기관1');
		expect(result.data.organizationName).toContain('기관2');
	});

	it('filename 파라미터로 특정 파일 기준 조회', async () => {
		const event = createMockRequestEvent({
			searchParams: { filename: 'custom-database.json' }
		});

		await GET(event);

		expect(loadDatabaseData).toHaveBeenCalledWith('custom-database.json');
	});

	it('기본 파일명 사용', async () => {
		const event = createMockRequestEvent({});

		await GET(event);

		expect(loadDatabaseData).toHaveBeenCalledWith('database.json');
	});

	it('데이터 로드 실패 처리', async () => {
		vi.mocked(loadDatabaseData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
		expect(result.error).toBe('파일을 찾을 수 없습니다');
	});

	it('필터 옵션 정렬 확인', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		// 정렬된 배열인지 확인
		const orgNames = result.data.organizationName;
		expect(orgNames[0]).toBe('기관1');
		expect(orgNames[1]).toBe('기관2');
	});

	it('빈 entries 배열 처리', async () => {
		const emptyData: DatabaseData = {
			entries: [],
			lastUpdated: '2024-01-01T00:00:00.000Z',
			totalCount: 0
		};
		vi.mocked(loadDatabaseData).mockResolvedValue(emptyData);

		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.organizationName).toEqual([]);
		expect(result.data.dbmsInfo).toEqual([]);
	});

	it('Nullable 필드에 빈값 옵션 포함', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		// logicalDbName, physicalDbName, dbmsInfo는 nullable이므로 빈값이 있으면 "(빈값)" 옵션 포함
		expect(result.data.logicalDbName).toContain('(빈값)');
		expect(result.data.physicalDbName).toContain('(빈값)');
		expect(result.data.dbmsInfo).toContain('(빈값)');
		// "(빈값)"이 첫 번째 요소인지 확인
		expect(result.data.logicalDbName[0]).toBe('(빈값)');
	});
});

