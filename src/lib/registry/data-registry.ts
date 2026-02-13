/**
 * 통합 데이터 레지스트리
 * 8개 데이터 타입에 대한 제네릭 CRUD 핸들러를 제공합니다.
 * 기존 file-handler.ts / database-design-handler.ts의 중복 로직을 통합합니다.
 */

import { mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve, basename } from 'path';
import type { DataType, DataTypeMap, EntryTypeMap } from '$lib/types/base';
import { DEFAULT_FILENAMES } from '$lib/types/base';
import { safeWriteFile, safeReadFile, FileReadError } from '$lib/utils/file-lock';
import { isValidUUID, isValidISODate } from '$lib/utils/validation';

// ============================================================================
// 디렉토리 설정
// ============================================================================

const DATA_DIR = process.env.DATA_PATH || 'static/data';

const DATA_DIRS: Record<DataType, string> = {
	vocabulary: join(DATA_DIR, 'vocabulary'),
	domain: join(DATA_DIR, 'domain'),
	term: join(DATA_DIR, 'term'),
	database: join(DATA_DIR, 'database'),
	entity: join(DATA_DIR, 'entity'),
	attribute: join(DATA_DIR, 'attribute'),
	table: join(DATA_DIR, 'table'),
	column: join(DATA_DIR, 'column')
};

const HISTORY_FILE = 'history.json';

// ============================================================================
// 타입별 설정 (Config)
// ============================================================================

/**
 * 각 데이터 타입의 설정을 정의합니다.
 * - validate: 엔트리의 필수 필드 존재 여부 확인
 * - getMergeKey: 병합 시 중복 판별 키
 * - createDefault: 빈 파일 생성 시 기본 데이터
 */
