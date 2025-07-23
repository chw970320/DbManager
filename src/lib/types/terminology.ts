/**
 * 용어집 관리 시스템을 위한 TypeScript 타입 정의
 */

// 개별 용어 엔트리 인터페이스
export interface TerminologyEntry {
    id: string;
    standardName: string;  // 표준단어명 (한국어)
    abbreviation: string;  // 영문약어
    englishName: string;   // 영문명
    description: string;    // 설명
    createdAt: string;     // ISO 8601 날짜 문자열
    updatedAt: string;     // ISO 8601 날짜 문자열
    duplicateInfo?: {      // 중복 정보 (선택적)
        standardName: boolean;
        abbreviation: boolean;
        englishName: boolean;
    };
}

// 전체 용어집 데이터 구조
export interface TerminologyData {
    entries: TerminologyEntry[];
    lastUpdated: string;   // ISO 8601 날짜 문자열
    totalCount: number;
}

// 파일 업로드 관련 타입
export interface UploadResult {
    success: boolean;
    message: string;
    fileName?: string;
    uploadedAt?: string;
    totalEntries?: number;
    data?: TerminologyData;
    error?: string;
}

// 검색 쿼리 인터페이스
export interface SearchQuery {
    query: string;
    field?: 'all' | 'standardName' | 'abbreviation' | 'englishName';
}

// 검색 결과 인터페이스
export interface SearchResult {
    entries: TerminologyEntry[];
    totalCount: number;
    query: SearchQuery;
}

// API 응답 공통 인터페이스
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
} 