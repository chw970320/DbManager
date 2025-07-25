/**
 * 데이터 관리 시스템을 위한 TypeScript 타입 정의
 */

// 개별 단어 엔트리 인터페이스
export interface VocabularyEntry {
	id: string;
	standardName: string; // 표준단어명 (한국어)
	abbreviation: string; // 영문약어
	englishName: string; // 영문명
	description: string; // 설명
	createdAt: string; // ISO 8601 날짜 문자열
	updatedAt: string; // ISO 8601 날짜 문자열
	duplicateInfo?: {
		standardName: boolean;
		abbreviation: boolean;
		englishName: boolean;
	};
}

// 전체 단어집 데이터 구조
export interface VocabularyData {
	entries: VocabularyEntry[];
	lastUpdated: string; // ISO 8601 날짜 문자열
	totalCount: number;
}

// 히스토리 로그 엔트리 인터페이스
export interface HistoryLogEntry {
	id: string; // 히스토리 로그 고유 ID
	action: 'add' | 'update' | 'delete' | 'UPLOAD_MERGE'; // 수행된 작업 타입
	targetId: string; // 대상 단어의 ID
	targetName: string; // 대상 단어의 표준단어명
	timestamp: string; // ISO 8601 날짜 문자열
	details?: {
		// 추가 세부 정보 (선택적)
		before?: Partial<VocabularyEntry>; // 변경 전 데이터 (update/delete 시)
		after?: Partial<VocabularyEntry>; // 변경 후 데이터 (add/update 시)
		// 업로드 관련 추가 정보
		fileName?: string; // 업로드된 파일명
		fileSize?: number; // 파일 크기
		processedCount?: number; // 처리된 항목 수
		replaceMode?: boolean; // 교체 모드 여부
	};
}

// 히스토리 데이터 구조
export interface HistoryData {
	logs: HistoryLogEntry[];
	lastUpdated: string; // ISO 8601 날짜 문자열
	totalCount: number;
}

// 업로드 결과 타입
export interface UploadResult {
	success: boolean;
	message?: string;
	data?: VocabularyData;
	uploadedAt?: string;
	totalEntries?: number;
	error?: string;
}

// 검색 쿼리 타입
export interface SearchQuery {
	query: string;
	field: string;
	exact?: boolean;
}

// 검색 결과 타입
export interface SearchResult {
	totalCount: number;
	query: SearchQuery;
	entries: VocabularyEntry[];
}

// 금지어 엔트리 인터페이스
export interface ForbiddenWordEntry {
	id: string;
	keyword: string; // 금지어 키워드
	type: 'standardName' | 'abbreviation'; // 적용 타입
	reason?: string; // 금지 사유 (선택적)
	createdAt: string; // ISO 8601 날짜 문자열
}

// 금지어 데이터 구조
export interface ForbiddenWordsData {
	entries: ForbiddenWordEntry[];
	lastUpdated: string; // ISO 8601 날짜 문자열
	totalCount: number;
}

// API 응답 타입
export interface ApiResponse {
	success: boolean;
	data?: unknown;
	error?: string;
	message?: string;
}
