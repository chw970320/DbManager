/**
 * ERD 데이터 필터링 유틸리티
 */

import type {
	DatabaseEntry,
	EntityEntry,
	AttributeEntry,
	TableEntry,
	ColumnEntry
} from '../types/database-design.js';
import type { DomainEntry } from '../types/domain.js';
import type { MappingContext } from '../types/erd-mapping.js';

/**
 * ERD 필터 옵션
 */
export interface ERDFilterOptions {
	/** 선택된 테이블 ID 배열 */
	tableIds?: string[];
	/** 관련 엔터티/속성 포함 여부 (기본값: true) */
	includeRelated?: boolean;
	/** 최대 노드 수 (Mermaid 텍스트 크기 제한 방지) */
	maxNodes?: number;
	/** 최대 엣지 수 (Mermaid 텍스트 크기 제한 방지) */
	maxEdges?: number;
}

/**
 * 선택된 테이블과 관련된 컬럼 ID 집합 생성
 */
function getRelatedColumnIds(selectedTableIds: Set<string>, columns: ColumnEntry[]): Set<string> {
	const columnIds = new Set<string>();

	for (const column of columns) {
		if (column.tableEnglishName && column.schemaName) {
			// 테이블 ID는 schemaName + tableEnglishName 조합으로 찾아야 함
			// 하지만 현재 TableEntry에는 ID만 있으므로, 테이블 이름으로 매칭
			// 실제로는 테이블 ID로 매칭해야 하므로, 컬럼의 테이블 참조를 확인
			// 일단 컬럼의 tableEnglishName과 schemaName으로 필터링
			columnIds.add(column.id);
		}
	}

	return columnIds;
}

/**
 * 선택된 테이블과 관련된 엔터티 ID 집합 생성
 */
function getRelatedEntityIds(
	selectedTableIds: Set<string>,
	tables: TableEntry[],
	columns: ColumnEntry[],
	includeRelated: boolean
): Set<string> {
	const entityIds = new Set<string>();

	if (!includeRelated) return entityIds;

	// 선택된 테이블의 relatedEntityName으로 엔터티 찾기
	const selectedTables = tables.filter((t) => selectedTableIds.has(t.id));

	for (const table of selectedTables) {
		if (table.relatedEntityName && table.relatedEntityName.trim() !== '-') {
			// 엔터티 이름으로 찾아야 하므로, 나중에 필터링 단계에서 처리
			// 여기서는 엔터티 이름을 수집
		}
	}

	// 선택된 테이블의 컬럼의 relatedEntityName으로 엔터티 찾기
	const selectedTableNames = new Set<string>();
	for (const table of selectedTables) {
		if (table.tableEnglishName && table.schemaName) {
			selectedTableNames.add(`${table.schemaName}|${table.tableEnglishName}`);
		}
	}

	for (const column of columns) {
		if (
			column.tableEnglishName &&
			column.schemaName &&
			selectedTableNames.has(`${column.schemaName}|${column.tableEnglishName}`)
		) {
			if (column.relatedEntityName && column.relatedEntityName.trim() !== '-') {
				// 엔터티 이름 수집 (나중에 필터링)
			}
		}
	}

	return entityIds;
}

/**
 * 선택된 테이블과 관련된 속성 ID 집합 생성
 */
function getRelatedAttributeIds(
	relatedEntityNames: Set<string>,
	attributes: AttributeEntry[]
): Set<string> {
	const attributeIds = new Set<string>();

	for (const attribute of attributes) {
		if (attribute.entityName && relatedEntityNames.has(attribute.entityName)) {
			attributeIds.add(attribute.id);
		}
	}

	return attributeIds;
}

/**
 * 선택된 테이블과 관련된 도메인 ID 집합 생성
 */
