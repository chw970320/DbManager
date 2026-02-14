/**
 * 데이터 관리 시스템을 위한 TypeScript 타입 정의
 */

// 개별 단어 엔트리 인터페이스
export interface VocabularyEntry {
	id: string;
	standardName: string; // 표준단어명 (한국어)
	abbreviation: string; // 영문약어
	englishName: string; // 영문명
	description?: string; // 설명
	createdAt: string; // ISO 8601 날짜 문자열
	updatedAt: string; // ISO 8601 날짜 문자열
	isFormalWord?: boolean; // 형식단어여부 (Y/N → true/false)
	domainGroup?: string; // 매핑된 도메인 그룹명
	domainCategory?: string; // 도메인분류명
	isDomainCategoryMapped?: boolean; // 도메인 매핑 성공 여부
	synonyms?: string[]; // 이음동의어 목록
	forbiddenWords?: string[]; // 금칙어 목록
	source?: string; // 출처
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
	/**
	 * @deprecated mappedDomainFile은 하위 호환성을 위해 유지됨.
	 * 새 코드에서는 mapping.domain을 사용하세요.
	 * 로드 시 자동으로 mapping.domain으로 마이그레이션됩니다.
	 */
	mappedDomainFile?: string;
	/** 매핑 정보 (표준 필드) */
	mapping?: {
		domain: string; // 매핑된 도메인 파일명
	};
}

// 금칙어 엔트리 인터페이스
export interface ForbiddenWord {
	id?: string;
	keyword: string;
	type: 'standardName' | 'abbreviation';
	createdAt?: string;
	updatedAt?: string;
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

// API 응답 타입
export interface ApiResponse {
	success: boolean;
	data?: unknown;
	error?: string;
	message?: string;
}
