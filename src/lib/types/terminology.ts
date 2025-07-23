/**
 * 데이터 관리 시스템을 위한 TypeScript 타입 정의
 */

// 개별 단어 엔트리 인터페이스
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

// 전체 단어집 데이터 구조
export interface TerminologyData {
    entries: TerminologyEntry[];
    lastUpdated: string;   // ISO 8601 날짜 문자열
    totalCount: number;
}

// 히스토리 로그 엔트리 인터페이스
export interface HistoryLogEntry {
    id: string;            // 히스토리 로그 고유 ID
    action: 'add' | 'update' | 'delete' | 'UPLOAD_MERGE';  // 수행된 작업 타입
    targetId: string;      // 대상 단어의 ID
    targetName: string;    // 대상 단어의 표준단어명
    timestamp: string;     // ISO 8601 날짜 문자열
    details?: {            // 추가 세부 정보 (선택적)
        before?: Partial<TerminologyEntry>;  // 변경 전 데이터 (update/delete 시)
        after?: Partial<TerminologyEntry>;   // 변경 후 데이터 (add/update 시)
        // 업로드 관련 추가 정보
        fileName?: string;     // 업로드된 파일명
        fileSize?: number;     // 파일 크기
        processedCount?: number; // 처리된 항목 수
        replaceMode?: boolean;   // 교체 모드 여부
    };
}

// 히스토리 데이터 구조
export interface HistoryData {
    logs: HistoryLogEntry[];
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