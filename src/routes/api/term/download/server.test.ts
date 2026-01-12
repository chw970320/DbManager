import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { TermData } from '$lib/types/term';

// Mock 모듈들
vi.mock('$lib/utils/file-handler.js', () => ({
	loadTermData: vi.fn()
}));

vi.mock('$lib/utils/xlsx-parser.js', () => ({
	exportTermToXlsxBuffer: vi.fn(() => Buffer.from('mock-xlsx-data'))
}));

import { loadTermData } from '$lib/utils/file-handler.js';
import { exportTermToXlsxBuffer } from '$lib/utils/xlsx-parser.js';

// 테스트용 Mock 데이터
const createMockTermData = (): TermData => ({
	entries: [
		{
			id: 'entry-1',
			termName: '사용자_이름',
			columnName: 'USER_NAME',
			domainName: '사용자분류_VARCHAR(50)',
			isMappedTerm: true,
			isMappedColumn: true,
			isMappedDomain: true,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 1
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: {
	searchParams?: Record<string, string>;
}): RequestEvent {
	const url = new URL('http://localhost/api/term/download');

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
		route: { id: '/api/term/download' },
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

describe('Term Download API: /api/term/download', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadTermData).mockResolvedValue(createMockTermData());
		vi.mocked(exportTermToXlsxBuffer).mockReturnValue(Buffer.from('mock-xlsx-data'));
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

	it('should return 404 when no entries exist', async () => {
		const emptyData: TermData = {
			entries: [],
			lastUpdated: '2024-01-01T00:00:00.000Z',
			totalCount: 0
		};
		vi.mocked(loadTermData).mockResolvedValue(emptyData);

		const event = createMockRequestEvent({});
		
		await expect(GET(event)).rejects.toThrow();
	});

	it('should return 500 on data load error', async () => {
		vi.mocked(loadTermData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

		const event = createMockRequestEvent({});
		
		try {
			await GET(event);
			expect.fail('Should have thrown an error');
		} catch (err: any) {
			expect(err.status).toBe(500);
		}
	});

	it('should use specified filename parameter', async () => {
		const event = createMockRequestEvent({
			searchParams: { filename: 'custom-term.json' }
		});

		await GET(event);

		expect(loadTermData).toHaveBeenCalledWith('custom-term.json');
	});

	it('should use default filename when not specified', async () => {
		const event = createMockRequestEvent({});

		await GET(event);

		expect(loadTermData).toHaveBeenCalledWith('term.json');
	});
});
