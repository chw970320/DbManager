import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { VocabularyData, VocabularyEntry } from '$lib/types/vocabulary';

// Mock 모듈들
vi.mock('$lib/registry/data-registry', () => ({
	loadVocabularyData: vi.fn(),
	saveVocabularyData: vi.fn(),
	listVocabularyFiles: vi.fn()
}));

vi.mock('$lib/registry/mapping-registry', () => ({
	checkEntryReferences: vi.fn()
}));

vi.mock('$lib/utils/duplicate-handler.js', () => ({
	getDuplicateDetails: vi.fn(() => new Map())
}));

vi.mock('$lib/registry/cache-registry', () => ({
	invalidateCache: vi.fn()
}));

vi.mock('$lib/registry/generator-cache', () => ({
	invalidateAllGeneratorCaches: vi.fn()
}));

vi.mock('$lib/utils/validation.js', () => ({
	validateForbiddenWordsAndSynonyms: vi.fn(() => null)
}));

vi.mock('uuid', () => ({
	v4: vi.fn(() => 'test-uuid-1234')
}));

// Mock import
import {
	loadVocabularyData,
	saveVocabularyData,
	listVocabularyFiles
} from '$lib/registry/data-registry';
import { checkEntryReferences } from '$lib/registry/mapping-registry';
import { invalidateAllGeneratorCaches } from '$lib/registry/generator-cache';
import { getDuplicateDetails } from '$lib/utils/duplicate-handler.js';

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
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'entry-2',
			standardName: '관리자',
			abbreviation: 'ADMIN',
			englishName: 'Administrator',
			description: '시스템 관리자',
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
	const url = new URL('http://localhost/api/vocabulary');

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
		route: { id: '/api/vocabulary' },
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

