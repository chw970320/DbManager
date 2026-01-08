/**
 * 런타임 타입 검증을 위한 타입 가드 함수들
 * JSON 파싱 결과의 안전한 타입 검증을 제공합니다.
 */

import type { VocabularyEntry, VocabularyData } from '$lib/types/vocabulary';
import type { DomainEntry, DomainData } from '$lib/types/domain';
import type { TermEntry, TermData } from '$lib/types/term';

// ============================================================================
// 기본 유틸리티 함수
// ============================================================================

/**
 * 값이 객체인지 확인 (null 제외)
 */
function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 값이 문자열인지 확인
 */
function isString(value: unknown): value is string {
	return typeof value === 'string';
}

/**
 * 값이 숫자인지 확인
 */
function isNumber(value: unknown): value is number {
	return typeof value === 'number' && !isNaN(value);
}

/**
 * 값이 boolean인지 확인
 */
function isBoolean(value: unknown): value is boolean {
	return typeof value === 'boolean';
}

/**
 * 값이 배열인지 확인
 */
function isArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

/**
 * ISO 8601 날짜 문자열인지 확인 (간단한 검증)
 */
function isISODateString(value: unknown): value is string {
	if (!isString(value)) return false;
	// 간단한 ISO 8601 형식 체크
	const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
	return isoDateRegex.test(value) || !isNaN(Date.parse(value));
}

// ============================================================================
// Vocabulary 타입 가드
// ============================================================================

/**
 * VocabularyEntry 타입 가드
 */
export function isVocabularyEntry(value: unknown): value is VocabularyEntry {
	if (!isObject(value)) return false;

	// 필수 필드 검증
	const required =
		isString(value.id) &&
		isString(value.standardName) &&
		isString(value.abbreviation) &&
		isString(value.englishName) &&
		isString(value.description) &&
		isString(value.createdAt) &&
		isString(value.updatedAt);

	if (!required) return false;

	// 선택적 필드 검증 (존재하면 타입 체크)
	if (value.isFormalWord !== undefined && !isBoolean(value.isFormalWord)) return false;
	if (value.domainGroup !== undefined && !isString(value.domainGroup)) return false;
	if (value.domainCategory !== undefined && !isString(value.domainCategory)) return false;
	if (value.isDomainCategoryMapped !== undefined && !isBoolean(value.isDomainCategoryMapped))
		return false;
	if (value.source !== undefined && !isString(value.source)) return false;

	// 배열 필드 검증
	if (value.synonyms !== undefined) {
		if (!isArray(value.synonyms) || !value.synonyms.every(isString)) return false;
	}
	if (value.forbiddenWords !== undefined) {
		if (!isArray(value.forbiddenWords) || !value.forbiddenWords.every(isString)) return false;
	}

	// duplicateInfo 객체 검증
	if (value.duplicateInfo !== undefined) {
		if (!isObject(value.duplicateInfo)) return false;
		const di = value.duplicateInfo;
		if (di.standardName !== undefined && !isBoolean(di.standardName)) return false;
		if (di.abbreviation !== undefined && !isBoolean(di.abbreviation)) return false;
		if (di.englishName !== undefined && !isBoolean(di.englishName)) return false;
	}

	return true;
}

/**
 * VocabularyData 타입 가드
 */
export function isVocabularyData(value: unknown): value is VocabularyData {
	if (!isObject(value)) return false;

	// 필수 필드 검증
	if (!isArray(value.entries)) return false;
	if (!isString(value.lastUpdated)) return false;
	if (!isNumber(value.totalCount)) return false;

	// entries 배열의 각 항목 검증
	if (!value.entries.every(isVocabularyEntry)) return false;

	// 선택적 필드 검증
	if (value.mappedDomainFile !== undefined && !isString(value.mappedDomainFile)) return false;
	if (value.mapping !== undefined) {
		if (!isObject(value.mapping)) return false;
		if (!isString(value.mapping.domain)) return false;
	}

	return true;
}

// ============================================================================
// Domain 타입 가드
// ============================================================================

/**
 * DomainEntry 타입 가드
 */
