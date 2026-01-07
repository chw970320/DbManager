/**
 * 데이터베이스 설계 시스템을 위한 TypeScript 타입 정의
 * 데이터베이스, 엔터티, 속성, 테이블, 컬럼을 관리
 */

// ============================================================================
// 공통 타입
// ============================================================================

/**
 * 히스토리 액션 타입
 */
export type DbDesignActionType = 'add' | 'update' | 'delete' | 'UPLOAD_MERGE';

/**
 * 데이터베이스 설계 엔터티 타입
 */
export type DbDesignEntityType = 'database' | 'entity' | 'attribute' | 'table' | 'column';

// ============================================================================
// 데이터베이스 정의서 (Database)
// ============================================================================

/**
 * 데이터베이스 정의서 엔트리
 */
export interface DatabaseEntry {
	id: string;
	// 필수 필드 (F: NOT NULL)
	organizationName: string; // 기관명
	departmentName: string; // 부서명
	appliedTask: string; // 적용업무
	relatedLaw: string; // 관련법령
	buildDate: string; // 구축일자
	osInfo: string; // 운영체제정보
	exclusionReason: string; // 수집제외사유
	// 선택 필드 (T: Nullable)
	logicalDbName?: string; // 논리DB명
	physicalDbName?: string; // 물리DB명
	dbDescription?: string; // DB설명
	dbmsInfo?: string; // DBMS정보
	// 시스템 필드
	createdAt: string; // ISO 8601 날짜 문자열
	updatedAt: string; // ISO 8601 날짜 문자열
}

/**
 * 데이터베이스 정의서 데이터 구조
 */
export interface DatabaseData {
	entries: DatabaseEntry[];
	lastUpdated: string;
	totalCount: number;
}

/**
 * 데이터베이스 히스토리 로그 엔트리
 */
export interface DatabaseHistoryLogEntry {
	id: string;
	action: DbDesignActionType;
	targetId: string;
	targetName: string;
	timestamp: string;
	filename?: string;
	details?: {
		before?: Partial<DatabaseEntry>;
		after?: Partial<DatabaseEntry>;
		fileName?: string;
		fileSize?: number;
		processedCount?: number;
		replaceMode?: boolean;
	};
}

/**
 * 데이터베이스 히스토리 데이터 구조
 */
export interface DatabaseHistoryData {
	logs: DatabaseHistoryLogEntry[];
	lastUpdated: string;
	totalCount: number;
}

// ============================================================================
// 엔터티 정의서 (Entity)
// ============================================================================

/**
 * 엔터티 정의서 엔트리
 */
export interface EntityEntry {
	id: string;
	// 필수 필드 (F: NOT NULL)
	superTypeEntityName: string; // 수퍼타입엔터티명
	// 선택 필드 (T: Nullable)
	logicalDbName?: string; // 논리DB명
	schemaName?: string; // 스키마명
	entityName?: string; // 엔터티명
	entityDescription?: string; // 엔터티설명
	primaryIdentifier?: string; // 주식별자
	tableKoreanName?: string; // 테이블한글명
	// 시스템 필드
	createdAt: string;
	updatedAt: string;
}

/**
 * 엔터티 정의서 데이터 구조
 */
export interface EntityData {
	entries: EntityEntry[];
	lastUpdated: string;
	totalCount: number;
}

/**
 * 엔터티 히스토리 로그 엔트리
 */
export interface EntityHistoryLogEntry {
	id: string;
	action: DbDesignActionType;
	targetId: string;
	targetName: string;
	timestamp: string;
	filename?: string;
	details?: {
		before?: Partial<EntityEntry>;
		after?: Partial<EntityEntry>;
		fileName?: string;
		fileSize?: number;
		processedCount?: number;
		replaceMode?: boolean;
	};
}

/**
 * 엔터티 히스토리 데이터 구조
 */
export interface EntityHistoryData {
	logs: EntityHistoryLogEntry[];
	lastUpdated: string;
	totalCount: number;
}

// ============================================================================
// 속성 정의서 (Attribute)
// ============================================================================

