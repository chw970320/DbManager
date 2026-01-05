/**
 * 용어 관리 타입 정의
 */

export interface TermEntry {
	id: string;
	termName: string; // 용어명 (단어집 standardName 기반)
	columnName: string; // 컬럼명 (단어집 abbreviation 기반)
	domainName: string; // 도메인 명 (standardDomainName 기반)
	isMappedTerm: boolean; // 용어명 매핑 성공 여부
	isMappedColumn: boolean; // 컬럼명 매핑 성공 여부
	isMappedDomain: boolean; // 도메인 매핑 성공 여부
	unmappedTermParts?: string[]; // 용어명에서 매핑되지 않은 부분들
	unmappedColumnParts?: string[]; // 컬럼명에서 매핑되지 않은 부분들
	createdAt: string; // ISO 8601
	updatedAt: string; // ISO 8601
}

export interface TermData {
	entries: TermEntry[];
	lastUpdated: string;
	totalCount: number;
	mapping?: {
		vocabulary: string; // 매핑된 단어집 파일명
		domain: string; // 매핑된 도메인 파일명
	};
}

export interface TermHistoryLogEntry {
	id: string;
	action: 'add' | 'update' | 'delete' | 'UPLOAD_MERGE';
	targetId: string;
	targetName: string;
	timestamp: string;
	filename?: string;
	details?: {
		before?: Partial<TermEntry>;
		after?: Partial<TermEntry>;
		fileName?: string;
		fileSize?: number;
		processedCount?: number;
		replaceMode?: boolean;
	};
}

export interface TermHistoryData {
	logs: TermHistoryLogEntry[];
	lastUpdated: string;
	totalCount: number;
}

/**
 * Validation 오류 타입
 */
export type ValidationErrorType =
	| 'TERM_NAME_LENGTH'
	| 'TERM_NAME_SUFFIX'
	| 'TERM_NAME_DUPLICATE'
	| 'TERM_UNIQUENESS'
	| 'TERM_NAME_MAPPING'
	| 'COLUMN_NAME_MAPPING'
	| 'DOMAIN_NAME_MAPPING';

/**
 * Validation 오류 정보
 */
export interface ValidationError {
	type: ValidationErrorType;
	message: string;
	field?: string;
}

/**
 * 자동 수정 제안
 */
export interface AutoFixSuggestion {
	termName?: string;
	columnName?: string;
	domainName?: string;
	reason?: string;
}

/**
 * Validation 결과
 */
export interface ValidationResult {
	entry: TermEntry;
	errors: ValidationError[];
	suggestions?: AutoFixSuggestion;
}

/**
 * 전체 Validation 체크 결과
 */
export interface ValidationCheckResult {
	totalCount: number;
	failedCount: number;
	passedCount: number;
	failedEntries: ValidationResult[];
}
