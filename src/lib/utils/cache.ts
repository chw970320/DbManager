/**
 * 간단한 메모리 캐시 유틸리티
 * 자주 액세스되는 데이터의 반복 로드를 방지합니다.
 */

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

	/**
	 * 캐시 키 생성
	 */
	private getKey(type: string, filename: string): string {
		return `${type}:${filename}`;
	}

	/**
	 * 캐시에서 데이터 가져오기
	 * @returns 캐시된 데이터 또는 undefined
	 */
	get(type: string, filename: string): T | undefined {
		const key = this.getKey(type, filename);
		const entry = this.cache.get(key);

		if (!entry) {
			return undefined;
		}

		// TTL 확인
		if (Date.now() - entry.timestamp > this.ttl) {
			this.cache.delete(key);
			return undefined;
		}

		return entry.data;
	}

	/**
	 * 캐시에 데이터 저장
	 */
	set(type: string, filename: string, data: T): void {
		const key = this.getKey(type, filename);

		// 최대 크기 확인 및 오래된 항목 제거
		if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
			this.evictOldest();
		}

		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			filename
		});
	}

	/**
	 * 캐시 무효화 (특정 타입/파일)
	 */
	invalidate(type: string, filename?: string): void {
		if (filename) {
			const key = this.getKey(type, filename);
			this.cache.delete(key);
		} else {
			// 해당 타입의 모든 캐시 삭제
			for (const key of this.cache.keys()) {
				if (key.startsWith(`${type}:`)) {
					this.cache.delete(key);
				}
			}
		}
	}

	/**
	 * 전체 캐시 클리어
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * 가장 오래된 항목 제거
	 */
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

	/**
	 * 캐시 상태 조회 (디버깅용)
	 */
	getStats(): { size: number; keys: string[] } {
		return {
			size: this.cache.size,
			keys: Array.from(this.cache.keys())
		};
	}
}

// ============================================================================
// 데이터 타입별 캐시 인스턴스
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
// 캐시 연동 로드 함수
// ============================================================================

import { loadVocabularyData, loadDomainData, loadTermData } from './file-handler';

/**
 * 캐시를 사용한 Vocabulary 데이터 로드
 */
export async function getCachedVocabularyData(
	filename: string = 'vocabulary.json'
): Promise<VocabularyData> {
	const cached = vocabularyCache.get('vocabulary', filename);
	if (cached) {
		return cached;
	}

	const data = await loadVocabularyData(filename);
	vocabularyCache.set('vocabulary', filename, data);
	return data;
}

/**
 * 캐시를 사용한 Domain 데이터 로드
 */
export async function getCachedDomainData(filename: string = 'domain.json'): Promise<DomainData> {
	const cached = domainCache.get('domain', filename);
	if (cached) {
		return cached;
	}

	const data = await loadDomainData(filename);
	domainCache.set('domain', filename, data);
	return data;
}

/**
 * 캐시를 사용한 Term 데이터 로드
 */
export async function getCachedTermData(filename: string = 'term.json'): Promise<TermData> {
	const cached = termCache.get('term', filename);
	if (cached) {
		return cached;
	}

	const data = await loadTermData(filename);
	termCache.set('term', filename, data);
	return data;
}

/**
 * 모든 캐시 무효화
 */
export function invalidateAllCaches(): void {
	vocabularyCache.clear();
	domainCache.clear();
	termCache.clear();
}

// ============================================================================
// 페이지네이션 최적화 (메모리 효율성)
// ============================================================================

/**
 * 페이지네이션된 결과를 반환 (전체 로드 후 슬라이싱)
 * 캐시를 활용하여 반복 로드 방지
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
	const data = await getCachedVocabularyData(filename);
	let entries = data.entries;

	// 검색 필터링
	if (searchQuery && searchQuery.trim()) {
		const query = searchQuery.toLowerCase();
		entries = entries.filter(
			(e) =>
				e.standardName.toLowerCase().includes(query) ||
				e.abbreviation.toLowerCase().includes(query) ||
				e.englishName.toLowerCase().includes(query)
		);
	}

	const totalCount = entries.length;
	const totalPages = Math.ceil(totalCount / limit);
	const startIndex = (page - 1) * limit;
	const paginatedEntries = entries.slice(startIndex, startIndex + limit);

	return {
		entries: paginatedEntries,
		totalCount,
		page,
		limit,
		totalPages
	};
}

/**
 * 페이지네이션된 Domain 결과
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
	const data = await getCachedDomainData(filename);
	let entries = data.entries;

	if (searchQuery && searchQuery.trim()) {
		const query = searchQuery.toLowerCase();
		entries = entries.filter(
			(e) =>
				e.domainGroup.toLowerCase().includes(query) ||
				e.domainCategory.toLowerCase().includes(query) ||
				e.standardDomainName.toLowerCase().includes(query)
		);
	}

	const totalCount = entries.length;
	const totalPages = Math.ceil(totalCount / limit);
	const startIndex = (page - 1) * limit;
	const paginatedEntries = entries.slice(startIndex, startIndex + limit);

	return {
		entries: paginatedEntries,
		totalCount,
		page,
		limit,
		totalPages
	};
}

/**
 * 페이지네이션된 Term 결과
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
	const data = await getCachedTermData(filename);
	let entries = data.entries;

	if (searchQuery && searchQuery.trim()) {
		const query = searchQuery.toLowerCase();
		entries = entries.filter(
			(e) =>
				e.termName.toLowerCase().includes(query) ||
				e.columnName.toLowerCase().includes(query) ||
				e.domainName.toLowerCase().includes(query)
		);
	}

	const totalCount = entries.length;
	const totalPages = Math.ceil(totalCount / limit);
	const startIndex = (page - 1) * limit;
	const paginatedEntries = entries.slice(startIndex, startIndex + limit);

	return {
		entries: paginatedEntries,
		totalCount,
		page,
		limit,
		totalPages
	};
}

/**
 * 특정 타입의 캐시 무효화
 */
export function invalidateCache(type: 'vocabulary' | 'domain' | 'term', filename?: string): void {
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
}
