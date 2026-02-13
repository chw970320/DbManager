/**
 * 캐시 유틸리티
 * @deprecated cache-registry의 통합 캐시를 사용하세요.
 * 하위 호환성을 위해 기존 API를 유지하며 내부적으로 cache-registry로 위임합니다.
 */

// ============================================================================
// 기존 MemoryCache 클래스 (하위 호환성 유지)
// ============================================================================

interface CacheEntry<T> {
	data: T;
	timestamp: number;
	filename: string;
}

interface CacheOptions {
	/** 캐시 만료 시간 (밀리초, 기본값: 30초) */
	ttl?: number;
	/** 최대 캐시 크기 (기본값: 10) */
	maxSize?: number;
}

const DEFAULT_TTL = 30000; // 30초
const DEFAULT_MAX_SIZE = 10;

/**
 * 제네릭 메모리 캐시 클래스
 */
class MemoryCache<T> {
	private cache: Map<string, CacheEntry<T>> = new Map();
	private ttl: number;
	private maxSize: number;

	constructor(options: CacheOptions = {}) {
		this.ttl = options.ttl ?? DEFAULT_TTL;
		this.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
	}

	private getKey(type: string, filename: string): string {
		return `${type}:${filename}`;
	}

	get(type: string, filename: string): T | undefined {
		const key = this.getKey(type, filename);
		const entry = this.cache.get(key);

		if (!entry) {
			return undefined;
		}

		if (Date.now() - entry.timestamp > this.ttl) {
			this.cache.delete(key);
			return undefined;
		}

		return entry.data;
	}

	set(type: string, filename: string, data: T): void {
		const key = this.getKey(type, filename);

		if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
			this.evictOldest();
		}

		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			filename
		});
	}

	invalidate(type: string, filename?: string): void {
		if (filename) {
			const key = this.getKey(type, filename);
			this.cache.delete(key);
		} else {
			for (const key of this.cache.keys()) {
				if (key.startsWith(`${type}:`)) {
					this.cache.delete(key);
				}
			}
		}
	}

	clear(): void {
		this.cache.clear();
	}

	private evictOldest(): void {
		let oldestKey: string | null = null;
		let oldestTime = Infinity;

		for (const [key, entry] of this.cache.entries()) {
			if (entry.timestamp < oldestTime) {
				oldestTime = entry.timestamp;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
		}
	}

	getStats(): { size: number; keys: string[] } {
		return {
			size: this.cache.size,
			keys: Array.from(this.cache.keys())
		};
	}
}

// ============================================================================
// 데이터 타입별 캐시 인스턴스 (하위 호환성)
// ============================================================================

import type { VocabularyData } from '$lib/types/vocabulary';
import type { DomainData } from '$lib/types/domain';
import type { TermData } from '$lib/types/term';

/** Vocabulary 데이터 캐시 */
export const vocabularyCache = new MemoryCache<VocabularyData>({ ttl: 30000, maxSize: 5 });

/** Domain 데이터 캐시 */
export const domainCache = new MemoryCache<DomainData>({ ttl: 30000, maxSize: 5 });

/** Term 데이터 캐시 */
export const termCache = new MemoryCache<TermData>({ ttl: 30000, maxSize: 5 });

// ============================================================================
// 캐시 연동 로드 함수 (하위 호환성 - cache-registry로 위임)
// ============================================================================

import {
	getCachedData,
	invalidateDataCache,
	invalidateAllDataCaches
} from '$lib/registry/cache-registry';

/**
 * 캐시를 사용한 Vocabulary 데이터 로드
 * @deprecated getCachedData('vocabulary', filename)를 사용하세요.
 */
export async function getCachedVocabularyData(
	filename: string = 'vocabulary.json'
): Promise<VocabularyData> {
	return getCachedData('vocabulary', filename);
}

/**
 * 캐시를 사용한 Domain 데이터 로드
 * @deprecated getCachedData('domain', filename)를 사용하세요.
 */
export async function getCachedDomainData(filename: string = 'domain.json'): Promise<DomainData> {
	return getCachedData('domain', filename);
}

/**
 * 캐시를 사용한 Term 데이터 로드
 * @deprecated getCachedData('term', filename)를 사용하세요.
 */
export async function getCachedTermData(filename: string = 'term.json'): Promise<TermData> {
	return getCachedData('term', filename);
}

/**
 * 모든 캐시 무효화
 * @deprecated invalidateAllDataCaches()를 사용하세요.
 */
export function invalidateAllCaches(): void {
	// 기존 MemoryCache도 클리어
	vocabularyCache.clear();
	domainCache.clear();
	termCache.clear();
	// 신규 통합 캐시도 클리어
	invalidateAllDataCaches();
}

// ============================================================================
// 페이지네이션 최적화 (기존 API 유지)
// ============================================================================

import { getPaginatedData } from '$lib/registry/cache-registry';

/**
 * 페이지네이션된 Vocabulary 결과
 * @deprecated getPaginatedData('vocabulary', ...)를 사용하세요.
 */
export async function getPaginatedVocabulary(
	filename: string = 'vocabulary.json',
	page: number = 1,
	limit: number = 20,
	searchQuery?: string
): Promise<{
	entries: import('$lib/types/vocabulary').VocabularyEntry[];
	totalCount: number;
	page: number;
	limit: number;
	totalPages: number;
}> {
	return getPaginatedData('vocabulary', filename, page, limit, searchQuery, (e, query) =>
		e.standardName.toLowerCase().includes(query) ||
		e.abbreviation.toLowerCase().includes(query) ||
		e.englishName.toLowerCase().includes(query)
	);
}

/**
 * 페이지네이션된 Domain 결과
 * @deprecated getPaginatedData('domain', ...)를 사용하세요.
 */
export async function getPaginatedDomain(
	filename: string = 'domain.json',
	page: number = 1,
	limit: number = 20,
	searchQuery?: string
): Promise<{
	entries: import('$lib/types/domain').DomainEntry[];
	totalCount: number;
	page: number;
	limit: number;
	totalPages: number;
}> {
	return getPaginatedData('domain', filename, page, limit, searchQuery, (e, query) =>
		e.domainGroup.toLowerCase().includes(query) ||
		e.domainCategory.toLowerCase().includes(query) ||
		e.standardDomainName.toLowerCase().includes(query)
	);
}

/**
 * 페이지네이션된 Term 결과
 * @deprecated getPaginatedData('term', ...)를 사용하세요.
 */
export async function getPaginatedTerm(
	filename: string = 'term.json',
	page: number = 1,
	limit: number = 20,
	searchQuery?: string
): Promise<{
	entries: import('$lib/types/term').TermEntry[];
	totalCount: number;
	page: number;
	limit: number;
	totalPages: number;
}> {
	return getPaginatedData('term', filename, page, limit, searchQuery, (e, query) =>
		e.termName.toLowerCase().includes(query) ||
		e.columnName.toLowerCase().includes(query) ||
		e.domainName.toLowerCase().includes(query)
	);
}

/**
 * 특정 타입의 캐시 무효화
 * @deprecated invalidateDataCache(type, filename)를 사용하세요.
 */
export function invalidateCache(type: 'vocabulary' | 'domain' | 'term', filename?: string): void {
	// 기존 MemoryCache 무효화
	switch (type) {
		case 'vocabulary':
			vocabularyCache.invalidate('vocabulary', filename);
			break;
		case 'domain':
			domainCache.invalidate('domain', filename);
			break;
		case 'term':
			termCache.invalidate('term', filename);
			break;
	}
	// 신규 통합 캐시도 무효화
	invalidateDataCache(type, filename);
}
