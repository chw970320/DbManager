import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { ColumnData } from '$lib/types/database-design';
import type { TermData } from '$lib/types/term';
import type { DomainData } from '$lib/types/domain';

vi.mock('$lib/registry/data-registry', () => ({
	loadData: vi.fn(),
	saveData: vi.fn()
}));

vi.mock('$lib/registry/mapping-registry', () => ({
	resolveRelatedFilenames: vi.fn()
}));

import { loadData, saveData } from '$lib/registry/data-registry';
import { resolveRelatedFilenames } from '$lib/registry/mapping-registry';

const createMockColumnData = (): ColumnData => ({
	entries: [
		{
			id: 'entry-1',
			scopeFlag: 'Y',
			subjectArea: '주제영역1',
			schemaName: '스키마1',
			tableEnglishName: 'TABLE1',
			columnEnglishName: 'COLUMN1',
			columnKoreanName: '컬럼1',
			relatedEntityName: '엔터티1',
			domainName: '기존도메인1',
			dataType: 'VARCHAR',
			notNullFlag: 'Y',
			personalInfoFlag: 'N',
			encryptionFlag: 'N',
			publicFlag: 'Y',
			dataLength: '100',
			dataDecimalLength: '0',
			dataFormat: '문자',
			pkInfo: '',
			fkInfo: '',
			indexName: '',
			indexOrder: '',
			akInfo: '',
			constraint: '',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'entry-2',
			scopeFlag: 'N',
			subjectArea: '주제영역2',
			schemaName: '스키마2',
			tableEnglishName: 'TABLE2',
			columnEnglishName: 'NO_MATCH',
			columnKoreanName: '컬럼2',
			relatedEntityName: '엔터티2',
			domainName: '기존도메인2',
			dataType: 'INT',
			notNullFlag: 'N',
			personalInfoFlag: 'Y',
			encryptionFlag: 'Y',
			publicFlag: 'N',
			dataLength: '10',
			dataDecimalLength: '0',
			dataFormat: '숫자',
			pkInfo: '',
			fkInfo: '',
			indexName: '',
			indexOrder: '',
			akInfo: '',
			constraint: '',
			createdAt: '2024-01-02T00:00:00.000Z',
			updatedAt: '2024-01-02T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-02T00:00:00.000Z',
	totalCount: 2
});

const createMockTermData = (): TermData => ({
	entries: [
		{
			id: 'term-1',
			termName: '컬럼1용어',
			columnName: 'COLUMN1',
			domainName: 'USER_NAME_DOM',
			isMappedTerm: true,
			isMappedColumn: true,
			isMappedDomain: true,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 1
});

const createMockDomainData = (): DomainData => ({
	entries: [
		{
			id: 'domain-1',
			domainGroup: '공통',
			domainCategory: '사용자',
			standardDomainName: 'USER_NAME_DOM',
			physicalDataType: 'VARCHAR',
			dataLength: '200',
			decimalPlaces: '0',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 1
});

function createMockRequestEvent(options: {
	method?: string;
	body?: unknown;
	searchParams?: Record<string, string>;
}): RequestEvent {
	const url = new URL('http://localhost/api/column/sync-term');

	if (options.searchParams) {
		Object.entries(options.searchParams).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});
	}

	const request = {
		json: vi.fn().mockResolvedValue(options.body || {}),
		method: options.method || 'GET'
	} as unknown as Request;

	return { url, request } as RequestEvent;
}

describe('Column Sync-Term API: /api/column/sync-term', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(resolveRelatedFilenames).mockResolvedValue(
			new Map([
				['term', 'term.json'],
				['domain', 'domain.json']
			])
		);
		vi.mocked(saveData).mockResolvedValue(undefined);
		vi.mocked(loadData).mockImplementation(async (type: string) => {
			if (type === 'column') return createMockColumnData();
			if (type === 'term') return createMockTermData();
			if (type === 'domain') return createMockDomainData();
			throw new Error('unsupported');
		});
	});

	describe('GET', () => {
		it('should return sync status successfully', async () => {
			const event = createMockRequestEvent({});

			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data).toHaveProperty('matched');
			expect(result.data).toHaveProperty('unmatched');
			expect(result.data).toHaveProperty('matchedDomain');
			expect(result.data).toHaveProperty('unmatchedDomain');
			expect(result.data).toHaveProperty('total');
		});

		it('should use specified filename parameters', async () => {
			const event = createMockRequestEvent({
				searchParams: {
					columnFilename: 'custom-column.json',
					termFilename: 'custom-term.json',
					domainFilename: 'custom-domain.json'
				}
			});

			await GET(event);

			expect(loadData).toHaveBeenCalledWith('column', 'custom-column.json');
			expect(loadData).toHaveBeenCalledWith('term', 'custom-term.json');
			expect(loadData).toHaveBeenCalledWith('domain', 'custom-domain.json');
		});

		it('should use default filenames when not specified', async () => {
			const event = createMockRequestEvent({});

			await GET(event);

			expect(loadData).toHaveBeenCalledWith('column', 'column.json');
			expect(loadData).toHaveBeenCalledWith('term', 'term.json');
			expect(loadData).toHaveBeenCalledWith('domain', 'domain.json');
		});

		it('should return 500 on column data load error', async () => {
			vi.mocked(loadData).mockImplementation(async (type: string) => {
				if (type === 'column') throw new Error('파일을 찾을 수 없습니다');
				if (type === 'term') return createMockTermData();
				throw new Error('unsupported');
			});

			const event = createMockRequestEvent({});
			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
		});

		it('should return 500 on term data load error', async () => {
			vi.mocked(loadData).mockImplementation(async (type: string) => {
				if (type === 'column') return createMockColumnData();
				if (type === 'term') throw new Error('용어 파일을 찾을 수 없습니다');
				throw new Error('unsupported');
			});

			const event = createMockRequestEvent({});
			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
		});
	});

	describe('POST', () => {
		it('should sync terms successfully', async () => {
			const event = createMockRequestEvent({
				method: 'POST',
				body: {}
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.matched).toBe(1);
			expect(result.data.unmatched).toBe(1);
			expect(result.data.matchedDomain).toBe(1);
			expect(result.data.unmatchedDomain).toBe(0);
			expect(result.data.total).toBe(2);
		});

		it('should update columnKoreanName when term matches', async () => {
			const event = createMockRequestEvent({
				method: 'POST',
				body: {}
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.updated).toBeGreaterThan(0);
			expect(saveData).toHaveBeenCalled();
		});

		it('should use specified filename parameters', async () => {
			const event = createMockRequestEvent({
				method: 'POST',
				body: {
					columnFilename: 'custom-column.json',
					termFilename: 'custom-term.json',
					domainFilename: 'custom-domain.json'
				}
			});

			await POST(event);

			expect(loadData).toHaveBeenCalledWith('column', 'custom-column.json');
			expect(loadData).toHaveBeenCalledWith('term', 'custom-term.json');
			expect(loadData).toHaveBeenCalledWith('domain', 'custom-domain.json');
		});

		it('should return 500 on column data load error', async () => {
			vi.mocked(loadData).mockImplementation(async (type: string) => {
				if (type === 'column') throw new Error('파일을 찾을 수 없습니다');
				if (type === 'term') return createMockTermData();
				throw new Error('unsupported');
			});

			const event = createMockRequestEvent({
				method: 'POST',
				body: {}
			});
			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
			expect(result.error).toContain('컬럼 정의서 로드 실패');
		});

		it('should return 500 on term data load error', async () => {
			vi.mocked(loadData).mockImplementation(async (type: string) => {
				if (type === 'column') return createMockColumnData();
				if (type === 'term') throw new Error('용어 파일을 찾을 수 없습니다');
				throw new Error('unsupported');
			});

			const event = createMockRequestEvent({
				method: 'POST',
				body: {}
			});
			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
			expect(result.error).toContain('용어 데이터 로드 실패');
		});
	});
});
