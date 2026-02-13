import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	vocabularyCache,
	domainCache,
	termCache,
	getCachedVocabularyData,
	getCachedDomainData,
	getCachedTermData,
	invalidateAllCaches,
	invalidateCache
} from './cache';
import type { VocabularyData } from '$lib/types/vocabulary';
import type { DomainData } from '$lib/types/domain';
import type { TermData } from '$lib/types/term';

// Mock file-handler (하위 호환성)
vi.mock('./file-handler', () => ({
	loadVocabularyData: vi.fn(),
	loadDomainData: vi.fn(),
	loadTermData: vi.fn()
}));

// Mock data-registry (cache-registry가 내부적으로 사용)
vi.mock('$lib/registry/data-registry', () => ({
	loadData: vi.fn()
}));

import { loadVocabularyData, loadDomainData, loadTermData } from './file-handler';
import { loadData } from '$lib/registry/data-registry';

// cache-registry의 통합 캐시도 리셋
import { invalidateAllDataCaches } from '$lib/registry/cache-registry';

describe('cache', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vocabularyCache.clear();
		domainCache.clear();
		termCache.clear();
		invalidateAllDataCaches();
	});

	describe('vocabularyCache', () => {
		it('should set and get cache', () => {
			const data: VocabularyData = {
				entries: [],
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 0
			};

			vocabularyCache.set('vocabulary', 'test.json', data);
			const result = vocabularyCache.get('vocabulary', 'test.json');

			expect(result).toEqual(data);
		});

		it('should return undefined for non-existent cache', () => {
			const result = vocabularyCache.get('vocabulary', 'nonexistent.json');
			expect(result).toBeUndefined();
		});

		it('should invalidate specific cache', () => {
			const data: VocabularyData = {
				entries: [],
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 0
			};

			vocabularyCache.set('vocabulary', 'test.json', data);
			vocabularyCache.invalidate('vocabulary', 'test.json');
			const result = vocabularyCache.get('vocabulary', 'test.json');

			expect(result).toBeUndefined();
		});

		it('should invalidate all caches of a type', () => {
			const data1: VocabularyData = {
				entries: [],
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 0
			};
			const data2: VocabularyData = {
				entries: [],
				lastUpdated: '2024-01-02T00:00:00.000Z',
				totalCount: 0
			};

			vocabularyCache.set('vocabulary', 'file1.json', data1);
			vocabularyCache.set('vocabulary', 'file2.json', data2);
			vocabularyCache.invalidate('vocabulary');

			expect(vocabularyCache.get('vocabulary', 'file1.json')).toBeUndefined();
			expect(vocabularyCache.get('vocabulary', 'file2.json')).toBeUndefined();
		});

		it('should clear all caches', () => {
			const data: VocabularyData = {
				entries: [],
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 0
			};

			vocabularyCache.set('vocabulary', 'test.json', data);
			vocabularyCache.clear();

			expect(vocabularyCache.get('vocabulary', 'test.json')).toBeUndefined();
		});
	});

	describe('getCachedVocabularyData', () => {
		it('should load and cache data via data-registry', async () => {
			const data: VocabularyData = {
				entries: [],
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 0
			};

			vi.mocked(loadData).mockResolvedValue(data);

			const result = await getCachedVocabularyData('vocabulary.json');

			expect(result).toEqual(data);
			expect(loadData).toHaveBeenCalledWith('vocabulary', 'vocabulary.json');
		});

		it('should return cached data on second call without reloading', async () => {
			const data: VocabularyData = {
				entries: [],
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 0
			};

			vi.mocked(loadData).mockResolvedValue(data);

			// 첫 번째 호출 - 로드
			await getCachedVocabularyData('vocabulary.json');
			// 두 번째 호출 - 캐시에서
			const result = await getCachedVocabularyData('vocabulary.json');

			expect(result).toEqual(data);
			// loadData는 한 번만 호출되어야 함
			expect(loadData).toHaveBeenCalledTimes(1);
		});
	});

	describe('getCachedDomainData', () => {
		it('should load and cache data via data-registry', async () => {
			const data: DomainData = {
				entries: [],
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 0
			};

			vi.mocked(loadData).mockResolvedValue(data);

			const result = await getCachedDomainData('domain.json');

			expect(result).toEqual(data);
			expect(loadData).toHaveBeenCalledWith('domain', 'domain.json');
		});
	});

	describe('getCachedTermData', () => {
		it('should load and cache data via data-registry', async () => {
			const data: TermData = {
				entries: [],
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 0
			};

			vi.mocked(loadData).mockResolvedValue(data);

			const result = await getCachedTermData('term.json');

			expect(result).toEqual(data);
			expect(loadData).toHaveBeenCalledWith('term', 'term.json');
		});
	});

	describe('invalidateAllCaches', () => {
		it('should clear all caches', () => {
			const vocabData: VocabularyData = {
				entries: [],
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 0
			};
			const domainData: DomainData = {
				entries: [],
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 0
			};
			const termData: TermData = {
				entries: [],
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 0
			};

			vocabularyCache.set('vocabulary', 'vocab.json', vocabData);
			domainCache.set('domain', 'domain.json', domainData);
			termCache.set('term', 'term.json', termData);

			invalidateAllCaches();

			expect(vocabularyCache.get('vocabulary', 'vocab.json')).toBeUndefined();
			expect(domainCache.get('domain', 'domain.json')).toBeUndefined();
			expect(termCache.get('term', 'term.json')).toBeUndefined();
		});
	});

	describe('invalidateCache', () => {
		it('should invalidate specific type cache', () => {
			const vocabData: VocabularyData = {
				entries: [],
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 0
			};

			vocabularyCache.set('vocabulary', 'vocab.json', vocabData);
			invalidateCache('vocabulary', 'vocab.json');

			expect(vocabularyCache.get('vocabulary', 'vocab.json')).toBeUndefined();
		});
	});
});
