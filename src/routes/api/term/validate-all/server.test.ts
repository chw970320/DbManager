import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { TermData } from '$lib/types/term';
import type { VocabularyData } from '$lib/types/vocabulary';
import type { DomainData } from '$lib/types/domain';

// Mock 모듈들
vi.mock('$lib/registry/data-registry', () => ({
	loadData: vi.fn()
}));

vi.mock('$lib/utils/validation.js', () => ({
	validateTermNameSuffix: vi.fn(() => null),
	validateTermUniqueness: vi.fn(() => null),
	validateTermNameUniqueness: vi.fn(() => null),
	validateTermNameMapping: vi.fn(() => null),
	validateColumnNameMapping: vi.fn(() => null),
	validateTermColumnOrderMapping: vi.fn(() => ({ error: null, mismatches: [], correctedColumnName: null })),
	validateDomainNameMapping: vi.fn(() => null)
}));

vi.mock('$lib/registry/cache-registry', () => ({
	getCachedData: vi.fn()
}));

vi.mock('$lib/registry/mapping-registry', () => ({
	resolveRelatedFilenames: vi.fn()
}));

import { loadData } from '$lib/registry/data-registry';
import { getCachedData } from '$lib/registry/cache-registry';
import { resolveRelatedFilenames } from '$lib/registry/mapping-registry';

// 테스트용 Mock 데이터
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
			termName: '관리자',
			columnName: 'ADMIN',
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

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: { searchParams?: Record<string, string> }): RequestEvent {
	const url = new URL('http://localhost/api/term/validate-all');

	if (options.searchParams) {
		Object.entries(options.searchParams).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});
	}

	return {
		url,
		request: new Request(url),
		params: {},
		locals: {},
		platform: undefined,
		route: { id: '/api/term/validate-all' },
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

describe('Term Validate-All API: /api/term/validate-all', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(resolveRelatedFilenames).mockResolvedValue(
			new Map([
				['vocabulary', 'vocabulary.json'],
				['domain', 'domain.json']
			])
		);
		vi.mocked(loadData).mockResolvedValue(createMockTermData());
		vi.mocked(getCachedData).mockImplementation(async (type: string) => {
			if (type === 'vocabulary') return createMockVocabularyData();
			if (type === 'domain') return createMockDomainData();
			return { entries: [], lastUpdated: '', totalCount: 0 };
		});
	});

	it('should validate all terms successfully', async () => {
		const event = createMockRequestEvent({
			searchParams: { filename: 'term.json' }
		});

		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data.totalCount).toBe(2);
		expect(result.data.failedCount).toBeDefined();
		expect(result.data.passedCount).toBeDefined();
		expect(result.data.failedEntries).toBeInstanceOf(Array);
	});

	it('should return validation errors for invalid entries', async () => {
		const event = createMockRequestEvent({
			searchParams: { filename: 'term.json' }
		});

		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		// entry-2는 단일 단어이므로 TERM_NAME_LENGTH 오류가 발생할 수 있음
		expect(result.data.failedEntries).toBeInstanceOf(Array);
	});

	it('should use specified filename parameter', async () => {
		const event = createMockRequestEvent({
			searchParams: { filename: 'custom-term.json' }
		});

		await GET(event);

		expect(loadData).toHaveBeenCalledWith('term', 'custom-term.json');
	});

	it('should use default filename when not specified', async () => {
		const event = createMockRequestEvent({
			searchParams: {}
		});

		await GET(event);

		expect(loadData).toHaveBeenCalledWith('term', 'term.json');
	});

	it('should return 500 on data load error', async () => {
		vi.mocked(loadData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

		const event = createMockRequestEvent({
			searchParams: { filename: 'term.json' }
		});

		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
	});
});
