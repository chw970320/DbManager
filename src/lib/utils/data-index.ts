/**
 * 데이터 인덱스 유틸리티
 * 대용량 데이터 조회 성능 최적화를 위한 인덱스 관리
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { safeReadFile, safeWriteFile } from './file-lock';

// ============================================================================
// 인덱스 타입 정의
// ============================================================================

/**
 * 인덱스 엔트리 (검색에 필요한 최소 정보만 포함)
 */
interface IndexEntry {
	id: string;
	/** 검색용 키 (소문자 변환됨) */
	searchKey: string;
	/** 원본 파일 내 위치 (바이트 오프셋 - 향후 스트리밍용) */
	offset?: number;
}

/**
 * 인덱스 파일 구조
 */
interface DataIndex {
	/** 인덱스 생성 시간 */
	createdAt: string;
	/** 원본 파일 수정 시간 */
	sourceModified: string;
	/** 총 엔트리 수 */
	totalCount: number;
	/** ID로 빠른 조회 */
	byId: Map<string, IndexEntry>;
	/** 검색 키워드 인덱스 (역인덱스) */
	bySearchKey: Map<string, string[]>;
}

/**
 * 직렬화된 인덱스 (JSON 저장용)
 */
interface SerializedIndex {
	createdAt: string;
	sourceModified: string;
	totalCount: number;
	entries: IndexEntry[];
	searchIndex: Record<string, string[]>;
}

// ============================================================================
// 인메모리 인덱스 캐시
// ============================================================================

const indexCache = new Map<string, DataIndex>();
const INDEX_SUFFIX = '.index.json';

/**
 * 인덱스 파일 경로 생성
 */
function getIndexPath(dataPath: string): string {
	return dataPath.replace('.json', INDEX_SUFFIX);
}

/**
 * 인덱스 로드 (캐시 우선)
 */
async function loadIndex(dataPath: string): Promise<DataIndex | null> {
	const indexPath = getIndexPath(dataPath);

	// 캐시 확인
	const cached = indexCache.get(dataPath);
	if (cached) {
		return cached;
	}

	// 인덱스 파일 확인
	if (!existsSync(indexPath)) {
		return null;
	}

	try {
		const content = await safeReadFile(indexPath);
		if (!content) return null;

		const serialized: SerializedIndex = JSON.parse(content);

		// Map으로 변환
		const index: DataIndex = {
			createdAt: serialized.createdAt,
			sourceModified: serialized.sourceModified,
			totalCount: serialized.totalCount,
			byId: new Map(serialized.entries.map((e) => [e.id, e])),
			bySearchKey: new Map(Object.entries(serialized.searchIndex))
		};

		indexCache.set(dataPath, index);
		return index;
	} catch (error) {
		console.warn('인덱스 로드 실패:', error);
		return null;
	}
}

/**
 * 인덱스 저장
 */
async function saveIndex(dataPath: string, index: DataIndex): Promise<void> {
	const indexPath = getIndexPath(dataPath);

	const serialized: SerializedIndex = {
		createdAt: index.createdAt,
		sourceModified: index.sourceModified,
		totalCount: index.totalCount,
		entries: Array.from(index.byId.values()),
		searchIndex: Object.fromEntries(index.bySearchKey)
	};

	await safeWriteFile(indexPath, JSON.stringify(serialized, null, 2));
	indexCache.set(dataPath, index);
}

// ============================================================================
// 인덱스 생성 함수
// ============================================================================

/**
 * Vocabulary 인덱스 생성
 */
export async function buildVocabularyIndex(
	entries: Array<{ id: string; standardName: string; abbreviation: string; englishName: string }>,
	dataPath: string,
	sourceModified: string
): Promise<DataIndex> {
	const byId = new Map<string, IndexEntry>();
	const bySearchKey = new Map<string, string[]>();

	for (const entry of entries) {
		const searchKey =
			`${entry.standardName} ${entry.abbreviation} ${entry.englishName}`.toLowerCase();

		const indexEntry: IndexEntry = {
			id: entry.id,
			searchKey
		};

		byId.set(entry.id, indexEntry);

		// 역인덱스: 각 단어별로 ID 매핑
		const words = searchKey.split(/\s+/).filter((w) => w.length > 0);
		for (const word of words) {
			const ids = bySearchKey.get(word) || [];
			if (!ids.includes(entry.id)) {
				ids.push(entry.id);
				bySearchKey.set(word, ids);
			}
		}
	}

	const index: DataIndex = {
		createdAt: new Date().toISOString(),
		sourceModified,
		totalCount: entries.length,
		byId,
		bySearchKey
	};

	await saveIndex(dataPath, index);
	return index;
}

