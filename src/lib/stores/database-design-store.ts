/**
 * 데이터베이스 설계 스토어
 * @deprecated unified-store의 개별 스토어를 사용하세요.
 * 하위 호환성을 위해 유지됩니다.
 */
import { writable } from 'svelte/store';
import {
	databaseDataStore,
	entityDataStore,
	attributeDataStore,
	tableDataStore,
	columnDataStore
} from './unified-store';

/**
 * 데이터베이스 정의서 스토어
 */
const _databaseStore = writable({
	selectedFilename: 'database.json'
});
databaseDataStore.subscribe((state) => {
	_databaseStore.set({ selectedFilename: state.selectedFilename });
});
export const databaseStore = _databaseStore;

/**
 * 엔터티 정의서 스토어
 */
const _entityStore = writable({
	selectedFilename: 'entity.json'
});
entityDataStore.subscribe((state) => {
	_entityStore.set({ selectedFilename: state.selectedFilename });
});
export const entityStore = _entityStore;

/**
 * 속성 정의서 스토어
 */
const _attributeStore = writable({
	selectedFilename: 'attribute.json'
});
attributeDataStore.subscribe((state) => {
	_attributeStore.set({ selectedFilename: state.selectedFilename });
});
export const attributeStore = _attributeStore;

/**
 * 테이블 정의서 스토어
 */
const _tableStore = writable({
	selectedFilename: 'table.json'
});
tableDataStore.subscribe((state) => {
	_tableStore.set({ selectedFilename: state.selectedFilename });
});
export const tableStore = _tableStore;

/**
 * 컬럼 정의서 스토어
 */
const _columnStore = writable({
	selectedFilename: 'column.json'
});
columnDataStore.subscribe((state) => {
	_columnStore.set({ selectedFilename: state.selectedFilename });
});
export const columnStore = _columnStore;
