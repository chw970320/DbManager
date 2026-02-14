/**
 * ERD 생성을 위한 매핑 관계 타입 정의
 */

import type {
	DatabaseEntry,
	EntityEntry,
	AttributeEntry,
	TableEntry,
	ColumnEntry
} from './database-design.js';
import type { DomainEntry } from './domain.js';

// ============================================================================
// 계층 구분
// ============================================================================

/**
 * 계층 타입
 */
export type LayerType = 'logical' | 'physical' | 'logical-physical' | 'domain';

/**
 * 엔터티 타입
 */
export type EntityType = 'database' | 'entity' | 'attribute' | 'table' | 'column' | 'domain';

// ============================================================================
// 매핑 관계 타입
// ============================================================================

/**
 * 기본 매핑 관계 인터페이스
 */
export interface BaseMapping {
	id: string;
	sourceId: string;
	targetId: string;
	sourceType: EntityType;
	targetType: EntityType;
	layerType: LayerType;
	mappingKey: string;
	relationshipType: '1:1' | '1:N' | 'N:1' | 'N:N';
}

/**
 * Database → Entity 매핑
 */
export interface DatabaseEntityMapping extends BaseMapping {
	sourceType: 'database';
	targetType: 'entity';
	layerType: 'logical';
	mappingKey: 'logicalDbName';
	relationshipType: '1:N';
}

/**
 * Entity → Attribute 매핑
 */
export interface EntityAttributeMapping extends BaseMapping {
	sourceType: 'entity';
	targetType: 'attribute';
	layerType: 'logical';
	mappingKey: 'schemaName+entityName';
	relationshipType: '1:N';
	schemaName: string;
	entityName: string;
}

/**
 * Entity → Entity (상속) 매핑
 */
export interface EntityInheritanceMapping extends BaseMapping {
	sourceType: 'entity';
	targetType: 'entity';
	layerType: 'logical';
	mappingKey: 'superTypeEntityName';
	relationshipType: '1:N';
	superTypeEntityName: string;
}

/**
 * Attribute → Entity (참조) 매핑
 */
export interface AttributeEntityRefMapping extends BaseMapping {
	sourceType: 'attribute';
	targetType: 'entity';
	layerType: 'logical';
	mappingKey: 'refEntityName';
	relationshipType: 'N:1';
	refEntityName: string;
}

/**
 * Attribute → Attribute (참조) 매핑
 */
export interface AttributeAttributeRefMapping extends BaseMapping {
	sourceType: 'attribute';
	targetType: 'attribute';
	layerType: 'logical';
	mappingKey: 'refAttributeName';
	relationshipType: 'N:1';
	refAttributeName: string;
}

/**
 * Database → Table 매핑
 */
export interface DatabaseTableMapping extends BaseMapping {
	sourceType: 'database';
	targetType: 'table';
	layerType: 'physical';
	mappingKey: 'physicalDbName';
	relationshipType: '1:N';
}

/**
 * Table → Column 매핑
 */
export interface TableColumnMapping extends BaseMapping {
	sourceType: 'table';
	targetType: 'column';
	layerType: 'physical';
	mappingKey: 'schemaName+tableEnglishName';
	relationshipType: '1:N';
	schemaName: string;
	tableEnglishName: string;
}

/**
 * Column → Column (FK) 매핑
 */
export interface ColumnFKMapping extends BaseMapping {
	sourceType: 'column';
	targetType: 'column';
	layerType: 'physical';
	mappingKey: 'fkInfo';
	relationshipType: 'N:1';
	fkInfo: string;
	referencedTable?: string;
	referencedColumn?: string;
}

/**
 * Table → Entity (논리-물리 매핑)
 */
export interface TableEntityMapping extends BaseMapping {
	sourceType: 'table';
	targetType: 'entity';
	layerType: 'logical-physical';
	mappingKey: 'relatedEntityName';
	relationshipType: 'N:1';
	relatedEntityName: string;
}

/**
 * Column → Entity (논리-물리 매핑)
 */
export interface ColumnEntityMapping extends BaseMapping {
	sourceType: 'column';
	targetType: 'entity';
	layerType: 'logical-physical';
	mappingKey: 'relatedEntityName';
	relationshipType: 'N:1';
	relatedEntityName: string;
}

