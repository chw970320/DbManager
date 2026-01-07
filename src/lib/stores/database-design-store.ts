/**
 * 데이터베이스 설계 스토어
 * 데이터베이스, 엔터티, 속성, 테이블, 컬럼 파일 선택 상태 관리
 */
import { writable } from 'svelte/store';

/**
 * 데이터베이스 정의서 스토어
 */
export const databaseStore = writable({
	selectedFilename: 'database.json'
});

/**
 * 엔터티 정의서 스토어
 */
export const entityStore = writable({
	selectedFilename: 'entity.json'
});

/**
 * 속성 정의서 스토어
 */
export const attributeStore = writable({
	selectedFilename: 'attribute.json'
});

/**
 * 테이블 정의서 스토어
 */
export const tableStore = writable({
	selectedFilename: 'table.json'
});

/**
 * 컬럼 정의서 스토어
 */
export const columnStore = writable({
	selectedFilename: 'column.json'
});