/**
 * 속성 정의서 엔트리
 */
export interface AttributeEntry {
	id: string;
	// 필수 필드 (F: NOT NULL)
	requiredInput: string; // 필수입력여부
	refEntityName: string; // 참조엔터티명
	// 선택 필드 (T: Nullable)
	schemaName?: string; // 스키마명
	entityName?: string; // 엔터티명
	attributeName?: string; // 속성명
	attributeType?: string; // 속성유형
	identifierFlag?: string; // 식별자여부
	refAttributeName?: string; // 참조속성명
	attributeDescription?: string; // 속성설명
	// 시스템 필드
	createdAt: string;
	updatedAt: string;
}

/**
 * 속성 정의서 데이터 구조
 */
export interface AttributeData {
	entries: AttributeEntry[];
	lastUpdated: string;
	totalCount: number;
}

/**
 * 속성 히스토리 로그 엔트리
 */
export interface AttributeHistoryLogEntry {
	id: string;
	action: DbDesignActionType;
	targetId: string;
	targetName: string;
	timestamp: string;
	filename?: string;
	details?: {
		before?: Partial<AttributeEntry>;
		after?: Partial<AttributeEntry>;
		fileName?: string;
		fileSize?: number;
		processedCount?: number;
		replaceMode?: boolean;
	};
}

/**
 * 속성 히스토리 데이터 구조
 */
export interface AttributeHistoryData {
	logs: AttributeHistoryLogEntry[];
	lastUpdated: string;
	totalCount: number;
}

// ============================================================================
// 테이블 정의서 (Table)
// ============================================================================

/**
 * 테이블 정의서 엔트리
 */
export interface TableEntry {
	id: string;
	// 필수 필드 (F: NOT NULL)
	businessClassification: string; // 업무분류체계
	tableVolume: string; // 테이블볼륨
	nonPublicReason: string; // 비공개사유
	openDataList: string; // 개방데이터목록
	// 선택 필드 (T: Nullable)
	physicalDbName?: string; // 물리DB명
	tableOwner?: string; // 테이블소유자
	subjectArea?: string; // 주제영역
	schemaName?: string; // 스키마명
	tableEnglishName?: string; // 테이블영문명
	tableKoreanName?: string; // 테이블한글명
	tableType?: string; // 테이블유형
	relatedEntityName?: string; // 관련엔터티명
	tableDescription?: string; // 테이블설명
	retentionPeriod?: string; // 보존기간
	occurrenceCycle?: string; // 발생주기
	publicFlag?: string; // 공개/비공개여부
	// 시스템 필드
	createdAt: string;
	updatedAt: string;
}

/**
 * 테이블 정의서 데이터 구조
 */
export interface TableData {
	entries: TableEntry[];
	lastUpdated: string;
	totalCount: number;
}

/**
 * 테이블 히스토리 로그 엔트리
 */
export interface TableHistoryLogEntry {
	id: string;
	action: DbDesignActionType;
	targetId: string;
	targetName: string;
	timestamp: string;
	filename?: string;
	details?: {
		before?: Partial<TableEntry>;
		after?: Partial<TableEntry>;
		fileName?: string;
		fileSize?: number;
		processedCount?: number;
		replaceMode?: boolean;
	};
}

/**
 * 테이블 히스토리 데이터 구조
 */
export interface TableHistoryData {
	logs: TableHistoryLogEntry[];
	lastUpdated: string;
	totalCount: number;
}

// ============================================================================
// 컬럼 정의서 (Column)
// ============================================================================

/**
 * 컬럼 정의서 엔트리
 */
