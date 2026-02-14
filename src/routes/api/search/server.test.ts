import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { VocabularyData, VocabularyEntry } from '$lib/types/vocabulary';

// Mock 모듈들
vi.mock('$lib/registry/data-registry', () => ({
	loadVocabularyData: vi.fn()
}));

vi.mock('$lib/utils/duplicate-handler.js', () => ({
	getDuplicateDetails: vi.fn(() => new Map())
}));

vi.mock('$lib/utils/validation.js', () => ({
	sanitizeSearchQuery: vi.fn((query: string) => query.trim() || null)
}));

import { loadVocabularyData } from '$lib/registry/data-registry';
import { getDuplicateDetails } from '$lib/utils/duplicate-handler.js';
import { sanitizeSearchQuery } from '$lib/utils/validation.js';

// 테스트용 Mock 데이터
const createMockVocabularyData = (): VocabularyData => ({
	entries: [
		{
			id: 'entry-1',
			standardName: '사용자',
			abbreviation: 'USER',
			englishName: 'User',
			description: '시스템 사용자',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
			synonyms: ['고객'],
			forbiddenWords: ['테스트']
		},
		{
			id: 'entry-2',
			standardName: '관리자',
			abbreviation: 'ADMIN',
			englishName: 'Administrator',
			description: '시스템 관리자',
			createdAt: '2024-01-02T00:00:00.000Z',
			updatedAt: '2024-01-02T00:00:00.000Z'
		},
		{
			id: 'entry-3',
			standardName: '계정',
			abbreviation: 'ACCT',
			englishName: 'Account',
			description: '사용자 계정',
			createdAt: '2024-01-03T00:00:00.000Z',
			updatedAt: '2024-01-03T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-03T00:00:00.000Z',
	totalCount: 3
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: {
	method?: string;
	body?: unknown;
	searchParams?: Record<string, string>;
}): RequestEvent {
	const url = new URL('http://localhost/api/search');

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
		route: { id: '/api/search' },
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

describe('Search API: /api/search', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadVocabularyData).mockResolvedValue(createMockVocabularyData());
		vi.mocked(getDuplicateDetails).mockReturnValue(new Map());
		vi.mocked(sanitizeSearchQuery).mockImplementation((query: string) => query.trim() || null);
	});

	describe('GET', () => {
		it('should return partial match search results', async () => {
			const event = createMockRequestEvent({
				searchParams: { q: '사용' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.entries).toHaveLength(1);
			expect(result.data.entries[0].standardName).toBe('사용자');
			expect(result.data.totalCount).toBe(1);
		});

		it('should return exact match search results when exact=true', async () => {
			const event = createMockRequestEvent({
				searchParams: { q: '사용자', exact: 'true' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.entries).toHaveLength(1);
			expect(result.data.entries[0].standardName).toBe('사용자');
		});

		it('should sort results correctly (exact match > starts with > contains)', async () => {
			const mockData: VocabularyData = {
				entries: [
					{
						id: '1',
						standardName: '사용자관리',
						abbreviation: 'USER',
						englishName: 'User',
						createdAt: '',
						updatedAt: '',
						description: ''
					},
					{
						id: '2',
						standardName: '사용자',
						abbreviation: 'USER',
						englishName: 'User',
						createdAt: '',
						updatedAt: '',
						description: ''
					},
					{
						id: '3',
						standardName: '시스템사용자',
						abbreviation: 'SYS',
						englishName: 'System',
						createdAt: '',
						updatedAt: '',
						description: ''
					}
				],
				lastUpdated: '',
				totalCount: 3
			};
			vi.mocked(loadVocabularyData).mockResolvedValue(mockData);

			const event = createMockRequestEvent({
				searchParams: { q: '사용자' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.data.entries[0].standardName).toBe('사용자'); // 정확 일치가 첫 번째
		});

		it('should return 400 when query is empty', async () => {
			vi.mocked(sanitizeSearchQuery).mockReturnValue(null);

			const event = createMockRequestEvent({
				searchParams: { q: '' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('검색어');
		});

		it('should search in synonyms when field=all', async () => {
			const event = createMockRequestEvent({
				searchParams: { q: '고객', field: 'all' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.entries).toHaveLength(1);
			expect(result.data.entries[0].standardName).toBe('사용자');
		});

		it('should search in specific field when field is specified', async () => {
			const event = createMockRequestEvent({
				searchParams: { q: 'USER', field: 'abbreviation' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.entries).toHaveLength(1);
			expect(result.data.entries[0].abbreviation).toBe('USER');
		});

		it('should apply pagination correctly', async () => {
			const event = createMockRequestEvent({
				searchParams: { q: '사', page: '1', limit: '1' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.entries).toHaveLength(1);
			expect(result.data.pagination.currentPage).toBe(1);
			expect(result.data.pagination.limit).toBe(1);
		});

		it('should return 400 for invalid field', async () => {
			const event = createMockRequestEvent({
				searchParams: { q: 'test', field: 'invalidField' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('검색 필드');
		});

		it('should return 500 on data load error', async () => {
			vi.mocked(loadVocabularyData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

			const event = createMockRequestEvent({
				searchParams: { q: 'test' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
		});

		it('should use specified filename parameter', async () => {
			const event = createMockRequestEvent({
				searchParams: { q: '사용', filename: 'custom-vocabulary.json' }
			});

			await GET(event);

			expect(loadVocabularyData).toHaveBeenCalledWith('custom-vocabulary.json');
		});

		it('should use default filename when not specified', async () => {
			const event = createMockRequestEvent({
				searchParams: { q: '사용' }
			});

			await GET(event);

			expect(loadVocabularyData).toHaveBeenCalledWith(undefined);
		});
	});

	describe('POST', () => {
		it('should return search suggestions for autocomplete', async () => {
			const event = createMockRequestEvent({
				method: 'POST',
				body: { query: '사용', limit: 10 }
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.suggestions).toBeInstanceOf(Array);
			expect(result.data.suggestions.length).toBeGreaterThan(0);
			expect(result.data.suggestions).toContain('사용자');
		});

		it('should return suggestions from synonyms', async () => {
			const event = createMockRequestEvent({
				method: 'POST',
				body: { query: '고객', limit: 10 }
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.suggestions).toContain('고객');
		});

		it('should limit suggestions to specified limit', async () => {
			const event = createMockRequestEvent({
				method: 'POST',
				body: { query: '사', limit: 2 }
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.suggestions.length).toBeLessThanOrEqual(2);
		});

		it('should return 400 when query is empty', async () => {
			vi.mocked(sanitizeSearchQuery).mockReturnValue(null);

			const event = createMockRequestEvent({
				method: 'POST',
				body: { query: '' }
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('검색어');
		});

		it('should return 400 when query is too short', async () => {
			const event = createMockRequestEvent({
				method: 'POST',
				body: { query: '' }
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
		});

		it('should return 500 on data load error', async () => {
			vi.mocked(loadVocabularyData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

			const event = createMockRequestEvent({
				method: 'POST',
				body: { query: 'test' }
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
		});

		it('should use specified filename parameter', async () => {
			const event = createMockRequestEvent({
				method: 'POST',
				body: { query: '사용', limit: 10 },
				searchParams: { filename: 'custom-vocabulary.json' }
			});

			await POST(event);

			expect(loadVocabularyData).toHaveBeenCalledWith('custom-vocabulary.json');
		});

		it('should use default filename when not specified', async () => {
			const event = createMockRequestEvent({
				method: 'POST',
				body: { query: '사용', limit: 10 }
			});

			await POST(event);

			expect(loadVocabularyData).toHaveBeenCalledWith(undefined);
		});
	});
});