function getRelatedDomainIds(
	selectedColumnIds: Set<string>,
	columns: ColumnEntry[],
	domains: DomainEntry[]
): Set<string> {
	const domainIds = new Set<string>();

	// 선택된 컬럼의 도메인 매핑은 나중에 매핑 단계에서 처리
	// 여기서는 일단 빈 집합 반환

	return domainIds;
}

/**
 * MappingContext를 필터링
 */
export function filterMappingContext(
	context: MappingContext,
	filterOptions: ERDFilterOptions
): MappingContext {
	const { tableIds, includeRelated = true } = filterOptions;

	// 필터 옵션이 없으면 전체 반환
	if (!tableIds || tableIds.length === 0) {
		return context;
	}

	const selectedTableIds = new Set(tableIds);

	// 선택된 테이블 필터링
	const filteredTables = context.tables.filter((table) => selectedTableIds.has(table.id));

	// 선택된 테이블의 이름 집합 생성 (스키마명 + 테이블영문명)
	const selectedTableKeys = new Set<string>();
	for (const table of filteredTables) {
		if (table.schemaName && table.tableEnglishName) {
			selectedTableKeys.add(`${table.schemaName}|${table.tableEnglishName}`);
		}
	}

	// 선택된 테이블의 컬럼 필터링
	const filteredColumns = context.columns.filter((column) => {
		if (!column.schemaName || !column.tableEnglishName) return false;
		const key = `${column.schemaName}|${column.tableEnglishName}`;
		return selectedTableKeys.has(key);
	});

	// 관련 엔터티 이름 수집
	const relatedEntityNames = new Set<string>();
	if (includeRelated) {
		// 테이블의 relatedEntityName
		for (const table of filteredTables) {
			if (table.relatedEntityName && table.relatedEntityName.trim() !== '-') {
				relatedEntityNames.add(table.relatedEntityName.trim());
			}
		}

		// 컬럼의 relatedEntityName
		for (const column of filteredColumns) {
			if (column.relatedEntityName && column.relatedEntityName.trim() !== '-') {
				relatedEntityNames.add(column.relatedEntityName.trim());
			}
		}
	}

	// 관련 엔터티 필터링
	const filteredEntities = includeRelated
		? context.entities.filter((entity) => {
				if (!entity.entityName) return false;
				return relatedEntityNames.has(entity.entityName.trim());
			})
		: [];

	// 관련 속성 필터링
	const filteredAttributes = includeRelated
		? context.attributes.filter((attribute) => {
				if (!attribute.entityName) return false;
				return relatedEntityNames.has(attribute.entityName.trim());
			})
		: [];

	// 관련 도메인은 매핑 단계에서 처리되므로 여기서는 전체 유지
	// (필터링은 매핑 생성 후에 수행)

	// Database는 선택된 테이블의 physicalDbName과 연결된 것만 포함
	const selectedDbNames = new Set<string>();
	for (const table of filteredTables) {
		if (table.physicalDbName && table.physicalDbName.trim() !== '-') {
			selectedDbNames.add(table.physicalDbName.trim());
		}
	}

	const filteredDatabases = context.databases.filter((db) => {
		if (db.physicalDbName && selectedDbNames.has(db.physicalDbName.trim())) {
			return true;
		}
		if (includeRelated && db.logicalDbName) {
			// 논리적 DB는 관련 엔터티와 연결된 경우 포함
			return filteredEntities.some(
				(e) => e.logicalDbName && e.logicalDbName.trim() === db.logicalDbName?.trim()
			);
		}
		return false;
	});

	return {
		databases: filteredDatabases,
		entities: filteredEntities,
		attributes: filteredAttributes,
		tables: filteredTables,
		columns: filteredColumns,
		domains: context.domains, // 도메인은 매핑 후 필터링
		vocabularyMap: context.vocabularyMap,
		domainMap: context.domainMap
	};
}

/**
 * ERD 데이터의 노드와 엣지를 필터링
 */
