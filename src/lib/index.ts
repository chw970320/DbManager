// Reexport your entry components here
export { default as ScrollToTop } from './components/ScrollToTop.svelte';

// vocabulary 기준으로 주석 정리
export type {
	VocabularyEntry,
	VocabularyData,
	UploadResult,
	SearchQuery,
	SearchResult,
	ApiResponse
} from './types/vocabulary.js';

// 데이터베이스 설계 타입 export
export type {
	// 공통 타입
	DbDesignActionType,
	DbDesignEntityType,
	DbDesignApiResponse,
	DbDesignUploadResult,
	DbDesignSearchQuery,
	DbDesignSearchResult,
	// 데이터베이스 정의서
	DatabaseEntry,
	DatabaseData,
	DatabaseHistoryLogEntry,
	DatabaseHistoryData,
	// 엔터티 정의서
	EntityEntry,
	EntityData,
	EntityHistoryLogEntry,
	EntityHistoryData,
	// 속성 정의서
	AttributeEntry,
	AttributeData,
	AttributeHistoryLogEntry,
	AttributeHistoryData,
	// 테이블 정의서
	TableEntry,
	TableData,
	TableHistoryLogEntry,
	TableHistoryData,
	// 컬럼 정의서
	ColumnEntry,
	ColumnData,
	ColumnHistoryLogEntry,
	ColumnHistoryData,
	// 필드 메타데이터
	FieldDefinition
} from './types/database-design.js';

// 필드 정의 상수 export
export {
	DATABASE_FIELDS,
	ENTITY_FIELDS,
	ATTRIBUTE_FIELDS,
	TABLE_FIELDS,
	COLUMN_FIELDS
} from './types/database-design.js';
