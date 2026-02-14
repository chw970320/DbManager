/**
 * 통합 캐시 레지스트리
 * 8개 데이터 타입 모두에 대한 통합 캐시 인프라를 제공합니다.
 * 기존 cache.ts의 vocabulary/domain/term만 지원하던 한계를 해결합니다.
 */

import type { DataType, DataTypeMap, EntryTypeMap } from '$lib/types/base';
import { ALL_DATA_TYPES, DEFAULT_FILENAMES } from '$lib/types/base';

// ============================================================================
// 캐시 설정
// ============================================================================

interface CacheEntry<T> {
	data: T;
	timestamp: number;
	filename: string;
}

interface CacheConfig {
	/** 캐시 만료 시간 (밀리초) */
	ttl: number;
	/** 타입당 최대 캐시 크기 */
	maxSizePerType: number;
}

const DEFAULT_CONFIG: CacheConfig = {
	ttl: 30000, // 30초
	maxSizePerType: 5
};

// ============================================================================
// 통합 캐시 클래스
// ============================================================================

class UnifiedCache {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private caches: Map<DataType, Map<string, CacheEntry<any>>> = new Map();
	private config: CacheConfig;

	constructor(config: CacheConfig = DEFAULT_CONFIG) {
		this.config = config;
		// 모든 타입에 대해 캐시 맵 초기화
		for (const type of ALL_DATA_TYPES) {
			this.caches.set(type, new Map());
		}
	}

	/**
	 * 캐시에서 데이터 조회
	 */
	get<T extends DataType>(type: T, filename: string): DataTypeMap[T] | undefined {
		const typeCache = this.caches.get(type);
		if (!typeCache) return undefined;

		const entry = typeCache.get(filename);
		if (!entry) return undefined;

		// TTL 확인
		if (Date.now() - entry.timestamp > this.config.ttl) {
			typeCache.delete(filename);
			return undefined;
		}

		return entry.data as DataTypeMap[T];
	}

	/**
	 * 캐시에 데이터 저장
	 */
	set<T extends DataType>(type: T, filename: string, data: DataTypeMap[T]): void {
		const typeCache = this.caches.get(type);
		if (!typeCache) return;

		// 최대 크기 확인
		if (typeCache.size >= this.config.maxSizePerType && !typeCache.has(filename)) {
			this.evictOldest(type);
		}

		typeCache.set(filename, {
			data,
			timestamp: Date.now(),
			filename
		});
	}

	/**
	 * 특정 타입/파일의 캐시 무효화
	 */
	invalidate(type: DataType, filename?: string): void {
		const typeCache = this.caches.get(type);
		if (!typeCache) return;

		if (filename) {
			typeCache.delete(filename);
		} else {
			typeCache.clear();
		}
	}

	/**
	 * 모든 캐시 클리어
	 */
	clear(): void {
		for (const typeCache of this.caches.values()) {
			typeCache.clear();
		}
	}

	/**
	 * 가장 오래된 항목 제거
	 */
	private evictOldest(type: DataType): void {
		const typeCache = this.caches.get(type);
		if (!typeCache) return;

		let oldestKey: string | null = null;
		let oldestTime = Infinity;

		for (const [key, entry] of typeCache.entries()) {
			if (entry.timestamp < oldestTime) {
				oldestTime = entry.timestamp;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			typeCache.delete(oldestKey);
		}
	}

	/**
	 * 캐시 상태 조회 (디버깅용)
	 */
	getStats(): Record<DataType, { size: number; keys: string[] }> {
		const stats: Partial<Record<DataType, { size: number; keys: string[] }>> = {};

		for (const type of ALL_DATA_TYPES) {
			const typeCache = this.caches.get(type);
			stats[type] = {
				size: typeCache?.size || 0,
				keys: typeCache ? Array.from(typeCache.keys()) : []
			};
		}

		return stats as Record<DataType, { size: number; keys: string[] }>;
	}
}

// ============================================================================
// 싱글톤 인스턴스
// ============================================================================

/** 통합 캐시 인스턴스 */
export const unifiedCache = new UnifiedCache();

// ============================================================================
// 캐시 연동 로드 함수
// ============================================================================

/**
 * 캐시를 사용한 데이터 로드 (제네릭)
 */
export async function getCachedData<T extends DataType>(
	type: T,
	filename?: string
): Promise<DataTypeMap[T]> {
	const file = filename || DEFAULT_FILENAMES[type];

	// 캐시 확인
	const cached = unifiedCache.get(type, file);
	if (cached) {
		return cached;
	}

	// 캐시 미스: data-registry에서 로드
	const { loadData } = await import('./data-registry');
	const data = await loadData(type, file);

	// 캐시에 저장
	unifiedCache.set(type, file, data);

	return data;
}

// ============================================================================
// 페이지네이션 유틸리티
// ============================================================================

/**
 * 제네릭 페이지네이션 결과
 */
export interface PaginatedResult<T> {
	entries: T[];
	totalCount: number;
	page: number;
	limit: number;
	totalPages: number;
}

/**
 * 제네릭 페이지네이션 함수
 */
export async function getPaginatedData<T extends DataType>(
	type: T,
	filename?: string,
	page: number = 1,
	limit: number = 20,
	searchQuery?: string,
	searchFilter?: (entry: EntryTypeMap[T], query: string) => boolean
): Promise<PaginatedResult<EntryTypeMap[T]>> {
	const data = await getCachedData(type, filename);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let entries = (data as any).entries as EntryTypeMap[T][];

	// 검색 필터링
	if (searchQuery && searchQuery.trim() && searchFilter) {
		const query = searchQuery.toLowerCase();
		entries = entries.filter((entry) => searchFilter(entry, query));
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

// ============================================================================
// 캐시 관리 유틸리티
// ============================================================================

/**
 * 특정 타입의 캐시 무효화
 */
export function invalidateDataCache(type: DataType, filename?: string): void {
	unifiedCache.invalidate(type, filename);
}

/**
 * 모든 캐시 무효화
 */
export function invalidateAllDataCaches(): void {
	unifiedCache.clear();
}

/**
 * 캐시 상태 조회 (디버깅용)
 */
export function getDataCacheStats(): Record<DataType, { size: number; keys: string[] }> {
	return unifiedCache.getStats();
}

// ============================================================================
// Legacy Named Exports (for test migration compatibility)
// ============================================================================

export const getCachedVocabularyData = (filename = 'vocabulary.json') =>
	getCachedData('vocabulary', filename);
export const getCachedDomainData = (filename = 'domain.json') => getCachedData('domain', filename);
export const getCachedTermData = (filename = 'term.json') => getCachedData('term', filename);
export const invalidateCache = (type: DataType, filename?: string) =>
	invalidateDataCache(type, filename);
export const invalidateAllCaches = () => invalidateAllDataCaches();
