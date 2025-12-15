// ============================================================================
// 형식 검증 함수
// ============================================================================

/**
 * UUID v4 형식 검증
 * @param value - 검증할 문자열
 * @returns UUID v4 형식 여부
 */
export function isValidUUID(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidV4Regex.test(value);
}

/**
 * ISO 8601 날짜 형식 검증
 * @param value - 검증할 문자열
 * @returns ISO 8601 형식 여부
 */
export function isValidISODate(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	const date = new Date(value);
	return !isNaN(date.getTime()) && value.includes('T');
}

/**
 * 비어있지 않은 문자열 검증
 * @param value - 검증할 값
 * @returns 비어있지 않은 문자열 여부
 */
export function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 양의 정수 검증
 * @param value - 검증할 값
 * @returns 양의 정수 여부
 */
export function isPositiveInteger(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * 배열 검증
 * @param value - 검증할 값
 * @returns 배열 여부
 */
export function isValidArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

// ============================================================================
// 검증 에러 클래스
// ============================================================================

/**
 * 데이터 검증 에러
 */
export class DataValidationError extends Error {
	constructor(
		message: string,
		public readonly field: string,
		public readonly value?: unknown
	) {
		super(message);
		this.name = 'DataValidationError';
	}
}

// ============================================================================
// 엔트리 검증 함수
// ============================================================================

/**
 * VocabularyEntry 필수 필드 및 형식 검증
 * @param entry - 검증할 엔트리
 * @throws DataValidationError - 검증 실패 시
 */
export function validateVocabularyEntryStrict(entry: unknown): void {
	if (!entry || typeof entry !== 'object') {
		throw new DataValidationError('엔트리가 객체가 아닙니다.', 'entry', entry);
	}

	const obj = entry as Record<string, unknown>;

	// ID 검증
	if (!isValidUUID(obj.id)) {
		throw new DataValidationError('ID가 유효한 UUID 형식이 아닙니다.', 'id', obj.id);
	}

	// 필수 문자열 필드 검증
	if (!isNonEmptyString(obj.standardName)) {
		throw new DataValidationError('표준단어명이 비어있습니다.', 'standardName', obj.standardName);
	}
	if (!isNonEmptyString(obj.abbreviation)) {
		throw new DataValidationError('영문약어가 비어있습니다.', 'abbreviation', obj.abbreviation);
	}
	if (!isNonEmptyString(obj.englishName)) {
		throw new DataValidationError('영문명이 비어있습니다.', 'englishName', obj.englishName);
	}

	// 날짜 형식 검증
	if (!isValidISODate(obj.createdAt)) {
		throw new DataValidationError(
			'생성일이 유효한 ISO 8601 형식이 아닙니다.',
			'createdAt',
			obj.createdAt
		);
	}
}

/**
 * DomainEntry 필수 필드 및 형식 검증
 * @param entry - 검증할 엔트리
 * @throws DataValidationError - 검증 실패 시
 */
export function validateDomainEntryStrict(entry: unknown): void {
	if (!entry || typeof entry !== 'object') {
		throw new DataValidationError('엔트리가 객체가 아닙니다.', 'entry', entry);
	}

	const obj = entry as Record<string, unknown>;

	// ID 검증
	if (!isValidUUID(obj.id)) {
		throw new DataValidationError('ID가 유효한 UUID 형식이 아닙니다.', 'id', obj.id);
	}

	// 필수 문자열 필드 검증
	if (!isNonEmptyString(obj.domainGroup)) {
		throw new DataValidationError('도메인그룹이 비어있습니다.', 'domainGroup', obj.domainGroup);
	}
	if (!isNonEmptyString(obj.domainCategory)) {
		throw new DataValidationError(
			'도메인분류명이 비어있습니다.',
			'domainCategory',
			obj.domainCategory
		);
	}
	if (!isNonEmptyString(obj.standardDomainName)) {
		throw new DataValidationError(
			'표준도메인명이 비어있습니다.',
			'standardDomainName',
			obj.standardDomainName
		);
	}
	if (!isNonEmptyString(obj.logicalDataType)) {
		throw new DataValidationError(
			'논리데이터타입이 비어있습니다.',
			'logicalDataType',
			obj.logicalDataType
		);
	}
	if (!isNonEmptyString(obj.physicalDataType)) {
		throw new DataValidationError(
			'물리데이터타입이 비어있습니다.',
			'physicalDataType',
			obj.physicalDataType
		);
	}

	// 날짜 형식 검증
	if (!isValidISODate(obj.createdAt)) {
		throw new DataValidationError(
			'생성일이 유효한 ISO 8601 형식이 아닙니다.',
			'createdAt',
			obj.createdAt
		);
	}
}

/**
 * TermEntry 필수 필드 및 형식 검증
 * @param entry - 검증할 엔트리
 * @throws DataValidationError - 검증 실패 시
 */
export function validateTermEntryStrict(entry: unknown): void {
	if (!entry || typeof entry !== 'object') {
		throw new DataValidationError('엔트리가 객체가 아닙니다.', 'entry', entry);
	}

	const obj = entry as Record<string, unknown>;

	// ID 검증
	if (!isValidUUID(obj.id)) {
		throw new DataValidationError('ID가 유효한 UUID 형식이 아닙니다.', 'id', obj.id);
	}

	// 필수 문자열 필드 검증
	if (!isNonEmptyString(obj.termName)) {
		throw new DataValidationError('용어명이 비어있습니다.', 'termName', obj.termName);
	}
	if (!isNonEmptyString(obj.columnName)) {
		throw new DataValidationError('컬럼명이 비어있습니다.', 'columnName', obj.columnName);
	}
	if (!isNonEmptyString(obj.domainName)) {
		throw new DataValidationError('도메인명이 비어있습니다.', 'domainName', obj.domainName);
	}

	// 날짜 형식 검증
	if (!isValidISODate(obj.createdAt)) {
		throw new DataValidationError(
			'생성일이 유효한 ISO 8601 형식이 아닙니다.',
			'createdAt',
			obj.createdAt
		);
	}
}

// ============================================================================
// API 요청 검증 함수
// ============================================================================

/**
 * API 요청의 ID 파라미터 검증
 * @param id - 검증할 ID
 * @throws DataValidationError - 검증 실패 시
 */
export function validateIdParam(id: unknown): asserts id is string {
	if (!isNonEmptyString(id)) {
		throw new DataValidationError('ID가 필요합니다.', 'id', id);
	}
	if (!isValidUUID(id)) {
		throw new DataValidationError('ID가 유효한 UUID 형식이 아닙니다.', 'id', id);
	}
}

/**
 * 페이지네이션 파라미터 검증 및 정규화
 * @param page - 페이지 번호
 * @param limit - 페이지당 항목 수
 * @returns 정규화된 페이지네이션 파라미터
 */
export function validatePagination(page: unknown, limit: unknown): { page: number; limit: number } {
	const parsedPage = typeof page === 'string' ? parseInt(page, 10) : page;
	const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit;

	return {
		page: isPositiveInteger(parsedPage) ? parsedPage : 1,
		limit: isPositiveInteger(parsedLimit) && parsedLimit <= 100 ? parsedLimit : 20
	};
}

// ============================================================================
// 파일 검증 함수
// ============================================================================

/**
 * 업로드된 파일이 유효한 xlsx 파일인지 검증
 * @param file - 업로드된 파일 객체
 * @returns 유효성 검증 결과
 */
export function validateXlsxFile(file: File): boolean {
	// 파일 존재 확인
	if (!file) {
		return false;
	}

	// 파일 크기 검증 (최대 10MB)
	const maxSize = 10 * 1024 * 1024; // 10MB
	if (file.size > maxSize) {
		throw new Error('파일 크기가 너무 큽니다. 최대 10MB까지 업로드 가능합니다.');
	}

	// 파일 타입 검증
	const validMimeTypes = [
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
		'application/vnd.ms-excel' // .xls (하위 호환)
	];

	if (!validMimeTypes.includes(file.type)) {
		throw new Error('지원하지 않는 파일 형식입니다. .xlsx 파일만 업로드 가능합니다.');
	}

	// 파일 확장자 검증
	const fileName = file.name.toLowerCase();
	if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
		throw new Error('파일 확장자가 올바르지 않습니다. .xlsx 파일을 업로드해주세요.');
	}

	return true;
}

