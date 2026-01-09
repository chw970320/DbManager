import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, DELETE } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { TermData, TermEntry } from '$lib/types/term';
import type { VocabularyData } from '$lib/types/vocabulary';
import type { DomainData } from '$lib/types/domain';

// Mock 모듈들
vi.mock('$lib/utils/file-handler.js', () => ({
	loadTermData: vi.fn(),
	saveTermData: vi.fn(),
	listTermFiles: vi.fn(),
	loadVocabularyData: vi.fn(),
	loadDomainData: vi.fn()
}));

vi.mock('$lib/utils/cache.js', () => ({
	getCachedVocabularyData: vi.fn(),
	getCachedDomainData: vi.fn(),
	invalidateCache: vi.fn()
}));

vi.mock('$lib/utils/validation.js', () => ({
	validateTermNameSuffix: vi.fn(() => null),
	validateTermNameUniqueness: vi.fn(() => null)
}));

vi.mock('uuid', () => ({
	v4: vi.fn(() => 'test-uuid-1234')
}));

// Mock import
import {
	loadTermData,
	saveTermData,
	listTermFiles,
	loadVocabularyData,
	loadDomainData
} from '$lib/utils/file-handler.js';
import { getCachedVocabularyData, getCachedDomainData } from '$lib/utils/cache.js';
import { validateTermNameSuffix, validateTermNameUniqueness } from '$lib/utils/validation.js';