export function isDomainEntry(value: unknown): value is DomainEntry {
	if (!isObject(value)) return false;

	// 필수 필드 검증
	const required =
		isString(value.id) &&
		isString(value.domainGroup) &&
		isString(value.domainCategory) &&
		isString(value.standardDomainName) &&
		isString(value.physicalDataType) &&
		isString(value.createdAt) &&
		isString(value.updatedAt);

	if (!required) return false;

	// 선택적 필드 검증
	if (value.dataLength !== undefined && !isString(value.dataLength)) return false;
	if (value.decimalPlaces !== undefined && !isString(value.decimalPlaces)) return false;
	if (value.measurementUnit !== undefined && !isString(value.measurementUnit)) return false;
	if (value.revision !== undefined && !isString(value.revision)) return false;
	if (value.description !== undefined && !isString(value.description)) return false;
	if (value.storageFormat !== undefined && !isString(value.storageFormat)) return false;
	if (value.displayFormat !== undefined && !isString(value.displayFormat)) return false;
	if (value.allowedValues !== undefined && !isString(value.allowedValues)) return false;

	return true;
}

/**
 * DomainData 타입 가드
 */
export function isDomainData(value: unknown): value is DomainData {
	if (!isObject(value)) return false;

	// 필수 필드 검증
	if (!isArray(value.entries)) return false;
	if (!isString(value.lastUpdated)) return false;
	if (!isNumber(value.totalCount)) return false;

	// entries 배열의 각 항목 검증
	if (!value.entries.every(isDomainEntry)) return false;

	return true;
}

// ============================================================================
// Term 타입 가드
// ============================================================================

/**
 * TermEntry 타입 가드
 */
export function isTermEntry(value: unknown): value is TermEntry {
	if (!isObject(value)) return false;

	// 필수 필드 검증
	return (
		isString(value.id) &&
		isString(value.termName) &&
		isString(value.columnName) &&
		isString(value.domainName) &&
		isBoolean(value.isMappedTerm) &&
		isBoolean(value.isMappedColumn) &&
		isBoolean(value.isMappedDomain) &&
		isString(value.createdAt) &&
		isString(value.updatedAt)
	);
}

/**
 * TermData 타입 가드
 */
export function isTermData(value: unknown): value is TermData {
	if (!isObject(value)) return false;

	// 필수 필드 검증
	if (!isArray(value.entries)) return false;
	if (!isString(value.lastUpdated)) return false;
	if (!isNumber(value.totalCount)) return false;

	// entries 배열의 각 항목 검증
	if (!value.entries.every(isTermEntry)) return false;

	// 선택적 필드 검증
	if (value.mapping !== undefined) {
		if (!isObject(value.mapping)) return false;
		if (!isString(value.mapping.vocabulary)) return false;
		if (!isString(value.mapping.domain)) return false;
	}

	return true;
}

// ============================================================================
// 안전한 JSON 파싱 헬퍼
// ============================================================================

/**
 * 타입 검증 에러 클래스
 */
export class TypeValidationError extends Error {
	constructor(
		message: string,
		public readonly expectedType: string,
		public readonly actualValue?: unknown
	) {
		super(message);
		this.name = 'TypeValidationError';
	}
}

/**
 * 안전한 JSON 파싱 및 타입 검증
 * @param jsonString - 파싱할 JSON 문자열
 * @param typeGuard - 타입 가드 함수
 * @param typeName - 예상 타입 이름 (에러 메시지용)
 * @returns 검증된 데이터
 * @throws TypeValidationError - 타입 검증 실패 시
 */
export function safeJsonParse<T>(
	jsonString: string,
	typeGuard: (value: unknown) => value is T,
	typeName: string
): T {
	let parsed: unknown;

	try {
		parsed = JSON.parse(jsonString);
	} catch (error) {
		throw new TypeValidationError(
			`JSON 파싱 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
			typeName
		);
	}

	if (!typeGuard(parsed)) {
		throw new TypeValidationError(
			`타입 검증 실패: ${typeName} 형식과 일치하지 않습니다.`,
			typeName,
			parsed
		);
	}

	return parsed;
}

/**
 * 안전한 request.json() 파싱 및 타입 검증
 * @param request - Request 객체
 * @param typeGuard - 타입 가드 함수
 * @param typeName - 예상 타입 이름 (에러 메시지용)
 * @returns 검증된 데이터
 * @throws TypeValidationError - 타입 검증 실패 시
 */
export async function safeRequestJson<T>(
	request: Request,
	typeGuard: (value: unknown) => value is T,
	typeName: string
): Promise<T> {
	let parsed: unknown;

	try {
		parsed = await request.json();
	} catch (error) {
		throw new TypeValidationError(
			`요청 JSON 파싱 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
			typeName
		);
	}

	if (!typeGuard(parsed)) {
		throw new TypeValidationError(
			`요청 타입 검증 실패: ${typeName} 형식과 일치하지 않습니다.`,
			typeName,
			parsed
		);
	}

	return parsed;
}

