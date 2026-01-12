import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

// Mock 모듈들
vi.mock('$lib/utils/database-design-handler.js', () => ({
	listDatabaseFiles: vi.fn(),
	createDatabaseFile: vi.fn(),
	renameDatabaseFile: vi.fn(),
	deleteDatabaseFile: vi.fn()
}));

import {
	listDatabaseFiles,
	createDatabaseFile,
	renameDatabaseFile,
	deleteDatabaseFile
} from '$lib/utils/database-design-handler.js';

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: {
	method?: string;
	body?: unknown;
}): RequestEvent {
	const request = {
		json: vi.fn().mockResolvedValue(options.body || {}),
		method: options.method || 'GET'
	} as unknown as Request;

	return {
		request,
		url: new URL('http://localhost/api/database/files'),
		params: {},
		locals: {},
		platform: undefined,
		route: { id: '/api/database/files' },
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

describe('Database Files API: /api/database/files', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET', () => {
		it('파일 목록 조회 성공', async () => {
			const mockFiles = ['database.json', 'custom-database.json'];
			vi.mocked(listDatabaseFiles).mockResolvedValue(mockFiles);

			const event = createMockRequestEvent({});
			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data).toEqual(mockFiles);
		});

		it('파일 시스템 오류 처리', async () => {
			vi.mocked(listDatabaseFiles).mockRejectedValue(new Error('파일 시스템 오류'));

			const event = createMockRequestEvent({});
			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
		});
	});

	describe('POST', () => {
		it('새 파일 생성 성공', async () => {
			vi.mocked(createDatabaseFile).mockResolvedValue(undefined);

			const event = createMockRequestEvent({
				method: 'POST',
				body: { filename: 'new-database.json' }
			});
			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(201);
			expect(result.success).toBe(true);
			expect(createDatabaseFile).toHaveBeenCalledWith('new-database.json');
		});

		it('파일명 누락 시 에러', async () => {
			const event = createMockRequestEvent({
				method: 'POST',
				body: {}
			});
			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('파일명');
		});

		it('파일 생성 실패 처리', async () => {
			vi.mocked(createDatabaseFile).mockRejectedValue(new Error('이미 존재하는 파일입니다'));

			const event = createMockRequestEvent({
				method: 'POST',
				body: { filename: 'existing.json' }
			});
			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
		});
	});

	describe('PUT', () => {
		it('파일 이름 변경 성공', async () => {
			vi.mocked(renameDatabaseFile).mockResolvedValue(undefined);

			const event = createMockRequestEvent({
				method: 'PUT',
				body: { oldFilename: 'old.json', newFilename: 'new.json' }
			});
			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(renameDatabaseFile).toHaveBeenCalledWith('old.json', 'new.json');
		});

		it('기존 파일명 누락 시 에러', async () => {
			const event = createMockRequestEvent({
				method: 'PUT',
				body: { newFilename: 'new.json' }
			});
			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('파일명');
		});

		it('새 파일명 누락 시 에러', async () => {
			const event = createMockRequestEvent({
				method: 'PUT',
				body: { oldFilename: 'old.json' }
			});
			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('파일명');
		});

		it('파일 이름 변경 실패 처리', async () => {
			vi.mocked(renameDatabaseFile).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

			const event = createMockRequestEvent({
				method: 'PUT',
				body: { oldFilename: 'not-exist.json', newFilename: 'new.json' }
			});
			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
		});
	});

	describe('DELETE', () => {
		it('파일 삭제 성공', async () => {
			vi.mocked(deleteDatabaseFile).mockResolvedValue(undefined);

			const event = createMockRequestEvent({
				method: 'DELETE',
				body: { filename: 'to-delete.json' }
			});
			const response = await DELETE(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(deleteDatabaseFile).toHaveBeenCalledWith('to-delete.json');
		});

		it('파일명 누락 시 에러', async () => {
			const event = createMockRequestEvent({
				method: 'DELETE',
				body: {}
			});
			const response = await DELETE(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('파일명');
		});

		it('파일 삭제 실패 처리', async () => {
			vi.mocked(deleteDatabaseFile).mockRejectedValue(new Error('삭제 권한이 없습니다'));

			const event = createMockRequestEvent({
				method: 'DELETE',
				body: { filename: 'protected.json' }
			});
			const response = await DELETE(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
		});
	});
});
