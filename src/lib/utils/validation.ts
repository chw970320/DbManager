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