describe('Vocabulary API: /api/vocabulary', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadVocabularyData).mockResolvedValue(createMockVocabularyData());
		vi.mocked(saveVocabularyData).mockResolvedValue(undefined);
		vi.mocked(listVocabularyFiles).mockResolvedValue(['vocabulary.json']);
		vi.mocked(checkEntryReferences).mockResolvedValue({ canDelete: true, references: [] });
	});

	describe('GET', () => {
		it('should return vocabulary data successfully', async () => {
			const event = createMockRequestEvent({});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result).toEqual({
				success: true,
				data: {
					entries: [
						expect.objectContaining({
							id: 'entry-2',
							duplicateInfo: {
								standardName: false,
								abbreviation: false,
								englishName: false
							}
						}),
						expect.objectContaining({
							id: 'entry-1',
							duplicateInfo: {
								standardName: false,
								abbreviation: false,
								englishName: false
							}
						})
					],
					pagination: {
						currentPage: 1,
						totalPages: 1,
						totalCount: 2,
						limit: 100,
						hasNextPage: false,
						hasPrevPage: false
					},
					sorting: {
						sortConfigs: [{ column: 'updatedAt', direction: 'desc' }]
					},
					filtering: {
						filter: 'none',
						isFiltered: false
					},
					lastUpdated: '2024-01-02T00:00:00.000Z'
				},
				message: 'Vocabulary data retrieved successfully'
			});
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
			expect(result.data.pagination).toEqual({
				currentPage: 1,
				totalPages: 2,
				totalCount: 2,
				limit: 1,
				hasNextPage: true,
				hasPrevPage: false
			});
		});

		it('should return 400 for invalid pagination parameters', async () => {
			const event = createMockRequestEvent({
				searchParams: { page: '0', limit: '100' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result).toEqual({
				success: false,
				error: '잘못된 페이지네이션 파라미터입니다. (page >= 1, 1 <= limit <= 1000)',
				message: 'Invalid pagination parameters'
			});
		});

		it('should return 400 for invalid sort field', async () => {
			const event = createMockRequestEvent({
				searchParams: { sortBy: 'invalidField', sortOrder: 'asc' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result).toEqual({
				success: false,
				error:
					'지원하지 않는 정렬 필드입니다. 사용 가능: standardName, abbreviation, englishName, createdAt, updatedAt',
				message: 'Invalid sort field'
			});
		});

		it('should handle data loading error gracefully', async () => {
			vi.mocked(loadVocabularyData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

			const event = createMockRequestEvent({});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result).toEqual({
				success: false,
				error: '파일을 찾을 수 없습니다',
				message: 'Data loading failed'
			});
		});

		it('should filter duplicate details by requested duplicate field', async () => {
			vi.mocked(getDuplicateDetails).mockReturnValue(
				new Map([
					[
						'entry-1',
						{
							standardName: false,
							abbreviation: true,
							englishName: false
						}
					],
					[
						'entry-2',
						{
							standardName: true,
							abbreviation: false,
							englishName: false
						}
					]
				])
			);

			const event = createMockRequestEvent({
				searchParams: { filter: 'duplicates:abbreviation' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.data.entries).toHaveLength(1);
			expect(result.data.entries[0]).toEqual(
				expect.objectContaining({
					id: 'entry-1',
					duplicateInfo: {
						standardName: false,
						abbreviation: true,
						englishName: false
					}
				})
			);
			expect(result.data.filtering).toEqual({
				filter: 'duplicates:abbreviation',
				isFiltered: false
			});
		});

		it('should keep unmappedDomain filtering limited to formal words', async () => {
			const data = createMockVocabularyData();
			data.entries = [
				{
					...data.entries[0],
					isFormalWord: true,
					domainGroup: undefined,
					isDomainCategoryMapped: false
				},
				{
					...data.entries[1],
					isFormalWord: false,
					domainGroup: undefined,
					isDomainCategoryMapped: false
				}
			];
			vi.mocked(loadVocabularyData).mockResolvedValue(data);

			const event = createMockRequestEvent({
				searchParams: { unmappedDomain: 'true' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.data.entries).toHaveLength(1);
			expect(result.data.entries[0].id).toBe('entry-1');
			expect(result.data.pagination).toEqual({
				currentPage: 1,
				totalPages: 1,
				totalCount: 1,
				limit: 100,
				hasNextPage: false,
				hasPrevPage: false
			});
		});

		it('should use specified filename parameter', async () => {
			const event = createMockRequestEvent({
				searchParams: { filename: 'custom-vocabulary.json' }
			});

			await GET(event);

			expect(loadVocabularyData).toHaveBeenCalledWith('custom-vocabulary.json');
		});

		it('should use default filename when not specified', async () => {
			const event = createMockRequestEvent({});

			await GET(event);

			expect(loadVocabularyData).toHaveBeenCalledWith(undefined);
		});
	});

	describe('POST', () => {
		it('should create a new vocabulary entry successfully', async () => {
			const newEntry = {
				standardName: '테스트',
				abbreviation: 'TEST',
				englishName: 'Test',
				description: '테스트 단어'
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
			expect(result.data.standardName).toBe('테스트');
			expect(result.data.abbreviation).toBe('TEST');
			expect(result.data).toHaveProperty('createdAt');
			expect(result.data).toHaveProperty('updatedAt');
			expect(saveVocabularyData).toHaveBeenCalled();
			expect(invalidateAllGeneratorCaches).toHaveBeenCalledTimes(1);
		});

		it('should return 400 when required fields are missing', async () => {
			const invalidEntry = {
				standardName: '테스트'
				// abbreviation, englishName 누락
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: invalidEntry
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('필수 항목');
		});

		it('should return 409 when abbreviation is duplicate', async () => {
			const duplicateEntry = {
				standardName: '다른사용자',
				abbreviation: 'USER', // 이미 존재하는 영문약어
				englishName: 'Another User'
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: duplicateEntry
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(409);
			expect(result.success).toBe(false);
			expect(result.error).toContain('영문약어');
		});

		it('should use specified filename parameter', async () => {
			const newEntry = {
				standardName: '테스트',
				abbreviation: 'TEST',
				englishName: 'Test'
			};

			const event = createMockRequestEvent({
				method: 'POST',
				body: newEntry,
				searchParams: { filename: 'custom-vocabulary.json' }
			});

			await POST(event);

			expect(loadVocabularyData).toHaveBeenCalledWith('custom-vocabulary.json');
			expect(saveVocabularyData).toHaveBeenCalledWith(expect.any(Object), 'custom-vocabulary.json');
		});
	});

	describe('PUT', () => {
		it('should update an existing entry successfully', async () => {
			const updatedEntry: Partial<VocabularyEntry> = {
				id: 'entry-1',
				standardName: '사용자',
				abbreviation: 'USER',
				englishName: 'User',
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
			expect(saveVocabularyData).toHaveBeenCalled();
			expect(invalidateAllGeneratorCaches).toHaveBeenCalledTimes(1);
		});

		it('should return 400 when id is missing', async () => {
			const entryWithoutId = {
				standardName: '사용자',
				abbreviation: 'USER',
				englishName: 'User'
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
				standardName: '없는단어',
				abbreviation: 'NONE',
				englishName: 'None'
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
			const updatedEntry: Partial<VocabularyEntry> = {
				id: 'entry-1',
				standardName: '사용자',
				abbreviation: 'USER',
				englishName: 'User',
				description: '수정된 설명'
			};

			const event = createMockRequestEvent({
				method: 'PUT',
				body: updatedEntry,
				searchParams: { filename: 'custom-vocabulary.json' }
			});

			await PUT(event);

			expect(loadVocabularyData).toHaveBeenCalledWith('custom-vocabulary.json');
			expect(saveVocabularyData).toHaveBeenCalledWith(expect.any(Object), 'custom-vocabulary.json');
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
			expect(saveVocabularyData).toHaveBeenCalled();
			expect(invalidateAllGeneratorCaches).toHaveBeenCalledTimes(1);
		});

		it('should include warnings when references exist and force is false', async () => {
			vi.mocked(checkEntryReferences).mockResolvedValue({
				canDelete: false,
				references: [{ type: 'term', filename: 'term.json', count: 2, entries: [] }]
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
				'vocabulary',
				expect.objectContaining({ id: 'entry-1' }),
				undefined
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
				searchParams: { id: 'entry-1', filename: 'custom-vocabulary.json' }
			});

			await DELETE(event);

			expect(loadVocabularyData).toHaveBeenCalledWith('custom-vocabulary.json');
			expect(saveVocabularyData).toHaveBeenCalledWith(expect.any(Object), 'custom-vocabulary.json');
		});
	});
});
