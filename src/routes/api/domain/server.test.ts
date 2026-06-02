import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, OPTIONS, POST, PUT, DELETE } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { DomainData, DomainEntry } from '$lib/types/domain';
import type { VocabularyData } from '$lib/types/vocabulary';
import type { TermData } from '$lib/types/term';

// Mock 모듈들
vi.mock('$lib/registry/data-registry', () => ({
	loadDomainData: vi.fn(),
	saveDomainData: vi.fn(),
	listDomainFiles: vi.fn(),
	loadVocabularyData: vi.fn(),
	loadTermData: vi.fn(),
	loadData: vi.fn(),
	saveData: vi.fn()
}));

vi.mock('$lib/registry/data-registry.js', () => ({
	loadDomainData: vi.fn(),
	saveDomainData: vi.fn(),
	listDomainFiles: vi.fn(),
	loadVocabularyData: vi.fn(),
	loadTermData: vi.fn(),
	loadData: vi.fn(),
	saveData: vi.fn()
}));

vi.mock('$lib/registry/mapping-registry', () => ({
	checkEntryReferences: vi.fn(),
	resolveRelatedFilenames: vi.fn()
}));

vi.mock('$lib/registry/cache-registry', () => ({
	invalidateCache: vi.fn()
}));

vi.mock('$lib/registry/cache-registry.js', () => ({
	invalidateCache: vi.fn()
}));

vi.mock('$lib/registry/domain-data-type-mapping-registry', () => ({
	loadDomainDataTypeMappingData: vi.fn()
}));

vi.mock('$lib/utils/validation.js', () => ({
	generateStandardDomainName: vi.fn((category, type, length, decimal) => {
		return `${category}_${type}${length ? `(${length})` : ''}${decimal ? `.${decimal}` : ''}`;
	}),
	validateDomainNameUniqueness: vi.fn(() => null)
}));

vi.mock('$lib/utils/cascade-update-plan.js', () => ({
	planCascadeUpdate: vi.fn()
}));

vi.mock('$lib/utils/cascade-update-transaction.js', () => ({
	applyCascadePlan: vi.fn()
}));

vi.mock('uuid', () => ({
	v4: vi.fn(() => 'test-uuid-1234')
}));

// Mock import
import {
	loadDomainData,
	saveDomainData,
	listDomainFiles,
	loadVocabularyData,
	loadTermData,
	loadData,
	saveData
} from '$lib/registry/data-registry';
import { loadDomainDataTypeMappingData } from '$lib/registry/domain-data-type-mapping-registry';
import { checkEntryReferences, resolveRelatedFilenames } from '$lib/registry/mapping-registry';
import { planCascadeUpdate } from '$lib/utils/cascade-update-plan.js';
import { applyCascadePlan } from '$lib/utils/cascade-update-transaction.js';
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

const createMockVocabularyData = (): VocabularyData => ({
	entries: [],
	lastUpdated: '2024-01-02T00:00:00.000Z',
	totalCount: 0
});

const createMockTermData = (): TermData => ({
	entries: [],
	lastUpdated: '2024-01-02T00:00:00.000Z',
	totalCount: 0
});

const createCascadePreview = () => ({
	summary: {
		relatedChangeCount: 1
	},
	changes: [
		{
			type: 'term',
			filename: 'term.json',
			entryId: 'term-1',
			field: 'domainName',
			before: '사용자분류_VARCHAR(50)',
			after: '테스트분류_VARCHAR(100)'
		}
	],
	conflicts: [
		{
			type: 'term',
			filename: 'term.json',
			entryId: 'term-1',
			reason: 'blocked by test conflict'
		}
	]
});

const createBlockedCascadePlan = () => ({
	blocked: true,
	preview: createCascadePreview()
});

