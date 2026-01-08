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

/**
 * 금칙어 및 이음동의어 validation
 * @param standardName - 검증할 표준단어명
 * @param allVocabularyEntries - 모든 단어집 파일의 엔트리 배열
 * @returns validation 결과 (에러 메시지 또는 null)
 */
export function validateForbiddenWordsAndSynonyms(
	standardName: string,
	allVocabularyEntries: VocabularyEntry[]
): string | null {
	if (!standardName || typeof standardName !== 'string') {
		return null;
	}

	const trimmedName = standardName.trim().toLowerCase();

	// 모든 단어집 파일의 금칙어 합집합 생성
	const allForbiddenWords = new Set<string>();
	for (const entry of allVocabularyEntries) {
		if (entry.forbiddenWords && Array.isArray(entry.forbiddenWords)) {
			for (const word of entry.forbiddenWords) {
				if (typeof word === 'string' && word.trim()) {
					allForbiddenWords.add(word.trim().toLowerCase());
				}
			}
		}
	}

	// 표준단어명이 금칙어와 정확히 일치하는지 확인
	if (allForbiddenWords.has(trimmedName)) {
		return `'${standardName}'은(는) 금칙어로 등록되어 있어 사용할 수 없습니다.`;
	}

	// 모든 단어집 파일의 이음동의어 합집합 생성
	const allSynonyms = new Set<string>();
	for (const entry of allVocabularyEntries) {
		if (entry.synonyms && Array.isArray(entry.synonyms)) {
			for (const synonym of entry.synonyms) {
				if (typeof synonym === 'string' && synonym.trim()) {
					allSynonyms.add(synonym.trim().toLowerCase());
				}
			}
		}
	}

	// 표준단어명이 이음동의어와 정확히 일치하는지 확인
	if (allSynonyms.has(trimmedName)) {
		return `'${standardName}'은(는) 이음동의어로 등록되어 있어 사용할 수 없습니다.`;
	}

	return null;
}

/**
 * 도메인명 자동 생성
 * @param domainCategory - 도메인분류명
 * @param physicalDataType - 물리데이터타입
 * @param dataLength - 데이터길이
 * @param decimalPlaces - 소수점자리수
 * @returns 생성된 표준 도메인명
 */
export function generateStandardDomainName(
	domainCategory: string,
	physicalDataType: string,
	dataLength?: string | number,
	decimalPlaces?: string | number
): string {
	const category = (domainCategory || '').trim();
	const dataType = (physicalDataType || '').trim();

	// 물리데이터타입의 첫 글자 추출
	const dataTypeFirstChar = dataType.length > 0 ? dataType[0].toUpperCase() : '';

	// 데이터길이 처리
	const length =
		dataLength !== undefined && dataLength !== null && dataLength !== ''
			? String(dataLength).trim()
			: '';

	// 소수점자리수 처리
	const decimal =
		decimalPlaces !== undefined && decimalPlaces !== null && decimalPlaces !== ''
			? String(decimalPlaces).trim()
			: '';

	// 도메인명 생성
	let domainName = category + dataTypeFirstChar;

	if (length) {
		domainName += length;
		if (decimal) {
			domainName += ',' + decimal;
		}
	}

	return domainName;
}

/**
 * 도메인명 유일성 validation
 * @param standardDomainName - 검증할 표준 도메인명
 * @param allDomainEntries - 모든 도메인 엔트리 배열
 * @param excludeId - 제외할 엔트리 ID (수정 시 사용)
 * @returns validation 결과 (에러 메시지 또는 null)
 */
export function validateDomainNameUniqueness(
	standardDomainName: string,
	allDomainEntries: Array<{ id: string; standardDomainName: string }>,
	excludeId?: string
): string | null {
	if (!standardDomainName || typeof standardDomainName !== 'string') {
		return null;
	}

	const trimmedName = standardDomainName.trim().toLowerCase();

	// 동일한 표준 도메인명이 이미 존재하는지 확인
	const duplicate = allDomainEntries.find(
		(entry) =>
			entry.id !== excludeId && entry.standardDomainName.trim().toLowerCase() === trimmedName
	);

	if (duplicate) {
		return `'${standardDomainName}'은(는) 이미 사용 중인 도메인명입니다.`;
	}

	return null;
}

