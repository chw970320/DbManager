/**
 * 도메인 관리 시스템을 위한 TypeScript 타입 정의
 */

// 개별 도메인 엔트리 인터페이스
export interface DomainEntry {
    id: string;
    domainGroup: string;           // A: 도메인그룹
    domainCategory: string;        // B: 도메인 분류명
    standardDomainName: string;    // C: 표준 도메인명
    logicalDataType: string;       // D: 논리 데이터타입
    physicalDataType: string;      // E: 물리 데이터타입
    dataLength?: number;           // F: 데이터 길이 (선택적)
    decimalPlaces?: number;        // G: 소수점자리수 (선택적)
    dataValue?: string;            // H: 데이터값 (선택적)
    measurementUnit?: string;      // I: 측정단위 (선택적)
    remarks?: string;              // J: 비고 (선택적)
    createdAt: string;             // ISO 8601 날짜 문자열
    updatedAt: string;             // ISO 8601 날짜 문자열
}

// 전체 도메인 데이터 구조
export interface DomainData {
    entries: DomainEntry[];
    lastUpdated: string;       // ISO 8601 날짜 문자열
    totalCount: number;
}

// 히스토리 로그 엔트리 인터페이스
export interface DomainHistoryLogEntry {
    id: string;                // 히스토리 로그 고유 ID
    action: 'add' | 'update' | 'delete' | 'UPLOAD_MERGE';  // 수행된 작업 타입
    targetId: string;          // 대상 도메인의 ID
    targetName: string;        // 대상 도메인의 표준 도메인명
    timestamp: string;         // ISO 8601 날짜 문자열
    details?: {                // 추가 세부 정보 (선택적)
        before?: Partial<DomainEntry>;  // 변경 전 데이터 (update/delete 시)
        after?: Partial<DomainEntry>;   // 변경 후 데이터 (add/update 시)
        // 업로드 관련 추가 정보
        fileName?: string;     // 업로드된 파일명
        fileSize?: number;     // 파일 크기
        processedCount?: number; // 처리된 항목 수
        replaceMode?: boolean;   // 교체 모드 여부
    };
}

// 히스토리 데이터 구조
export interface DomainHistoryData {
    logs: DomainHistoryLogEntry[];
    lastUpdated: string;       // ISO 8601 날짜 문자열
    totalCount: number;
}

// 파일 업로드 관련 타입
export interface DomainUploadResult {
    success: boolean;
    message: string;
    fileName?: string;
    uploadedAt?: string;
    totalEntries?: number;
    data?: DomainData;
    error?: string;
}

// 검색 쿼리 인터페이스
export interface DomainSearchQuery {
    query: string;
    field?: 'all' | 'domainGroup' | 'domainCategory' | 'standardDomainName' | 'logicalDataType' | 'physicalDataType';
}

// 검색 결과 인터페이스
export interface DomainSearchResult {
    entries: DomainEntry[];
    totalCount: number;
    query: DomainSearchQuery;
}

// 페이지네이션 관련 타입
export interface DomainPaginationParams {
    page: number;
    limit: number;
    sortBy?: keyof DomainEntry;
    sortOrder?: 'asc' | 'desc';
}

// API 응답 공통 인터페이스
export interface DomainApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    pagination?: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
    };
}

// XLSX 파싱을 위한 원본 데이터 타입 (파싱 전 상태)
export interface RawDomainData {
    도메인그룹: string;              // A
    '도메인 분류명': string;         // B
    '표준 도메인명': string;         // C
    '논리 데이터타입': string;       // D
    '물리 데이터타입': string;       // E
    '데이터 길이'?: string | number; // F
    소수점자리수?: string | number;   // G
    데이터값?: string;               // H
    측정단위?: string;               // I
    비고?: string;                   // J
} 