export function filterERDDataByTableIds(
	erdData: {
		nodes: Array<{ id: string; type: string }>;
		edges: Array<{ source: string; target: string }>;
		mappings: Array<{ sourceId: string; targetId: string; sourceType: string; targetType: string }>;
	},
	selectedTableIds: string[],
	includeRelated: boolean
): {
	nodes: Array<{ id: string; type: string }>;
	edges: Array<{ source: string; target: string }>;
	mappings: Array<{ sourceId: string; targetId: string; sourceType: string; targetType: string }>;
} {
	if (selectedTableIds.length === 0) {
		return erdData;
	}

	const selectedTableIdSet = new Set(selectedTableIds);
	const includedNodeIds = new Set<string>();
	const includedEntityNames = new Set<string>();

	// 1단계: 선택된 테이블 노드 포함
	for (const node of erdData.nodes) {
		if (node.type === 'table' && selectedTableIdSet.has(node.id)) {
			includedNodeIds.add(node.id);
		}
	}

	// 2단계: 선택된 테이블의 컬럼 노드 포함
	for (const mapping of erdData.mappings) {
		if (
			mapping.sourceType === 'table' &&
			mapping.targetType === 'column' &&
			includedNodeIds.has(mapping.sourceId)
		) {
			includedNodeIds.add(mapping.targetId);
		}
	}

	// 3단계: 관련 엔터티 포함 (includeRelated가 true인 경우)
	if (includeRelated) {
		// 테이블 → 엔터티 매핑
		for (const mapping of erdData.mappings) {
			if (
				mapping.sourceType === 'table' &&
				mapping.targetType === 'entity' &&
				includedNodeIds.has(mapping.sourceId)
			) {
				includedNodeIds.add(mapping.targetId);
			}
		}

		// 컬럼 → 엔터티 매핑
		for (const mapping of erdData.mappings) {
			if (
				mapping.sourceType === 'column' &&
				mapping.targetType === 'entity' &&
				includedNodeIds.has(mapping.sourceId)
			) {
				includedNodeIds.add(mapping.targetId);
			}
		}

		// 엔터티의 속성 포함
		for (const mapping of erdData.mappings) {
			if (
				mapping.sourceType === 'entity' &&
				mapping.targetType === 'attribute' &&
				includedNodeIds.has(mapping.sourceId)
			) {
				includedNodeIds.add(mapping.targetId);
			}
		}

		// 도메인 매핑 포함 (컬럼 → 도메인)
		for (const mapping of erdData.mappings) {
			if (
				mapping.sourceType === 'column' &&
				mapping.targetType === 'domain' &&
				includedNodeIds.has(mapping.sourceId)
			) {
				includedNodeIds.add(mapping.targetId);
			}
		}
	}

	// 4단계: Database 노드 포함 (포함된 테이블과 연결된 경우)
	for (const mapping of erdData.mappings) {
		if (
			mapping.sourceType === 'database' &&
			mapping.targetType === 'table' &&
			includedNodeIds.has(mapping.targetId)
		) {
			includedNodeIds.add(mapping.sourceId);
		}
		if (
			includeRelated &&
			mapping.sourceType === 'database' &&
			mapping.targetType === 'entity' &&
			includedNodeIds.has(mapping.targetId)
		) {
			includedNodeIds.add(mapping.sourceId);
		}
	}

	// 필터링된 노드
	const filteredNodes = erdData.nodes.filter((node) => includedNodeIds.has(node.id));

	// 필터링된 엣지 (양쪽 노드가 모두 포함된 경우만)
	const filteredEdges = erdData.edges.filter(
		(edge) => includedNodeIds.has(edge.source) && includedNodeIds.has(edge.target)
	);

	// 필터링된 매핑
	const filteredMappings = erdData.mappings.filter(
		(mapping) => includedNodeIds.has(mapping.sourceId) && includedNodeIds.has(mapping.targetId)
	);

	return {
		nodes: filteredNodes,
		edges: filteredEdges,
		mappings: filteredMappings
	};
}
