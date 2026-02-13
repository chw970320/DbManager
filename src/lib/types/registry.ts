/**
 * 매핑 레지스트리 타입 정의
 * 데이터 타입 간 매핑 관계를 중앙에서 관리하기 위한 타입입니다.
 */

import type { DataType } from './base.js';

// ============================================================================
// 매핑 관계 타입
// ============================================================================

/**
 * 매핑 관계의 카디널리티
 */
export type MappingCardinality = '1:1' | '1:N' | 'N:1' | 'N:N';

/**
 * 매핑 관계 정의
 * 두 데이터 타입 간의 연결 관계를 선언적으로 정의합니다.
 */
export interface MappingRelation {
	/** 매핑 관계 고유 ID */
	id: string;
	/** 소스 데이터 타입 */
	sourceType: DataType;
	/** 소스 파일명 */
	sourceFilename: string;
	/** 타겟 데이터 타입 */
	targetType: DataType;
	/** 타겟 파일명 */
	targetFilename: string;
	/**
	 * 매핑 키 표현식
	 * 소스의 어떤 필드가 타겟의 어떤 필드와 연결되는지 설명
	 * 예: "logicalDbName", "columnName→termName", "termName_parts→standardName"
	 */
	mappingKey: string;
	/** 관계 카디널리티 */
	cardinality: MappingCardinality;
	/** 매핑 설명 */
	description?: string;
	/** 생성일 */
	createdAt: string;
	/** 수정일 */
	updatedAt?: string;
}

// ============================================================================
// 매핑 레지스트리 데이터 구조
// ============================================================================

/**
 * 매핑 레지스트리 파일 구조 (registry.json)
 */
export interface MappingRegistryData {
	/** 레지스트리 버전 */
	version: '1.0';
	/** 매핑 관계 목록 */
	relations: MappingRelation[];
	/** 최종 수정일 */
	lastUpdated: string;
}

// ============================================================================
// 매핑 조회 결과 타입
// ============================================================================

/**
 * 특정 데이터 타입에 관련된 매핑 정보
 */
export interface RelatedMapping {
	/** 관련 매핑 관계 */
	relation: MappingRelation;
	/** 이 타입이 소스인지 타겟인지 */
	role: 'source' | 'target';
	/** 상대방 데이터 타입 */
	relatedType: DataType;
	/** 상대방 파일명 */
	relatedFilename: string;
}

/**
 * 매핑 관계 그래프 조회 결과
 */
export interface MappingGraph {
	/** 조회 기준 데이터 타입 */
	centerType: DataType;
	/** 조회 기준 파일명 */
	centerFilename: string;
	/** 직접 연결된 매핑 */
	directMappings: RelatedMapping[];
	/** 간접 연결된 매핑 (2-hop 이내) */
	indirectMappings: RelatedMapping[];
}

// ============================================================================
// 기본 매핑 관계 상수 (초기 seed 데이터)
// ============================================================================

/**
 * 기본 매핑 관계 정의
 * 프로젝트에서 사용되는 표준 매핑 관계입니다.
 */
export const DEFAULT_MAPPING_RELATIONS: Omit<MappingRelation, 'id' | 'createdAt'>[] = [
	// ======== 기존 3종 간 매핑 ========
	{
		sourceType: 'vocabulary',
		sourceFilename: 'vocabulary.json',
		targetType: 'domain',
		targetFilename: 'domain.json',
		mappingKey: 'domainCategory',
		cardinality: 'N:1',
		description: '단어집 → 도메인 분류 매핑 (단어의 도메인분류명이 도메인에 존재하는지)'
	},
	{
		sourceType: 'term',
		sourceFilename: 'term.json',
		targetType: 'vocabulary',
		targetFilename: 'vocabulary.json',
		mappingKey: 'termName_parts→standardName',
		cardinality: 'N:N',
		description: '용어집 → 단어집 매핑 (용어명의 각 부분이 단어집에 등록되어 있는지)'
	},
	{
		sourceType: 'term',
		sourceFilename: 'term.json',
		targetType: 'domain',
		targetFilename: 'domain.json',
		mappingKey: 'domainName→standardDomainName',
		cardinality: 'N:1',
		description: '용어집 → 도메인 매핑 (용어의 도메인명이 도메인에 존재하는지)'
	},
	// ======== DB 설계 5종 간 매핑 ========
	{
		sourceType: 'database',
		sourceFilename: 'database.json',
		targetType: 'entity',
		targetFilename: 'entity.json',
		mappingKey: 'logicalDbName',
		cardinality: '1:N',
		description: 'DB → 엔터티 매핑 (논리DB명 기반)'
	},
	{
		sourceType: 'entity',
		sourceFilename: 'entity.json',
		targetType: 'attribute',
		targetFilename: 'attribute.json',
		mappingKey: 'schemaName+entityName',
		cardinality: '1:N',
		description: '엔터티 → 속성 매핑 (스키마명+엔터티명 기반)'
	},
	{
		sourceType: 'database',
		sourceFilename: 'database.json',
		targetType: 'table',
		targetFilename: 'table.json',
		mappingKey: 'physicalDbName',
		cardinality: '1:N',
		description: 'DB → 테이블 매핑 (물리DB명 기반)'
	},
	{
		sourceType: 'table',
		sourceFilename: 'table.json',
		targetType: 'column',
		targetFilename: 'column.json',
		mappingKey: 'schemaName+tableEnglishName',
		cardinality: '1:N',
		description: '테이블 → 컬럼 매핑 (스키마명+테이블영문명 기반)'
	},
	// ======== 논리-물리 교차 매핑 ========
	{
		sourceType: 'table',
		sourceFilename: 'table.json',
		targetType: 'entity',
		targetFilename: 'entity.json',
		mappingKey: 'relatedEntityName→entityName',
		cardinality: 'N:1',
		description: '테이블 → 엔터티 매핑 (관련엔터티명 기반, 논리-물리 연결)'
	},
	{
		sourceType: 'attribute',
		sourceFilename: 'attribute.json',
		targetType: 'column',
		targetFilename: 'column.json',
		mappingKey: 'schemaName+entityName+attributeName',
		cardinality: '1:1',
		description: '속성 → 컬럼 매핑 (논리-물리 연결)'
	},
	// ======== 기존 3종 ↔ DB 설계 5종 간 교차 매핑 ========
	{
		sourceType: 'column',
		sourceFilename: 'column.json',
		targetType: 'term',
		targetFilename: 'term.json',
		mappingKey: 'columnEnglishName→columnName',
		cardinality: 'N:1',
		description: '컬럼 → 용어 매핑 (컬럼영문명과 용어 컬럼명 일치)'
	},
	{
		sourceType: 'column',
		sourceFilename: 'column.json',
		targetType: 'domain',
		targetFilename: 'domain.json',
		mappingKey: 'columnEnglishName_suffix→domainCategory',
		cardinality: 'N:1',
		description: '컬럼 → 도메인 매핑 (컬럼영문명 접미사 기반 도메인 결정)'
	}
];
