/**
 * 데이터베이스 설계 파일 핸들러
 * 데이터베이스, 엔터티, 속성, 테이블, 컬럼 데이터 관리
 */
import { mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve, basename } from 'path';
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
import { safeWriteFile, safeReadFile, FileReadError } from './file-lock';
import { isValidUUID, isValidISODate } from './validation';
import { createDataFile, renameDataFile, deleteDataFile, type DataType } from './file-operations';

// 데이터 저장 경로 설정
const DATA_DIR = process.env.DATA_PATH || 'static/data';
const DATABASE_DIR = join(DATA_DIR, 'database');
const ENTITY_DIR = join(DATA_DIR, 'entity');
const ATTRIBUTE_DIR = join(DATA_DIR, 'attribute');
const TABLE_DIR = join(DATA_DIR, 'table');
const COLUMN_DIR = join(DATA_DIR, 'column');

const DEFAULT_DATABASE_FILE = 'database.json';
const DEFAULT_ENTITY_FILE = 'entity.json';
const DEFAULT_ATTRIBUTE_FILE = 'attribute.json';
const DEFAULT_TABLE_FILE = 'table.json';
const DEFAULT_COLUMN_FILE = 'column.json';
const HISTORY_FILE = 'history.json';

// ============================================================================
// 공통 유틸리티
// ============================================================================

/**
 * 파일명 유효성 검증
 */
function validateFilename(filename: string): void {
	if (!filename || filename.trim() === '') {
		throw new Error('파일명이 비어있습니다.');
	}
	if (filename.includes('..')) {
		throw new Error('유효하지 않은 파일명입니다: 상위 디렉토리 접근이 허용되지 않습니다.');
	}
	if (filename.includes('\0')) {
		throw new Error('유효하지 않은 파일명입니다: 허용되지 않는 문자가 포함되어 있습니다.');
	}
	if (filename.startsWith('/') || filename.startsWith('\\') || /^[a-zA-Z]:/.test(filename)) {
		throw new Error('유효하지 않은 파일명입니다: 절대 경로는 허용되지 않습니다.');
	}
}

/**
 * 데이터 파일 경로 가져오기
 */
function getDataPath(
	filename: string,
	type: 'database' | 'entity' | 'attribute' | 'table' | 'column'
): string {
	validateFilename(filename);
	const safeFilename = basename(filename);

	let baseDir: string;
	switch (type) {
		case 'database':
			baseDir = DATABASE_DIR;
			break;
		case 'entity':
			baseDir = ENTITY_DIR;
			break;
		case 'attribute':
			baseDir = ATTRIBUTE_DIR;
			break;
		case 'table':
			baseDir = TABLE_DIR;
			break;
		case 'column':
			baseDir = COLUMN_DIR;
			break;
		default:
			throw new Error('알 수 없는 데이터 타입입니다.');
	}

	const fullPath = resolve(baseDir, safeFilename);
	const resolvedBaseDir = resolve(baseDir);

	if (!fullPath.startsWith(resolvedBaseDir)) {
		throw new Error('유효하지 않은 파일 경로입니다: 허용된 디렉토리 외부 접근이 감지되었습니다.');
	}

	return fullPath;
}

/**
 * 데이터베이스 설계 관련 디렉토리 확인 및 생성
 */
