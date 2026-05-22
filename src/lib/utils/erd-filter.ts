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
import { parseForeignKeyReference, type ERDForeignKeyReference } from './erd-fk-reference.js';

/**
 * ERD 필터 옵션
 */
export interface ERDFilterOptions {
	/** 선택된 테이블 ID 배열 */
	tableIds?: string[];
	/** 관련 엔터티/속성 포함 여부 (기본값: true) */
	includeRelated?: boolean;
	/** 주제영역 필터 */
	subjectAreas?: string[];
	/** 스키마 필터 */
	schemas?: string[];
	/** 테이블명/한글명/schema 검색어 */
	tableSearch?: string;
	/** 사업범위여부 필터 */
	scopeFlags?: string[];
	/** Graphviz FK 외부참조 포함 여부와 같은 URL 계약 유지용 */
	includeExternalReferences?: boolean;
	/** 최대 노드 수 */
	maxNodes?: number;
	/** 최대 엣지 수 */
	maxEdges?: number;
}

function normalizeText(value: string | undefined | null): string {
	return (value ?? '').trim();
}

function normalizeKey(value: string | undefined | null): string {
	const text = normalizeText(value);
	return text === '-' ? '' : text.toLowerCase();
}

function normalizeList(values: string[] | undefined): string[] {
	return (values ?? [])
		.flatMap((value) => value.split(','))
		.map((value) => normalizeText(value))
		.filter((value) => value.length > 0);
}

function createTableKey(
	schemaName: string | undefined,
	tableEnglishName: string | undefined
): string {
	return `${normalizeKey(schemaName)}|${normalizeKey(tableEnglishName)}`;
}

function isPositiveFlag(value: string | undefined): boolean {
	const normalized = normalizeKey(value);
	return ['y', 'yes', 'true', '1', 'o', '예', '대상', '포함'].includes(normalized);
}

function isNegativeFlag(value: string | undefined): boolean {
	const normalized = normalizeKey(value);
	return ['n', 'no', 'false', '0', 'x', '아니오', '제외'].includes(normalized);
}

function resolveSubjectArea(table: TableEntry, columns: ColumnEntry[]): string | undefined {
	return (
		table.subjectArea ?? columns.find((column) => normalizeKey(column.subjectArea))?.subjectArea
	);
}

function resolveBusinessScope(columns: ColumnEntry[]): boolean {
	return columns.some((column) => isPositiveFlag(column.scopeFlag));
}

function matchesText(value: string | undefined, expectedValues: string[]): boolean {
	if (expectedValues.length === 0) return true;
	const normalizedValue = normalizeKey(value);
	return expectedValues.some((expected) => normalizeKey(expected) === normalizedValue);
}

function matchesSearch(table: TableEntry, subjectArea: string | undefined, query: string): boolean {
	if (!query) return true;
	const normalizedQuery = query.toLowerCase();
	return [table.schemaName, table.tableEnglishName, table.tableKoreanName, subjectArea]
		.filter((value): value is string => Boolean(value))
		.some((value) => value.toLowerCase().includes(normalizedQuery));
}

function matchesScope(columns: ColumnEntry[], scopeFlags: string[]): boolean {
	if (scopeFlags.length === 0) return true;

	const normalizedFilters = scopeFlags.map((value) => normalizeKey(value));
	const wantsPositive = normalizedFilters.some((value) => isPositiveFlag(value));
	const wantsNegative = normalizedFilters.some((value) => isNegativeFlag(value));

	if (wantsPositive || wantsNegative) {
		const inBusinessScope = resolveBusinessScope(columns);
		return (wantsPositive && inBusinessScope) || (wantsNegative && !inBusinessScope);
	}

	return columns.some((column) => normalizedFilters.includes(normalizeKey(column.scopeFlag)));
}

function findReferencedColumn(
	reference: ERDForeignKeyReference,
	columns: ColumnEntry[]
): ColumnEntry | undefined {
	const referenceSchema = normalizeKey(reference.schemaName);
	const referenceTable = normalizeKey(reference.tableEnglishName);
	const referenceColumn = normalizeKey(reference.columnEnglishName);

	return columns.find((candidate) => {
		const schemaMatches =
			!referenceSchema || normalizeKey(candidate.schemaName) === referenceSchema;
		const tableMatches =
			!referenceTable || normalizeKey(candidate.tableEnglishName) === referenceTable;
		const columnMatches =
			!referenceColumn || normalizeKey(candidate.columnEnglishName) === referenceColumn;
		return schemaMatches && tableMatches && columnMatches;
	});
}

function collectExternalReferencedTableKeys(
	sourceTableKeys: Set<string>,
	columns: ColumnEntry[],
	tableKeys: Set<string>
): Set<string> {
	const externalTableKeys = new Set<string>();

	for (const column of columns) {
		if (!sourceTableKeys.has(createTableKey(column.schemaName, column.tableEnglishName))) continue;

		const reference = parseForeignKeyReference(column.fkInfo, column);
		if (!reference) continue;

		const targetColumn = findReferencedColumn(reference, columns);
		if (!targetColumn) continue;

		const targetTableKey = createTableKey(targetColumn.schemaName, targetColumn.tableEnglishName);
		if (!tableKeys.has(targetTableKey) || sourceTableKeys.has(targetTableKey)) continue;

		externalTableKeys.add(targetTableKey);
	}

	return externalTableKeys;
}

/**
 * MappingContext를 필터링
 */