interface DataTypeConfig<T extends DataType> {
	validate: (entry: EntryTypeMap[T]) => boolean;
	getMergeKey: (entry: EntryTypeMap[T]) => string;
	createDefault: () => DataTypeMap[T];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TYPE_CONFIGS: { [K in DataType]: DataTypeConfig<K> } = {
	vocabulary: {
		validate: (e) =>
			!!(e.id && e.standardName && e.abbreviation && e.englishName && e.createdAt),
		getMergeKey: (e) =>
			`${e.standardName.toLowerCase()}|${e.abbreviation.toLowerCase()}|${e.englishName.toLowerCase()}`,
		createDefault: () =>
			({
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0,
				mapping: { domain: 'domain.json' }
			}) as DataTypeMap['vocabulary']
	},
	domain: {
		validate: (e) =>
			!!(
				e.id &&
				e.domainGroup &&
				e.domainCategory &&
				e.standardDomainName &&
				e.physicalDataType &&
				e.createdAt
			),
		getMergeKey: (e) =>
			`${e.domainGroup.toLowerCase()}|${e.domainCategory.toLowerCase()}|${e.standardDomainName.toLowerCase()}`,
		createDefault: () =>
			({
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			}) as DataTypeMap['domain']
	},
	term: {
		validate: (e) => !!(e.id && e.termName && e.columnName && e.domainName && e.createdAt),
		getMergeKey: (e) =>
			`${e.termName.toLowerCase()}|${e.columnName.toLowerCase()}|${e.domainName.toLowerCase()}`,
		createDefault: () =>
			({
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0,
				mapping: { vocabulary: 'vocabulary.json', domain: 'domain.json' }
			}) as DataTypeMap['term']
	},
	database: {
		validate: (e) => !!(e.id && e.organizationName && e.createdAt),
		getMergeKey: (e) =>
			`${(e.organizationName || '').toLowerCase()}|${(e.logicalDbName || '').toLowerCase()}`,
		createDefault: () =>
			({
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			}) as DataTypeMap['database']
	},
	entity: {
		validate: (e) => !!(e.id && e.createdAt),
		getMergeKey: (e) =>
			`${(e.schemaName || '').toLowerCase()}|${(e.entityName || '').toLowerCase()}`,
		createDefault: () =>
			({
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			}) as DataTypeMap['entity']
	},
	attribute: {
		validate: (e) => !!(e.id && e.createdAt),
		getMergeKey: (e) =>
			`${(e.schemaName || '').toLowerCase()}|${(e.entityName || '').toLowerCase()}|${(e.attributeName || '').toLowerCase()}`,
		createDefault: () =>
			({
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			}) as DataTypeMap['attribute']
	},
	table: {
		validate: (e) => !!(e.id && e.createdAt),
		getMergeKey: (e) =>
			`${(e.schemaName || '').toLowerCase()}|${(e.tableEnglishName || '').toLowerCase()}`,
		createDefault: () =>
			({
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			}) as DataTypeMap['table']
	},
	column: {
		validate: (e) => !!(e.id && e.createdAt),
		getMergeKey: (e) =>
			`${(e.schemaName || '').toLowerCase()}|${(e.tableEnglishName || '').toLowerCase()}|${(e.columnEnglishName || '').toLowerCase()}`,
		createDefault: () =>
			({
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			}) as DataTypeMap['column']
	}
};

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
 * 안전한 데이터 파일 경로 생성
 */
function getDataPath(filename: string, type: DataType): string {
	validateFilename(filename);
	const safeFilename = basename(filename);
	const baseDir = DATA_DIRS[type];
	const fullPath = resolve(baseDir, safeFilename);
	const resolvedBaseDir = resolve(baseDir);

	if (!fullPath.startsWith(resolvedBaseDir)) {
		throw new Error('유효하지 않은 파일 경로입니다: 허용된 디렉토리 외부 접근이 감지되었습니다.');
	}

	return fullPath;
}

/**
 * 데이터 디렉토리 초기화
 */
export async function ensureDirectories(types?: DataType[]): Promise<void> {
	const targetTypes = types || (Object.keys(DATA_DIRS) as DataType[]);
	try {
		if (!existsSync(DATA_DIR)) {
			await mkdir(DATA_DIR, { recursive: true });
		}
		for (const type of targetTypes) {
			const dir = DATA_DIRS[type];
			if (!existsSync(dir)) {
				await mkdir(dir, { recursive: true });
			}
		}
	} catch (error) {
		console.error('데이터 디렉토리 초기화 실패:', error);
		throw new Error(
			`디렉토리 초기화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 디렉토리 경로 조회
 */
export function getDirectoryPath(type: DataType): string {
	return DATA_DIRS[type];
}

// ============================================================================
// 타입별 설정 접근
// ============================================================================

/**
 * 특정 데이터 타입의 설정 조회
 */
export function getTypeConfig<T extends DataType>(type: T): DataTypeConfig<T> {
	return TYPE_CONFIGS[type] as DataTypeConfig<T>;
}

// ============================================================================
// 제네릭 CRUD 함수
// ============================================================================

/**
 * 데이터 로드 (제네릭)
 */
export async function loadData<T extends DataType>(
	type: T,
	filename?: string
): Promise<DataTypeMap[T]> {
	const file = filename || DEFAULT_FILENAMES[type];
	const config = getTypeConfig(type);

	try {
		await ensureDirectories([type]);
		const dataPath = getDataPath(file, type);

		const fileContent = await safeReadFile(dataPath);

		if (!fileContent || !fileContent.trim()) {
			const defaultData = config.createDefault();
			if (file === DEFAULT_FILENAMES[type]) {
				await saveData(type, defaultData, file);
			}
			return defaultData;
		}

		const data = JSON.parse(fileContent) as DataTypeMap[T];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const entries = (data as any).entries;
		return {
			...data,
			totalCount: entries?.length || 0
		};
	} catch (error) {
		const label = type;
		console.error(`${label} 데이터 로드 실패:`, error);
		if (error instanceof FileReadError) {
			throw new Error(`파일 읽기 실패: ${error.message}`);
		}
		if (error instanceof SyntaxError) {
			throw new Error(`${label} 데이터 파일 형식이 손상되었습니다.`);
		}
		throw new Error(
			`${label} 데이터 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 데이터 저장 (제네릭)
 */
export async function saveData<T extends DataType>(
	type: T,
	data: DataTypeMap[T],
	filename?: string
): Promise<void> {
	const file = filename || DEFAULT_FILENAMES[type];
	const config = getTypeConfig(type);

	try {
		await ensureDirectories([type]);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const rawEntries = (data as any).entries;

		if (!rawEntries || !Array.isArray(rawEntries)) {
			throw new Error(`유효하지 않은 ${type} 데이터입니다.`);
		}

		const validEntries = rawEntries.filter((entry: EntryTypeMap[T]) => {
			const isValid = config.validate(entry);
			if (!isValid) return false;

			// 형식 경고 (저장은 허용)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const e = entry as any;
			if (e.id && !isValidUUID(e.id)) {
				console.warn(`[검증 경고] ${type} 엔트리 ID가 UUID 형식이 아닙니다: ${e.id}`);
			}
			if (e.createdAt && !isValidISODate(e.createdAt)) {
				console.warn(
					`[검증 경고] ${type} 엔트리 생성일이 ISO 8601 형식이 아닙니다: ${e.createdAt}`
				);
			}

			return true;
		});

		if (validEntries.length === 0 && rawEntries.length > 0) {
			throw new Error(`저장할 유효한 ${type} 데이터가 없습니다.`);
		}

		const now = new Date().toISOString();

		// 타입별 특수 필드 보존 (mapping 등)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const finalData: any = {
			...data,
			entries: validEntries,
			lastUpdated: now,
			totalCount: validEntries.length
		};

		const dataPath = getDataPath(file, type);
		const jsonData = JSON.stringify(finalData, null, 2);
		await safeWriteFile(dataPath, jsonData);
	} catch (error) {
		console.error(`${type} 데이터 저장 실패:`, error);
		throw new Error(
			`${type} 데이터 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 데이터 병합 (제네릭)
 */
export async function mergeData<T extends DataType>(
	type: T,
	newEntries: EntryTypeMap[T][],
	replaceExisting: boolean = true,
	filename?: string
): Promise<DataTypeMap[T]> {
	const file = filename || DEFAULT_FILENAMES[type];
	const config = getTypeConfig(type);

	try {
		const existingData = await loadData(type, file);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const existingEntries = (existingData as any).entries as EntryTypeMap[T][];
		let finalEntries: EntryTypeMap[T][];

		if (replaceExisting || existingEntries.length === 0) {
			finalEntries = [...newEntries];
		} else {
			const mergedMap = new Map<string, EntryTypeMap[T]>();

			existingEntries.forEach((entry) => {
				const key = config.getMergeKey(entry);
				mergedMap.set(key, entry);
			});

			newEntries.forEach((entry) => {
				const key = config.getMergeKey(entry);
				const existing = mergedMap.get(key);
				if (existing) {
					mergedMap.set(key, {
						...entry,
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						createdAt: (existing as any).createdAt,
						updatedAt: new Date().toISOString()
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					} as any);
				} else {
					mergedMap.set(key, entry);
				}
			});

			finalEntries = Array.from(mergedMap.values());
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const mergedData: any = {
			...existingData,
			entries: finalEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: finalEntries.length
		};

		await saveData(type, mergedData as DataTypeMap[T], file);
		return mergedData as DataTypeMap[T];
	} catch (error) {
		throw new Error(
			`${type} 데이터 병합 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 파일 목록 조회 (제네릭)
 */
export async function listFiles(type: DataType): Promise<string[]> {
	try {
		await ensureDirectories([type]);
		const dir = DATA_DIRS[type];
		const files = await readdir(dir);
		return files.filter(
			(file) =>
				file.endsWith('.json') && file !== HISTORY_FILE && !file.includes('_backup_')
		);
	} catch (error) {
		console.error(`${type} 파일 목록 조회 실패:`, error);
		return [DEFAULT_FILENAMES[type]];
	}
}

/**
 * 파일 생성 (제네릭)
 */
export async function createFile(type: DataType, filename: string): Promise<void> {
	const config = getTypeConfig(type);
	await ensureDirectories([type]);

	const { createDataFile } = await import('$lib/utils/file-operations');
	await createDataFile(type, filename, config.createDefault as () => unknown);
}

/**
 * 파일 이름 변경 (제네릭)
 * 매핑 레지스트리 자동 동기화 포함
 */
export async function renameFile(
	type: DataType,
	oldFilename: string,
	newFilename: string
): Promise<void> {
	if (oldFilename === DEFAULT_FILENAMES[type]) {
		throw new Error('시스템 파일은 이름을 변경할 수 없습니다.');
	}
	await ensureDirectories([type]);

	const { renameDataFile } = await import('$lib/utils/file-operations');
	await renameDataFile(type, oldFilename, newFilename);

	// 매핑 레지스트리 자동 동기화
	try {
		const { syncMappingsOnRename } = await import('./mapping-registry');
		const updatedCount = await syncMappingsOnRename(type, oldFilename, newFilename);
		if (updatedCount > 0) {
			console.log(
				`[매핑 동기화] ${type} 파일 이름 변경 시 ${updatedCount}개의 매핑 관계가 업데이트되었습니다.`
			);
		}
	} catch (syncError) {
		// 매핑 동기화 실패는 파일 작업을 롤백하지 않음 (best-effort)
		console.warn('[매핑 동기화 경고] 매핑 레지스트리 업데이트 실패:', syncError);
	}
}

/**
 * 파일 삭제 (제네릭)
 * 매핑 레지스트리 자동 정리 포함
 */
export async function deleteFile(type: DataType, filename: string): Promise<void> {
	if (filename === DEFAULT_FILENAMES[type]) {
		throw new Error('시스템 파일은 삭제할 수 없습니다.');
	}
	await ensureDirectories([type]);

	const { deleteDataFile } = await import('$lib/utils/file-operations');
	await deleteDataFile(type, filename);

	// 매핑 레지스트리 자동 정리 (삭제된 파일 → 기본 파일명으로 대체)
	try {
		const { cleanMappingsOnDelete } = await import('./mapping-registry');
		const updatedCount = await cleanMappingsOnDelete(type, filename);
		if (updatedCount > 0) {
			console.log(
				`[매핑 동기화] ${type} 파일 삭제 시 ${updatedCount}개의 매핑 관계가 기본 파일로 대체되었습니다.`
			);
		}
	} catch (syncError) {
		// 매핑 동기화 실패는 파일 작업을 롤백하지 않음 (best-effort)
		console.warn('[매핑 동기화 경고] 매핑 레지스트리 정리 실패:', syncError);
	}
}
