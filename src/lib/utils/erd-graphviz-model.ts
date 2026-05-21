/**
 * Graphviz ERD 모델 생성 유틸리티
 *
 * TableEntry + ColumnEntry를 현재 정의서 기준 ERD 이미지 모델로 정규화한다.
 */

import type { ColumnEntry, TableEntry } from '$lib/types/database-design.js';
import type { MappingContext } from '$lib/types/erd-mapping.js';

// ============================================================================
// 타입 정의
// ============================================================================

export type GraphvizERDMode = 'logical' | 'physical';
export type GraphvizERDFormat = 'svg' | 'png';

export interface GraphvizERDFilterOptions {
	tableIds?: string[];
	subjectAreas?: string[];
	schemas?: string[];
	tableSearch?: string;
	scopeFlags?: string[];
	includeExternalReferences?: boolean;
}

export interface GraphvizERDColumnReference {
	schemaName?: string;
	tableEnglishName?: string;
	columnEnglishName?: string;
}

export interface GraphvizERDColumn {
	id: string;
	columnEnglishName: string;
	columnKoreanName?: string;
	dataType?: string;
	dataLength: string;
	dataDecimalLength: string;
	notNullFlag?: string;
	pkInfo: string;
	fkInfo?: string;
	isPrimaryKey: boolean;
	isForeignKey: boolean;
	isNotNull: boolean;
	reference?: GraphvizERDColumnReference;
	raw: ColumnEntry;
}

export interface GraphvizERDTable {
	id: string;
	key: string;
	nodeId: string;
	schemaName?: string;
	tableEnglishName: string;
	tableKoreanName?: string;
	subjectArea?: string;
	scopeFlag?: string;
	inBusinessScope: boolean;
	isExternal: boolean;
	columns: GraphvizERDColumn[];
	raw?: TableEntry;
}

export interface GraphvizERDRelationship {
	id: string;
	sourceTableKey: string;
	targetTableKey: string;
	sourceColumnName?: string;
	targetColumnName?: string;
	label: string;
	fkInfo: string;
	isExternalReference: boolean;
}

export interface GraphvizERDWarning {
	code: 'missing-table' | 'missing-column' | 'unresolved-fk';
	message: string;
	detail?: Record<string, string>;
}

export interface GraphvizERDModel {
	tables: GraphvizERDTable[];
	relationships: GraphvizERDRelationship[];
	warnings: GraphvizERDWarning[];
	filters: Required<GraphvizERDFilterOptions>;
	metadata: {
		generatedAt: string;
		totalTables: number;
		totalColumns: number;
		totalRelationships: number;
		externalTables: number;
	};
}

interface TableBuildRecord {
	table: TableEntry;
	key: string;
	columns: ColumnEntry[];
}

// ============================================================================
// 공통 유틸리티
// ============================================================================

function normalizeText(value: string | undefined | null): string {
	return (value ?? '').trim();
}

function normalizeKey(value: string | undefined | null): string {
	const text = normalizeText(value);
	return text === '-' ? '' : text.toLowerCase();
}

function isBlank(value: string | undefined | null): boolean {
	const text = normalizeText(value);
	return text === '' || text === '-';
}

function normalizeList(values: string[] | undefined): string[] {
	return (values ?? [])
		.flatMap((value) => value.split(','))
		.map((value) => normalizeText(value))
		.filter((value) => value.length > 0);
}

function createTableKey(schemaName: string | undefined, tableEnglishName: string | undefined): string {
	return `${normalizeKey(schemaName)}|${normalizeKey(tableEnglishName)}`;
}

function createNodeId(base: string, usedNodeIds: Set<string>): string {
	const sanitized =
		`t_${base}`
			.replace(/[^a-zA-Z0-9_]/g, '_')
			.replace(/_+/g, '_')
			.replace(/^_+|_+$/g, '') || 't_node';
	let nodeId = sanitized;
	let suffix = 2;
	while (usedNodeIds.has(nodeId)) {
		nodeId = `${sanitized}_${suffix}`;
		suffix += 1;
	}
	usedNodeIds.add(nodeId);
	return nodeId;
}

