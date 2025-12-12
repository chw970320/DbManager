const VOCABULARY_SYSTEM_FILE = 'vocabulary.json';
const _DOMAIN_SYSTEM_FILE = 'domain.json';
const TERM_SYSTEM_FILE = 'term.json';
const FORBIDDEN_WORDS_FILE = 'forbidden-words.json';
const HISTORY_FILE = 'history.json';

/**
 * 단어집 시스템 파일인지 확인
 * @param file - 파일명
 * @returns 시스템 파일 여부
 */
export function isSystemVocabularyFile(file: string): boolean {
	return file === VOCABULARY_SYSTEM_FILE || file === FORBIDDEN_WORDS_FILE || file === HISTORY_FILE;
}

/**
 * 도메인 시스템 파일인지 확인
 * @param file - 파일명
 * @returns 시스템 파일 여부
 */
export function isSystemDomainFile(file: string): boolean {
	// 도메인 기본 파일(domain.json)은 사용자 관리 대상이므로 시스템 파일에서 제외
	return file === HISTORY_FILE;
}

/**
 * 용어 시스템 파일인지 확인
 * @param file - 파일명
 * @returns 시스템 파일 여부
 */
export function isSystemTermFile(file: string): boolean {
	// 기본 용어 파일(term.json)은 사용자 관리 대상이므로 시스템 파일에서 제외
	return file === HISTORY_FILE;
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
