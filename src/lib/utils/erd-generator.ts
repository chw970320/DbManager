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
			logicalNodes,
			physicalNodes,
			domainNodes
		}
	};
}

// ============================================================================
// Mermaid 다이어그램 생성
// ============================================================================

/**
 * ERD 데이터를 Mermaid ER 다이어그램 형식으로 변환
 * Mermaid 텍스트 크기 제한(약 50KB)을 고려하여 자동으로 축소
 */
export function generateMermaidERD(erdData: ERDData, maxNodes?: number, maxEdges?: number): string {
	const lines: string[] = ['erDiagram'];

	// 노드 맵 생성
	const nodeMap = new Map<string, ERDNodeType>();
	for (const node of erdData.nodes) {
		nodeMap.set(node.id, node);
	}

	// Mermaid에 포함할 노드 필터링: database, entity, table 타입 (주요 노드)
	const diagramNodes = erdData.nodes.filter(
		(node) => node.type === 'entity' || node.type === 'table' || node.type === 'database'
	);

	// 노드 수 제한 적용
	const limitedNodes = maxNodes ? diagramNodes.slice(0, maxNodes) : diagramNodes;
	const limitedNodeIds = new Set(limitedNodes.map((n) => n.id));

	// Attribute 노드들을 Entity별로 그룹화 (Entity 필드로 표시)
	const entityAttributes = new Map<string, ERDNodeType[]>();
	for (const mapping of erdData.mappings) {
		if (
			mapping.sourceType === 'entity' &&
			mapping.targetType === 'attribute' &&
			limitedNodeIds.has(mapping.sourceId)
		) {
			const attrs = entityAttributes.get(mapping.sourceId) || [];
			const attrNode = nodeMap.get(mapping.targetId);
			if (attrNode) {
				attrs.push(attrNode);
				entityAttributes.set(mapping.sourceId, attrs);
			}
		}
	}

	// Column 노드들을 Table별로 그룹화 (Table 필드로 표시)
	const tableColumns = new Map<string, ERDNodeType[]>();
	for (const mapping of erdData.mappings) {
		if (
			mapping.sourceType === 'table' &&
			mapping.targetType === 'column' &&
			limitedNodeIds.has(mapping.sourceId)
		) {
			const cols = tableColumns.get(mapping.sourceId) || [];
			const colNode = nodeMap.get(mapping.targetId);
			if (colNode) {
				cols.push(colNode);
				tableColumns.set(mapping.sourceId, cols);
			}
		}
	}

	// PK 컬럼 ID들 수집
	const pkColumnIds = new Set<string>();
	for (const node of erdData.nodes) {
		if (node.type === 'column') {
			const colData = node.data as ColumnEntry;
			if (colData.pkInfo && colData.pkInfo.trim() !== '' && colData.pkInfo.trim() !== '-') {
				pkColumnIds.add(node.id);
			}
		}
	}

	// 엔터티/테이블/데이터베이스 정의 출력
	const MAX_FIELDS_PER_NODE = 8;

	for (const node of limitedNodes) {
		const nodeName = sanitizeNodeName(node.label);
		const fields: string[] = [];

		if (node.type === 'database') {
			const dbData = node.data as DatabaseEntry;
			if (dbData.logicalDbName && dbData.logicalDbName.trim() !== '-') {
				fields.push(`  ${sanitizeNodeName(dbData.logicalDbName)} string "논리명"`);
			}
			if (dbData.physicalDbName && dbData.physicalDbName.trim() !== '-') {
				fields.push(`  ${sanitizeNodeName(dbData.physicalDbName)} string "물리명"`);
			}
			if (dbData.dbmsInfo && dbData.dbmsInfo.trim() !== '-') {
				fields.push(`  ${sanitizeNodeName(dbData.dbmsInfo)} string "DBMS"`);
			}
		} else if (node.type === 'entity') {
			const entity = node.data as EntityEntry;
			// 엔터티의 속성들을 필드로 표시
			const attrs = entityAttributes.get(node.id) || [];
			if (entity.primaryIdentifier) {
				fields.push(`  ${sanitizeNodeName(entity.primaryIdentifier)} string PK`);
			}
			for (const attr of attrs.slice(0, MAX_FIELDS_PER_NODE - 1)) {
				const attrData = attr.data as AttributeEntry;
				const attrName = sanitizeNodeName(attr.label);
				const attrType = attrData.attributeType
					? sanitizeNodeName(attrData.attributeType)
					: 'string';
				const idFlag = attrData.identifierFlag === 'Y' ? ' PK' : '';
				fields.push(`  ${attrName} ${attrType}${idFlag}`);
			}
		} else if (node.type === 'table') {
			// 테이블의 칼럼들을 필드로 표시
			const cols = tableColumns.get(node.id) || [];
			for (const col of cols.slice(0, MAX_FIELDS_PER_NODE)) {
				const colData = col.data as ColumnEntry;
				const colName = sanitizeNodeName(col.label);
				const dataType = colData.dataType ? sanitizeNodeName(colData.dataType) : 'varchar';
				const pkFlag = pkColumnIds.has(col.id) ? ' PK' : '';
				const fkFlag =
					!pkFlag && colData.fkInfo && colData.fkInfo.trim() !== '' && colData.fkInfo.trim() !== '-'
						? ' FK'
						: '';
				fields.push(`  ${colName} ${dataType}${pkFlag}${fkFlag}`);
			}
		}

		lines.push(`    ${nodeName} {`);
		for (const field of fields.slice(0, MAX_FIELDS_PER_NODE)) {
			lines.push(field);
		}
		lines.push('    }');
	}

	// 관계 정의 - 제한된 노드와 관련된 엣지만 포함
	// Attribute/Column 간 관계는 제외하고, 상위 노드(database, entity, table) 간 관계만
	const relevantEdges = erdData.edges.filter((edge) => {
		// 양쪽 노드가 다이어그램에 포함되어야 함
		if (!limitedNodeIds.has(edge.source) || !limitedNodeIds.has(edge.target)) {
			return false;
		}
		// contains(entity→attribute, table→column) 관계는 필드로 표시하므로 엣지 제외
		const sourceNode = nodeMap.get(edge.source);
		const targetNode = nodeMap.get(edge.target);
		if (!sourceNode || !targetNode) return false;
		// attribute, column 노드는 엣지의 대상이 아님 (database, entity, table 간만)
		if (targetNode.type === 'attribute' || targetNode.type === 'column') return false;
		if (sourceNode.type === 'attribute' || sourceNode.type === 'column') return false;
		return true;
	});

	// 엣지 수 제한 적용
	const limitedEdges = maxEdges ? relevantEdges.slice(0, maxEdges) : relevantEdges;

	// 중복 엣지 제거 (동일 source-target 조합)
	const edgeKeys = new Set<string>();
	const dedupedEdges: ERDEdge[] = [];
	for (const edge of limitedEdges) {
		const key = `${edge.source}-${edge.target}`;
		if (!edgeKeys.has(key)) {
			edgeKeys.add(key);
			dedupedEdges.push(edge);
		}
	}

	// 관계 정의 출력
	for (const edge of dedupedEdges) {
		const sourceNode = nodeMap.get(edge.source);
		const targetNode = nodeMap.get(edge.target);

		if (sourceNode && targetNode) {
			const sourceName = sanitizeNodeName(sourceNode.label);
			const targetName = sanitizeNodeName(targetNode.label);
			const relationType = getMermaidRelationType(edge.type, edge.mapping.relationshipType);
			// 엣지 라벨도 길이 제한
			const edgeLabel = edge.label ? sanitizeNodeName(edge.label) : '';

			lines.push(`    ${sourceName} ||--${relationType}|| ${targetName} : "${edgeLabel}"`);
		}
	}

	const mermaidCode = lines.join('\n');

	// 텍스트 크기 체크 (약 50KB 제한, 안전 마진을 위해 45KB로 설정)
	const MAX_SIZE = 45 * 1024; // 45KB
	const codeSize = new Blob([mermaidCode]).size;

	if (codeSize > MAX_SIZE) {
		console.warn(
			`Mermaid 다이어그램 크기가 제한을 초과했습니다 (${(codeSize / 1024).toFixed(2)}KB). ` +
				`노드 수를 줄이거나 필터를 적용해주세요.`
		);
	}

	return mermaidCode;
}

/**
 * 노드 이름을 Mermaid 형식에 맞게 정리
 * 최대 길이: 50자 (Mermaid 텍스트 크기 제한 방지)
 */
function sanitizeNodeName(name: string): string {
	const sanitized =
		name
			.replace(/[^a-zA-Z0-9가-힣_]/g, '_')
			.replace(/\s+/g, '_')
			.replace(/^_+|_+$/g, '') || 'Node';

	// 최대 50자로 제한
	if (sanitized.length > 50) {
		return sanitized.substring(0, 47) + '...';
	}

	return sanitized;
}

/**
 * Mermaid 관계 타입 결정
 */
function getMermaidRelationType(edgeType: string, relationshipType: string): string {
	if (edgeType === 'inheritance') {
		return 'o{';
	}
	if (edgeType === 'foreign-key' || edgeType === 'reference') {
		return relationshipType === 'N:1' ? '}o' : 'o{';
	}
	return relationshipType === '1:N' ? '}o' : '||';
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
