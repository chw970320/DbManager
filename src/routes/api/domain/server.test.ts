import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { DomainData, DomainEntry } from '$lib/types/domain';

// Mock 모듈들
vi.mock('$lib/utils/file-handler.js', () => ({
	loadDomainData: vi.fn(),
	saveDomainData: vi.fn(),
	listDomainFiles: vi.fn()
}));

vi.mock('$lib/registry/mapping-registry', () => ({
	checkEntryReferences: vi.fn()
}));

vi.mock('$lib/utils/cache.js', () => ({
	invalidateCache: vi.fn()
}));

vi.mock('$lib/utils/validation.js', () => ({
	generateStandardDomainName: vi.fn((category, type, length, decimal) => {
		return `${category}_${type}${length ? `(${length})` : ''}${decimal ? `.${decimal}` : ''}`;
	}),
	validateDomainNameUniqueness: vi.fn(() => null)
}));

vi.mock('uuid', () => ({
	v4: vi.fn(() => 'test-uuid-1234')
}));

// Mock import
import {
	loadDomainData,
	saveDomainData,
	listDomainFiles
} from '$lib/utils/file-handler.js';
import { checkEntryReferences } from '$lib/registry/mapping-registry';
import { generateStandardDomainName, validateDomainNameUniqueness } from '$lib/utils/validation.js';

// 테스트용 Mock 데이터
const createMockDomainData = (): DomainData => ({
	entries: [
		{
			id: 'entry-1',
			domainGroup: '공통표준도메인그룹',
			domainCategory: '사용자분류',
			standardDomainName: '사용자분류_VARCHAR(50)',
			physicalDataType: 'VARCHAR',
			dataLength: '50',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'entry-2',
			domainGroup: '공통표준도메인그룹',
			domainCategory: '상태분류',
			standardDomainName: '상태분류_INT',
			physicalDataType: 'INT',
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
	const url = new URL('http://localhost/api/domain');

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
		route: { id: '/api/domain' },
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

describe('Domain API: /api/domain', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadDomainData).mockResolvedValue(createMockDomainData());
		vi.mocked(saveDomainData).mockResolvedValue(undefined);
		vi.mocked(listDomainFiles).mockResolvedValue(['domain.json']);
		vi.mocked(checkEntryReferences).mockResolvedValue({ canDelete: true, references: [] });
		vi.mocked(validateDomainNameUniqueness).mockReturnValue(null);
	});

	describe('GET', () => {
		it('should return domain data successfully', async () => {
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
			vi.mocked(loadDomainData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

			const event = createMockRequestEvent({});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
		});

		it('should use specified filename parameter', async () => {
			const event = createMockRequestEvent({
				searchParams: { filename: 'custom-domain.json' }
			});

			await GET(event);

			expect(loadDomainData).toHaveBeenCalledWith('custom-domain.json');
		});

		it('should use default filename when not specified', async () => {
			const event = createMockRequestEvent({});

			await GET(event);

			expect(loadDomainData).toHaveBeenCalledWith('domain.json');
		});
	});

	describe('POST', () => {
		it('should create a new domain entry successfully', async () => {
			const newEntry = {
				domainGroup: '공통표준도메인그룹',
				domainCategory: '테스트분류',
				physicalDataType: 'VARCHAR',
				dataLength: '100'
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
			expect(result.data.domainGroup).toBe('공통표준도메인그룹');
			expect(result.data.domainCategory).toBe('테스트분류');
			expect(result.data).toHaveProperty('createdAt');
			expect(result.data).toHaveProperty('updatedAt');
			expect(saveDomainData).toHaveBeenCalled();
		});

		it('should return 400 when required fields are missing', async () => {
			const invalidEntry = {
				domainGroup: '공통표준도메인그룹'
				// domainCategory, physicalDataType 누락
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

		it('should return 409 when standardDomainName is duplicate', async () => {
			vi.mocked(validateDomainNameUniqueness).mockReturnValue('이미 존재하는 도메인명입니다.');

			const duplicateEntry = {
				domainGroup: '공통표준도메인그룹',
				domainCategory: '사용자분류',
				physicalDataType: 'VARCHAR',
				dataLength: '50'
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: duplicateEntry
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(409);
			expect(result.success).toBe(false);
			expect(result.error).toContain('이미 존재하는 도메인명');
		});

		it('should use specified filename parameter', async () => {
			const newEntry = {
				domainGroup: '공통표준도메인그룹',
				domainCategory: '테스트분류',
				physicalDataType: 'VARCHAR'
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: newEntry,
				searchParams: { filename: 'custom-domain.json' }
			});

			await POST(event);

			expect(loadDomainData).toHaveBeenCalledWith('custom-domain.json');
			expect(saveDomainData).toHaveBeenCalledWith(expect.any(Object), 'custom-domain.json');
		});
	});

	describe('PUT', () => {
		it('should update an existing entry successfully', async () => {
			const updatedEntry: Partial<DomainEntry> = {
				id: 'entry-1',
				domainGroup: '공통표준도메인그룹',
				domainCategory: '사용자분류',
				physicalDataType: 'VARCHAR',
				description: '수정된 설명'
			};

			const event = createMockRequestEvent({
				method: 'PUT',
				body: updatedEntry
			});

			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.description).toBe('수정된 설명');
			expect(saveDomainData).toHaveBeenCalled();
		});

		it('should return 400 when id is missing', async () => {
			const entryWithoutId = {
				domainGroup: '공통표준도메인그룹',
				domainCategory: '사용자분류',
				physicalDataType: 'VARCHAR'
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
				domainGroup: '공통표준도메인그룹',
				domainCategory: '없는분류',
				physicalDataType: 'VARCHAR'
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
			const updatedEntry: Partial<DomainEntry> = {
				id: 'entry-1',
				domainGroup: '공통표준도메인그룹',
				domainCategory: '사용자분류',
				physicalDataType: 'VARCHAR',
				description: '수정된 설명'
			};

			const event = createMockRequestEvent({
				method: 'PUT',
				body: updatedEntry,
				searchParams: { filename: 'custom-domain.json' }
			});

			await PUT(event);

			expect(loadDomainData).toHaveBeenCalledWith('custom-domain.json');
			expect(saveDomainData).toHaveBeenCalledWith(expect.any(Object), 'custom-domain.json');
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
			expect(saveDomainData).toHaveBeenCalled();
		});

		it('should include warnings when references exist and force is false', async () => {
			vi.mocked(checkEntryReferences).mockResolvedValue({
				canDelete: false,
				references: [{ type: 'term', filename: 'term.json', count: 1, entries: [] }]
			});

			const event = createMockRequestEvent({
				searchParams: { id: 'entry-1' }
			});

			const response = await DELETE(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.warnings).toHaveLength(1);
			expect(checkEntryReferences).toHaveBeenCalledWith(
				'domain',
				expect.objectContaining({ id: 'entry-1' }),
				'domain.json'
			);
		});

		it('should skip reference check when force=true', async () => {
			const event = createMockRequestEvent({
				searchParams: { id: 'entry-1', force: 'true' }
			});

			const response = await DELETE(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.warnings).toEqual([]);
			expect(checkEntryReferences).not.toHaveBeenCalled();
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
				searchParams: { id: 'entry-1', filename: 'custom-domain.json' }
			});

			await DELETE(event);

			expect(loadDomainData).toHaveBeenCalledWith('custom-domain.json');
			expect(saveDomainData).toHaveBeenCalledWith(expect.any(Object), 'custom-domain.json');
		});
	});
});