export async function ensureDbDesignDirectories(): Promise<void> {
	try {
		const dirs = [DATABASE_DIR, ENTITY_DIR, ATTRIBUTE_DIR, TABLE_DIR, COLUMN_DIR];
		for (const dir of dirs) {
			if (!existsSync(dir)) {
				await mkdir(dir, { recursive: true });
			}
		}
	} catch (error) {
		console.error('데이터베이스 설계 디렉토리 생성 실패:', error);
		throw new Error(
			`디렉토리 초기화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

// ============================================================================
// Database (데이터베이스 정의서)
// ============================================================================

/**
 * 데이터베이스 정의서 데이터 로드
 */
export async function loadDatabaseData(
	filename: string = DEFAULT_DATABASE_FILE
): Promise<DatabaseData> {
	try {
		await ensureDbDesignDirectories();
		const dataPath = getDataPath(filename, 'database');

		const fileContent = await safeReadFile(dataPath);

		if (!fileContent || !fileContent.trim()) {
			const defaultData: DatabaseData = {
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			};
			if (filename === DEFAULT_DATABASE_FILE) {
				await saveDatabaseData(defaultData, filename);
			}
			return defaultData;
		}

		const data = JSON.parse(fileContent) as DatabaseData;
		return {
			...data,
			totalCount: data.entries?.length || 0
		};
	} catch (error) {
		console.error('데이터베이스 정의서 로드 실패:', error);
		if (error instanceof FileReadError) {
			throw new Error(`파일 읽기 실패: ${error.message}`);
		}
		throw new Error(
			`데이터베이스 정의서 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 데이터베이스 정의서 데이터 저장
 */
export async function saveDatabaseData(
	data: DatabaseData,
	filename: string = DEFAULT_DATABASE_FILE
): Promise<void> {
	try {
		await ensureDbDesignDirectories();

		if (!data || !Array.isArray(data.entries)) {
			throw new Error('유효하지 않은 데이터입니다.');
		}

		const validEntries = data.entries.filter((entry) => {
			const hasRequiredFields = entry.id && entry.organizationName && entry.createdAt;
			if (!hasRequiredFields) return false;

			if (!isValidUUID(entry.id)) {
				console.warn(`[검증 경고] 엔트리 ID가 UUID 형식이 아닙니다: ${entry.id}`);
			}
			if (!isValidISODate(entry.createdAt)) {
				console.warn(`[검증 경고] 엔트리 생성일이 ISO 8601 형식이 아닙니다: ${entry.createdAt}`);
			}

			return true;
		});

		const finalData: DatabaseData = {
			entries: validEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: validEntries.length
		};

		const dataPath = getDataPath(filename, 'database');
		const jsonData = JSON.stringify(finalData, null, 2);
		await safeWriteFile(dataPath, jsonData);
	} catch (error) {
		console.error('데이터베이스 정의서 저장 실패:', error);
		throw new Error(
			`데이터 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 데이터베이스 정의서 데이터 병합
 */
export async function mergeDatabaseData(
	newEntries: DatabaseEntry[],
	replaceExisting: boolean = true,
	filename: string = DEFAULT_DATABASE_FILE
): Promise<DatabaseData> {
	try {
		const existingData = await loadDatabaseData(filename);
		let finalEntries: DatabaseEntry[];

		if (replaceExisting || existingData.entries.length === 0) {
			finalEntries = [...newEntries];
		} else {
			const mergedMap = new Map<string, DatabaseEntry>();
			existingData.entries.forEach((entry) => {
				const key = `${(entry.organizationName || '').toLowerCase()}|${(entry.logicalDbName || '').toLowerCase()}`;
				mergedMap.set(key, entry);
			});
			newEntries.forEach((entry) => {
				const key = `${(entry.organizationName || '').toLowerCase()}|${(entry.logicalDbName || '').toLowerCase()}`;
				const existing = mergedMap.get(key);
				if (existing) {
					mergedMap.set(key, {
						...entry,
						createdAt: existing.createdAt,
						updatedAt: new Date().toISOString()
					});
				} else {
					mergedMap.set(key, entry);
				}
			});
			finalEntries = Array.from(mergedMap.values());
		}

		const mergedData: DatabaseData = {
			entries: finalEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: finalEntries.length
		};

		await saveDatabaseData(mergedData, filename);
		return mergedData;
	} catch (error) {
		throw new Error(
			`데이터 병합 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 데이터베이스 정의서 파일 목록 조회
 */
export async function listDatabaseFiles(): Promise<string[]> {
	try {
		await ensureDbDesignDirectories();
		const files = await readdir(DATABASE_DIR);
		return files.filter(
			(file) => file.endsWith('.json') && file !== HISTORY_FILE && !file.includes('_backup_')
		);
	} catch (error) {
		console.error('파일 목록 조회 실패:', error);
		return [DEFAULT_DATABASE_FILE];
	}
}

/**
 * 데이터베이스 정의서 파일 생성
 */
export async function createDatabaseFile(filename: string): Promise<void> {
	await ensureDbDesignDirectories();
	await createDataFile('database' as DataType, filename, () => ({
		entries: [],
		lastUpdated: new Date().toISOString(),
		totalCount: 0
	}));
}

/**
 * 데이터베이스 정의서 파일 이름 변경
 */
export async function renameDatabaseFile(oldFilename: string, newFilename: string): Promise<void> {
	if (oldFilename === DEFAULT_DATABASE_FILE) {
		throw new Error('시스템 파일은 이름을 변경할 수 없습니다.');
	}
	await ensureDbDesignDirectories();
	await renameDataFile('database' as DataType, oldFilename, newFilename);
}

/**
 * 데이터베이스 정의서 파일 삭제
 */
export async function deleteDatabaseFile(filename: string): Promise<void> {
	if (filename === DEFAULT_DATABASE_FILE) {
		throw new Error('시스템 파일은 삭제할 수 없습니다.');
	}
	await ensureDbDesignDirectories();
	await deleteDataFile('database' as DataType, filename);
}

// ============================================================================
// Entity (엔터티 정의서)
// ============================================================================

/**
 * 엔터티 정의서 데이터 로드
 */
export async function loadEntityData(filename: string = DEFAULT_ENTITY_FILE): Promise<EntityData> {
	try {
		await ensureDbDesignDirectories();
		const dataPath = getDataPath(filename, 'entity');

		const fileContent = await safeReadFile(dataPath);

		if (!fileContent || !fileContent.trim()) {
			const defaultData: EntityData = {
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			};
			if (filename === DEFAULT_ENTITY_FILE) {
				await saveEntityData(defaultData, filename);
			}
			return defaultData;
		}

		const data = JSON.parse(fileContent) as EntityData;
		return {
			...data,
			totalCount: data.entries?.length || 0
		};
	} catch (error) {
		console.error('엔터티 정의서 로드 실패:', error);
		if (error instanceof FileReadError) {
			throw new Error(`파일 읽기 실패: ${error.message}`);
		}
		throw new Error(
			`엔터티 정의서 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 엔터티 정의서 데이터 저장
 */
export async function saveEntityData(
	data: EntityData,
	filename: string = DEFAULT_ENTITY_FILE
): Promise<void> {
	try {
		await ensureDbDesignDirectories();

		if (!data || !Array.isArray(data.entries)) {
			throw new Error('유효하지 않은 데이터입니다.');
		}

		const validEntries = data.entries.filter((entry) => {
			const hasRequiredFields = entry.id && entry.createdAt;
			if (!hasRequiredFields) return false;

			if (!isValidUUID(entry.id)) {
				console.warn(`[검증 경고] 엔트리 ID가 UUID 형식이 아닙니다: ${entry.id}`);
			}

			return true;
		});

		const finalData: EntityData = {
			entries: validEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: validEntries.length
		};

		const dataPath = getDataPath(filename, 'entity');
		const jsonData = JSON.stringify(finalData, null, 2);
		await safeWriteFile(dataPath, jsonData);
	} catch (error) {
		console.error('엔터티 정의서 저장 실패:', error);
		throw new Error(
			`데이터 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 엔터티 정의서 데이터 병합
 */
export async function mergeEntityData(
	newEntries: EntityEntry[],
	replaceExisting: boolean = true,
	filename: string = DEFAULT_ENTITY_FILE
): Promise<EntityData> {
	try {
		const existingData = await loadEntityData(filename);
		let finalEntries: EntityEntry[];

		if (replaceExisting || existingData.entries.length === 0) {
			finalEntries = [...newEntries];
		} else {
			const mergedMap = new Map<string, EntityEntry>();
			existingData.entries.forEach((entry) => {
				const key = `${(entry.schemaName || '').toLowerCase()}|${(entry.entityName || '').toLowerCase()}`;
				mergedMap.set(key, entry);
			});
			newEntries.forEach((entry) => {
				const key = `${(entry.schemaName || '').toLowerCase()}|${(entry.entityName || '').toLowerCase()}`;
				const existing = mergedMap.get(key);
				if (existing) {
					mergedMap.set(key, {
						...entry,
						createdAt: existing.createdAt,
						updatedAt: new Date().toISOString()
					});
				} else {
					mergedMap.set(key, entry);
				}
			});
			finalEntries = Array.from(mergedMap.values());
		}

		const mergedData: EntityData = {
			entries: finalEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: finalEntries.length
		};

		await saveEntityData(mergedData, filename);
		return mergedData;
	} catch (error) {
		throw new Error(
			`데이터 병합 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 엔터티 정의서 파일 목록 조회
 */
export async function listEntityFiles(): Promise<string[]> {
	try {
		await ensureDbDesignDirectories();
		const files = await readdir(ENTITY_DIR);
		return files.filter(
			(file) => file.endsWith('.json') && file !== HISTORY_FILE && !file.includes('_backup_')
		);
	} catch (error) {
		console.error('파일 목록 조회 실패:', error);
		return [DEFAULT_ENTITY_FILE];
	}
}

/**
 * 엔터티 정의서 파일 생성
 */
export async function createEntityFile(filename: string): Promise<void> {
	await ensureDbDesignDirectories();
	await createDataFile('entity' as DataType, filename, () => ({
		entries: [],
		lastUpdated: new Date().toISOString(),
		totalCount: 0
	}));
}

/**
 * 엔터티 정의서 파일 이름 변경
 */
export async function renameEntityFile(oldFilename: string, newFilename: string): Promise<void> {
	if (oldFilename === DEFAULT_ENTITY_FILE) {
		throw new Error('시스템 파일은 이름을 변경할 수 없습니다.');
	}
	await ensureDbDesignDirectories();
	await renameDataFile('entity' as DataType, oldFilename, newFilename);
}

/**
 * 엔터티 정의서 파일 삭제
 */
export async function deleteEntityFile(filename: string): Promise<void> {
	if (filename === DEFAULT_ENTITY_FILE) {
		throw new Error('시스템 파일은 삭제할 수 없습니다.');
	}
	await ensureDbDesignDirectories();
	await deleteDataFile('entity' as DataType, filename);
}

// ============================================================================
// Attribute (속성 정의서)
// ============================================================================

/**
 * 속성 정의서 데이터 로드
 */
export async function loadAttributeData(
	filename: string = DEFAULT_ATTRIBUTE_FILE
): Promise<AttributeData> {
	try {
		await ensureDbDesignDirectories();
		const dataPath = getDataPath(filename, 'attribute');

		const fileContent = await safeReadFile(dataPath);

		if (!fileContent || !fileContent.trim()) {
			const defaultData: AttributeData = {
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			};
			if (filename === DEFAULT_ATTRIBUTE_FILE) {
				await saveAttributeData(defaultData, filename);
			}
			return defaultData;
		}

		const data = JSON.parse(fileContent) as AttributeData;
		return {
			...data,
			totalCount: data.entries?.length || 0
		};
	} catch (error) {
		console.error('속성 정의서 로드 실패:', error);
		if (error instanceof FileReadError) {
			throw new Error(`파일 읽기 실패: ${error.message}`);
		}
		throw new Error(
			`속성 정의서 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 속성 정의서 데이터 저장
 */
export async function saveAttributeData(
	data: AttributeData,
	filename: string = DEFAULT_ATTRIBUTE_FILE
): Promise<void> {
	try {
		await ensureDbDesignDirectories();

		if (!data || !Array.isArray(data.entries)) {
			throw new Error('유효하지 않은 데이터입니다.');
		}

		const validEntries = data.entries.filter((entry) => {
			const hasRequiredFields = entry.id && entry.createdAt;
			if (!hasRequiredFields) return false;

			if (!isValidUUID(entry.id)) {
				console.warn(`[검증 경고] 엔트리 ID가 UUID 형식이 아닙니다: ${entry.id}`);
			}

			return true;
		});

		const finalData: AttributeData = {
			entries: validEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: validEntries.length
		};

		const dataPath = getDataPath(filename, 'attribute');
		const jsonData = JSON.stringify(finalData, null, 2);
		await safeWriteFile(dataPath, jsonData);
	} catch (error) {
		console.error('속성 정의서 저장 실패:', error);
		throw new Error(
			`데이터 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 속성 정의서 데이터 병합
 */
export async function mergeAttributeData(
	newEntries: AttributeEntry[],
	replaceExisting: boolean = true,
	filename: string = DEFAULT_ATTRIBUTE_FILE
): Promise<AttributeData> {
	try {
		const existingData = await loadAttributeData(filename);
		let finalEntries: AttributeEntry[];

		if (replaceExisting || existingData.entries.length === 0) {
			finalEntries = [...newEntries];
		} else {
			const mergedMap = new Map<string, AttributeEntry>();
			existingData.entries.forEach((entry) => {
				const key = `${(entry.schemaName || '').toLowerCase()}|${(entry.entityName || '').toLowerCase()}|${(entry.attributeName || '').toLowerCase()}`;
				mergedMap.set(key, entry);
			});
			newEntries.forEach((entry) => {
				const key = `${(entry.schemaName || '').toLowerCase()}|${(entry.entityName || '').toLowerCase()}|${(entry.attributeName || '').toLowerCase()}`;
				const existing = mergedMap.get(key);
				if (existing) {
					mergedMap.set(key, {
						...entry,
						createdAt: existing.createdAt,
						updatedAt: new Date().toISOString()
					});
				} else {
					mergedMap.set(key, entry);
				}
			});
			finalEntries = Array.from(mergedMap.values());
		}

		const mergedData: AttributeData = {
			entries: finalEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: finalEntries.length
		};

		await saveAttributeData(mergedData, filename);
		return mergedData;
	} catch (error) {
		throw new Error(
			`데이터 병합 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 속성 정의서 파일 목록 조회
 */
export async function listAttributeFiles(): Promise<string[]> {
	try {
		await ensureDbDesignDirectories();
		const files = await readdir(ATTRIBUTE_DIR);
		return files.filter(
			(file) => file.endsWith('.json') && file !== HISTORY_FILE && !file.includes('_backup_')
		);
	} catch (error) {
		console.error('파일 목록 조회 실패:', error);
		return [DEFAULT_ATTRIBUTE_FILE];
	}
}

/**
 * 속성 정의서 파일 생성
 */
export async function createAttributeFile(filename: string): Promise<void> {
	await ensureDbDesignDirectories();
	await createDataFile('attribute' as DataType, filename, () => ({
		entries: [],
		lastUpdated: new Date().toISOString(),
		totalCount: 0
	}));
}

/**
 * 속성 정의서 파일 이름 변경
 */
export async function renameAttributeFile(oldFilename: string, newFilename: string): Promise<void> {
	if (oldFilename === DEFAULT_ATTRIBUTE_FILE) {
		throw new Error('시스템 파일은 이름을 변경할 수 없습니다.');
	}
	await ensureDbDesignDirectories();
	await renameDataFile('attribute' as DataType, oldFilename, newFilename);
}

/**
 * 속성 정의서 파일 삭제
 */
export async function deleteAttributeFile(filename: string): Promise<void> {
	if (filename === DEFAULT_ATTRIBUTE_FILE) {
		throw new Error('시스템 파일은 삭제할 수 없습니다.');
	}
	await ensureDbDesignDirectories();
	await deleteDataFile('attribute' as DataType, filename);
}

// ============================================================================
// Table (테이블 정의서)
// ============================================================================

/**
 * 테이블 정의서 데이터 로드
 */
export async function loadTableData(filename: string = DEFAULT_TABLE_FILE): Promise<TableData> {
	try {
		await ensureDbDesignDirectories();
		const dataPath = getDataPath(filename, 'table');

		const fileContent = await safeReadFile(dataPath);

		if (!fileContent || !fileContent.trim()) {
			const defaultData: TableData = {
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			};
			if (filename === DEFAULT_TABLE_FILE) {
				await saveTableData(defaultData, filename);
			}
			return defaultData;
		}

		const data = JSON.parse(fileContent) as TableData;
		return {
			...data,
			totalCount: data.entries?.length || 0
		};
	} catch (error) {
		console.error('테이블 정의서 로드 실패:', error);
		if (error instanceof FileReadError) {
			throw new Error(`파일 읽기 실패: ${error.message}`);
		}
		throw new Error(
			`테이블 정의서 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 테이블 정의서 데이터 저장
 */
export async function saveTableData(
	data: TableData,
	filename: string = DEFAULT_TABLE_FILE
): Promise<void> {
	try {
		await ensureDbDesignDirectories();

		if (!data || !Array.isArray(data.entries)) {
			throw new Error('유효하지 않은 데이터입니다.');
		}

		const validEntries = data.entries.filter((entry) => {
			const hasRequiredFields = entry.id && entry.createdAt;
			if (!hasRequiredFields) return false;

			if (!isValidUUID(entry.id)) {
				console.warn(`[검증 경고] 엔트리 ID가 UUID 형식이 아닙니다: ${entry.id}`);
			}

			return true;
		});

		const finalData: TableData = {
			entries: validEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: validEntries.length
		};

		const dataPath = getDataPath(filename, 'table');
		const jsonData = JSON.stringify(finalData, null, 2);
		await safeWriteFile(dataPath, jsonData);
	} catch (error) {
		console.error('테이블 정의서 저장 실패:', error);
		throw new Error(
			`데이터 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 테이블 정의서 데이터 병합
 */
export async function mergeTableData(
	newEntries: TableEntry[],
	replaceExisting: boolean = true,
	filename: string = DEFAULT_TABLE_FILE
): Promise<TableData> {
	try {
		const existingData = await loadTableData(filename);
		let finalEntries: TableEntry[];

		if (replaceExisting || existingData.entries.length === 0) {
			finalEntries = [...newEntries];
		} else {
			const mergedMap = new Map<string, TableEntry>();
			existingData.entries.forEach((entry) => {
				const key = `${(entry.schemaName || '').toLowerCase()}|${(entry.tableEnglishName || '').toLowerCase()}`;
				mergedMap.set(key, entry);
			});
			newEntries.forEach((entry) => {
				const key = `${(entry.schemaName || '').toLowerCase()}|${(entry.tableEnglishName || '').toLowerCase()}`;
				const existing = mergedMap.get(key);
				if (existing) {
					mergedMap.set(key, {
						...entry,
						createdAt: existing.createdAt,
						updatedAt: new Date().toISOString()
					});
				} else {
					mergedMap.set(key, entry);
				}
			});
			finalEntries = Array.from(mergedMap.values());
		}

		const mergedData: TableData = {
			entries: finalEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: finalEntries.length
		};

		await saveTableData(mergedData, filename);
		return mergedData;
	} catch (error) {
		throw new Error(
			`데이터 병합 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 테이블 정의서 파일 목록 조회
 */
export async function listTableFiles(): Promise<string[]> {
	try {
		await ensureDbDesignDirectories();
		const files = await readdir(TABLE_DIR);
		return files.filter(
			(file) => file.endsWith('.json') && file !== HISTORY_FILE && !file.includes('_backup_')
		);
	} catch (error) {
		console.error('파일 목록 조회 실패:', error);
		return [DEFAULT_TABLE_FILE];
	}
}

/**
 * 테이블 정의서 파일 생성
 */
export async function createTableFile(filename: string): Promise<void> {
	await ensureDbDesignDirectories();
	await createDataFile('table' as DataType, filename, () => ({
		entries: [],
		lastUpdated: new Date().toISOString(),
		totalCount: 0
	}));
}

/**
 * 테이블 정의서 파일 이름 변경
 */
export async function renameTableFile(oldFilename: string, newFilename: string): Promise<void> {
	if (oldFilename === DEFAULT_TABLE_FILE) {
		throw new Error('시스템 파일은 이름을 변경할 수 없습니다.');
	}
	await ensureDbDesignDirectories();
	await renameDataFile('table' as DataType, oldFilename, newFilename);
}

/**
 * 테이블 정의서 파일 삭제
 */
export async function deleteTableFile(filename: string): Promise<void> {
	if (filename === DEFAULT_TABLE_FILE) {
		throw new Error('시스템 파일은 삭제할 수 없습니다.');
	}
	await ensureDbDesignDirectories();
	await deleteDataFile('table' as DataType, filename);
}

// ============================================================================
// Column (컬럼 정의서)
// ============================================================================

/**
 * 컬럼 정의서 데이터 로드
 */
export async function loadColumnData(filename: string = DEFAULT_COLUMN_FILE): Promise<ColumnData> {
	try {
		await ensureDbDesignDirectories();
		const dataPath = getDataPath(filename, 'column');

		const fileContent = await safeReadFile(dataPath);

		if (!fileContent || !fileContent.trim()) {
			const defaultData: ColumnData = {
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			};
			if (filename === DEFAULT_COLUMN_FILE) {
				await saveColumnData(defaultData, filename);
			}
			return defaultData;
		}

		const data = JSON.parse(fileContent) as ColumnData;
		return {
			...data,
			totalCount: data.entries?.length || 0
		};
	} catch (error) {
		console.error('컬럼 정의서 로드 실패:', error);
		if (error instanceof FileReadError) {
			throw new Error(`파일 읽기 실패: ${error.message}`);
		}
		throw new Error(
			`컬럼 정의서 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 컬럼 정의서 데이터 저장
 */
export async function saveColumnData(
	data: ColumnData,
	filename: string = DEFAULT_COLUMN_FILE
): Promise<void> {
	try {
		await ensureDbDesignDirectories();

		if (!data || !Array.isArray(data.entries)) {
			throw new Error('유효하지 않은 데이터입니다.');
		}

		const validEntries = data.entries.filter((entry) => {
			const hasRequiredFields = entry.id && entry.createdAt;
			if (!hasRequiredFields) return false;

			if (!isValidUUID(entry.id)) {
				console.warn(`[검증 경고] 엔트리 ID가 UUID 형식이 아닙니다: ${entry.id}`);
			}

			return true;
		});

		const finalData: ColumnData = {
			entries: validEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: validEntries.length
		};

		const dataPath = getDataPath(filename, 'column');
		const jsonData = JSON.stringify(finalData, null, 2);
		await safeWriteFile(dataPath, jsonData);
	} catch (error) {
		console.error('컬럼 정의서 저장 실패:', error);
		throw new Error(
			`데이터 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 컬럼 정의서 데이터 병합
 */
export async function mergeColumnData(
	newEntries: ColumnEntry[],
	replaceExisting: boolean = true,
	filename: string = DEFAULT_COLUMN_FILE
): Promise<ColumnData> {
	try {
		const existingData = await loadColumnData(filename);
		let finalEntries: ColumnEntry[];

		if (replaceExisting || existingData.entries.length === 0) {
			finalEntries = [...newEntries];
		} else {
			const mergedMap = new Map<string, ColumnEntry>();
			existingData.entries.forEach((entry) => {
				const key = `${(entry.schemaName || '').toLowerCase()}|${(entry.tableEnglishName || '').toLowerCase()}|${(entry.columnEnglishName || '').toLowerCase()}`;
				mergedMap.set(key, entry);
			});
			newEntries.forEach((entry) => {
				const key = `${(entry.schemaName || '').toLowerCase()}|${(entry.tableEnglishName || '').toLowerCase()}|${(entry.columnEnglishName || '').toLowerCase()}`;
				const existing = mergedMap.get(key);
				if (existing) {
					mergedMap.set(key, {
						...entry,
						createdAt: existing.createdAt,
						updatedAt: new Date().toISOString()
					});
				} else {
					mergedMap.set(key, entry);
				}
			});
			finalEntries = Array.from(mergedMap.values());
		}

		const mergedData: ColumnData = {
			entries: finalEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: finalEntries.length
		};

		await saveColumnData(mergedData, filename);
		return mergedData;
	} catch (error) {
		throw new Error(
			`데이터 병합 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 컬럼 정의서 파일 목록 조회
 */
export async function listColumnFiles(): Promise<string[]> {
	try {
		await ensureDbDesignDirectories();
		const files = await readdir(COLUMN_DIR);
		return files.filter(
			(file) => file.endsWith('.json') && file !== HISTORY_FILE && !file.includes('_backup_')
		);
	} catch (error) {
		console.error('파일 목록 조회 실패:', error);
		return [DEFAULT_COLUMN_FILE];
	}
}

/**
 * 컬럼 정의서 파일 생성
 */
export async function createColumnFile(filename: string): Promise<void> {
	await ensureDbDesignDirectories();
	await createDataFile('column' as DataType, filename, () => ({
		entries: [],
		lastUpdated: new Date().toISOString(),
		totalCount: 0
	}));
}

/**
 * 컬럼 정의서 파일 이름 변경
 */
export async function renameColumnFile(oldFilename: string, newFilename: string): Promise<void> {
	if (oldFilename === DEFAULT_COLUMN_FILE) {
		throw new Error('시스템 파일은 이름을 변경할 수 없습니다.');
	}
	await ensureDbDesignDirectories();
	await renameDataFile('column' as DataType, oldFilename, newFilename);
}

/**
 * 컬럼 정의서 파일 삭제
 */
export async function deleteColumnFile(filename: string): Promise<void> {
	if (filename === DEFAULT_COLUMN_FILE) {
		throw new Error('시스템 파일은 삭제할 수 없습니다.');
	}
	await ensureDbDesignDirectories();
	await deleteDataFile('column' as DataType, filename);
}