// ============================================================================
// FormData 안전한 추출 유틸리티
// ============================================================================

/**
 * FormData 검증 에러
 */
export class FormDataValidationError extends Error {
	constructor(
		message: string,
		public readonly fieldName: string
	) {
		super(message);
		this.name = 'FormDataValidationError';
	}
}

/**
 * FormData에서 필수 File 안전하게 추출
 * @param formData - FormData 객체
 * @param fieldName - 필드명
 * @returns File 객체
 * @throws FormDataValidationError - 파일이 없거나 유효하지 않은 경우
 */
export function getRequiredFile(formData: FormData, fieldName: string): File {
	const value = formData.get(fieldName);

	if (value === null) {
		throw new FormDataValidationError(`필수 파일 '${fieldName}'이(가) 누락되었습니다.`, fieldName);
	}

	if (!(value instanceof File)) {
		throw new FormDataValidationError(`'${fieldName}'이(가) 파일 형식이 아닙니다.`, fieldName);
	}

	if (value.size === 0) {
		throw new FormDataValidationError(`'${fieldName}' 파일이 비어있습니다.`, fieldName);
	}

	return value;
}

/**
 * FormData에서 필수 문자열 안전하게 추출
 * @param formData - FormData 객체
 * @param fieldName - 필드명
 * @returns 문자열 값
 * @throws FormDataValidationError - 값이 없거나 빈 문자열인 경우
 */
export function getRequiredString(formData: FormData, fieldName: string): string {
	const value = formData.get(fieldName);

	if (value === null) {
		throw new FormDataValidationError(`필수 필드 '${fieldName}'이(가) 누락되었습니다.`, fieldName);
	}

	if (typeof value !== 'string') {
		throw new FormDataValidationError(`'${fieldName}'이(가) 문자열 형식이 아닙니다.`, fieldName);
	}

	if (value.trim() === '') {
		throw new FormDataValidationError(`'${fieldName}' 값이 비어있습니다.`, fieldName);
	}

	return value;
}

/**
 * FormData에서 선택적 문자열 안전하게 추출
 * @param formData - FormData 객체
 * @param fieldName - 필드명
 * @param defaultValue - 기본값
 * @returns 문자열 값 또는 기본값
 */
export function getOptionalString(
	formData: FormData,
	fieldName: string,
	defaultValue: string
): string {
	const value = formData.get(fieldName);

	if (value === null || typeof value !== 'string' || value.trim() === '') {
		return defaultValue;
	}

	return value;
}

/**
 * FormData에서 boolean 값 안전하게 추출
 * @param formData - FormData 객체
 * @param fieldName - 필드명
 * @param defaultValue - 기본값
 * @returns boolean 값
 */
export function getOptionalBoolean(
	formData: FormData,
	fieldName: string,
	defaultValue: boolean = false
): boolean {
	const value = formData.get(fieldName);

	if (value === null || typeof value !== 'string') {
		return defaultValue;
	}

	return value === 'true';
}

// ============================================================================
// 객체 병합 유틸리티 (undefined 값 필터링)
// ============================================================================

/**
 * 객체에서 undefined 값을 가진 속성 제거
 * 부분 업데이트 시 undefined가 기존 값을 덮어쓰는 문제 방지
 *
 * @param obj - 필터링할 객체
 * @returns undefined 값이 제거된 새 객체
 */
export function removeUndefinedValues<T>(obj: T): Partial<T> {
	if (obj === null || typeof obj !== 'object') {
		return obj as Partial<T>;
	}

	const result = {} as Partial<T>;
	const entries = Object.entries(obj as object);

	for (const [key, value] of entries) {
		if (value !== undefined) {
			(result as Record<string, unknown>)[key] = value;
		}
	}

	return result;
}

/**
 * 부분 업데이트를 위한 안전한 객체 병합
 * undefined 값은 무시하고, 정의된 값만 기존 데이터에 덮어씀
 *
 * @param original - 원본 객체
 * @param updates - 업데이트할 객체 (undefined 값 포함 가능)
 * @returns 병합된 새 객체
 */
export function safeMerge<T>(original: T, updates: Partial<T>): T {
	const filteredUpdates = removeUndefinedValues(updates);
	return { ...original, ...filteredUpdates } as T;
}
