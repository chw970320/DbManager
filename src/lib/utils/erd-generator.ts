/**
 * ERD 데이터 구조 생성 유틸리티
 */

import type {
	DatabaseEntry,
	EntityEntry,
	AttributeEntry,
	TableEntry,
	ColumnEntry
} from '../types/database-design.js';
import type { DomainEntry } from '../types/domain.js';
import type {
	ERDData,
	ERDNodeType,
	ERDEdge,
	ERDMapping,
	DatabaseNode,
	EntityNode,
	AttributeNode,
	TableNode,
	ColumnNode,
	DomainNode,
	MappingContext
} from '../types/erd-mapping.js';
import { generateAllMappings } from './erd-mapper.js';
import { filterMappingContext, type ERDFilterOptions } from './erd-filter.js';
import { buildGraphvizERDModel } from './erd-graphviz-model.js';

// ============================================================================
// 노드 생성 함수
// ============================================================================

/**
 * Database 노드 생성
 */
function createDatabaseNode(database: DatabaseEntry, isLogical: boolean): DatabaseNode {
	return {
		id: database.id,
		type: 'database',
		layerType: isLogical ? 'logical' : 'physical',
		label:
			database.logicalDbName || database.physicalDbName || database.organizationName || 'Database',
		data: database
	};
}

/**
 * Entity 노드 생성
 */
function createEntityNode(entity: EntityEntry): EntityNode {
	return {
		id: entity.id,
		type: 'entity',
		layerType: 'logical',
		label: entity.entityName || entity.tableKoreanName || 'Entity',
		data: entity
	};
}

/**
 * Attribute 노드 생성
 */
function createAttributeNode(attribute: AttributeEntry): AttributeNode {
	return {
		id: attribute.id,
		type: 'attribute',
		layerType: 'logical',
		label: attribute.attributeName || 'Attribute',
		data: attribute
	};
}

/**
 * Table 노드 생성
 */
function createTableNode(table: TableEntry): TableNode {
	return {
		id: table.id,
		type: 'table',
		layerType: 'physical',
		label: table.tableEnglishName || table.tableKoreanName || 'Table',
		data: table
	};
}

/**
 * Column 노드 생성
 */
function createColumnNode(column: ColumnEntry): ColumnNode {
	return {
		id: column.id,
		type: 'column',
		layerType: 'physical',
		label: column.columnEnglishName || column.columnKoreanName || 'Column',
		data: column
	};
}

/**
 * Domain 노드 생성
 */
function createDomainNode(domain: DomainEntry): DomainNode {
	return {
		id: domain.id,
		type: 'domain',
		layerType: 'domain',
		label: domain.standardDomainName || 'Domain',
		data: domain
	};
}

// ============================================================================
// 엣지 생성 함수
// ============================================================================

/**
 * 매핑에서 엣지 생성
 */
function createEdgeFromMapping(mapping: ERDMapping, index: number): ERDEdge {
	const edgeType = getEdgeType(mapping);
	const label = getEdgeLabel(mapping);

	return {
		id: `edge-${mapping.id}-${index}`,
		source: mapping.sourceId,
		target: mapping.targetId,
		type: edgeType,
		label,
		mapping
	};
}

/**
 * 매핑 타입에 따른 엣지 타입 결정
 */
function getEdgeType(mapping: ERDMapping): string {
	switch (mapping.layerType) {
		case 'logical':
			if (mapping.mappingKey === 'superTypeEntityName') return 'inheritance';
			if (mapping.mappingKey === 'refEntityName' || mapping.mappingKey === 'refAttributeName')
				return 'reference';
			return 'contains';
		case 'physical':
			if (mapping.mappingKey === 'fkInfo') return 'foreign-key';
			return 'contains';
		case 'logical-physical':
			return 'maps-to';
		case 'domain':
			return 'uses-domain';
		default:
			return 'related';
	}
}

/**
 * 매핑 타입에 따른 엣지 라벨 생성
 */
