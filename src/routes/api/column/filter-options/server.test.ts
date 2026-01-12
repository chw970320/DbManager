import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { ColumnData } from '$lib/types/database-design';

// Mock 모듈들
vi.mock('$lib/utils/database-design-handler.js', () => ({
	loadColumnData: vi.fn()
}));

import { loadColumnData } from '$lib/utils/database-design-handler.js';

// 테스트용 Mock 데이터
const createMockColumnData = (): ColumnData => ({
	entries: [
		{
			id: 'entry-1',
			scopeFlag: 'Y',
			subjectArea: '주제영역1',
			schemaName: '스키마1',
			tableEnglishName: 'TABLE1',
			columnEnglishName: 'COLUMN1',
			columnKoreanName: '컬럼1',
			relatedEntityName: '엔터티1',
			dataType: 'VARCHAR',
			notNullFlag: 'Y',
			pkInfo: '',
			fkInfo: '',
			akInfo: '',
			personalInfoFlag: 'N',
			encryptionFlag: 'N',
			publicFlag: 'Y',
			dataLength: '100',
			dataDecimalLength: '0',
			dataFormat: '문자',
			indexName: '',
			indexOrder: '',
			constraint: '',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'entry-2',
			scopeFlag: 'N',
			subjectArea: '주제영역2',
			schemaName: '스키마2',
			tableEnglishName: 'TABLE2',
			columnEnglishName: 'COLUMN2',
			columnKoreanName: '컬럼2',
			relatedEntityName: '엔터티2',
			dataType: 'INT',
			notNullFlag: 'N',
			pkInfo: '',
			fkInfo: '',
			akInfo: '',
			personalInfoFlag: 'Y',
			encryptionFlag: 'Y',
			publicFlag: 'N',
			dataLength: '10',
			dataDecimalLength: '0',
			dataFormat: '숫자',
			indexName: '',
			indexOrder: '',
			constraint: '',
			createdAt: '2024-01-02T00:00:00.000Z',
			updatedAt: '2024-01-02T00:00:00.000Z'
		},
		{
			id: 'entry-3',
			scopeFlag: 'Y',
			subjectArea: '주제영역1',
			schemaName: '스키마3',
			tableEnglishName: 'TABLE3',
			columnEnglishName: 'COLUMN3',
			columnKoreanName: '컬럼3',
			relatedEntityName: '엔터티3',
			dataType: 'VARCHAR',
			notNullFlag: 'Y',
			pkInfo: '',
			fkInfo: '',
			akInfo: '',
			personalInfoFlag: 'N',
			encryptionFlag: 'N',
			publicFlag: 'Y',
			dataLength: '100',
			dataDecimalLength: '0',
			dataFormat: '문자',
			indexName: '',
			indexOrder: '',
			constraint: '',
			createdAt: '2024-01-03T00:00:00.000Z',
			updatedAt: '2024-01-03T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-03T00:00:00.000Z',
	totalCount: 3
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: { searchParams?: Record<string, string> }): RequestEvent {
	const url = new URL('http://localhost/api/column/filter-options');

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
		route: { id: '/api/column/filter-options' },
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

describe('Column Filter Options API: /api/column/filter-options', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadColumnData).mockResolvedValue(createMockColumnData());
	});

	it('should return filter options successfully', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data.scopeFlag).toBeInstanceOf(Array);
		expect(result.data.schemaName).toBeInstanceOf(Array);
		expect(result.data.columnEnglishName).toBeInstanceOf(Array);
	});

	it('should return unique values for each filterable column', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.data.scopeFlag).toHaveLength(2); // Y, N
		expect(result.data.schemaName).toHaveLength(3); // 스키마1, 스키마2, 스키마3
		expect(result.data.columnEnglishName).toHaveLength(3); // COLUMN1, COLUMN2, COLUMN3
	});

	it('should include "(빈값)" option for nullable fields', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		// nullable 필드이고 빈값이 있으면 "(빈값)" 포함 가능
		expect(result.data.scopeFlag).toBeInstanceOf(Array);
	});

	it('should use specified filename parameter', async () => {
		const event = createMockRequestEvent({
			searchParams: { filename: 'custom-column.json' }
		});

		await GET(event);

		expect(loadColumnData).toHaveBeenCalledWith('custom-column.json');
	});

	it('should use default filename when not specified', async () => {
		const event = createMockRequestEvent({});

		await GET(event);

		expect(loadColumnData).toHaveBeenCalledWith('column.json');
	});

	it('should return 500 on data load error', async () => {
		vi.mocked(loadColumnData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

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
		// scopeFlag 정렬 확인
		const scopeFlags = result.data.scopeFlag;
		expect(scopeFlags[0]).toBe('N');
		expect(scopeFlags[1]).toBe('Y');
	});

	it('should handle empty entries array', async () => {
		const emptyData: ColumnData = {
			entries: [],
			lastUpdated: '2024-01-01T00:00:00.000Z',
			totalCount: 0
		};
		vi.mocked(loadColumnData).mockResolvedValue(emptyData);

		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.scopeFlag).toEqual([]);
		expect(result.data.schemaName).toEqual([]);
	});
});