/**
 * 용어명 접미사 validation
 * @param termName - 검증할 용어명 (예: "사용자_이름")
 * @param vocabularyEntries - 단어집 엔트리 배열
 * @returns validation 결과 (에러 메시지 또는 null)
 */
export function validateTermNameSuffix(
	termName: string,
	vocabularyEntries: Array<{ standardName: string; isFormalWord?: boolean }>
): string | null {
	if (!termName || typeof termName !== 'string') {
		return null;
	}

	// 용어명을 언더스코어로 분리
	const parts = termName
		.split('_')
		.map((p) => p.trim())
		.filter((p) => p.length > 0);

	if (parts.length === 0) {
		return '용어명이 비어있습니다.';
	}

	// 마지막 단어(접미사) 추출
	const suffix = parts[parts.length - 1].toLowerCase();

	// 단어집에서 접미사에 해당하는 단어 찾기
	const vocabularyWord = vocabularyEntries.find(
		(entry) => entry.standardName.trim().toLowerCase() === suffix
	);

	if (!vocabularyWord) {
		return `'${suffix}'은(는) 단어집에 등록되지 않은 단어입니다.`;
	}

	// 형식단어여부 확인
	if (vocabularyWord.isFormalWord !== true) {
		return `'${suffix}'은(는) 형식단어가 아니므로 용어명의 접미사로 사용할 수 없습니다. (형식단어여부: N)`;
	}

	return null;
}

/**
 * 용어명 유일성 validation
 * @param termName - 검증할 용어명
 * @param allTermEntries - 모든 용어 엔트리 배열
 * @param excludeId - 제외할 엔트리 ID (수정 시 사용)
 * @returns validation 결과 (에러 메시지 또는 null)
 */
export function validateTermNameUniqueness(
	termName: string,
	allTermEntries: Array<{ id: string; termName: string }>,
	excludeId?: string
): string | null {
	if (!termName || typeof termName !== 'string') {
		return null;
	}

	const trimmedName = termName.trim().toLowerCase();

	// 동일한 용어명이 이미 존재하는지 확인
	const duplicate = allTermEntries.find(
		(entry) => entry.id !== excludeId && entry.termName.trim().toLowerCase() === trimmedName
	);

	if (duplicate) {
		return `'${termName}'은(는) 이미 사용 중인 용어명입니다.`;
	}

	return null;
}

/**
 * 용어 유일성 validation (termName, columnName, domainName 조합)
 * @param termName - 검증할 용어명
 * @param columnName - 검증할 컬럼명
 * @param domainName - 검증할 도메인명
 * @param allTermEntries - 모든 용어 엔트리 배열
 * @param excludeId - 제외할 엔트리 ID (수정 시 사용)
 * @returns validation 결과 (에러 메시지 또는 null)
 */
export function validateTermUniqueness(
	termName: string,
	columnName: string,
	domainName: string,
	allTermEntries: Array<{ id: string; termName: string; columnName: string; domainName: string }>,
	excludeId?: string
): string | null {
	if (!termName || typeof termName !== 'string') {
		return null;
	}

	const trimmedTermName = termName.trim().toLowerCase();
	const trimmedColumnName = columnName?.trim().toLowerCase() || '';
	const trimmedDomainName = domainName?.trim().toLowerCase() || '';

	// 동일한 조합(termName, columnName, domainName)이 이미 존재하는지 확인
	const duplicate = allTermEntries.find(
		(entry) =>
			entry.id !== excludeId &&
			entry.termName.trim().toLowerCase() === trimmedTermName &&
			entry.columnName.trim().toLowerCase() === trimmedColumnName &&
			entry.domainName.trim().toLowerCase() === trimmedDomainName
	);

	if (duplicate) {
		return `동일한 용어명, 컬럼명, 도메인명 조합이 이미 존재합니다. (용어명: ${termName}, 컬럼명: ${columnName}, 도메인명: ${domainName})`;
	}

	return null;
}

/**
 * 용어명 매핑 validation
 * 용어명의 모든 부분이 단어집에 식별되는지 확인
 * @param termName - 검증할 용어명
 * @param vocabularyEntries - 단어집 엔트리 배열
 * @returns validation 결과 (에러 메시지 또는 null)
 */
