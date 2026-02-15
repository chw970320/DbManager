import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { VocabularyData } from '$lib/types/vocabulary';
import type { DomainData } from '$lib/types/domain';

vi.mock('$lib/registry/data-registry', () => ({
	loadData: vi.fn(),
	saveData: vi.fn()
}));

vi.mock('$lib/registry/cache-registry', () => ({
	invalidateDataCache: vi.fn()
}));

vi.mock('$lib/registry/mapping-registry', () => ({
	resolveRelatedFilenames: vi.fn()
}));

import { loadData, saveData } from '$lib/registry/data-registry';
import { invalidateDataCache } from '$lib/registry/cache-registry';
import { resolveRelatedFilenames } from '$lib/registry/mapping-registry';

const createMockVocabularyData = (): VocabularyData => ({
	entries: [
		{
			id: 'entry-1',
			standardName: '고객',
			abbreviation: 'CUST',
			englishName: 'Customer',
			description: '고객 정보',
			domainCategory: '금융',
			isFormalWord: true,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'entry-2',
			standardName: '계좌',
			abbreviation: 'ACCT',
			englishName: 'Account',
			description: '계좌 정보',
			domainCategory: '은행',
			isFormalWord: true,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'entry-3',
			standardName: '사용자',
			abbreviation: 'USER',
			englishName: 'User',
			description: '사용자',
			isFormalWord: false,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 3,
	mapping: { domain: 'domain.json' }
});

const createMockDomainData = (): DomainData => ({
	entries: [
		{
			id: 'domain-1',
			domainGroup: 'FIN',
			domainCategory: '금융',
			standardDomainName: '금융도메인',
			physicalDataType: 'VARCHAR',
			description: '금융 관련',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'domain-2',
			domainGroup: 'BNK',
			domainCategory: '은행',
			standardDomainName: '은행도메인',
			physicalDataType: 'VARCHAR',
			description: '은행 관련',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 2
});

function createMockRequestEvent(body: unknown): RequestEvent {
	const request = {
		json: vi.fn().mockResolvedValue(body),
		method: 'POST'
	} as unknown as Request;

	return {
		request,
		url: new URL('http://localhost/api/vocabulary/sync-domain')
	} as RequestEvent;
}

describe('Vocabulary Sync-Domain API: /api/vocabulary/sync-domain', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(resolveRelatedFilenames).mockResolvedValue(new Map([['domain', 'domain.json']]));
		vi.mocked(saveData).mockResolvedValue(undefined);
		vi.mocked(loadData).mockImplementation(async (type: string) => {
			if (type === 'vocabulary') return createMockVocabularyData();
			if (type === 'domain') return createMockDomainData();
			throw new Error('unsupported');
		});
	});

	it('should sync domain mapping successfully', async () => {
		const event = createMockRequestEvent({});
		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.applied).toBe(true);
		expect(result.data.mode).toBe('apply');
		expect(result.data.matched).toBe(2);
		expect(result.data.unmatched).toBe(1);
		expect(result.data.total).toBe(3);
		expect(saveData).toHaveBeenCalled();
		expect(invalidateDataCache).toHaveBeenCalledWith('vocabulary', 'vocabulary.json');
	});

	it('should return preview without saving when apply is false', async () => {
		const event = createMockRequestEvent({
			apply: false
		});
		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.applied).toBe(false);
		expect(result.data.mode).toBe('preview');
		expect(Array.isArray(result.data.changes)).toBe(true);
		expect(result.data.changes[0]).toMatchObject({
			owner: 'vocabulary/sync-domain'
		});
		expect(typeof result.data.changes[0].reason).toBe('string');
		expect(result.data.changes[0]).toHaveProperty('before');
		expect(result.data.changes[0]).toHaveProperty('after');
		expect(saveData).not.toHaveBeenCalled();
		expect(invalidateDataCache).not.toHaveBeenCalled();
	});

	it('should use specified vocabulary and domain filenames', async () => {
		const event = createMockRequestEvent({
			vocabularyFilename: 'custom-vocab.json',
			domainFilename: 'custom-domain.json'
		});
		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(loadData).toHaveBeenCalledWith('vocabulary', 'custom-vocab.json');
		expect(loadData).toHaveBeenCalledWith('domain', 'custom-domain.json');
		expect(result.data.vocabularyFilename).toBe('custom-vocab.json');
		expect(result.data.domainFilename).toBe('custom-domain.json');
	});

	it('should use resolved domain mapping when domainFilename not specified', async () => {
		vi.mocked(resolveRelatedFilenames).mockResolvedValue(new Map([['domain', 'mapped-domain.json']]));

		const event = createMockRequestEvent({ vocabularyFilename: 'vocabulary.json' });
		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(loadData).toHaveBeenCalledWith('domain', 'mapped-domain.json');
		expect(result.data.domainFilename).toBe('mapped-domain.json');
	});

	it('should return updated count correctly', async () => {
		const vocabData = createMockVocabularyData();
		vocabData.entries[0].domainGroup = 'FIN';
		vocabData.entries[0].isDomainCategoryMapped = true;

		vi.mocked(loadData).mockImplementation(async (type: string) => {
			if (type === 'vocabulary') return vocabData;
			if (type === 'domain') return createMockDomainData();
			throw new Error('unsupported');
		});

		const event = createMockRequestEvent({});
		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.data.updated).toBe(1);
		expect(result.data.matched).toBe(2);
	});

	it('should handle entries without domainCategory as unmatched', async () => {
		const vocabData = createMockVocabularyData();
		vocabData.entries.forEach((entry) => {
			delete entry.domainCategory;
		});

		vi.mocked(loadData).mockImplementation(async (type: string) => {
			if (type === 'vocabulary') return vocabData;
			if (type === 'domain') return createMockDomainData();
			throw new Error('unsupported');
		});

		const event = createMockRequestEvent({});
		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.data.matched).toBe(0);
		expect(result.data.unmatched).toBe(3);
	});

	it('should return 500 on vocabulary load error', async () => {
		vi.mocked(loadData).mockImplementation(async (type: string) => {
			if (type === 'vocabulary') throw new Error('파일을 찾을 수 없습니다');
			if (type === 'domain') return createMockDomainData();
			throw new Error('unsupported');
		});

		const event = createMockRequestEvent({});
		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
		expect(result.error).toContain('동기화');
	});

	it('should return 500 on domain load error', async () => {
		vi.mocked(loadData).mockImplementation(async (type: string) => {
			if (type === 'vocabulary') return createMockVocabularyData();
			if (type === 'domain') throw new Error('도메인 파일을 찾을 수 없습니다');
			throw new Error('unsupported');
		});

		const event = createMockRequestEvent({});
		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
	});

	it('should return 500 on save error', async () => {
		vi.mocked(saveData).mockRejectedValue(new Error('저장 실패'));

		const event = createMockRequestEvent({});
		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
	});
});