import type { VocabularyEntry } from '../types/vocabulary';
/**
 * 원시 단어집 엔트리 데이터의 유효성을 검증하고 정제
 * @param entry - 검증할 원시 데이터 객체
 * @returns 유효한 경우 정제된 데이터, 무효한 경우 null
 */
export function validateVocabularyEntry(entry: VocabularyEntry): {
	standardName: string;
	abbreviation: string;
	englishName: string;
} | null {
	if (!entry || typeof entry !== 'object') {
		return null;
	}

	// 필드 값만 trim
	const standardName = entry.standardName ? String(entry.standardName).trim() : '';
	const abbreviation = entry.abbreviation ? String(entry.abbreviation).trim() : '';
	const englishName = entry.englishName ? String(entry.englishName).trim() : '';

	// 세 필드 모두 값이 있어야 통과
	if (!standardName || !abbreviation || !englishName) {
		return null;
	}

	return {
		standardName,
		abbreviation,
		englishName
	};
}

/**
 * 검색 쿼리 문자열 정제 및 검증
 * @param query - 검색 쿼리 문자열
 * @returns 정제된 검색 쿼리 (유효하지 않은 경우 빈 문자열)
 */
export function sanitizeSearchQuery(query: string): string {
	if (!query || typeof query !== 'string') {
		return '';
	}

	// 앞뒤 공백 제거 및 길이 제한
	const sanitized = query.trim();
	if (sanitized.length === 0 || sanitized.length > 100) {
		return '';
	}

	// 특수문자 이스케이프 (정규식 안전성)
	return sanitized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
