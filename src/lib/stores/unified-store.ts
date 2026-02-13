/**
 * 통합 스토어 팩토리
 * 8개 데이터 타입에 대한 Svelte 스토어를 통합 관리합니다.
 * 기존 vocabulary-store, domain-store, term-store, database-design-store를 대체합니다.
 */

import { writable, type Writable } from 'svelte/store';
import type { DataType } from '$lib/types/base';
import { ALL_DATA_TYPES, DEFAULT_FILENAMES } from '$lib/types/base';

// ============================================================================
// 스토어 타입
// ============================================================================

/**
 * 데이터 스토어 상태
 */
export interface DataStoreState {
	selectedFilename: string;
}

// ============================================================================
// 통합 스토어 레지스트리
// ============================================================================

/**
 * 모든 데이터 타입에 대한 스토어 레지스트리
 */
const storeRegistry = new Map<DataType, Writable<DataStoreState>>();

/**
 * 데이터 스토어 생성 팩토리
 */
function createDataStore(type: DataType): Writable<DataStoreState> {
	return writable<DataStoreState>({
		selectedFilename: DEFAULT_FILENAMES[type]
	});
}

// 모든 타입에 대해 스토어 초기화
for (const type of ALL_DATA_TYPES) {
	storeRegistry.set(type, createDataStore(type));
}

// ============================================================================
// 스토어 접근 함수
// ============================================================================

/**
 * 특정 데이터 타입의 스토어 조회
 */
export function getDataStore(type: DataType): Writable<DataStoreState> {
	const store = storeRegistry.get(type);
	if (!store) {
		throw new Error(`알 수 없는 데이터 타입: ${type}`);
	}
	return store;
}

// ============================================================================
// 개별 스토어 export (하위 호환성)
// ============================================================================

/** 단어집 스토어 */
export const vocabularyDataStore = storeRegistry.get('vocabulary')!;

/** 도메인 스토어 */
export const domainDataStore = storeRegistry.get('domain')!;

/** 용어집 스토어 */
export const termDataStore = storeRegistry.get('term')!;

/** 데이터베이스 정의서 스토어 */
export const databaseDataStore = storeRegistry.get('database')!;

/** 엔터티 정의서 스토어 */
export const entityDataStore = storeRegistry.get('entity')!;

/** 속성 정의서 스토어 */
export const attributeDataStore = storeRegistry.get('attribute')!;

/** 테이블 정의서 스토어 */
export const tableDataStore = storeRegistry.get('table')!;

/** 컬럼 정의서 스토어 */
export const columnDataStore = storeRegistry.get('column')!;

// ============================================================================
// 유틸리티
// ============================================================================

/**
 * 모든 스토어를 기본값으로 리셋
 */
export function resetAllStores(): void {
	for (const type of ALL_DATA_TYPES) {
		const store = storeRegistry.get(type);
		if (store) {
			store.set({ selectedFilename: DEFAULT_FILENAMES[type] });
		}
	}
}

/**
 * 특정 스토어의 선택된 파일명 변경
 */
export function setSelectedFilename(type: DataType, filename: string): void {
	const store = storeRegistry.get(type);
	if (store) {
		store.set({ selectedFilename: filename });
	}
}
