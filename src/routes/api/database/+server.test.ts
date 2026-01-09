import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { DatabaseData, DatabaseEntry } from '$lib/types/database-design';

// Mock 모듈들
vi.mock('$lib/utils/database-design-handler.js', () => ({
	loadDatabaseData: vi.fn(),
	saveDatabaseData: vi.fn(),
	listDatabaseFiles: vi.fn()
}));

vi.mock('uuid', () => ({
	v4: vi.fn(() => 'test-uuid-1234')
}));

// Mock import
import { loadDatabaseData, saveDatabaseData } from '$lib/utils/database-design-handler.js';

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
	const url = new URL('http://localhost/api/database');

	if (options.searchParams) {
		Object.entries(options.searchParams).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});
	}

	const request = {
		json: vi.fn().mockResolvedValue(options.body || {}),
		method: options.method || 'GET',
		headers: {
			get: vi.fn()
		}
	} as unknown as Request;

	return {
		url,
		request,
		params: {},
		locals: {},
		platform: undefined,
		route: { id: '/api/database' },
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

describe('Database API: /api/database', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadDatabaseData).mockResolvedValue(createMockDatabaseData());
		vi.mocked(saveDatabaseData).mockResolvedValue();
	});

	describe('GET - 목록 조회', () => {
		it('기본 목록 조회 성공', async () => {
			const event = createMockRequestEvent({
				method: 'GET',
				searchParams: {}
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.entries).toHaveLength(2);
			expect(result.data.pagination.totalCount).toBe(2);
			expect(loadDatabaseData).toHaveBeenCalledWith('database.json');
		});

		it('filename 파라미터로 특정 파일 조회', async () => {
			const event = createMockRequestEvent({
				method: 'GET',
				searchParams: { filename: 'custom-database.json' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(loadDatabaseData).toHaveBeenCalledWith('custom-database.json');
		});

		it('페이지네이션 적용', async () => {
			const event = createMockRequestEvent({
				method: 'GET',
				searchParams: { page: '1', limit: '1' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.data.entries).toHaveLength(1);
			expect(result.data.pagination.currentPage).toBe(1);
			expect(result.data.pagination.limit).toBe(1);
			expect(result.data.pagination.totalPages).toBe(2);
		});

		it('검색 필터 적용', async () => {
			const event = createMockRequestEvent({
				method: 'GET',
				searchParams: { q: '기관1', field: 'organizationName' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.entries.length).toBeGreaterThan(0);
		});

		it('정렬 적용', async () => {
			const event = createMockRequestEvent({
				method: 'GET',
				searchParams: { sortBy: 'organizationName', sortOrder: 'asc' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
		});

		it('잘못된 페이지네이션 파라미터 처리', async () => {
			const event = createMockRequestEvent({
				method: 'GET',
				searchParams: { page: '0', limit: '200' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
		});

		it('데이터 로드 실패 처리', async () => {
			vi.mocked(loadDatabaseData).mockRejectedValue(new Error('파일 읽기 실패'));

			const event = createMockRequestEvent({
				method: 'GET',
				searchParams: {}
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
		});
	});

	describe('POST - 데이터베이스 생성', () => {
		it('정상 생성 성공', async () => {
			const newEntry = {
				organizationName: '기관3',
				departmentName: '부서3',
				appliedTask: '업무3',
				logicalDbName: '논리DB3',
				physicalDbName: '물리DB3',
				dbmsInfo: 'Oracle'
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: newEntry,
				searchParams: {}
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(201);
			expect(result.success).toBe(true);
			expect(result.data.id).toBe('test-uuid-1234');
			expect(saveDatabaseData).toHaveBeenCalled();
			expect(loadDatabaseData).toHaveBeenCalledWith('database.json');
		});

		it('filename 파라미터로 특정 파일에 저장', async () => {
			const newEntry = {
				organizationName: '기관3',
				departmentName: '부서3',
				appliedTask: '업무3',
				logicalDbName: '논리DB3',
				physicalDbName: '물리DB3',
				dbmsInfo: 'Oracle'
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: newEntry,
				searchParams: { filename: 'custom-database.json' }
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(201);
			expect(result.success).toBe(true);
			expect(loadDatabaseData).toHaveBeenCalledWith('custom-database.json');
			expect(saveDatabaseData).toHaveBeenCalledWith(
				expect.objectContaining({
					entries: expect.arrayContaining([
						expect.objectContaining({
							organizationName: '기관3'
						})
					])
				}),
				'custom-database.json'
			);
		});

		it('필수 필드 누락 시 에러', async () => {
			const incompleteEntry = {
				organizationName: '기관3'
				// 필수 필드 누락
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: incompleteEntry,
				searchParams: {}
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('필수 필드가 누락되었습니다');
		});

		it('빈 파일에 첫 엔트리 추가', async () => {
			vi.mocked(loadDatabaseData).mockRejectedValue(new Error('파일 없음'));

			const newEntry = {
				organizationName: '기관3',
				departmentName: '부서3',
				appliedTask: '업무3',
				logicalDbName: '논리DB3',
				physicalDbName: '물리DB3',
				dbmsInfo: 'Oracle'
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: newEntry,
				searchParams: {}
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(201);
			expect(result.success).toBe(true);
		});
	});

	describe('PUT - 데이터베이스 수정', () => {
		it('정상 수정 성공', async () => {
			const updateData = {
				id: 'entry-1',
				organizationName: '기관1-수정',
				departmentName: '부서1',
				appliedTask: '업무1',
				logicalDbName: '논리DB1',
				physicalDbName: '물리DB1',
				dbmsInfo: 'MySQL'
			};

			const event = createMockRequestEvent({
				method: 'PUT',
				body: updateData,
				searchParams: {}
			});

			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(saveDatabaseData).toHaveBeenCalled();
			expect(loadDatabaseData).toHaveBeenCalledWith('database.json');
		});

		it('filename 파라미터로 특정 파일에서 수정', async () => {
			const updateData = {
				id: 'entry-1',
				organizationName: '기관1-수정',
				departmentName: '부서1',
				appliedTask: '업무1',
				logicalDbName: '논리DB1',
				physicalDbName: '물리DB1',
				dbmsInfo: 'MySQL'
			};

			const event = createMockRequestEvent({
				method: 'PUT',
				body: updateData,
				searchParams: { filename: 'custom-database.json' }
			});

			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(loadDatabaseData).toHaveBeenCalledWith('custom-database.json');
			expect(saveDatabaseData).toHaveBeenCalledWith(
				expect.any(Object),
				'custom-database.json'
			);
		});

		it('ID 누락 시 에러', async () => {
			const updateData = {
				organizationName: '기관1-수정'
			};

			const event = createMockRequestEvent({
				method: 'PUT',
				body: updateData,
				searchParams: {}
			});

			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('ID가 필요합니다');
		});

		it('존재하지 않는 엔트리 수정 시 에러', async () => {
			const updateData = {
				id: 'non-existent-id',
				organizationName: '기관1-수정',
				departmentName: '부서1',
				appliedTask: '업무1',
				logicalDbName: '논리DB1',
				physicalDbName: '물리DB1',
				dbmsInfo: 'MySQL'
			};

			const event = createMockRequestEvent({
				method: 'PUT',
				body: updateData,
				searchParams: {}
			});

			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(404);
			expect(result.success).toBe(false);
			expect(result.error).toContain('찾을 수 없습니다');
		});

		it('필수 필드 누락 시 에러', async () => {
			const updateData = {
				id: 'entry-1',
				organizationName: '기관1-수정'
				// 필수 필드 누락
			};

			const event = createMockRequestEvent({
				method: 'PUT',
				body: updateData,
				searchParams: {}
			});

			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('필수 필드가 누락되었습니다');
		});
	});

	describe('DELETE - 데이터베이스 삭제', () => {
		it('정상 삭제 성공', async () => {
			const event = createMockRequestEvent({
				method: 'DELETE',
				searchParams: { id: 'entry-1' }
			});

			const response = await DELETE(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(saveDatabaseData).toHaveBeenCalled();
			expect(loadDatabaseData).toHaveBeenCalledWith('database.json');
		});

		it('filename 파라미터로 특정 파일에서 삭제', async () => {
			const event = createMockRequestEvent({
				method: 'DELETE',
				searchParams: { id: 'entry-1', filename: 'custom-database.json' }
			});

			const response = await DELETE(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(loadDatabaseData).toHaveBeenCalledWith('custom-database.json');
			expect(saveDatabaseData).toHaveBeenCalledWith(
				expect.objectContaining({
					entries: expect.not.arrayContaining([
						expect.objectContaining({ id: 'entry-1' })
					])
				}),
				'custom-database.json'
			);
		});

		it('ID 누락 시 에러', async () => {
			const event = createMockRequestEvent({
				method: 'DELETE',
				searchParams: {}
			});

			const response = await DELETE(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('ID가 필요합니다');
		});

		it('존재하지 않는 엔트리 삭제 시 에러', async () => {
			const event = createMockRequestEvent({
				method: 'DELETE',
				searchParams: { id: 'non-existent-id' }
			});

			const response = await DELETE(event);
			const result = await response.json();

			expect(response.status).toBe(404);
			expect(result.success).toBe(false);
			expect(result.error).toContain('찾을 수 없습니다');
		});
	});
});
