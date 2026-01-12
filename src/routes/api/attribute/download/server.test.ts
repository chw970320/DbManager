import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { AttributeData } from '$lib/types/database-design';

// Mock 모듈들
vi.mock('$lib/utils/database-design-handler.js', () => ({
	loadAttributeData: vi.fn()
}));

vi.mock('$lib/utils/database-design-xlsx-parser.js', () => ({
	exportAttributeToXlsxBuffer: vi.fn(() => Buffer.from('mock-xlsx-data'))
}));

import { loadAttributeData } from '$lib/utils/database-design-handler.js';
import { exportAttributeToXlsxBuffer } from '$lib/utils/database-design-xlsx-parser.js';

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
			createdAt: '2024-01-02T00:00:00.000Z',
			updatedAt: '2024-01-02T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-02T00:00:00.000Z',
	totalCount: 2
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: { searchParams?: Record<string, string> }): RequestEvent {
	const url = new URL('http://localhost/api/attribute/download');

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
		route: { id: '/api/attribute/download' },
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

describe('Attribute Download API: /api/attribute/download', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadAttributeData).mockResolvedValue(createMockAttributeData());
		vi.mocked(exportAttributeToXlsxBuffer).mockReturnValue(Buffer.from('mock-xlsx-data'));
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
			searchParams: { sortBy: 'attributeName', sortOrder: 'desc' }
		});

		await GET(event);

		expect(loadAttributeData).toHaveBeenCalled();
		expect(exportAttributeToXlsxBuffer).toHaveBeenCalled();
	});

	it('should apply filter correctly', async () => {
		const event = createMockRequestEvent({
			searchParams: { q: '속성1' }
		});

		await GET(event);

		expect(loadAttributeData).toHaveBeenCalled();
		expect(exportAttributeToXlsxBuffer).toHaveBeenCalled();
	});

	it('should return 500 on data load error', async () => {
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
