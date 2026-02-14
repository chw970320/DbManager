import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { ColumnData, ColumnEntry } from '$lib/types/database-design';

// Mock 모듈들
vi.mock('$lib/registry/data-registry', () => ({
	loadColumnData: vi.fn(),
	saveColumnData: vi.fn()
}));

vi.mock('uuid', () => ({
	v4: vi.fn(() => 'test-uuid-1234')
}));

// Mock import
import { loadColumnData, saveColumnData } from '$lib/registry/data-registry';

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
			domainName: '사용자명',
			dataType: 'VARCHAR',
			notNullFlag: 'Y',
			personalInfoFlag: 'N',
			encryptionFlag: 'N',
			publicFlag: 'Y',
			columnDescription: '컬럼 설명1',
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
			domainName: '사용자ID',
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
function createMockRequestEvent(options: {
	method?: string;
	body?: unknown;
	searchParams?: Record<string, string>;
}): RequestEvent {
	const url = new URL('http://localhost/api/column');

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
		route: { id: '/api/column' },
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

describe('Column API: /api/column', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadColumnData).mockResolvedValue(createMockColumnData());
		vi.mocked(saveColumnData).mockResolvedValue(undefined);
	});

	describe('GET', () => {
		it('should return column data successfully', async () => {
			const event = createMockRequestEvent({});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.entries).toHaveLength(2);
			expect(result.data.pagination).toBeDefined();
			expect(result.data.pagination.totalCount).toBe(2);
		});

		it('should return paginated data correctly', async () => {
			const event = createMockRequestEvent({
				searchParams: { page: '1', limit: '1' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.entries).toHaveLength(1);
			expect(result.data.pagination.currentPage).toBe(1);
			expect(result.data.pagination.totalPages).toBe(2);
			expect(result.data.pagination.hasNextPage).toBe(true);
		});

		it('should return 400 for invalid pagination parameters', async () => {
			const event = createMockRequestEvent({
				searchParams: { page: '0', limit: '100' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('잘못된 페이지네이션');
		});

		it('should handle data loading error gracefully', async () => {
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

	describe('POST', () => {
		it('should create a new column entry successfully', async () => {
			const newEntry = {
				scopeFlag: 'Y',
				subjectArea: '주제영역3',
				schemaName: '스키마3',
				tableEnglishName: 'TABLE3',
				columnEnglishName: 'COLUMN3',
				columnKoreanName: '컬럼3',
				relatedEntityName: '엔터티3',
				domainName: '신규도메인',
				dataType: 'VARCHAR',
				notNullFlag: 'Y',
				personalInfoFlag: 'N',
				encryptionFlag: 'N',
				publicFlag: 'Y'
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: newEntry
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(201);
			expect(result.success).toBe(true);
			expect(result.data.id).toBe('test-uuid-1234');
			expect(result.data.columnEnglishName).toBe('COLUMN3');
			expect(result.data).toHaveProperty('createdAt');
			expect(result.data).toHaveProperty('updatedAt');
			expect(saveColumnData).toHaveBeenCalled();
		});

		it('should return 400 when required fields are missing', async () => {
			const invalidEntry = {
				scopeFlag: 'Y'
				// 나머지 필수 필드 누락
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: invalidEntry
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('필수 필드가 누락되었습니다');
		});

		it('should use specified filename parameter', async () => {
			const newEntry = {
				scopeFlag: 'Y',
				subjectArea: '주제영역3',
				schemaName: '스키마3',
				tableEnglishName: 'TABLE3',
				columnEnglishName: 'COLUMN3',
				columnKoreanName: '컬럼3',
				relatedEntityName: '엔터티3',
				domainName: '신규도메인',
				dataType: 'VARCHAR',
				notNullFlag: 'Y',
				personalInfoFlag: 'N',
				encryptionFlag: 'N',
				publicFlag: 'Y'
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: newEntry,
				searchParams: { filename: 'custom-column.json' }
			});

			await POST(event);

			expect(loadColumnData).toHaveBeenCalledWith('custom-column.json');
			expect(saveColumnData).toHaveBeenCalledWith(expect.any(Object), 'custom-column.json');
		});
	});

	describe('PUT', () => {
		it('should update an existing entry successfully', async () => {
			const updatedEntry: Partial<ColumnEntry> = {
				id: 'entry-1',
				scopeFlag: 'Y',
				subjectArea: '주제영역1',
				schemaName: '스키마1',
				tableEnglishName: 'TABLE1',
				columnEnglishName: 'COLUMN1',
				columnKoreanName: '컬럼1',
				relatedEntityName: '엔터티1',
				domainName: '사용자명',
				dataType: 'VARCHAR',
				notNullFlag: 'Y',
				personalInfoFlag: 'N',
				encryptionFlag: 'N',
				publicFlag: 'Y',
				columnDescription: '수정된 설명'
			};

			const event = createMockRequestEvent({
				method: 'PUT',
				body: updatedEntry
			});

			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.columnDescription).toBe('수정된 설명');
			expect(saveColumnData).toHaveBeenCalled();
		});

		it('should return 400 when id is missing', async () => {
			const entryWithoutId = {
				scopeFlag: 'Y',
				subjectArea: '주제영역1',
				schemaName: '스키마1',
				tableEnglishName: 'TABLE1',
				columnEnglishName: 'COLUMN1',
				columnKoreanName: '컬럼1',
				relatedEntityName: '엔터티1',
				domainName: '사용자명',
				dataType: 'VARCHAR',
				notNullFlag: 'Y',
				personalInfoFlag: 'N',
				encryptionFlag: 'N',
				publicFlag: 'Y'
			};

			const event = createMockRequestEvent({
				method: 'PUT',
				body: entryWithoutId
			});

			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('ID');
		});

		it('should return 404 when entry not found', async () => {
			const nonExistentEntry = {
				id: 'non-existent-id',
				scopeFlag: 'Y',
				subjectArea: '주제영역1',
				schemaName: '스키마1',
				tableEnglishName: 'TABLE1',
				columnEnglishName: 'COLUMN1',
				columnKoreanName: '컬럼1',
				relatedEntityName: '엔터티1',
				domainName: '사용자명',
				dataType: 'VARCHAR',
				notNullFlag: 'Y',
				personalInfoFlag: 'N',
				encryptionFlag: 'N',
				publicFlag: 'Y'
			};

			const event = createMockRequestEvent({
				method: 'PUT',
				body: nonExistentEntry
			});

			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(404);
			expect(result.success).toBe(false);
			expect(result.error).toContain('찾을 수 없습니다');
		});

		it('should use specified filename parameter', async () => {
			const updatedEntry: Partial<ColumnEntry> = {
				id: 'entry-1',
				scopeFlag: 'Y',
				subjectArea: '주제영역1',
				schemaName: '스키마1',
				tableEnglishName: 'TABLE1',
				columnEnglishName: 'COLUMN1',
				columnKoreanName: '컬럼1',
				relatedEntityName: '엔터티1',
				domainName: '사용자명',
				dataType: 'VARCHAR',
				notNullFlag: 'Y',
				personalInfoFlag: 'N',
				encryptionFlag: 'N',
				publicFlag: 'Y',
				columnDescription: '수정된 설명'
			};

			const event = createMockRequestEvent({
				method: 'PUT',
				body: updatedEntry,
				searchParams: { filename: 'custom-column.json' }
			});

			await PUT(event);

			expect(loadColumnData).toHaveBeenCalledWith('custom-column.json');
			expect(saveColumnData).toHaveBeenCalledWith(expect.any(Object), 'custom-column.json');
		});
	});

	describe('DELETE', () => {
		it('should delete an existing entry successfully', async () => {
			const event = createMockRequestEvent({
				searchParams: { id: 'entry-1' }
			});

			const response = await DELETE(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.message).toContain('삭제');
			expect(saveColumnData).toHaveBeenCalled();
		});

		it('should return 400 when id is missing', async () => {
			const event = createMockRequestEvent({
				searchParams: {}
			});

			const response = await DELETE(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('ID');
		});

		it('should return 404 when entry not found', async () => {
			const event = createMockRequestEvent({
				searchParams: { id: 'non-existent-id' }
			});

			const response = await DELETE(event);
			const result = await response.json();

			expect(response.status).toBe(404);
			expect(result.success).toBe(false);
			expect(result.error).toContain('찾을 수 없습니다');
		});

		it('should use specified filename parameter', async () => {
			const event = createMockRequestEvent({
				searchParams: { id: 'entry-1', filename: 'custom-column.json' }
			});

			await DELETE(event);

			expect(loadColumnData).toHaveBeenCalledWith('custom-column.json');
			expect(saveColumnData).toHaveBeenCalledWith(expect.any(Object), 'custom-column.json');
		});
	});
});

