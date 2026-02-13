/**
 * 공통 기본 타입 정의
 * 모든 데이터 타입의 공통 인터페이스와 타입 매핑을 제공합니다.
 */

import type { VocabularyEntry, VocabularyData } from './vocabulary.js';
import type { DomainEntry, DomainData } from './domain.js';
import type { TermEntry, TermData } from './term.js';
import type {
	DatabaseEntry,
	DatabaseData,
	EntityEntry,
	EntityData,
	AttributeEntry,
	AttributeData,
	TableEntry,
	TableData,
	ColumnEntry,
	ColumnData
} from './database-design.js';

// ============================================================================
// 데이터 타입 식별자
// ============================================================================

/**
 * 모든 데이터 타입의 8가지 식별자
 */
export type DataType =
	| 'vocabulary'
	| 'domain'
	| 'term'
	| 'database'
	| 'entity'
	| 'attribute'
	| 'table'
	| 'column';

/**
 * 모든 데이터 타입 목록 (런타임 사용)
 */
export const ALL_DATA_TYPES: DataType[] = [
	'vocabulary',
	'domain',
	'term',
	'database',
	'entity',
	'attribute',
	'table',
	'column'
];

// ============================================================================
// 공통 기본 인터페이스
// ============================================================================

/**
 * 모든 엔트리의 공통 기본 인터페이스
 */
export interface BaseEntry {
	id: string;
	createdAt: string;
	updatedAt?: string;
}

/**
 * 모든 Data 컨테이너의 공통 기본 인터페이스
 */
export interface BaseData<T extends BaseEntry = BaseEntry> {
	entries: T[];
	lastUpdated: string;
	totalCount: number;
}

// ============================================================================
// 타입 매핑 (DataType → 실제 TypeScript 타입)
// ============================================================================

/**
 * DataType → Entry 타입 매핑
 */
export type EntryTypeMap = {
	vocabulary: VocabularyEntry;
	domain: DomainEntry;
	term: TermEntry;
	database: DatabaseEntry;
	entity: EntityEntry;
	attribute: AttributeEntry;
	table: TableEntry;
	column: ColumnEntry;
};

/**
 * DataType → Data 컨테이너 타입 매핑
 */
export type DataTypeMap = {
	vocabulary: VocabularyData;
	domain: DomainData;
	term: TermData;
	database: DatabaseData;
	entity: EntityData;
	attribute: AttributeData;
	table: TableData;
	column: ColumnData;
};

// ============================================================================
// 타입별 기본 파일명
// ============================================================================

/**
 * 각 데이터 타입의 기본 파일명
 */
export const DEFAULT_FILENAMES: Record<DataType, string> = {
	vocabulary: 'vocabulary.json',
	domain: 'domain.json',
	term: 'term.json',
	database: 'database.json',
	entity: 'entity.json',
	attribute: 'attribute.json',
	table: 'table.json',
	column: 'column.json'
};

// ============================================================================
// 타입별 한글 라벨
// ============================================================================

/**
 * 각 데이터 타입의 한글 표시 이름
 */
export const DATA_TYPE_LABELS: Record<DataType, string> = {
	vocabulary: '단어집',
	domain: '도메인',
	term: '용어집',
	database: '데이터베이스 정의서',
	entity: '엔터티 정의서',
	attribute: '속성 정의서',
	table: '테이블 정의서',
	column: '컬럼 정의서'
};

// ============================================================================
// 타입 가드 유틸리티
// ============================================================================

/**
 * 주어진 문자열이 유효한 DataType인지 확인
 */
export function isValidDataType(value: string): value is DataType {
	return ALL_DATA_TYPES.includes(value as DataType);
}

// ============================================================================
// 제네릭 유틸리티 타입
// ============================================================================

/**
 * 특정 DataType에 해당하는 Entry 타입 추출
 */
export type EntryOf<T extends DataType> = EntryTypeMap[T];

/**
 * 특정 DataType에 해당하는 Data 타입 추출
 */
export type DataOf<T extends DataType> = DataTypeMap[T];

/**
 * 참조 무결성 검증 결과
 */
export interface ReferenceCheckResult {
	canDelete: boolean;
	references: {
		type: DataType;
		filename: string;
		count: number;
		entries: Array<{ id: string; name: string }>;
	}[];
	message?: string;
}
