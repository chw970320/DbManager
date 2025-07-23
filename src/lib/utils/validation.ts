import type { TerminologyEntry } from '../types/terminology.js';

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

/**
 * 원시 단어집 엔트리 데이터의 유효성을 검증하고 정제
 * @param entry - 검증할 원시 데이터 객체
 * @returns 유효한 경우 정제된 데이터, 무효한 경우 null
 */
export function validateTerminologyEntry(entry: any): {
    standardName: string;
    abbreviation: string;
    englishName: string;
} | null {
    if (!entry || typeof entry !== 'object') {
        return null;
    }

    // 필수 필드 존재 확인 및 문자열 변환
    const standardName = entry.standardName ? String(entry.standardName).trim() : '';
    const abbreviation = entry.abbreviation ? String(entry.abbreviation).trim() : '';
    const englishName = entry.englishName ? String(entry.englishName).trim() : '';

    // 필수 필드 공백 검증
    if (!standardName || !abbreviation || !englishName) {
        return null;
    }

    // 문자열 길이 검증
    if (standardName.length > 100) {
        console.warn('표준단어명이 너무 깁니다 (최대 100자):', standardName);
        return null;
    }

    if (abbreviation.length > 50) {
        console.warn('영문약어가 너무 깁니다 (최대 50자):', abbreviation);
        return null;
    }

    if (englishName.length > 200) {
        console.warn('영문명이 너무 깁니다 (최대 200자):', englishName);
        return null;
    }

    // 영문약어 형식 검증 (영문, 숫자, 하이픈, 언더스코어만 허용)
    const abbreviationPattern = /^[A-Za-z0-9_-]+$/;
    if (!abbreviationPattern.test(abbreviation)) {
        console.warn('영문약어에 허용되지 않는 문자가 포함되어 있습니다:', abbreviation);
        return null;
    }

    // 영문명 형식 검증 (기본적인 영문, 공백, 일부 특수문자 허용)
    const englishNamePattern = /^[A-Za-z0-9\s\-_.()&]+$/;
    if (!englishNamePattern.test(englishName)) {
        console.warn('영문명에 허용되지 않는 문자가 포함되어 있습니다:', englishName);
        return null;
    }

    return {
        standardName,
        abbreviation: abbreviation.toUpperCase(), // 약어는 대문자로 통일
        englishName
    };
}

/**
 * 완성된 TerminologyEntry 객체의 유효성 최종 검증
 * @param entry - 검증할 TerminologyEntry 객체
 * @returns 유효성 검증 결과
 */
export function validateCompleteEntry(entry: TerminologyEntry): boolean {
    if (!entry || typeof entry !== 'object') {
        return false;
    }

    // 필수 필드 존재 확인
    const requiredFields = ['id', 'standardName', 'abbreviation', 'englishName', 'createdAt'];
    for (const field of requiredFields) {
        if (!entry[field as keyof TerminologyEntry]) {
            return false;
        }
    }

    // ID 형식 검증 (UUID v4)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(entry.id)) {
        return false;
    }

    // 날짜 형식 검증 (ISO 8601)
    try {
        const date = new Date(entry.createdAt);
        if (isNaN(date.getTime())) {
            return false;
        }
    } catch {
        return false;
    }

    return true;
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