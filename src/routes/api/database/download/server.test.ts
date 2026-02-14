import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { DatabaseData, DatabaseEntry } from '$lib/types/database-design';

// Mock 모듈들
vi.mock('$lib/registry/data-registry', () => ({
	loadDatabaseData: vi.fn()
}));

vi.mock('$lib/utils/database-design-xlsx-parser.js', () => ({
	exportDatabaseToXlsxBuffer: vi.fn(() => Buffer.from('mock-xlsx-data'))
}));

import { loadDatabaseData } from '$lib/registry/data-registry';
import { exportDatabaseToXlsxBuffer } from '$lib/utils/database-design-xlsx-parser.js';

// 테스트용 Mock 데이터
const createMockDatabaseData = (): DatabaseData => ({
	entries: [
		{
			id: 'entry-1',
			organizationName: '기관1',
			departmentName: '부서1',
			appliedTask: '업무1',
			relatedLaw: '',
			logicalDbName: '논리DB1',
			physicalDbName: '물리DB1',
			buildDate: '2024-01-01',
			dbDescription: '설명1',
			dbmsInfo: 'MySQL',
			osInfo: 'Linux',
			exclusionReason: '',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 1
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: { searchParams?: Record<string, string> }): RequestEvent {
	const url = new URL('http://localhost/api/database/download');

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
		route: { id: '/api/database/download' },
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

describe('Database Download API: /api/database/download', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadDatabaseData).mockResolvedValue(createMockDatabaseData());
		vi.mocked(exportDatabaseToXlsxBuffer).mockReturnValue(Buffer.from('mock-xlsx-data'));
	});

	it('XLSX 파일 다운로드 성공', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe(
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		);
		expect(response.headers.get('Content-Disposition')).toContain('attachment');
		expect(response.headers.get('Content-Disposition')).toContain('.xlsx');
	});

	it('filename 파라미터로 특정 파일 다운로드', async () => {
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

	it('검색 필터 적용', async () => {
		const event = createMockRequestEvent({
			searchParams: { q: '기관1', field: 'organizationName' }
		});

		const response = await GET(event);

		expect(response.status).toBe(200);
		expect(exportDatabaseToXlsxBuffer).toHaveBeenCalled();
	});

	it('정렬 적용', async () => {
		const event = createMockRequestEvent({
			searchParams: { sortBy: 'organizationName', sortOrder: 'asc' }
		});

		const response = await GET(event);

		expect(response.status).toBe(200);
		expect(exportDatabaseToXlsxBuffer).toHaveBeenCalled();
	});

	it('데이터 로드 실패 처리', async () => {
		vi.mocked(loadDatabaseData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
	});
});