function isPositiveFlag(value: string | undefined): boolean {
	const normalized = normalizeKey(value);
	return ['y', 'yes', 'true', '1', 'o', '예', '대상', '포함'].includes(normalized);
}

function isNegativeFlag(value: string | undefined): boolean {
	const normalized = normalizeKey(value);
	return ['n', 'no', 'false', '0', 'x', '아니오', '제외'].includes(normalized);
}

function hasMeaningfulFlag(value: string | undefined): boolean {
	return !isBlank(value);
}

function resolveTableScopeFlag(columns: ColumnEntry[]): string | undefined {
	return columns.find((column) => hasMeaningfulFlag(column.scopeFlag))?.scopeFlag;
}

function resolveBusinessScope(columns: ColumnEntry[]): boolean {
	return columns.some((column) => isPositiveFlag(column.scopeFlag));
}

function scopeFilterMatches(table: GraphvizERDTable, scopeFlags: string[]): boolean {
	if (scopeFlags.length === 0) return true;

	const normalizedFilters = scopeFlags.map((value) => normalizeKey(value));
	const wantsPositive = normalizedFilters.some((value) => isPositiveFlag(value));
	const wantsNegative = normalizedFilters.some((value) => isNegativeFlag(value));

	if (wantsPositive || wantsNegative) {
		return (
			(wantsPositive && table.inBusinessScope) || (wantsNegative && !table.inBusinessScope)
		);
	}

	const tableScope = normalizeKey(table.scopeFlag);
	return normalizedFilters.includes(tableScope);
}

function createColumnModel(column: ColumnEntry): GraphvizERDColumn {
	return {
		id: column.id,
		columnEnglishName: normalizeText(column.columnEnglishName),
		columnKoreanName: column.columnKoreanName,
		dataType: column.dataType,
		dataLength: column.dataLength,
		dataDecimalLength: column.dataDecimalLength,
		notNullFlag: column.notNullFlag,
		pkInfo: column.pkInfo,
		fkInfo: column.fkInfo,
		isPrimaryKey: !isBlank(column.pkInfo),
		isForeignKey: !isBlank(column.fkInfo) && !['y', 'yes'].includes(normalizeKey(column.fkInfo)),
		isNotNull: isPositiveFlag(column.notNullFlag),
		reference: parseForeignKeyReference(column.fkInfo, column),
		raw: column
	};
}

function resolveSubjectArea(table: TableEntry, columns: ColumnEntry[]): string | undefined {
	return table.subjectArea ?? columns.find((column) => !isBlank(column.subjectArea))?.subjectArea;
}

function createGraphvizTable(
	record: TableBuildRecord,
	usedNodeIds: Set<string>,
	isExternal: boolean
): GraphvizERDTable {
	const tableName = normalizeText(record.table.tableEnglishName);
	const nodeId = createNodeId(`${record.table.schemaName ?? ''}_${tableName}`, usedNodeIds);
	const scopeFlag = resolveTableScopeFlag(record.columns);
	return {
		id: record.table.id,
		key: record.key,
		nodeId,
		schemaName: record.table.schemaName,
		tableEnglishName: tableName,
		tableKoreanName: record.table.tableKoreanName,
		subjectArea: resolveSubjectArea(record.table, record.columns),
		scopeFlag,
		inBusinessScope: resolveBusinessScope(record.columns),
		isExternal,
		columns: record.columns.map(createColumnModel),
		raw: record.table
	};
}