export interface ColumnEntry {
	id: string;
	// 필수 필드 (F: NOT NULL)
	dataLength: string; // 자료길이
	dataDecimalLength: string; // 자료소수점길이
	dataFormat: string; // 자료형식
	pkInfo: string; // PK정보
	indexName: string; // 인덱스명
	indexOrder: string; // 인덱스순번
	akInfo: string; // AK정보
	constraint: string; // 제약조건
	// 선택 필드 (T: Nullable)
	scopeFlag?: string; // 사업범위여부
	subjectArea?: string; // 주제영역
	schemaName?: string; // 스키마명
	tableEnglishName?: string; // 테이블영문명
	columnEnglishName?: string; // 컬럼영문명
	columnKoreanName?: string; // 컬럼한글명
	columnDescription?: string; // 컬럼설명
	relatedEntityName?: string; // 연관엔터티명
	dataType?: string; // 자료타입
	notNullFlag?: string; // NOTNULL여부
	fkInfo?: string; // FK정보
	personalInfoFlag?: string; // 개인정보여부
	encryptionFlag?: string; // 암호화여부
	publicFlag?: string; // 공개/비공개여부
	// 시스템 필드
	createdAt: string;
	updatedAt: string;
}

/**
 * 컬럼 정의서 데이터 구조
 */
export interface ColumnData {
	entries: ColumnEntry[];
	lastUpdated: string;
	totalCount: number;
}

/**
 * 컬럼 히스토리 로그 엔트리
 */
export interface ColumnHistoryLogEntry {
	id: string;
	action: DbDesignActionType;
	targetId: string;
	targetName: string;
	timestamp: string;
	filename?: string;
	details?: {
		before?: Partial<ColumnEntry>;
		after?: Partial<ColumnEntry>;
		fileName?: string;
		fileSize?: number;
		processedCount?: number;
		replaceMode?: boolean;
	};
}

/**
 * 컬럼 히스토리 데이터 구조
 */
export interface ColumnHistoryData {
	logs: ColumnHistoryLogEntry[];
	lastUpdated: string;
	totalCount: number;
}

// ============================================================================
// API 응답 타입
// ============================================================================

/**
 * 데이터베이스 설계 API 응답
 */
export interface DbDesignApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
	pagination?: {
		currentPage: number;
		totalPages: number;
		totalCount: number;
		limit: number;
		hasNextPage: boolean;
		hasPrevPage: boolean;
	};
}

// ============================================================================
// 업로드 결과 타입
// ============================================================================

/**
 * 업로드 결과 공통 인터페이스
 */
export interface DbDesignUploadResult {
	success: boolean;
	message: string;
	fileName?: string;
	uploadedAt?: string;
	totalEntries?: number;
	error?: string;
}

// ============================================================================
// 검색 타입
// ============================================================================

/**
 * 검색 쿼리 타입
 */
export interface DbDesignSearchQuery {
	query: string;
	field: string;
	exact?: boolean;
}

/**
 * 검색 결과 타입
 */
export interface DbDesignSearchResult<T> {
	totalCount: number;
	query: DbDesignSearchQuery;
	entries: T[];
}

// ============================================================================
// XLSX 파싱을 위한 원본 데이터 타입
// ============================================================================

/**
 * 데이터베이스 정의서 원본 데이터 (XLSX)
 */
export interface RawDatabaseData {
	기관명: string;
	부서명: string;
	적용업무: string;
	관련법령: string;
	논리DB명?: string;
	물리DB명?: string;
	구축일자: string;
	DB설명?: string;
	DBMS정보?: string;
	운영체제정보: string;
	수집제외사유: string;
}

/**
 * 엔터티 정의서 원본 데이터 (XLSX)
 */
export interface RawEntityData {
	논리DB명?: string;
	스키마명?: string;
	엔터티명?: string;
	엔터티설명?: string;
	주식별자?: string;
	수퍼타입엔터티명: string;
	테이블한글명?: string;
}

/**
 * 속성 정의서 원본 데이터 (XLSX)
 */
export interface RawAttributeData {
	schema?: string;
	엔터티명?: string;
	속성명?: string;
	속성유형?: string;
	필수입력여부: string;
	식별자여부?: string;
	'참조 엔터티명': string;
	'참조 속성명'?: string;
	'속성 설명'?: string;
}

/**
 * 테이블 정의서 원본 데이터 (XLSX)
 */