export function validateTermNameMapping(
	termName: string,
	vocabularyEntries: Array<{ standardName: string; abbreviation: string }>
): string | null {
	if (!termName || typeof termName !== 'string') {
		return '용어명이 필요합니다.';
	}

	const termParts = termName
		.split('_')
		.map((p) => p.trim())
		.filter((p) => p.length > 0);

	if (termParts.length === 0) {
		return '용어명이 비어있습니다.';
	}

	// 단어집 맵 생성
	const vocabularyMap = new Map<string, { standardName: string; abbreviation: string }>();
	vocabularyEntries.forEach((entry) => {
		const standardNameKey = entry.standardName.trim().toLowerCase();
		const abbreviationKey = entry.abbreviation.trim().toLowerCase();
		vocabularyMap.set(standardNameKey, {
			standardName: entry.standardName,
			abbreviation: entry.abbreviation
		});
		vocabularyMap.set(abbreviationKey, {
			standardName: entry.standardName,
			abbreviation: entry.abbreviation
		});
	});

	// 각 부분이 단어집에 있는지 확인
	const unmappedParts: string[] = [];
	for (const part of termParts) {
		const partLower = part.toLowerCase();
		let found = false;
		for (const [key] of vocabularyMap.entries()) {
			if (key === partLower) {
				found = true;
				break;
			}
		}
		if (!found) {
			unmappedParts.push(part);
		}
	}

	if (unmappedParts.length > 0) {
		return `용어명의 다음 부분이 단어집에 등록되지 않았습니다: ${unmappedParts.join(', ')}`;
	}

	return null;
}

/**
 * 컬럼명 매핑 validation
 * 컬럼명의 모든 부분이 영문약어로 식별되는지 확인
 * @param columnName - 검증할 컬럼명
 * @param vocabularyEntries - 단어집 엔트리 배열
 * @returns validation 결과 (에러 메시지 또는 null)
 */
export function validateColumnNameMapping(
	columnName: string,
	vocabularyEntries: Array<{ standardName: string; abbreviation: string }>
): string | null {
	if (!columnName || typeof columnName !== 'string') {
		return '컬럼명이 필요합니다.';
	}

	const columnParts = columnName
		.split('_')
		.map((p) => p.trim())
		.filter((p) => p.length > 0);

	if (columnParts.length === 0) {
		return '컬럼명이 비어있습니다.';
	}

	// 단어집 맵 생성 (abbreviation만 사용)
	const abbreviationMap = new Set<string>();
	vocabularyEntries.forEach((entry) => {
		const abbreviationKey = entry.abbreviation.trim().toLowerCase();
		abbreviationMap.add(abbreviationKey);
	});

	// 각 부분이 영문약어로 식별되는지 확인
	const unmappedParts: string[] = [];
	for (const part of columnParts) {
		const partLower = part.toLowerCase();
		if (!abbreviationMap.has(partLower)) {
			unmappedParts.push(part);
		}
	}

	if (unmappedParts.length > 0) {
		return `컬럼명의 다음 부분이 영문약어로 등록되지 않았습니다: ${unmappedParts.join(', ')}`;
	}

	return null;
}

/**
 * 도메인명 매핑 validation
 * 도메인명이 도메인 데이터에 존재하는지 확인
 * @param domainName - 검증할 도메인명
 * @param domainEntries - 도메인 엔트리 배열
 * @returns validation 결과 (에러 메시지 또는 null)
 */
export function validateDomainNameMapping(
	domainName: string,
	domainEntries: Array<{ standardDomainName: string }>
): string | null {
	if (!domainName || typeof domainName !== 'string') {
		return '도메인명이 필요합니다.';
	}

	const domainNameLower = domainName.trim().toLowerCase();
	const domainMap = new Set<string>();
	domainEntries.forEach((entry) => {
		if (entry.standardDomainName) {
			domainMap.add(entry.standardDomainName.trim().toLowerCase());
		}
	});

	if (!domainMap.has(domainNameLower)) {
		return `도메인명 '${domainName}'이(가) 도메인 데이터에 존재하지 않습니다.`;
	}

	return null;
}
