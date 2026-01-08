/**
 * 용어 관리 타입 정의
 */
import type { VocabularyEntry } from './vocabulary.js';

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
 * 자동 수정 액션 타입
 */
export type AutoFixActionType =
	| 'DELETE_TERM' // 용어 삭제
	| 'DELETE_DUPLICATE' // 중복 항목 삭제
	| 'FIX_TERM_NAME' // 용어명 수정 (동음이의어/금칙어)
	| 'ADD_VOCABULARY' // 단어 추가
	| 'FIX_COLUMN_NAME' // 컬럼명 수정
	| 'FIX_VOCABULARY_SUFFIX' // 단어 형식단어여부 수정 (TERM_NAME_SUFFIX)
	| 'FIX_VOCABULARY_DOMAIN' // 단어 형식단어여부/도메인 수정 (DOMAIN_NAME_MAPPING)
	| 'SELECT_SYNONYM' // 동음이의어 선택
	| 'AUTO_FIX_TERM_EDITOR'; // 용어 수정 팝업 열기 (도메인명 수정 등)

/**
 * 자동 수정 제안
 */
export interface AutoFixSuggestion {
	// 수정할 값들
	termName?: string;
	columnName?: string;
	domainName?: string;
	reason?: string;

	// 자동 수정 메타데이터
	actionType?: AutoFixActionType;
	metadata?: {
		// DELETE_DUPLICATE용
		duplicateEntryIds?: string[];

		// FIX_TERM_NAME용 (동음이의어 선택)
		unmappedParts?: Array<{
			part: string;
			recommendations: string[];
		}>;

		// ADD_VOCABULARY용
		vocabularyToAdd?: Array<{
			standardName: string;
			abbreviation: string;
		}>;

		// FIX_COLUMN_NAME용
		columnNameFixes?: Array<{
			index: number;
			oldValue: string;
			newValue: string;
		}>;

		// FIX_VOCABULARY_SUFFIX, FIX_VOCABULARY_DOMAIN용
		suffixWord?: string; // 접미사 단어
		vocabularyFilename?: string; // 단어집 파일명
		vocabularyEntryId?: string; // 단어 ID (수정 모드용)
		vocabularyEntry?: Partial<VocabularyEntry>; // 이미 찾은 단어 정보 (API 호출 불필요)

		// DOMAIN_NAME_MAPPING용
		recommendedDomainNames?: string[];
	};
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