export interface RawTableData {
	물리DB명?: string;
	테이블소유자?: string;
	주제영역?: string;
	스키마명?: string;
	테이블영문명?: string;
	테이블한글명?: string;
	테이블유형?: string;
	관련엔터티명?: string;
	테이블설명?: string;
	업무분류체계: string;
	보존기간?: string;
	테이블볼륨: string;
	발생주기?: string;
	'공개/비공개여부'?: string;
	비공개사유: string;
	개방데이터목록: string;
}

/**
 * 컬럼 정의서 원본 데이터 (XLSX)
 */
export interface RawColumnData {
	사업범위여부?: string;
	주제영역?: string;
	schema?: string;
	'테이블 영문명'?: string;
	'컬럼 영문명'?: string;
	'컬럼 한글명'?: string;
	'컬럼 설명'?: string;
	'연관 엔터티명'?: string;
	'자료 타입'?: string;
	'자료 길이': string;
	자료소수점길이: string;
	'자료 형식': string;
	'NOT NULL 여부'?: string;
	PK정보: string;
	FK정보?: string;
	인덱스명: string;
	인덱스순번: string;
	AK정보: string;
	제약조건: string;
	개인정보여부?: string;
	'암호화 여부'?: string;
	'공개/비공개여부'?: string;
}

// ============================================================================
// 필드 메타데이터 (UI 렌더링 및 검증용)
// ============================================================================

/**
 * 필드 정의 인터페이스
 */
export interface FieldDefinition {
	key: string;
	label: string;
	nullable: boolean;
	type: 'string' | 'date' | 'boolean';
}

/**
 * 데이터베이스 정의서 필드 정의
 */
export const DATABASE_FIELDS: FieldDefinition[] = [
	{ key: 'organizationName', label: '기관명', nullable: false, type: 'string' },
	{ key: 'departmentName', label: '부서명', nullable: false, type: 'string' },
	{ key: 'appliedTask', label: '적용업무', nullable: false, type: 'string' },
	{ key: 'relatedLaw', label: '관련법령', nullable: false, type: 'string' },
	{ key: 'logicalDbName', label: '논리DB명', nullable: true, type: 'string' },
	{ key: 'physicalDbName', label: '물리DB명', nullable: true, type: 'string' },
	{ key: 'buildDate', label: '구축일자', nullable: false, type: 'date' },
	{ key: 'dbDescription', label: 'DB설명', nullable: true, type: 'string' },
	{ key: 'dbmsInfo', label: 'DBMS정보', nullable: true, type: 'string' },
	{ key: 'osInfo', label: '운영체제정보', nullable: false, type: 'string' },
	{ key: 'exclusionReason', label: '수집제외사유', nullable: false, type: 'string' }
];

/**
 * 엔터티 정의서 필드 정의
 */
export const ENTITY_FIELDS: FieldDefinition[] = [
	{ key: 'logicalDbName', label: '논리DB명', nullable: true, type: 'string' },
	{ key: 'schemaName', label: '스키마명', nullable: true, type: 'string' },
	{ key: 'entityName', label: '엔터티명', nullable: true, type: 'string' },
	{ key: 'entityDescription', label: '엔터티설명', nullable: true, type: 'string' },
	{ key: 'primaryIdentifier', label: '주식별자', nullable: true, type: 'string' },
	{ key: 'superTypeEntityName', label: '수퍼타입엔터티명', nullable: false, type: 'string' },
	{ key: 'tableKoreanName', label: '테이블한글명', nullable: true, type: 'string' }
];

/**
 * 속성 정의서 필드 정의
 */
export const ATTRIBUTE_FIELDS: FieldDefinition[] = [
	{ key: 'schemaName', label: '스키마명', nullable: true, type: 'string' },
	{ key: 'entityName', label: '엔터티명', nullable: true, type: 'string' },
	{ key: 'attributeName', label: '속성명', nullable: true, type: 'string' },
	{ key: 'attributeType', label: '속성유형', nullable: true, type: 'string' },
	{ key: 'requiredInput', label: '필수입력여부', nullable: false, type: 'string' },
	{ key: 'identifierFlag', label: '식별자여부', nullable: true, type: 'string' },
	{ key: 'refEntityName', label: '참조엔터티명', nullable: false, type: 'string' },
	{ key: 'refAttributeName', label: '참조속성명', nullable: true, type: 'string' },
	{ key: 'attributeDescription', label: '속성설명', nullable: true, type: 'string' }
];

