import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

// Mock 모듈들
vi.mock('$lib/utils/database-design-handler.js', () => ({
	listTableFiles: vi.fn(),
	createTableFile: vi.fn(),
	renameTableFile: vi.fn(),
	deleteTableFile: vi.fn()
}));

import {
	listTableFiles,
	createTableFile,
	renameTableFile,
	deleteTableFile
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
		url: new URL('http://localhost/api/table/files'),
		params: {},
		locals: {},
		platform: undefined,
		route: { id: '/api/table/files' },
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

describe('Table Files API: /api/table/files', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET', () => {
		it('should return file list successfully', async () => {
			const mockFiles = ['table.json', 'custom-table.json'];
			vi.mocked(listTableFiles).mockResolvedValue(mockFiles);

			const event = createMockRequestEvent({});
			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data).toEqual(mockFiles);
		});

		it('should return 500 on error', async () => {
			vi.mocked(listTableFiles).mockRejectedValue(new Error('파일 시스템 오류'));

			const event = createMockRequestEvent({});
			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
			expect(result.error).toBe('서버에서 파일 목록 조회 중 오류가 발생했습니다.');
		});
	});

	describe('POST', () => {
		it('should create a new file successfully', async () => {
			vi.mocked(createTableFile).mockResolvedValue(undefined);

			const event = createMockRequestEvent({
				method: 'POST',
				body: { filename: 'new-table.json' }
			});
			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(201);
			expect(result.success).toBe(true);
			expect(createTableFile).toHaveBeenCalledWith('new-table.json');
		});

		it('should return 400 when filename is missing', async () => {
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

		it('should return 500 when file creation fails', async () => {
			vi.mocked(createTableFile).mockRejectedValue(new Error('이미 존재하는 파일입니다'));

			const event = createMockRequestEvent({
				method: 'POST',
				body: { filename: 'existing.json' }
			});
			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
			expect(result.error).toContain('이미 존재하는 파일');
		});
	});

	describe('PUT', () => {
		it('should rename file successfully', async () => {
			vi.mocked(renameTableFile).mockResolvedValue(undefined);

			const event = createMockRequestEvent({
				method: 'PUT',
				body: { oldFilename: 'old.json', newFilename: 'new.json' }
			});
			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(renameTableFile).toHaveBeenCalledWith('old.json', 'new.json');
		});

		it('should return 400 when oldFilename is missing', async () => {
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

		it('should return 400 when newFilename is missing', async () => {
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

		it('should return 500 when rename fails', async () => {
			vi.mocked(renameTableFile).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

			const event = createMockRequestEvent({
				method: 'PUT',
				body: { oldFilename: 'not-exist.json', newFilename: 'new.json' }
			});
			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
			expect(result.error).toContain('찾을 수 없습니다');
		});
	});

	describe('DELETE', () => {
		it('should delete file successfully', async () => {
			vi.mocked(deleteTableFile).mockResolvedValue(undefined);

			const event = createMockRequestEvent({
				method: 'DELETE',
				body: { filename: 'to-delete.json' }
			});
			const response = await DELETE(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(deleteTableFile).toHaveBeenCalledWith('to-delete.json');
		});

		it('should return 400 when filename is missing', async () => {
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

		it('should return 500 when delete fails', async () => {
			vi.mocked(deleteTableFile).mockRejectedValue(new Error('삭제 권한이 없습니다'));

			const event = createMockRequestEvent({
				method: 'DELETE',
				body: { filename: 'protected.json' }
			});
			const response = await DELETE(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
			expect(result.error).toContain('삭제 권한');
		});
	});
});