// 테스트용 Mock 데이터
const createMockVocabularyData = (): VocabularyData => ({
	entries: [
		{
			id: 'vocab-1',
			standardName: '사용자',
			abbreviation: 'USER',
			englishName: 'User',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'vocab-2',
			standardName: '이름',
			abbreviation: 'NAME',
			englishName: 'Name',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 2
});

const createMockDomainData = (): DomainData => ({
	entries: [
		{
			id: 'domain-1',
			domainGroup: '공통표준도메인그룹',
			domainCategory: '사용자분류',
			standardDomainName: '사용자분류_VARCHAR(50)',
			physicalDataType: 'VARCHAR',
			dataLength: '50',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 1
});

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
		},
		{
			id: 'entry-2',
			termName: '관리자_이름',
			columnName: 'ADMIN_NAME',
			domainName: '사용자분류_VARCHAR(50)',
			isMappedTerm: false,
			isMappedColumn: false,
			isMappedDomain: true,
			createdAt: '2024-01-02T00:00:00.000Z',
			updatedAt: '2024-01-02T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-02T00:00:00.000Z',
	totalCount: 2,
	mapping: {
		vocabulary: 'vocabulary.json',
		domain: 'domain.json'
	}
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: {
	method?: string;
	body?: unknown;
	searchParams?: Record<string, string>;
}): RequestEvent {
	const url = new URL('http://localhost/api/term');

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
		route: { id: '/api/term' },
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

describe('Term API: /api/term', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadTermData).mockResolvedValue(createMockTermData());
		vi.mocked(saveTermData).mockResolvedValue(undefined);
		vi.mocked(listTermFiles).mockResolvedValue(['term.json']);
		vi.mocked(getCachedVocabularyData).mockResolvedValue(createMockVocabularyData());
		vi.mocked(getCachedDomainData).mockResolvedValue(createMockDomainData());
		vi.mocked(validateTermNameSuffix).mockReturnValue(null);
		vi.mocked(validateTermNameUniqueness).mockReturnValue(null);
	});

	describe('GET', () => {
		it('should return term data successfully', async () => {
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
			if (result.data.pagination.hasNextPage !== undefined) {
				expect(result.data.pagination.hasNextPage).toBe(true);
			}
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

		it('should return 400 for invalid sort field', async () => {
			const event = createMockRequestEvent({
				searchParams: { sortBy: 'invalidField', sortOrder: 'asc' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('지원하지 않는 정렬 필드');
		});

		it('should handle data loading error gracefully', async () => {
			vi.mocked(loadTermData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

			const event = createMockRequestEvent({});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
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

	describe('POST', () => {
		it('should create a new term entry successfully (mapping success)', async () => {
			const newEntry = {
				entry: {
					termName: '사용자_이름',
					columnName: 'USER_NAME',
					domainName: '사용자분류_VARCHAR(50)'
				},
				filename: 'term.json'
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: newEntry
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.id).toBeDefined();
			expect(result.data.termName).toBe('사용자_이름');
			expect(result.data.isMappedTerm).toBe(true);
			expect(result.data.isMappedColumn).toBe(true);
			expect(result.data.isMappedDomain).toBe(true);
			expect(saveTermData).toHaveBeenCalled();
		});

		it('should create a new term entry with mapping failure', async () => {
			// 매핑 실패 케이스: 단어집에 없는 단어 사용
			const newEntry = {
				entry: {
					termName: '없는단어_이름',
					columnName: 'UNKNOWN_NAME',
					domainName: '사용자분류_VARCHAR(50)'
				},
				filename: 'term.json'
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: newEntry
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.isMappedTerm).toBe(false);
			expect(result.data.isMappedColumn).toBe(false);
			expect(result.data.isMappedDomain).toBe(true);
		});

		it('should return 400 when required fields are missing', async () => {
			const invalidEntry = {
				entry: {
					termName: '사용자_이름'
					// columnName, domainName 누락
				}
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: invalidEntry
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('필수');
		});

		it('should use specified filename parameter', async () => {
			const newEntry = {
				entry: {
					termName: '사용자_이름',
					columnName: 'USER_NAME',
					domainName: '사용자분류_VARCHAR(50)'
				},
				filename: 'custom-term.json'
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: newEntry
			});

			await POST(event);

			expect(loadTermData).toHaveBeenCalledWith('custom-term.json');
			expect(saveTermData).toHaveBeenCalledWith(expect.any(Object), 'custom-term.json');
		});
	});

	describe('PUT (via POST with id)', () => {
		it('should update an existing entry successfully', async () => {
			const updatedEntry = {
				entry: {
					id: 'entry-1',
					termName: '사용자_이름',
					columnName: 'USER_NAME',
					domainName: '사용자분류_VARCHAR(50)'
				},
				filename: 'term.json'
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: updatedEntry
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(saveTermData).toHaveBeenCalled();
		});

		it('should return 404 when entry not found', async () => {
			const nonExistentEntry = {
				entry: {
					id: 'non-existent-id',
					termName: '없는용어',
					columnName: 'NONE',
					domainName: '사용자분류_VARCHAR(50)'
				}
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: nonExistentEntry
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(404);
			expect(result.success).toBe(false);
			expect(result.error).toContain('찾을 수 없습니다');
		});

		it('should use specified filename parameter', async () => {
			const updatedEntry = {
				entry: {
					id: 'entry-1',
					termName: '사용자_이름',
					columnName: 'USER_NAME',
					domainName: '사용자분류_VARCHAR(50)'
				},
				filename: 'custom-term.json'
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: updatedEntry
			});

			await POST(event);

			expect(loadTermData).toHaveBeenCalledWith('custom-term.json');
			expect(saveTermData).toHaveBeenCalledWith(expect.any(Object), 'custom-term.json');
		});
	});

	describe('DELETE', () => {
		it('should delete an existing entry successfully', async () => {
			const event = createMockRequestEvent({
				method: 'DELETE',
				body: { id: 'entry-1', filename: 'term.json' }
			});

			const response = await DELETE(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.message).toBe('Term deleted successfully');
			expect(saveTermData).toHaveBeenCalled();
		});

		it('should return 400 when id is missing', async () => {
			const event = createMockRequestEvent({
				method: 'DELETE',
				body: { filename: 'term.json' }
			});

			const response = await DELETE(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('ID');
		});

		it('should return 404 when entry not found', async () => {
			const event = createMockRequestEvent({
				method: 'DELETE',
				body: { id: 'non-existent-id', filename: 'term.json' }
			});

			const response = await DELETE(event);
			const result = await response.json();

			expect(response.status).toBe(404);
			expect(result.success).toBe(false);
			expect(result.error).toContain('찾을 수 없습니다');
		});

		it('should use specified filename parameter', async () => {
			const event = createMockRequestEvent({
				method: 'DELETE',
				body: { id: 'entry-1', filename: 'custom-term.json' }
			});

			await DELETE(event);

			expect(loadTermData).toHaveBeenCalledWith('custom-term.json');
			expect(saveTermData).toHaveBeenCalledWith(expect.any(Object), 'custom-term.json');
		});
	});
});