/**
 * Attribute → Column (논리-물리 매핑)
 */
export interface AttributeColumnMapping extends BaseMapping {
	sourceType: 'attribute';
	targetType: 'column';
	layerType: 'logical-physical';
	mappingKey: 'schemaName+entityName+attributeName';
	relationshipType: '1:1' | '1:N';
	schemaName: string;
	entityName: string;
	attributeName: string;
	tableEnglishName: string;
	columnKoreanName: string;
}

/**
 * Column → Domain (도메인 매핑)
 */
export interface ColumnDomainMapping extends BaseMapping {
	sourceType: 'column';
	targetType: 'domain';
	layerType: 'domain';
	mappingKey: 'columnEnglishName_suffix' | 'domainName';
	relationshipType: 'N:1';
	suffix?: string;
	domainCategory?: string;
	standardDomainName: string;
}

/**
 * 모든 매핑 관계의 유니온 타입
 */
export type ERDMapping =
	| DatabaseEntityMapping
	| EntityAttributeMapping
	| EntityInheritanceMapping
	| AttributeEntityRefMapping
	| AttributeAttributeRefMapping
	| DatabaseTableMapping
	| TableColumnMapping
	| ColumnFKMapping
	| TableEntityMapping
	| ColumnEntityMapping
	| AttributeColumnMapping
	| ColumnDomainMapping;

// ============================================================================
// ERD 노드 타입
// ============================================================================

/**
 * ERD 노드 기본 인터페이스
 */
export interface ERDNode {
	id: string;
	type: EntityType;
	layerType: LayerType;
	label: string;
	data: DatabaseEntry | EntityEntry | AttributeEntry | TableEntry | ColumnEntry | DomainEntry;
}

/**
 * Database 노드
 */
export interface DatabaseNode extends ERDNode {
	type: 'database';
	layerType: 'logical' | 'physical';
	data: DatabaseEntry;
}

/**
 * Entity 노드
 */
export interface EntityNode extends ERDNode {
	type: 'entity';
	layerType: 'logical';
	data: EntityEntry;
}

/**
 * Attribute 노드
 */
export interface AttributeNode extends ERDNode {
	type: 'attribute';
	layerType: 'logical';
	data: AttributeEntry;
}

/**
 * Table 노드
 */
export interface TableNode extends ERDNode {
	type: 'table';
	layerType: 'physical';
	data: TableEntry;
}

/**
 * Column 노드
 */
export interface ColumnNode extends ERDNode {
	type: 'column';
	layerType: 'physical';
	data: ColumnEntry;
}

/**
 * Domain 노드
 */
export interface DomainNode extends ERDNode {
	type: 'domain';
	layerType: 'domain';
	data: DomainEntry;
}

/**
 * 모든 노드 타입의 유니온
 */
export type ERDNodeType =
	| DatabaseNode
	| EntityNode
	| AttributeNode
	| TableNode
	| ColumnNode
	| DomainNode;

// ============================================================================
// ERD 엣지 타입
// ============================================================================

/**
 * ERD 엣지 인터페이스
 */
export interface ERDEdge {
	id: string;
	source: string;
	target: string;
	type: string;
	label?: string;
	mapping: ERDMapping;
}

// ============================================================================
// ERD 데이터 구조
// ============================================================================

/**
 * ERD 데이터 구조
 */
export interface ERDData {
	nodes: ERDNodeType[];
	edges: ERDEdge[];
	mappings: ERDMapping[];
	metadata: {
		generatedAt: string;
		totalNodes: number;
		totalEdges: number;
		totalMappings: number;
		logicalNodes: number;
		physicalNodes: number;
		domainNodes: number;
	};
}

// ============================================================================
// 매핑 컨텍스트
// ============================================================================

/**
 * 매핑에 필요한 컨텍스트 데이터
 */
export interface MappingContext {
	databases: DatabaseEntry[];
	entities: EntityEntry[];
	attributes: AttributeEntry[];
	tables: TableEntry[];
	columns: ColumnEntry[];
	domains: DomainEntry[];
	vocabularyMap?: Map<
		string,
		{ standardName: string; abbreviation: string; domainCategory?: string }
	>;
	domainMap?: Map<string, DomainEntry>;
}