/**
 * Domain 인덱스 생성
 */
export async function buildDomainIndex(
	entries: Array<{
		id: string;
		domainGroup: string;
		domainCategory: string;
		standardDomainName: string;
	}>,
	dataPath: string,
	sourceModified: string
): Promise<DataIndex> {
	const byId = new Map<string, IndexEntry>();
	const bySearchKey = new Map<string, string[]>();

	for (const entry of entries) {
		const searchKey =
			`${entry.domainGroup} ${entry.domainCategory} ${entry.standardDomainName}`.toLowerCase();

		const indexEntry: IndexEntry = {
			id: entry.id,
			searchKey
		};

		byId.set(entry.id, indexEntry);

		const words = searchKey.split(/\s+/).filter((w) => w.length > 0);
		for (const word of words) {
			const ids = bySearchKey.get(word) || [];
			if (!ids.includes(entry.id)) {
				ids.push(entry.id);
				bySearchKey.set(word, ids);
			}
		}
	}

	const index: DataIndex = {
		createdAt: new Date().toISOString(),
		sourceModified,
		totalCount: entries.length,
		byId,
		bySearchKey
	};

	await saveIndex(dataPath, index);
	return index;
}

/**
 * Term 인덱스 생성
 */
export async function buildTermIndex(
	entries: Array<{ id: string; termName: string; columnName: string; domainName: string }>,
	dataPath: string,
	sourceModified: string
): Promise<DataIndex> {
	const byId = new Map<string, IndexEntry>();
	const bySearchKey = new Map<string, string[]>();

	for (const entry of entries) {
		const searchKey = `${entry.termName} ${entry.columnName} ${entry.domainName}`.toLowerCase();

		const indexEntry: IndexEntry = {
			id: entry.id,
			searchKey
		};

		byId.set(entry.id, indexEntry);

		const words = searchKey.split(/\s+/).filter((w) => w.length > 0);
		for (const word of words) {
			const ids = bySearchKey.get(word) || [];
			if (!ids.includes(entry.id)) {
				ids.push(entry.id);
				bySearchKey.set(word, ids);
			}
		}
	}

	const index: DataIndex = {
		createdAt: new Date().toISOString(),
		sourceModified,
		totalCount: entries.length,
		byId,
		bySearchKey
	};

	await saveIndex(dataPath, index);
	return index;
}

// ============================================================================
// 인덱스 기반 조회 함수
// ============================================================================

/**
 * 인덱스로 빠른 ID 존재 확인
 */
export async function hasEntryById(dataPath: string, id: string): Promise<boolean | null> {
	const index = await loadIndex(dataPath);
	if (!index) return null; // 인덱스 없음 - 전체 로드 필요

	return index.byId.has(id);
}

/**
 * 인덱스로 빠른 검색 (ID 목록 반환)
 */
export async function searchByKeyword(dataPath: string, keyword: string): Promise<string[] | null> {
	const index = await loadIndex(dataPath);
	if (!index) return null; // 인덱스 없음 - 전체 로드 필요

	const keywordLower = keyword.toLowerCase();
	const matchingIds = new Set<string>();

	// 부분 일치 검색
	for (const [key, ids] of index.bySearchKey) {
		if (key.includes(keywordLower)) {
			ids.forEach((id) => matchingIds.add(id));
		}
	}

	return Array.from(matchingIds);
}

/**
 * 인덱스로 총 개수 빠르게 조회
 */
export async function getTotalCount(dataPath: string): Promise<number | null> {
	const index = await loadIndex(dataPath);
	if (!index) return null;

	return index.totalCount;
}

/**
 * 인덱스 무효화 (데이터 변경 시)
 */
export function invalidateIndex(dataPath: string): void {
	indexCache.delete(dataPath);
}

/**
 * 모든 인덱스 캐시 클리어
 */
export function clearAllIndexes(): void {
	indexCache.clear();
}

/**
 * 인덱스 상태 조회 (디버깅용)
 */
export function getIndexStats(): { cachedPaths: string[]; cacheSize: number } {
	return {
		cachedPaths: Array.from(indexCache.keys()),
		cacheSize: indexCache.size
	};
}