export function filterMappingContext(
	context: MappingContext,
	filterOptions: ERDFilterOptions
): MappingContext {
	const {
		tableIds,
		includeRelated = true,
		subjectAreas,
		schemas,
		tableSearch,
		scopeFlags,
		includeExternalReferences = true
	} = filterOptions;
	const normalizedTableIds = normalizeList(tableIds);
	const normalizedSubjectAreas = normalizeList(subjectAreas);
	const normalizedSchemas = normalizeList(schemas);
	const normalizedTableSearch = normalizeText(tableSearch);
	const normalizedScopeFlags = normalizeList(scopeFlags);

	// 필터 옵션이 없으면 전체 반환
	if (
		normalizedTableIds.length === 0 &&
		normalizedSubjectAreas.length === 0 &&
		normalizedSchemas.length === 0 &&
		normalizedTableSearch.length === 0 &&
		normalizedScopeFlags.length === 0
	) {
		return context;
	}

	const columnsByTableKey = new Map<string, ColumnEntry[]>();
	for (const column of context.columns) {
		const key = createTableKey(column.schemaName, column.tableEnglishName);
		if (key === '|') continue;
		const columns = columnsByTableKey.get(key) ?? [];
		columns.push(column);
		columnsByTableKey.set(key, columns);
	}

	const selectedTableIds = new Set(normalizedTableIds);

	// 선택된 테이블 필터링
	const filteredTables = context.tables.filter((table) => {
		const columns =
			columnsByTableKey.get(createTableKey(table.schemaName, table.tableEnglishName)) ?? [];
		const subjectArea = resolveSubjectArea(table, columns);
		return (
			(normalizedTableIds.length === 0 || selectedTableIds.has(table.id)) &&
			matchesText(subjectArea, normalizedSubjectAreas) &&
			matchesText(table.schemaName, normalizedSchemas) &&
			matchesSearch(table, subjectArea, normalizedTableSearch) &&
			matchesScope(columns, normalizedScopeFlags)
		);
	});

	const allTableKeys = new Set(
		context.tables
			.map((table) => createTableKey(table.schemaName, table.tableEnglishName))
			.filter((key) => key !== '|')
	);

	// 선택된 테이블의 이름 집합 생성 (스키마명 + 테이블영문명)
	const selectedTableKeys = new Set(
		filteredTables
			.map((table) => createTableKey(table.schemaName, table.tableEnglishName))
			.filter((key) => key !== '|')
	);

	const finalTableKeys = new Set(selectedTableKeys);
	if (includeExternalReferences) {
		for (const key of collectExternalReferencedTableKeys(
			selectedTableKeys,
			context.columns,
			allTableKeys
		)) {
			finalTableKeys.add(key);
		}
	}

	// 선택된 테이블의 컬럼 필터링
	const filteredColumns = context.columns.filter((column) => {
		if (!column.schemaName || !column.tableEnglishName) return false;
		const key = createTableKey(column.schemaName, column.tableEnglishName);
		return finalTableKeys.has(key);
	});

	const finalFilteredTables =
		finalTableKeys.size === selectedTableKeys.size
			? filteredTables
			: context.tables.filter((table) =>
					finalTableKeys.has(createTableKey(table.schemaName, table.tableEnglishName))
				);

	// 관련 엔터티 이름 수집
	const relatedEntityNames = new Set<string>();
	if (includeRelated) {
		// 테이블의 relatedEntityName
		for (const table of finalFilteredTables) {
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

	// 관련 엔터티의 상위 엔터티(superType)도 포함
	if (includeRelated && filteredEntities.length > 0) {
		const superTypeNames = new Set<string>();
		for (const entity of filteredEntities) {
			if (entity.superTypeEntityName && entity.superTypeEntityName.trim() !== '-') {
				superTypeNames.add(entity.superTypeEntityName.trim());
			}
		}
		// superType 엔터티 중 아직 포함되지 않은 것들 추가
		const additionalEntities = context.entities.filter((entity) => {
			if (!entity.entityName) return false;
			const name = entity.entityName.trim();
			return superTypeNames.has(name) && !relatedEntityNames.has(name);
		});
		filteredEntities.push(...additionalEntities);
		for (const e of additionalEntities) {
			if (e.entityName) relatedEntityNames.add(e.entityName.trim());
		}
	}

	// 관련 속성 필터링 (관련 엔터티에 속한 속성)
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
	for (const table of finalFilteredTables) {
		if (table.physicalDbName && table.physicalDbName.trim() !== '-') {
			selectedDbNames.add(table.physicalDbName.trim());
		}
	}

	// 관련 엔터티의 논리 DB명도 수집
	const relatedLogicalDbNames = new Set<string>();
	if (includeRelated) {
		for (const entity of filteredEntities) {
			if (entity.logicalDbName && entity.logicalDbName.trim() !== '-') {
				relatedLogicalDbNames.add(entity.logicalDbName.trim());
			}
		}
	}

	const filteredDatabases = context.databases.filter((db) => {
		if (db.physicalDbName && selectedDbNames.has(db.physicalDbName.trim())) {
			return true;
		}
		if (includeRelated && db.logicalDbName) {
			// 논리적 DB는 관련 엔터티의 logicalDbName과 매칭
			return relatedLogicalDbNames.has(db.logicalDbName.trim());
		}
		return false;
	});

	return {
		databases: filteredDatabases,
		entities: filteredEntities,
		attributes: filteredAttributes,
		tables: finalFilteredTables,
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

		// 엔터티 상속 관계 포함
		for (const mapping of erdData.mappings) {
			if (
				mapping.sourceType === 'entity' &&
				mapping.targetType === 'entity' &&
				includedNodeIds.has(mapping.targetId)
			) {
				includedNodeIds.add(mapping.sourceId);
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

	// 4단계: Database 노드 포함 (포함된 테이블/엔터티와 연결된 경우)
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