/**
 * 테이블 정의서 필드 정의
 */
export const TABLE_FIELDS: FieldDefinition[] = [
	{ key: 'physicalDbName', label: '물리DB명', nullable: true, type: 'string' },
	{ key: 'tableOwner', label: '테이블소유자', nullable: true, type: 'string' },
	{ key: 'subjectArea', label: '주제영역', nullable: true, type: 'string' },
	{ key: 'schemaName', label: '스키마명', nullable: true, type: 'string' },
	{ key: 'tableEnglishName', label: '테이블영문명', nullable: true, type: 'string' },
	{ key: 'tableKoreanName', label: '테이블한글명', nullable: true, type: 'string' },
	{ key: 'tableType', label: '테이블유형', nullable: true, type: 'string' },
	{ key: 'relatedEntityName', label: '관련엔터티명', nullable: true, type: 'string' },
	{ key: 'tableDescription', label: '테이블설명', nullable: true, type: 'string' },
	{ key: 'businessClassification', label: '업무분류체계', nullable: false, type: 'string' },
	{ key: 'retentionPeriod', label: '보존기간', nullable: true, type: 'string' },
	{ key: 'tableVolume', label: '테이블볼륨', nullable: false, type: 'string' },
	{ key: 'occurrenceCycle', label: '발생주기', nullable: true, type: 'string' },
	{ key: 'publicFlag', label: '공개/비공개여부', nullable: true, type: 'string' },
	{ key: 'nonPublicReason', label: '비공개사유', nullable: false, type: 'string' },
	{ key: 'openDataList', label: '개방데이터목록', nullable: false, type: 'string' }
];

/**
 * 컬럼 정의서 필드 정의
 */
export const COLUMN_FIELDS: FieldDefinition[] = [
	{ key: 'scopeFlag', label: '사업범위여부', nullable: true, type: 'string' },
	{ key: 'subjectArea', label: '주제영역', nullable: true, type: 'string' },
	{ key: 'schemaName', label: '스키마명', nullable: true, type: 'string' },
	{ key: 'tableEnglishName', label: '테이블영문명', nullable: true, type: 'string' },
	{ key: 'columnEnglishName', label: '컬럼영문명', nullable: true, type: 'string' },
	{ key: 'columnKoreanName', label: '컬럼한글명', nullable: true, type: 'string' },
	{ key: 'columnDescription', label: '컬럼설명', nullable: true, type: 'string' },
	{ key: 'relatedEntityName', label: '연관엔터티명', nullable: true, type: 'string' },
	{ key: 'dataType', label: '자료타입', nullable: true, type: 'string' },
	{ key: 'dataLength', label: '자료길이', nullable: false, type: 'string' },
	{ key: 'dataDecimalLength', label: '자료소수점길이', nullable: false, type: 'string' },
	{ key: 'dataFormat', label: '자료형식', nullable: false, type: 'string' },
	{ key: 'notNullFlag', label: 'NOTNULL여부', nullable: true, type: 'string' },
	{ key: 'pkInfo', label: 'PK정보', nullable: false, type: 'string' },
	{ key: 'fkInfo', label: 'FK정보', nullable: true, type: 'string' },
	{ key: 'indexName', label: '인덱스명', nullable: false, type: 'string' },
	{ key: 'indexOrder', label: '인덱스순번', nullable: false, type: 'string' },
	{ key: 'akInfo', label: 'AK정보', nullable: false, type: 'string' },
	{ key: 'constraint', label: '제약조건', nullable: false, type: 'string' },
	{ key: 'personalInfoFlag', label: '개인정보여부', nullable: true, type: 'string' },
	{ key: 'encryptionFlag', label: '암호화여부', nullable: true, type: 'string' },
	{ key: 'publicFlag', label: '공개/비공개여부', nullable: true, type: 'string' }
];
