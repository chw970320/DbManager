/**
 * 데이터베이스 설계 파일 핸들러
 * @deprecated data-registry의 제네릭 CRUD를 사용하세요.
 * 하위 호환성을 위해 기존 API를 유지하며 내부적으로 data-registry로 위임합니다.
 *
 * 마이그레이션 가이드:
 * - loadDatabaseData(filename) → loadData('database', filename)
 * - saveDatabaseData(data, filename) → saveData('database', data, filename)
 * - mergeDatabaseData(entries, replace, filename) → mergeData('database', entries, replace, filename)
 * - listDatabaseFiles() → listFiles('database')
 * (entity, attribute, table, column도 동일 패턴)
 */

import type {
	DatabaseData,
	DatabaseEntry,
	EntityData,
	EntityEntry,
	AttributeData,
	AttributeEntry,
	TableData,
	TableEntry,
	ColumnData,
	ColumnEntry
} from '$lib/types/database-design';
import {
	loadData,
	saveData,
	mergeData,
	listFiles,
	createFile,
	renameFile,
	deleteFile,
	ensureDirectories
} from '$lib/registry/data-registry';

// 기본 파일명 상수 (하위 호환성)
const DEFAULT_DATABASE_FILE = 'database.json';
const DEFAULT_ENTITY_FILE = 'entity.json';
const DEFAULT_ATTRIBUTE_FILE = 'attribute.json';
const DEFAULT_TABLE_FILE = 'table.json';
const DEFAULT_COLUMN_FILE = 'column.json';

// ============================================================================
// 공통 유틸리티 - data-registry로 위임
// ============================================================================

/**
 * 데이터베이스 설계 관련 디렉토리 확인 및 생성
 * @deprecated ensureDirectories(['database', 'entity', ...]) 사용 권장
 */
export async function ensureDbDesignDirectories(): Promise<void> {
	await ensureDirectories(['database', 'entity', 'attribute', 'table', 'column']);
}

// ============================================================================
// Database (데이터베이스 정의서) - data-registry로 위임
// ============================================================================

/**
 * 데이터베이스 정의서 데이터 로드
 * @deprecated loadData('database', filename) 사용 권장
 */
export async function loadDatabaseData(
	filename: string = DEFAULT_DATABASE_FILE
): Promise<DatabaseData> {
	return loadData('database', filename);
}

/**
 * 데이터베이스 정의서 데이터 저장
 * @deprecated saveData('database', data, filename) 사용 권장
 */
export async function saveDatabaseData(
	data: DatabaseData,
	filename: string = DEFAULT_DATABASE_FILE
): Promise<void> {
	await saveData('database', data, filename);
}

/**
 * 데이터베이스 정의서 데이터 병합
 * @deprecated mergeData('database', entries, replace, filename) 사용 권장
 */
export async function mergeDatabaseData(
	newEntries: DatabaseEntry[],
	replaceExisting: boolean = true,
	filename: string = DEFAULT_DATABASE_FILE
): Promise<DatabaseData> {
	return mergeData('database', newEntries, replaceExisting, filename);
}

/**
 * 데이터베이스 정의서 파일 목록 조회
 * @deprecated listFiles('database') 사용 권장
 */
export async function listDatabaseFiles(): Promise<string[]> {
	return listFiles('database');
}

/**
 * 데이터베이스 정의서 파일 생성
 * @deprecated createFile('database', filename) 사용 권장
 */
export async function createDatabaseFile(filename: string): Promise<void> {
	await createFile('database', filename);
}

/**
 * 데이터베이스 정의서 파일 이름 변경
 * @deprecated renameFile('database', old, new) 사용 권장
 */
export async function renameDatabaseFile(oldFilename: string, newFilename: string): Promise<void> {
	if (oldFilename === DEFAULT_DATABASE_FILE) {
		throw new Error('시스템 파일은 이름을 변경할 수 없습니다.');
	}
	await renameFile('database', oldFilename, newFilename);
}

/**
 * 데이터베이스 정의서 파일 삭제
 * @deprecated deleteFile('database', filename) 사용 권장
 */
export async function deleteDatabaseFile(filename: string): Promise<void> {
	if (filename === DEFAULT_DATABASE_FILE) {
		throw new Error('시스템 파일은 삭제할 수 없습니다.');
	}
	await deleteFile('database', filename);
}

// ============================================================================
// Entity (엔터티 정의서) - data-registry로 위임
// ============================================================================

/**
 * 엔터티 정의서 데이터 로드
 * @deprecated loadData('entity', filename) 사용 권장
 */