function parseForeignKeyReference(
	fkInfo: string | undefined,
	column: ColumnEntry
): GraphvizERDColumnReference | undefined {
	if (isBlank(fkInfo)) return undefined;

	const text = normalizeText(fkInfo);
	if (['Y', 'YES', 'TRUE'].includes(text.toUpperCase())) return undefined;

	const firstReference = text
		.split(/[;,\n]/)
		.map((part) => part.trim())
		.find((part) => part.length > 0);
	if (!firstReference) return undefined;

	const cleaned = firstReference
		.replace(/[`"'[\]{}()]/g, ' ')
		.replace(/->/g, '.')
		.replace(/=>/g, '.')
		.replace(/\s+/g, ' ')
		.trim();
	const parts = cleaned
		.split(/[.:]/)
		.map((part) => part.trim())
		.filter(Boolean);

	if (parts.length >= 3) {
		return {
			schemaName: parts[parts.length - 3],
			tableEnglishName: parts[parts.length - 2],
			columnEnglishName: parts[parts.length - 1]
		};
	}

	if (parts.length === 2) {
		return {
			schemaName: column.schemaName,
			tableEnglishName: parts[0],
			columnEnglishName: parts[1]
		};
	}

	return {
		schemaName: column.schemaName,
		tableEnglishName: column.tableEnglishName,
		columnEnglishName: parts[0]
	};
}

function matchesText(value: string | undefined, expectedValues: string[]): boolean {
	if (expectedValues.length === 0) return true;
	const normalizedValue = normalizeKey(value);
	return expectedValues.some((expected) => normalizeKey(expected) === normalizedValue);
}

function tableMatchesSearch(table: GraphvizERDTable, query: string): boolean {
	if (!query) return true;
	const normalizedQuery = query.toLowerCase();
	return [table.schemaName, table.tableEnglishName, table.tableKoreanName, table.subjectArea]
		.filter((value): value is string => Boolean(value))
		.some((value) => value.toLowerCase().includes(normalizedQuery));
}

function buildTableRecords(context: MappingContext): Map<string, TableBuildRecord> {
	const columnsByTableKey = new Map<string, ColumnEntry[]>();
	for (const column of context.columns) {
		const key = createTableKey(column.schemaName, column.tableEnglishName);
		if (key === '|') continue;
		const columns = columnsByTableKey.get(key) ?? [];
		columns.push(column);
		columnsByTableKey.set(key, columns);
	}

	const records = new Map<string, TableBuildRecord>();
	for (const table of context.tables) {
		const key = createTableKey(table.schemaName, table.tableEnglishName);
		if (key === '|') continue;
		records.set(key, {
			table,
			key,
			columns: columnsByTableKey.get(key) ?? []
		});
	}
	return records;
}

function findReferencedColumn(
	reference: GraphvizERDColumnReference | undefined,
	columns: ColumnEntry[]
): ColumnEntry | undefined {
	if (!reference?.tableEnglishName && !reference?.columnEnglishName) return undefined;
	const referenceSchema = normalizeKey(reference.schemaName);
	const referenceTable = normalizeKey(reference.tableEnglishName);
	const referenceColumn = normalizeKey(reference.columnEnglishName);

	return columns.find((candidate) => {
		const schemaMatches = !referenceSchema || normalizeKey(candidate.schemaName) === referenceSchema;
		const tableMatches = !referenceTable || normalizeKey(candidate.tableEnglishName) === referenceTable;
		const columnMatches =
			!referenceColumn || normalizeKey(candidate.columnEnglishName) === referenceColumn;
		return schemaMatches && tableMatches && columnMatches;
	});
}

function buildRelationshipId(
	sourceTableKey: string,
	targetTableKey: string,
	sourceColumnName: string | undefined,
	targetColumnName: string | undefined
): string {
	return [sourceTableKey, sourceColumnName, targetTableKey, targetColumnName]
		.map((part) => normalizeKey(part).replace(/[^a-z0-9가-힣|_]/g, '_'))
		.join('__');
}

function normalizeFilterOptions(
	options: GraphvizERDFilterOptions | undefined
): Required<GraphvizERDFilterOptions> {
	return {
		tableIds: normalizeList(options?.tableIds),
		subjectAreas: normalizeList(options?.subjectAreas),
		schemas: normalizeList(options?.schemas),
		tableSearch: normalizeText(options?.tableSearch),
		scopeFlags: normalizeList(options?.scopeFlags),
		includeExternalReferences: options?.includeExternalReferences ?? true
	};
}

// ============================================================================
// 모델 생성
// ============================================================================

export function buildGraphvizERDModel(
	context: MappingContext,
	options?: GraphvizERDFilterOptions
): GraphvizERDModel {
	const filters = normalizeFilterOptions(options);
	const records = buildTableRecords(context);
	const usedNodeIds = new Set<string>();
	const warnings: GraphvizERDWarning[] = [];

	const tableIdSet = new Set(filters.tableIds);
	let selectedRecords = Array.from(records.values()).filter((record) => {
		const provisional = createGraphvizTable(record, new Set(), false);
		return (
			(filters.tableIds.length === 0 || tableIdSet.has(record.table.id)) &&
			matchesText(provisional.subjectArea, filters.subjectAreas) &&
			matchesText(record.table.schemaName, filters.schemas) &&
			tableMatchesSearch(provisional, filters.tableSearch) &&
			scopeFilterMatches(provisional, filters.scopeFlags)
		);
	});

	selectedRecords = selectedRecords.sort((a, b) => {
		const subjectCompare = normalizeText(a.table.subjectArea).localeCompare(
			normalizeText(b.table.subjectArea),
			'ko',
			{ sensitivity: 'base' }
		);
		if (subjectCompare !== 0) return subjectCompare;
		return `${a.table.schemaName ?? ''}.${a.table.tableEnglishName ?? ''}`.localeCompare(
			`${b.table.schemaName ?? ''}.${b.table.tableEnglishName ?? ''}`,
			'ko',
			{ sensitivity: 'base' }
		);
	});

	const selectedKeys = new Set(selectedRecords.map((record) => record.key));
	const modelTables = new Map<string, GraphvizERDTable>();
	for (const record of selectedRecords) {
		modelTables.set(record.key, createGraphvizTable(record, usedNodeIds, false));
	}

	const relationships = new Map<string, GraphvizERDRelationship>();
	for (const record of selectedRecords) {
		for (const sourceColumn of record.columns) {
			const reference = parseForeignKeyReference(sourceColumn.fkInfo, sourceColumn);
			if (!reference) continue;

			const targetColumn = findReferencedColumn(reference, context.columns);
			if (!targetColumn) {
				warnings.push({
					code: 'unresolved-fk',
					message: 'FK 참조 컬럼을 찾을 수 없습니다.',
					detail: {
						fkInfo: sourceColumn.fkInfo ?? '',
						table: sourceColumn.tableEnglishName ?? '',
						column: sourceColumn.columnEnglishName ?? ''
					}
				});
				continue;
			}

			const targetTableKey = createTableKey(targetColumn.schemaName, targetColumn.tableEnglishName);
			if (!records.has(targetTableKey)) {
				warnings.push({
					code: 'missing-table',
					message: 'FK 참조 테이블 정의를 찾을 수 없습니다.',
					detail: {
						fkInfo: sourceColumn.fkInfo ?? '',
						targetTable: targetColumn.tableEnglishName ?? ''
					}
				});
				continue;
			}

			const isExternalReference = !selectedKeys.has(targetTableKey);
			if (isExternalReference && !filters.includeExternalReferences) continue;

			if (isExternalReference && !modelTables.has(targetTableKey)) {
				const targetRecord = records.get(targetTableKey);
				if (targetRecord) {
					modelTables.set(targetTableKey, createGraphvizTable(targetRecord, usedNodeIds, true));
				}
			}

			const relationshipId = buildRelationshipId(
				record.key,
				targetTableKey,
				sourceColumn.columnEnglishName,
				targetColumn.columnEnglishName
			);
			if (relationships.has(relationshipId)) continue;

			relationships.set(relationshipId, {
				id: relationshipId,
				sourceTableKey: record.key,
				targetTableKey,
				sourceColumnName: sourceColumn.columnEnglishName,
				targetColumnName: targetColumn.columnEnglishName,
				label: `${sourceColumn.columnEnglishName ?? 'FK'} → ${targetColumn.columnEnglishName ?? 'PK'}`,
				fkInfo: sourceColumn.fkInfo ?? '',
				isExternalReference
			});
		}
	}

	const tables = Array.from(modelTables.values());
	const relationshipList = Array.from(relationships.values());

	return {
		tables,
		relationships: relationshipList,
		warnings,
		filters,
		metadata: {
			generatedAt: new Date().toISOString(),
			totalTables: tables.length,
			totalColumns: tables.reduce((sum, table) => sum + table.columns.length, 0),
			totalRelationships: relationshipList.length,
			externalTables: tables.filter((table) => table.isExternal).length
		}
	};
}

export const graphvizERDTestUtils = {
	createTableKey,
	parseForeignKeyReference,
	isPositiveFlag
};
