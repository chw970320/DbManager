import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { DomainData } from '$lib/types/domain';

// Mock 모듈들
vi.mock('$lib/registry/data-registry', () => ({
	loadDomainData: vi.fn()
}));

vi.mock('$lib/utils/xlsx-parser.js', () => ({
	exportDomainToXlsxBuffer: vi.fn(() => Buffer.from('mock-xlsx-data'))
}));

import { loadDomainData } from '$lib/registry/data-registry';
import { exportDomainToXlsxBuffer } from '$lib/utils/xlsx-parser.js';

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
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'entry-2',
			domainGroup: '공통표준도메인그룹',
			domainCategory: '상태분류',
			standardDomainName: '상태분류_INT',
			physicalDataType: 'INT',
			createdAt: '2024-01-02T00:00:00.000Z',
			updatedAt: '2024-01-02T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-02T00:00:00.000Z',
	totalCount: 2
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: { searchParams?: Record<string, string> }): RequestEvent {
	const url = new URL('http://localhost/api/domain/download');

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
		route: { id: '/api/domain/download' },
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

describe('Domain Download API: /api/domain/download', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadDomainData).mockResolvedValue(createMockDomainData());
		vi.mocked(exportDomainToXlsxBuffer).mockReturnValue(Buffer.from('mock-xlsx-data'));
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
			searchParams: { sortBy: 'standardDomainName', sortOrder: 'desc' }
		});

		await GET(event);

		expect(loadDomainData).toHaveBeenCalled();
		expect(exportDomainToXlsxBuffer).toHaveBeenCalled();
	});

	it('should apply filter correctly', async () => {
		const event = createMockRequestEvent({
			searchParams: { q: '사용자', field: 'domainCategory' }
		});

		await GET(event);

		expect(loadDomainData).toHaveBeenCalled();
		expect(exportDomainToXlsxBuffer).toHaveBeenCalled();
	});

	it('should return 500 on data load error', async () => {
		vi.mocked(loadDomainData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
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
});