export async function loadEntityData(filename: string = DEFAULT_ENTITY_FILE): Promise<EntityData> {
	return loadData('entity', filename);
}

/**
 * 엔터티 정의서 데이터 저장
 * @deprecated saveData('entity', data, filename) 사용 권장
 */
export async function saveEntityData(
	data: EntityData,
	filename: string = DEFAULT_ENTITY_FILE
): Promise<void> {
	await saveData('entity', data, filename);
}

/**
 * 엔터티 정의서 데이터 병합
 * @deprecated mergeData('entity', entries, replace, filename) 사용 권장
 */
export async function mergeEntityData(
	newEntries: EntityEntry[],
	replaceExisting: boolean = true,
	filename: string = DEFAULT_ENTITY_FILE
): Promise<EntityData> {
	return mergeData('entity', newEntries, replaceExisting, filename);
}

/**
 * 엔터티 정의서 파일 목록 조회
 * @deprecated listFiles('entity') 사용 권장
 */
export async function listEntityFiles(): Promise<string[]> {
	return listFiles('entity');
}

/**
 * 엔터티 정의서 파일 생성
 * @deprecated createFile('entity', filename) 사용 권장
 */
export async function createEntityFile(filename: string): Promise<void> {
	await createFile('entity', filename);
}

/**
 * 엔터티 정의서 파일 이름 변경
 * @deprecated renameFile('entity', old, new) 사용 권장
 */
export async function renameEntityFile(oldFilename: string, newFilename: string): Promise<void> {
	if (oldFilename === DEFAULT_ENTITY_FILE) {
		throw new Error('시스템 파일은 이름을 변경할 수 없습니다.');
	}
	await renameFile('entity', oldFilename, newFilename);
}

/**
 * 엔터티 정의서 파일 삭제
 * @deprecated deleteFile('entity', filename) 사용 권장
 */
export async function deleteEntityFile(filename: string): Promise<void> {
	if (filename === DEFAULT_ENTITY_FILE) {
		throw new Error('시스템 파일은 삭제할 수 없습니다.');
	}
	await deleteFile('entity', filename);
}

// ============================================================================
// Attribute (속성 정의서) - data-registry로 위임
// ============================================================================

/**
 * 속성 정의서 데이터 로드
 * @deprecated loadData('attribute', filename) 사용 권장
 */
export async function loadAttributeData(
	filename: string = DEFAULT_ATTRIBUTE_FILE
): Promise<AttributeData> {
	return loadData('attribute', filename);
}

/**
 * 속성 정의서 데이터 저장
 * @deprecated saveData('attribute', data, filename) 사용 권장
 */
export async function saveAttributeData(
	data: AttributeData,
	filename: string = DEFAULT_ATTRIBUTE_FILE
): Promise<void> {
	await saveData('attribute', data, filename);
}

/**
 * 속성 정의서 데이터 병합
 * @deprecated mergeData('attribute', entries, replace, filename) 사용 권장
 */
export async function mergeAttributeData(
	newEntries: AttributeEntry[],
	replaceExisting: boolean = true,
	filename: string = DEFAULT_ATTRIBUTE_FILE
): Promise<AttributeData> {
	return mergeData('attribute', newEntries, replaceExisting, filename);
}

/**
 * 속성 정의서 파일 목록 조회
 * @deprecated listFiles('attribute') 사용 권장
 */
export async function listAttributeFiles(): Promise<string[]> {
	return listFiles('attribute');
}

/**
 * 속성 정의서 파일 생성
 * @deprecated createFile('attribute', filename) 사용 권장
 */
export async function createAttributeFile(filename: string): Promise<void> {
	await createFile('attribute', filename);
}

/**
 * 속성 정의서 파일 이름 변경
 * @deprecated renameFile('attribute', old, new) 사용 권장
 */
export async function renameAttributeFile(oldFilename: string, newFilename: string): Promise<void> {
	if (oldFilename === DEFAULT_ATTRIBUTE_FILE) {
		throw new Error('시스템 파일은 이름을 변경할 수 없습니다.');
	}
	await renameFile('attribute', oldFilename, newFilename);
}

/**
 * 속성 정의서 파일 삭제
 * @deprecated deleteFile('attribute', filename) 사용 권장
 */
export async function deleteAttributeFile(filename: string): Promise<void> {
	if (filename === DEFAULT_ATTRIBUTE_FILE) {
		throw new Error('시스템 파일은 삭제할 수 없습니다.');
	}
	await deleteFile('attribute', filename);
}

