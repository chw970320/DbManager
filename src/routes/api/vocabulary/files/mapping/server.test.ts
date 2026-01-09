import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { VocabularyData } from '$lib/types/vocabulary';

// Mock 모듈들
vi.mock('$lib/utils/file-handler', () => ({
	loadVocabularyData: vi.fn(),
	saveVocabularyData: vi.fn()
}));

import { loadVocabularyData, saveVocabularyData } from '$lib/utils/file-handler';

// 테스트용 Mock 데이터
const createMockVocabularyData = (mapping?: { domain: string }): VocabularyData => ({
	entries: [],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 0,
	mapping: mapping || { domain: 'domain.json' }
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: {
	method?: string;
	body?: unknown;
	searchParams?: Record<string, string>;
}): RequestEvent {
	const url = new URL('http://localhost/api/vocabulary/files/mapping');

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
		route: { id: '/api/vocabulary/files/mapping' },
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

describe('Vocabulary Mapping API: /api/vocabulary/files/mapping', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET', () => {
		it('should return mapping info successfully', async () => {
			const mockData = createMockVocabularyData({ domain: 'custom-domain.json' });
			vi.mocked(loadVocabularyData).mockResolvedValue(mockData);

			const event = createMockRequestEvent({});
			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.mapping.domain).toBe('custom-domain.json');
		});

		it('should use specified filename parameter', async () => {
			const mockData = createMockVocabularyData();
			vi.mocked(loadVocabularyData).mockResolvedValue(mockData);

			const event = createMockRequestEvent({
				searchParams: { filename: 'custom.json' }
			});
			await GET(event);

			expect(loadVocabularyData).toHaveBeenCalledWith('custom.json');
		});

		it('should use default filename when not specified', async () => {
			const mockData = createMockVocabularyData();
			vi.mocked(loadVocabularyData).mockResolvedValue(mockData);

			const event = createMockRequestEvent({});
			await GET(event);

			expect(loadVocabularyData).toHaveBeenCalledWith('vocabulary.json');
		});

		it('should return default mapping when not set', async () => {
			const mockData: VocabularyData = {
				entries: [],
				lastUpdated: '',
				totalCount: 0
			};
			vi.mocked(loadVocabularyData).mockResolvedValue(mockData);

			const event = createMockRequestEvent({});
			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.data.mapping.domain).toBe('domain.json');
		});

		it('should return 500 on error', async () => {
			vi.mocked(loadVocabularyData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

			const event = createMockRequestEvent({});
			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
			expect(result.error).toContain('찾을 수 없습니다');
		});
	});

	describe('PUT', () => {
		it('should save mapping info successfully', async () => {
			const mockData = createMockVocabularyData();
			vi.mocked(loadVocabularyData).mockResolvedValue(mockData);
			vi.mocked(saveVocabularyData).mockResolvedValue(undefined);

			const event = createMockRequestEvent({
				method: 'PUT',
				body: {
					filename: 'vocabulary.json',
					mapping: { domain: 'new-domain.json' }
				}
			});
			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.mapping.domain).toBe('new-domain.json');
			expect(saveVocabularyData).toHaveBeenCalled();
		});

		it('should return 400 when filename is missing', async () => {
			const event = createMockRequestEvent({
				method: 'PUT',
				body: { mapping: { domain: 'domain.json' } }
			});
			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('파일명');
		});

		it('should return 400 when mapping is missing', async () => {
			const event = createMockRequestEvent({
				method: 'PUT',
				body: { filename: 'vocabulary.json' }
			});
			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('매핑 정보');
		});

		it('should return 400 when mapping.domain is missing', async () => {
			const event = createMockRequestEvent({
				method: 'PUT',
				body: { filename: 'vocabulary.json', mapping: {} }
			});
			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('domain');
		});

		it('should return 500 on save error', async () => {
			const mockData = createMockVocabularyData();
			vi.mocked(loadVocabularyData).mockResolvedValue(mockData);
			vi.mocked(saveVocabularyData).mockRejectedValue(new Error('저장 실패'));

			const event = createMockRequestEvent({
				method: 'PUT',
				body: {
					filename: 'vocabulary.json',
					mapping: { domain: 'domain.json' }
				}
			});
			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
			expect(result.error).toContain('저장 실패');
		});
	});
});