const createUnblockedCascadePlan = (sourceEntry: unknown) => ({
	blocked: false,
	sourceEntry,
	preview: {
		summary: {
			relatedChangeCount: 0
		},
		changes: [],
		conflicts: []
	}
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
		vi.mocked(loadVocabularyData).mockResolvedValue({
			entries: [],
			lastUpdated: '2024-01-02T00:00:00.000Z',
			totalCount: 0
		} as VocabularyData);
		vi.mocked(loadTermData).mockResolvedValue({
			entries: [],
			lastUpdated: '2024-01-02T00:00:00.000Z',
			totalCount: 0
		} as TermData);
		vi.mocked(loadData).mockImplementation(async (type: string) => {
			if (type === 'vocabulary') {
				return {
					entries: [],
					lastUpdated: '2024-01-02T00:00:00.000Z',
					totalCount: 0
				} as never;
			}
			if (type === 'term') {
				return {
					entries: [],
					lastUpdated: '2024-01-02T00:00:00.000Z',
					totalCount: 0
				} as never;
			}
			return createMockDomainData() as never;
		});
		vi.mocked(saveData).mockResolvedValue(undefined);
		vi.mocked(listDomainFiles).mockResolvedValue(['domain.json']);
		vi.mocked(loadDomainDataTypeMappingData).mockResolvedValue({
			entries: [
				{ id: 'map-1', dataType: 'VARCHAR', abbreviation: 'V', createdAt: '', updatedAt: '' }
			],
			lastUpdated: '2024-01-02T00:00:00.000Z',
			totalCount: 1
		});
		vi.mocked(checkEntryReferences).mockResolvedValue({ canDelete: true, references: [] });
		vi.mocked(resolveRelatedFilenames).mockResolvedValue(
			new Map([
				['vocabulary', 'vocabulary.json'],
				['term', 'term.json']
			]) as never
		);
		vi.mocked(validateDomainNameUniqueness).mockReturnValue(null);
		vi.mocked(planCascadeUpdate).mockImplementation(
			async (input) =>
				createUnblockedCascadePlan((input as { proposedEntry?: unknown }).proposedEntry) as never
		);
		vi.mocked(applyCascadePlan).mockImplementation(
			async (plan) =>
				({
					sourceEntry: (plan as { sourceEntry?: unknown }).sourceEntry,
					preview: (plan as { preview?: unknown }).preview
				}) as never
		);
	});

	describe('GET', () => {
		it('should return domain data successfully', async () => {
			const event = createMockRequestEvent({});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result).toEqual({
				success: true,
				data: {
					entries: [
						expect.objectContaining({ id: 'entry-2' }),
						expect.objectContaining({ id: 'entry-1' })
					],
					pagination: {
						currentPage: 1,
						totalPages: 1,
						totalCount: 2,
						limit: 20,
						hasNextPage: false,
						hasPrevPage: false
					},
					sorting: {
						sortConfigs: [{ column: 'updatedAt', direction: 'desc' }]
					},
					search: {
						query: '',
						field: 'all',
						isFiltered: false
					},
					lastUpdated: '2024-01-02T00:00:00.000Z'
				},
				message: 'Domain data retrieved successfully'
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
				error: '잘못된 페이지네이션 파라미터입니다. (page >= 1, 1 <= limit <= 100)',
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
					'지원하지 않는 정렬 필드입니다. 사용 가능: domainGroup, domainCategory, standardDomainName, physicalDataType, createdAt, updatedAt',
				message: 'Invalid sort field'
			});
		});

		it('should return 400 for invalid search field', async () => {
			const event = createMockRequestEvent({
				searchParams: { field: 'invalidField' }
			});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result).toEqual({
				success: false,
				error:
					'지원하지 않는 검색 필드입니다. 사용 가능: all, domainGroup, domainCategory, standardDomainName, physicalDataType',
				message: 'Invalid search field'
			});
		});

		it('should handle data loading error gracefully', async () => {
			vi.mocked(loadDomainData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

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

	describe('OPTIONS', () => {
		it('should return domain statistics without touching CRUD response shape', async () => {
			const event = createMockRequestEvent({});

			const response = await OPTIONS(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result).toEqual({
				success: true,
				data: {
					totalEntries: 2,
					lastUpdated: '2024-01-02T00:00:00.000Z',
					domainGroups: {
						공통표준도메인그룹: 2
					},
					physicalDataTypes: {
						VARCHAR: 1,
						INT: 1
					},
					summary: {
						uniqueGroups: 1,
						uniquePhysicalDataTypes: 2
					}
				},
				message: 'Domain statistics retrieved successfully'
			});
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
			expect(result.data.id).toBeDefined();
			expect(result.data.domainGroup).toBe('공통표준도메인그룹');
			expect(result.data.domainCategory).toBeDefined();
			expect(result.data).toHaveProperty('createdAt');
			expect(result.data).toHaveProperty('updatedAt');
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
		});

		it('should return 409 with preview when cascade update is blocked', async () => {
			const blockedPlan = createBlockedCascadePlan();
			vi.mocked(planCascadeUpdate).mockResolvedValue(blockedPlan as never);

			const event = createMockRequestEvent({
				method: 'POST',
				body: {
					domainGroup: '공통표준도메인그룹',
					domainCategory: '테스트분류',
					physicalDataType: 'VARCHAR',
					dataLength: '100'
				}
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(409);
			expect(result.success).toBe(false);
			expect(result.message).toBe('Cascade update blocked');
			expect(result.error).toBe(blockedPlan.preview.conflicts[0].reason);
			expect(result.data.preview).toEqual(blockedPlan.preview);
			expect(applyCascadePlan).not.toHaveBeenCalled();
			expect(saveDomainData).not.toHaveBeenCalled();
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
			expect(result.data).toBeDefined();
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
		});

		it('should return 409 with preview when cascade update is blocked', async () => {
			const blockedPlan = createBlockedCascadePlan();
			vi.mocked(planCascadeUpdate).mockResolvedValue(blockedPlan as never);

			const event = createMockRequestEvent({
				method: 'PUT',
				body: {
					id: 'entry-1',
					domainGroup: '공통표준도메인그룹',
					domainCategory: '사용자분류',
					physicalDataType: 'VARCHAR',
					description: '수정된 설명'
				}
			});

			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(409);
			expect(result.success).toBe(false);
			expect(result.message).toBe('Cascade update blocked');
			expect(result.error).toBe(blockedPlan.preview.conflicts[0].reason);
			expect(result.data.preview).toEqual(blockedPlan.preview);
			expect(applyCascadePlan).not.toHaveBeenCalled();
			expect(saveDomainData).not.toHaveBeenCalled();
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