// ============================================================================
// Table (테이블 정의서) - data-registry로 위임
// ============================================================================

/**
 * 테이블 정의서 데이터 로드
 * @deprecated loadData('table', filename) 사용 권장
 */
export async function loadTableData(filename: string = DEFAULT_TABLE_FILE): Promise<TableData> {
	return loadData('table', filename);
}

/**
 * 테이블 정의서 데이터 저장
 * @deprecated saveData('table', data, filename) 사용 권장
 */
export async function saveTableData(
	data: TableData,
	filename: string = DEFAULT_TABLE_FILE
): Promise<void> {
	await saveData('table', data, filename);
}

/**
 * 테이블 정의서 데이터 병합
 * @deprecated mergeData('table', entries, replace, filename) 사용 권장
 */
export async function mergeTableData(
	newEntries: TableEntry[],
	replaceExisting: boolean = true,
	filename: string = DEFAULT_TABLE_FILE
): Promise<TableData> {
	return mergeData('table', newEntries, replaceExisting, filename);
}

/**
 * 테이블 정의서 파일 목록 조회
 * @deprecated listFiles('table') 사용 권장
 */
export async function listTableFiles(): Promise<string[]> {
	return listFiles('table');
}

/**
 * 테이블 정의서 파일 생성
 * @deprecated createFile('table', filename) 사용 권장
 */
export async function createTableFile(filename: string): Promise<void> {
	await createFile('table', filename);
}

/**
 * 테이블 정의서 파일 이름 변경
 * @deprecated renameFile('table', old, new) 사용 권장
 */
export async function renameTableFile(oldFilename: string, newFilename: string): Promise<void> {
	if (oldFilename === DEFAULT_TABLE_FILE) {
		throw new Error('시스템 파일은 이름을 변경할 수 없습니다.');
	}
	await renameFile('table', oldFilename, newFilename);
}

/**
 * 테이블 정의서 파일 삭제
 * @deprecated deleteFile('table', filename) 사용 권장
 */
export async function deleteTableFile(filename: string): Promise<void> {
	if (filename === DEFAULT_TABLE_FILE) {
		throw new Error('시스템 파일은 삭제할 수 없습니다.');
	}
	await deleteFile('table', filename);
}

// ============================================================================
// Column (컬럼 정의서) - data-registry로 위임
// ============================================================================

/**
 * 컬럼 정의서 데이터 로드
 * @deprecated loadData('column', filename) 사용 권장
 */
export async function loadColumnData(filename: string = DEFAULT_COLUMN_FILE): Promise<ColumnData> {
	return loadData('column', filename);
}

/**
 * 컬럼 정의서 데이터 저장
 * @deprecated saveData('column', data, filename) 사용 권장
 */
export async function saveColumnData(
	data: ColumnData,
	filename: string = DEFAULT_COLUMN_FILE
): Promise<void> {
	await saveData('column', data, filename);
}

/**
 * 컬럼 정의서 데이터 병합
 * @deprecated mergeData('column', entries, replace, filename) 사용 권장
 */
export async function mergeColumnData(
	newEntries: ColumnEntry[],
	replaceExisting: boolean = true,
	filename: string = DEFAULT_COLUMN_FILE
): Promise<ColumnData> {
	return mergeData('column', newEntries, replaceExisting, filename);
}

/**
 * 컬럼 정의서 파일 목록 조회
 * @deprecated listFiles('column') 사용 권장
 */
export async function listColumnFiles(): Promise<string[]> {
	return listFiles('column');
}

/**
 * 컬럼 정의서 파일 생성
 * @deprecated createFile('column', filename) 사용 권장
 */
export async function createColumnFile(filename: string): Promise<void> {
	await createFile('column', filename);
}

/**
 * 컬럼 정의서 파일 이름 변경
 * @deprecated renameFile('column', old, new) 사용 권장
 */
export async function renameColumnFile(oldFilename: string, newFilename: string): Promise<void> {
	if (oldFilename === DEFAULT_COLUMN_FILE) {
		throw new Error('시스템 파일은 이름을 변경할 수 없습니다.');
	}
	await renameFile('column', oldFilename, newFilename);
}

/**
 * 컬럼 정의서 파일 삭제
 * @deprecated deleteFile('column', filename) 사용 권장
 */
export async function deleteColumnFile(filename: string): Promise<void> {
	if (filename === DEFAULT_COLUMN_FILE) {
		throw new Error('시스템 파일은 삭제할 수 없습니다.');
	}
	await deleteFile('column', filename);
}
