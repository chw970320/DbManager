import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { VocabularyData } from '$lib/types/vocabulary';
import type { DomainData } from '$lib/types/domain';

// Mock 모듈들
vi.mock('$lib/utils/file-handler.js', () => ({
	loadVocabularyData: vi.fn(),
	saveVocabularyData: vi.fn(),
	loadDomainData: vi.fn()
}));

vi.mock('$lib/utils/cache.js', () => ({
	invalidateCache: vi.fn()
}));

import { loadVocabularyData, saveVocabularyData, loadDomainData } from '$lib/utils/file-handler.js';
import { invalidateCache } from '$lib/utils/cache.js';

// 테스트용 Mock 데이터
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
			description: '금융 관련',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'domain-2',
			domainGroup: 'BNK',
			domainCategory: '은행',
			standardDomainName: '은행도메인',
			description: '은행 관련',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 2
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(body: unknown): RequestEvent {
	const request = {
		json: vi.fn().mockResolvedValue(body),
		method: 'POST'
	} as unknown as Request;

	return {
		request,
		url: new URL('http://localhost/api/vocabulary/sync-domain'),
		params: {},
		locals: {},
		platform: undefined,
		route: { id: '/api/vocabulary/sync-domain' },
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

describe('Vocabulary Sync-Domain API: /api/vocabulary/sync-domain', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('POST', () => {
		it('should sync domain mapping successfully', async () => {
			vi.mocked(loadVocabularyData).mockResolvedValue(createMockVocabularyData());
			vi.mocked(loadDomainData).mockResolvedValue(createMockDomainData());
			vi.mocked(saveVocabularyData).mockResolvedValue(undefined);

			const event = createMockRequestEvent({});
			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.matched).toBe(2); // 금융, 은행 매핑됨
			expect(result.data.unmatched).toBe(1); // domainCategory 없는 항목
			expect(result.data.total).toBe(3);
			expect(saveVocabularyData).toHaveBeenCalled();
			expect(invalidateCache).toHaveBeenCalledWith('vocabulary', 'vocabulary.json');
		});

		it('should use specified vocabulary and domain filenames', async () => {
			vi.mocked(loadVocabularyData).mockResolvedValue(createMockVocabularyData());
			vi.mocked(loadDomainData).mockResolvedValue(createMockDomainData());
			vi.mocked(saveVocabularyData).mockResolvedValue(undefined);

			const event = createMockRequestEvent({
				vocabularyFilename: 'custom-vocab.json',
				domainFilename: 'custom-domain.json'
			});
			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(loadVocabularyData).toHaveBeenCalledWith('custom-vocab.json');
			expect(loadDomainData).toHaveBeenCalledWith('custom-domain.json');
			expect(result.data.vocabularyFilename).toBe('custom-vocab.json');
			expect(result.data.domainFilename).toBe('custom-domain.json');
		});

		it('should use mapping.domain when domainFilename not specified', async () => {
			const vocabData = createMockVocabularyData();
			vocabData.mapping = { domain: 'mapped-domain.json' };
			vi.mocked(loadVocabularyData).mockResolvedValue(vocabData);
			vi.mocked(loadDomainData).mockResolvedValue(createMockDomainData());
			vi.mocked(saveVocabularyData).mockResolvedValue(undefined);

			const event = createMockRequestEvent({ vocabularyFilename: 'vocabulary.json' });
			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(loadDomainData).toHaveBeenCalledWith('mapped-domain.json');
			expect(result.data.domainFilename).toBe('mapped-domain.json');
		});

		it('should return updated count correctly', async () => {
			const vocabData = createMockVocabularyData();
			// domainGroup이 이미 올바르게 설정된 경우
			vocabData.entries[0].domainGroup = 'FIN';
			vocabData.entries[0].isDomainCategoryMapped = true;
			vi.mocked(loadVocabularyData).mockResolvedValue(vocabData);
			vi.mocked(loadDomainData).mockResolvedValue(createMockDomainData());
			vi.mocked(saveVocabularyData).mockResolvedValue(undefined);

			const event = createMockRequestEvent({});
			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			// entry-1은 이미 매핑됨 (updated 아님), entry-2는 새로 매핑 (updated)
			expect(result.data.updated).toBe(1);
			expect(result.data.matched).toBe(2);
		});

		it('should handle entries without domainCategory as unmatched', async () => {
			const vocabData = createMockVocabularyData();
			// 모든 항목에서 domainCategory 제거
			vocabData.entries.forEach((entry) => {
				delete entry.domainCategory;
			});
			vi.mocked(loadVocabularyData).mockResolvedValue(vocabData);
			vi.mocked(loadDomainData).mockResolvedValue(createMockDomainData());
			vi.mocked(saveVocabularyData).mockResolvedValue(undefined);

			const event = createMockRequestEvent({});
			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.data.matched).toBe(0);
			expect(result.data.unmatched).toBe(3);
		});

		it('should return 500 on vocabulary load error', async () => {
			vi.mocked(loadVocabularyData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

			const event = createMockRequestEvent({});
			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
			expect(result.error).toContain('동기화');
		});

		it('should return 500 on domain load error', async () => {
			vi.mocked(loadVocabularyData).mockResolvedValue(createMockVocabularyData());
			vi.mocked(loadDomainData).mockRejectedValue(new Error('도메인 파일을 찾을 수 없습니다'));

			const event = createMockRequestEvent({});
			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
		});

		it('should return 500 on save error', async () => {
			vi.mocked(loadVocabularyData).mockResolvedValue(createMockVocabularyData());
			vi.mocked(loadDomainData).mockResolvedValue(createMockDomainData());
			vi.mocked(saveVocabularyData).mockRejectedValue(new Error('저장 실패'));

			const event = createMockRequestEvent({});
			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
		});
	});
});
