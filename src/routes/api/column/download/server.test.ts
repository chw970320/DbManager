import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { ColumnData } from '$lib/types/database-design';

// Mock 모듈들
vi.mock('$lib/registry/data-registry', () => ({
	loadColumnData: vi.fn()
}));

vi.mock('$lib/utils/database-design-xlsx-parser.js', () => ({
	exportColumnToXlsxBuffer: vi.fn(() => Buffer.from('mock-xlsx-data'))
}));

import { loadColumnData } from '$lib/registry/data-registry';
import { exportColumnToXlsxBuffer } from '$lib/utils/database-design-xlsx-parser.js';

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
			personalInfoFlag: 'N',
			encryptionFlag: 'N',
			publicFlag: 'Y',
			dataLength: '100',
			dataDecimalLength: '0',
			dataFormat: '문자',
			pkInfo: '',
			fkInfo: '',
			indexName: '',
			indexOrder: '',
			akInfo: '',
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
			personalInfoFlag: 'Y',
			encryptionFlag: 'Y',
			publicFlag: 'N',
			dataLength: '10',
			dataDecimalLength: '0',
			dataFormat: '숫자',
			pkInfo: '',
			fkInfo: '',
			indexName: '',
			indexOrder: '',
			akInfo: '',
			constraint: '',
			createdAt: '2024-01-02T00:00:00.000Z',
			updatedAt: '2024-01-02T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-02T00:00:00.000Z',
	totalCount: 2
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: { searchParams?: Record<string, string> }): RequestEvent {
	const url = new URL('http://localhost/api/column/download');

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
		route: { id: '/api/column/download' },
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

describe('Column Download API: /api/column/download', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadColumnData).mockResolvedValue(createMockColumnData());
		vi.mocked(exportColumnToXlsxBuffer).mockReturnValue(Buffer.from('mock-xlsx-data'));
	});

	it('should download XLSX file successfully', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe(
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		);
		expect(response.headers.get('Content-Disposition')).toContain('attachment');
		expect(response.headers.get('Content-Disposition')).toContain('.xlsx');
	});

	it('should apply sortBy and sortOrder correctly', async () => {
		const event = createMockRequestEvent({
			searchParams: { sortBy: 'columnEnglishName', sortOrder: 'desc' }
		});

		await GET(event);

		expect(loadColumnData).toHaveBeenCalled();
		expect(exportColumnToXlsxBuffer).toHaveBeenCalled();
	});

	it('should apply filter correctly', async () => {
		const event = createMockRequestEvent({
			searchParams: { q: 'COLUMN1' }
		});

		await GET(event);

		expect(loadColumnData).toHaveBeenCalled();
		expect(exportColumnToXlsxBuffer).toHaveBeenCalled();
	});

	it('should return 500 on data load error', async () => {
		vi.mocked(loadColumnData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
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
});

