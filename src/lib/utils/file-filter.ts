const VOCABULARY_SYSTEM_FILE = 'vocabulary.json';
const _DOMAIN_SYSTEM_FILE = 'domain.json';
const TERM_SYSTEM_FILE = 'term.json';
const DATABASE_SYSTEM_FILE = 'database.json';
const ENTITY_SYSTEM_FILE = 'entity.json';
const ATTRIBUTE_SYSTEM_FILE = 'attribute.json';
const TABLE_SYSTEM_FILE = 'table.json';
const COLUMN_SYSTEM_FILE = 'column.json';
const HISTORY_FILE = 'history.json';

/**
 * 단어집 시스템 파일인지 확인
 * @param file - 파일명
 * @returns 시스템 파일 여부
 */
export function isSystemVocabularyFile(file: string): boolean {
	return file === VOCABULARY_SYSTEM_FILE || file === HISTORY_FILE;
}

/**
 * 도메인 시스템 파일인지 확인
 * @param file - 파일명
 * @returns 시스템 파일 여부
 */
export function isSystemDomainFile(file: string): boolean {
	return file === _DOMAIN_SYSTEM_FILE || file === HISTORY_FILE;
}

/**
 * 용어 시스템 파일인지 확인
 * @param file - 파일명
 * @returns 시스템 파일 여부
 */
export function isSystemTermFile(file: string): boolean {
	return file === TERM_SYSTEM_FILE || file === HISTORY_FILE;
}

/**
 * 단어집 파일 목록 필터링
 * @param files - 전체 파일 목록
 * @param showSystemFiles - 시스템 파일 표시 여부
 * @returns 필터링된 파일 목록
 */
export function filterVocabularyFiles(files: string[], showSystemFiles: boolean): string[] {
	const userFiles = files.filter((file) => !isSystemVocabularyFile(file));
	const hasUserFiles = userFiles.length > 0;

	// 사용자 파일이 없으면 시스템 파일 항상 표시
	if (!showSystemFiles && hasUserFiles) {
		return userFiles;
	}
	return files;
}

/**
 * 도메인 파일 목록 필터링
 * @param files - 전체 파일 목록
 * @param showSystemFiles - 시스템 파일 표시 여부
 * @returns 필터링된 파일 목록
 */
export function filterDomainFiles(files: string[], showSystemFiles: boolean): string[] {
	const userFiles = files.filter((file) => !isSystemDomainFile(file));
	const hasUserFiles = userFiles.length > 0;

	// 사용자 파일이 없으면 시스템 파일 항상 표시
	if (!showSystemFiles && hasUserFiles) {
		return userFiles;
	}
	return files;
}

/**
 * 용어 파일 목록 필터링
 * @param files - 전체 파일 목록
 * @param showSystemFiles - 시스템 파일 표시 여부
 * @returns 필터링된 파일 목록
 */
export function filterTermFiles(files: string[], showSystemFiles: boolean): string[] {
	const userFiles = files.filter((file) => !isSystemTermFile(file));
	const hasUserFiles = userFiles.length > 0;

	// 사용자 파일이 없으면 시스템 파일 항상 표시
	if (!showSystemFiles && hasUserFiles) {
		return userFiles;
	}
	return files;
}

/**
 * 데이터베이스 시스템 파일인지 확인
 */
export function isSystemDatabaseFile(file: string): boolean {
	return file === DATABASE_SYSTEM_FILE;
}

/**
 * 엔터티 시스템 파일인지 확인
 */
export function isSystemEntityFile(file: string): boolean {
	return file === ENTITY_SYSTEM_FILE;
}

/**
 * 속성 시스템 파일인지 확인
 */
export function isSystemAttributeFile(file: string): boolean {
	return file === ATTRIBUTE_SYSTEM_FILE;
}

/**
 * 테이블 시스템 파일인지 확인
 */
export function isSystemTableFile(file: string): boolean {
	return file === TABLE_SYSTEM_FILE;
}

/**
 * 컬럼 시스템 파일인지 확인
 */
export function isSystemColumnFile(file: string): boolean {
	return file === COLUMN_SYSTEM_FILE;
}

/**
 * 데이터베이스 파일 목록 필터링
 */
export function filterDatabaseFiles(files: string[], showSystemFiles: boolean): string[] {
	const userFiles = files.filter((file) => !isSystemDatabaseFile(file));
	const hasUserFiles = userFiles.length > 0;
	if (!showSystemFiles && hasUserFiles) {
		return userFiles;
	}
	return files;
}

/**
 * 엔터티 파일 목록 필터링
 */
export function filterEntityFiles(files: string[], showSystemFiles: boolean): string[] {
	const userFiles = files.filter((file) => !isSystemEntityFile(file));
	const hasUserFiles = userFiles.length > 0;
	if (!showSystemFiles && hasUserFiles) {
		return userFiles;
	}
	return files;
}

/**
 * 속성 파일 목록 필터링
 */
export function filterAttributeFiles(files: string[], showSystemFiles: boolean): string[] {
	const userFiles = files.filter((file) => !isSystemAttributeFile(file));
	const hasUserFiles = userFiles.length > 0;
	if (!showSystemFiles && hasUserFiles) {
		return userFiles;
	}
	return files;
}

/**
 * 테이블 파일 목록 필터링
 */
export function filterTableFiles(files: string[], showSystemFiles: boolean): string[] {
	const userFiles = files.filter((file) => !isSystemTableFile(file));
	const hasUserFiles = userFiles.length > 0;
	if (!showSystemFiles && hasUserFiles) {
		return userFiles;
	}
	return files;
}

/**
 * 컬럼 파일 목록 필터링
 */
export function filterColumnFiles(files: string[], showSystemFiles: boolean): string[] {
	const userFiles = files.filter((file) => !isSystemColumnFile(file));
	const hasUserFiles = userFiles.length > 0;
	if (!showSystemFiles && hasUserFiles) {
		return userFiles;
	}
	return files;
}
