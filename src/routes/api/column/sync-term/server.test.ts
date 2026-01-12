import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { ColumnData, ColumnEntry } from '$lib/types/database-design';
import type { TermData, TermEntry } from '$lib/types/term';

// Mock 모듈들
vi.mock('$lib/utils/database-design-handler.js', () => ({
	loadColumnData: vi.fn(),
	saveColumnData: vi.fn()
}));

vi.mock('$lib/utils/file-handler.js', () => ({
	loadTermData: vi.fn()
}));

import { loadColumnData, saveColumnData } from '$lib/utils/database-design-handler.js';
import { loadTermData } from '$lib/utils/file-handler.js';

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

const createMockTermData = (): TermData => ({
	entries: [
		{
			id: 'term-1',
			termName: '컬럼1용어',
			columnName: 'COLUMN1',
			domainName: 'VARCHAR',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 1
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: {
	method?: string;
	body?: unknown;
	searchParams?: Record<string, string>;
}): RequestEvent {
	const url = new URL('http://localhost/api/column/sync-term');

	if (options.searchParams) {
		Object.entries(options.searchParams).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});
	}

	const request = {
		json: vi.fn().mockResolvedValue(options.body || {}),
		method: options.method || 'GET'
	} as unknown as Request;

	return {
		url,
		request,
		params: {},
		locals: {},
		platform: undefined,
		route: { id: '/api/column/sync-term' },
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

describe('Column Sync-Term API: /api/column/sync-term', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadColumnData).mockResolvedValue(createMockColumnData());
		vi.mocked(loadTermData).mockResolvedValue(createMockTermData());
		vi.mocked(saveColumnData).mockResolvedValue(undefined);
	});

	describe('GET', () => {
		it('should return sync status successfully', async () => {
			const event = createMockRequestEvent({});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data).toHaveProperty('matched');
			expect(result.data).toHaveProperty('unmatched');
			expect(result.data).toHaveProperty('total');
		});

		it('should use specified filename parameters', async () => {
			const event = createMockRequestEvent({
				searchParams: {
					columnFilename: 'custom-column.json',
					termFilename: 'custom-term.json'
				}
			});

			await GET(event);

			expect(loadColumnData).toHaveBeenCalledWith('custom-column.json');
			expect(loadTermData).toHaveBeenCalledWith('custom-term.json');
		});

		it('should use default filenames when not specified', async () => {
			const event = createMockRequestEvent({});

			await GET(event);

			expect(loadColumnData).toHaveBeenCalledWith('column.json');
			expect(loadTermData).toHaveBeenCalledWith('term.json');
		});

		it('should return 500 on column data load error', async () => {
			vi.mocked(loadColumnData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

			const event = createMockRequestEvent({});
			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
		});

		it('should return 500 on term data load error', async () => {
			vi.mocked(loadTermData).mockRejectedValue(new Error('용어 파일을 찾을 수 없습니다'));

			const event = createMockRequestEvent({});
			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
		});
	});

	describe('POST', () => {
		it('should sync terms successfully', async () => {
			const event = createMockRequestEvent({
				method: 'POST',
				body: {}
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data).toHaveProperty('matched');
			expect(result.data).toHaveProperty('unmatched');
			expect(result.data).toHaveProperty('updated');
			expect(result.data).toHaveProperty('total');
		});

		it('should update columnKoreanName when term matches', async () => {
			const columnData = createMockColumnData();
			const termData = createMockTermData();
			vi.mocked(loadColumnData).mockResolvedValue(columnData);
			vi.mocked(loadTermData).mockResolvedValue(termData);

			const event = createMockRequestEvent({
				method: 'POST',
				body: {}
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.matched).toBeGreaterThan(0);
		});

		it('should use specified filename parameters', async () => {
			const event = createMockRequestEvent({
				method: 'POST',
				body: {
					columnFilename: 'custom-column.json',
					termFilename: 'custom-term.json'
				}
			});

			await POST(event);

			expect(loadColumnData).toHaveBeenCalledWith('custom-column.json');
			expect(loadTermData).toHaveBeenCalledWith('custom-term.json');
		});

		it('should return 500 on column data load error', async () => {
			vi.mocked(loadColumnData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

			const event = createMockRequestEvent({
				method: 'POST',
				body: {}
			});
			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
			expect(result.error).toContain('컬럼 정의서 로드 실패');
		});

		it('should return 500 on term data load error', async () => {
			vi.mocked(loadTermData).mockRejectedValue(new Error('용어 파일을 찾을 수 없습니다'));

			const event = createMockRequestEvent({
				method: 'POST',
				body: {}
			});
			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
			expect(result.error).toContain('용어 데이터 로드 실패');
		});
	});
});