function getEdgeLabel(mapping: ERDMapping): string | undefined {
	switch (mapping.mappingKey) {
		case 'superTypeEntityName':
			return 'inherits';
		case 'refEntityName':
			return 'references';
		case 'refAttributeName':
			return 'references';
		case 'fkInfo':
			return 'FK';
		case 'relatedEntityName':
			return 'maps to';
		case 'domainName':
		case 'columnEnglishName_suffix':
			return 'uses';
		default:
			return undefined;
	}
}

// ============================================================================
// ERD 데이터 생성
// ============================================================================

/**
 * ERD 데이터 생성
 */
export function generateERDData(
	context: MappingContext,
	filterOptions?: ERDFilterOptions
): ERDData {
	// 필터 옵션이 있으면 컨텍스트 필터링
	const filteredContext = filterOptions ? filterMappingContext(context, filterOptions) : context;
	// 모든 노드 생성
	const nodes: ERDNodeType[] = [];

	// Database 노드 (논리/물리)
	const logicalDatabases = new Set<string>();
	const physicalDatabases = new Set<string>();

	for (const database of filteredContext.databases) {
		if (database.logicalDbName && database.logicalDbName.trim() !== '-') {
			logicalDatabases.add(database.id);
		}
		if (database.physicalDbName && database.physicalDbName.trim() !== '-') {
			physicalDatabases.add(database.id);
		}
	}

	for (const database of filteredContext.databases) {
		if (logicalDatabases.has(database.id) || physicalDatabases.has(database.id)) {
			nodes.push(createDatabaseNode(database, logicalDatabases.has(database.id)));
		}
	}

	// Entity 노드
	for (const entity of filteredContext.entities) {
		nodes.push(createEntityNode(entity));
	}

	// Attribute 노드
	for (const attribute of filteredContext.attributes) {
		nodes.push(createAttributeNode(attribute));
	}

	// Table 노드
	for (const table of filteredContext.tables) {
		nodes.push(createTableNode(table));
	}

	// Column 노드
	for (const column of filteredContext.columns) {
		nodes.push(createColumnNode(column));
	}

	// Domain 노드 (매핑된 도메인만)
	const mappedDomainIds = new Set<string>();
	const mappings = generateAllMappings(filteredContext);
	for (const mapping of mappings) {
		if (mapping.targetType === 'domain') {
			mappedDomainIds.add(mapping.targetId);
		}
	}

	for (const domain of filteredContext.domains) {
		if (mappedDomainIds.has(domain.id)) {
			nodes.push(createDomainNode(domain));
		}
	}

	// 모든 엣지 생성
	const edges: ERDEdge[] = mappings.map((mapping, index) => createEdgeFromMapping(mapping, index));
	const graphvizModel = buildGraphvizERDModel(context, filterOptions);

	// 메타데이터 계산
	const logicalNodes = nodes.filter((n) => n.layerType === 'logical').length;
	const physicalNodes = nodes.filter((n) => n.layerType === 'physical').length;
	const domainNodes = nodes.filter((n) => n.layerType === 'domain').length;

	return {
		nodes,
		edges,
		mappings,
		metadata: {
			generatedAt: new Date().toISOString(),
			totalNodes: nodes.length,
			totalEdges: edges.length,
			totalMappings: mappings.length,
			totalRelationships: graphvizModel.metadata.totalRelationships,
			externalRelationships: graphvizModel.relationships.filter(
				(relationship) => relationship.isExternalReference
			).length,
			unresolvedForeignKeys: graphvizModel.warnings.filter(
				(warning) => warning.code === 'unresolved-fk'
			).length,
			logicalNodes,
			physicalNodes,
			domainNodes
		}
	};
}

// ============================================================================
// JSON 형식 출력
// ============================================================================

/**
 * ERD 데이터를 JSON 형식으로 직렬화
 */
export function serializeERDData(erdData: ERDData): string {
	return JSON.stringify(erdData, null, 2);
}

/**
 * JSON 형식에서 ERD 데이터 역직렬화
 */
export function deserializeERDData(json: string): ERDData {
	return JSON.parse(json) as ERDData;
}
