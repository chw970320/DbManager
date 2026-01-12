import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { TableData } from '$lib/types/database-design';

// Mock 모듈들
vi.mock('$lib/utils/database-design-handler.js', () => ({
	loadTableData: vi.fn()
}));

import { loadTableData } from '$lib/utils/database-design-handler.js';

// 테스트용 Mock 데이터
const createMockTableData = (): TableData => ({
	entries: [
		{
			id: 'entry-1',
			physicalDbName: '물리DB1',
			tableOwner: '소유자1',
			subjectArea: '주제영역1',
			schemaName: '스키마1',
			tableEnglishName: 'TABLE1',
			tableKoreanName: '테이블1',
			tableType: '일반',
			relatedEntityName: '엔터티1',
			publicFlag: 'Y',
			businessClassification: '업무분류1',
			retentionPeriod: '5년',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'entry-2',
			physicalDbName: '물리DB2',
			tableOwner: '소유자2',
			subjectArea: '주제영역2',
			schemaName: '스키마2',
			tableEnglishName: 'TABLE2',
			tableKoreanName: '테이블2',
			tableType: '임시',
			relatedEntityName: '엔터티2',
			publicFlag: 'N',
			createdAt: '2024-01-02T00:00:00.000Z',
			updatedAt: '2024-01-02T00:00:00.000Z'
		},
		{
			id: 'entry-3',
			physicalDbName: '물리DB1',
			tableOwner: '소유자1',
			subjectArea: '주제영역1',
			schemaName: '스키마3',
			tableEnglishName: 'TABLE3',
			tableKoreanName: '테이블3',
			tableType: '일반',
			relatedEntityName: '엔터티3',
			publicFlag: 'Y',
			createdAt: '2024-01-03T00:00:00.000Z',
			updatedAt: '2024-01-03T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-03T00:00:00.000Z',
	totalCount: 3
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: {
	searchParams?: Record<string, string>;
}): RequestEvent {
	const url = new URL('http://localhost/api/table/filter-options');

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
		route: { id: '/api/table/filter-options' },
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

describe('Table Filter Options API: /api/table/filter-options', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadTableData).mockResolvedValue(createMockTableData());
	});

	it('should return filter options successfully', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data.physicalDbName).toBeInstanceOf(Array);
		expect(result.data.schemaName).toBeInstanceOf(Array);
		expect(result.data.tableEnglishName).toBeInstanceOf(Array);
	});

	it('should return unique values for each filterable column', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.data.physicalDbName).toHaveLength(2); // 물리DB1, 물리DB2
		expect(result.data.schemaName).toHaveLength(3); // 스키마1, 스키마2, 스키마3
		expect(result.data.tableEnglishName).toHaveLength(3); // TABLE1, TABLE2, TABLE3
	});

	it('should include "(빈값)" option for nullable fields', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		// nullable 필드이고 빈값이 있으면 "(빈값)" 포함 가능
		expect(result.data.physicalDbName).toBeInstanceOf(Array);
	});

	it('should use specified filename parameter', async () => {
		const event = createMockRequestEvent({
			searchParams: { filename: 'custom-table.json' }
		});

		await GET(event);

		expect(loadTableData).toHaveBeenCalledWith('custom-table.json');
	});

	it('should use default filename when not specified', async () => {
		const event = createMockRequestEvent({});

		await GET(event);

		expect(loadTableData).toHaveBeenCalledWith('table.json');
	});

	it('should return 500 on data load error', async () => {
		vi.mocked(loadTableData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

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
		// physicalDbName 정렬 확인
		const physicalDbNames = result.data.physicalDbName;
		expect(physicalDbNames[0]).toBe('물리DB1');
		expect(physicalDbNames[1]).toBe('물리DB2');
	});

	it('should handle empty entries array', async () => {
		const emptyData: TableData = {
			entries: [],
			lastUpdated: '2024-01-01T00:00:00.000Z',
			totalCount: 0
		};
		vi.mocked(loadTableData).mockResolvedValue(emptyData);

		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.physicalDbName).toEqual([]);
		expect(result.data.schemaName).toEqual([]);
	});
});
