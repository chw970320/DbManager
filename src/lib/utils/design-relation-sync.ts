import type { ColumnEntry, TableEntry } from '$lib/types/database-design.js';
import type {
	DesignRelationSyncPreview,
	RelationSyncChange,
	RelationSyncSuggestion
} from '$lib/types/design-relation.js';
import type { MappingContext } from '$lib/types/erd-mapping.js';

type TablePatch = Partial<Pick<TableEntry, 'relatedEntityName'>>;
type ColumnPatch = Partial<Pick<ColumnEntry, 'schemaName' | 'tableEnglishName' | 'relatedEntityName'>>;

export interface RelationSyncUpdate<TPatch> {
	id: string;
	patch: TPatch;
	targetLabel: string;
	reason: string;
}

export interface DesignRelationSyncPlan {
	tableUpdates: RelationSyncUpdate<TablePatch>[];
	columnUpdates: RelationSyncUpdate<ColumnPatch>[];
	preview: DesignRelationSyncPreview;
}

function normalize(value: string | undefined | null): string {
	if (!value) return '';
	const v = value.trim();
	if (v === '' || v === '-') return '';
	return v.toLowerCase();
}

function addMapValue<T>(map: Map<string, T[]>, key: string, value: T): void {
	const prev = map.get(key);
	if (prev) {
		prev.push(value);
		return;
	}
	map.set(key, [value]);
}

function buildAttributeColumnSuggestions(context: MappingContext): RelationSyncSuggestion[] {
	const bySchemaEntity = new Map<string, ColumnEntry[]>();
	const exactKeySet = new Set<string>();

	for (const column of context.columns) {
		const schema = normalize(column.schemaName);
		const entity = normalize(column.relatedEntityName);
		const columnKorean = normalize(column.columnKoreanName);
		if (!schema || !entity) continue;

		const entityKey = `${schema}|${entity}`;
		addMapValue(bySchemaEntity, entityKey, column);

		if (columnKorean) {
			exactKeySet.add(`${entityKey}|${columnKorean}`);
		}
	}

	const suggestions: RelationSyncSuggestion[] = [];

	for (const attribute of context.attributes) {
		const schema = normalize(attribute.schemaName);
		const entity = normalize(attribute.entityName);
		const attrName = normalize(attribute.attributeName);
		if (!schema || !entity || !attrName) continue;

		const exactKey = `${schema}|${entity}|${attrName}`;
		if (exactKeySet.has(exactKey)) {
			continue;
		}

		const candidates = (bySchemaEntity.get(`${schema}|${entity}`) || [])
			.filter((column) => {
				const colName = normalize(column.columnKoreanName);
				return colName !== '' && (colName.includes(attrName) || attrName.includes(colName));
			})
			.slice(0, 3)
			.map((column) => ({
				columnId: column.id,
				columnLabel: column.columnEnglishName || column.columnKoreanName || column.id,
				schemaName: column.schemaName,
				tableEnglishName: column.tableEnglishName,
				relatedEntityName: column.relatedEntityName
			}));

		if (candidates.length === 0) continue;

		suggestions.push({
			attributeId: attribute.id,
			attributeName: attribute.attributeName || attribute.id,
			schemaName: attribute.schemaName || '',
			entityName: attribute.entityName || '',
			candidates
		});
	}

	return suggestions;
}

export function buildDesignRelationSyncPlan(context: MappingContext): DesignRelationSyncPlan {
	const entityBySchemaName = new Map<string, MappingContext['entities'][number]>();
	const entityBySchemaKorean = new Map<string, MappingContext['entities'][number][]>();

	for (const entity of context.entities) {
		const schema = normalize(entity.schemaName);
		const entityName = normalize(entity.entityName);
		const tableKoreanName = normalize(entity.tableKoreanName);

		if (schema && entityName) {
			entityBySchemaName.set(`${schema}|${entityName}`, entity);
		}
		if (schema && tableKoreanName) {
			addMapValue(entityBySchemaKorean, `${schema}|${tableKoreanName}`, entity);
		}
	}

	const tableUpdates: RelationSyncUpdate<TablePatch>[] = [];
	const columnUpdates: RelationSyncUpdate<ColumnPatch>[] = [];
	const changes: RelationSyncChange[] = [];

	for (const table of context.tables) {
		const schema = normalize(table.schemaName);
		if (!schema) continue;

		const relatedEntity = normalize(table.relatedEntityName);
		const tableKorean = normalize(table.tableKoreanName);

		let canonicalEntityName: string | undefined;
		let reason = '';

		if (relatedEntity) {
			if (entityBySchemaName.has(`${schema}|${relatedEntity}`)) {
				continue;
			}

			const byKorean = entityBySchemaKorean.get(`${schema}|${relatedEntity}`) || [];
			if (byKorean.length === 1 && byKorean[0].entityName) {
				canonicalEntityName = byKorean[0].entityName;
				reason = 'relatedEntityName이 엔터티 한글명과 일치하여 엔터티명으로 보정';
			}
		} else if (tableKorean) {
			const byTableName = entityBySchemaKorean.get(`${schema}|${tableKorean}`) || [];
			if (byTableName.length === 1 && byTableName[0].entityName) {
				canonicalEntityName = byTableName[0].entityName;
				reason = 'tableKoreanName과 일치하는 엔터티를 찾아 relatedEntityName을 보정';
			}
		}

		if (!canonicalEntityName || canonicalEntityName === table.relatedEntityName) {
			continue;
		}

		tableUpdates.push({
			id: table.id,
			patch: { relatedEntityName: canonicalEntityName },
			targetLabel: table.tableEnglishName || table.tableKoreanName || table.id,
			reason
		});

		changes.push({
			targetType: 'table',
			targetId: table.id,
			targetLabel: table.tableEnglishName || table.tableKoreanName || table.id,
			field: 'relatedEntityName',
			before: table.relatedEntityName || '',
			after: canonicalEntityName,
			reason
		});
	}

	const tablePatchMap = new Map(tableUpdates.map((update) => [update.id, update.patch]));
	const effectiveTables = context.tables.map((table) => ({
		...table,
		...(tablePatchMap.get(table.id) || {})
	}));

	const tableBySchemaEnglish = new Map<string, TableEntry>();
	const tableBySchemaKorean = new Map<string, TableEntry[]>();
	const tableByEnglish = new Map<string, TableEntry[]>();
	const tableBySchemaRelatedEntity = new Map<string, TableEntry[]>();

	for (const table of effectiveTables) {
		const schema = normalize(table.schemaName);
		const tableEnglish = normalize(table.tableEnglishName);
		const tableKorean = normalize(table.tableKoreanName);
		const relatedEntity = normalize(table.relatedEntityName);

		if (schema && tableEnglish) {
			tableBySchemaEnglish.set(`${schema}|${tableEnglish}`, table);
		}
		if (schema && tableKorean) {
			addMapValue(tableBySchemaKorean, `${schema}|${tableKorean}`, table);
		}
		if (tableEnglish) {
			addMapValue(tableByEnglish, tableEnglish, table);
		}
		if (schema && relatedEntity) {
			addMapValue(tableBySchemaRelatedEntity, `${schema}|${relatedEntity}`, table);
		}
	}

	for (const column of context.columns) {
		const schema = normalize(column.schemaName);
		const tableEnglish = normalize(column.tableEnglishName);
		const relatedEntity = normalize(column.relatedEntityName);

		if (schema && tableEnglish && tableBySchemaEnglish.has(`${schema}|${tableEnglish}`)) {
			continue;
		}

		let matchedTable: TableEntry | null = null;
		let reason = '';

		if (schema && tableEnglish) {
			const byKorean = tableBySchemaKorean.get(`${schema}|${tableEnglish}`) || [];
			if (byKorean.length === 1) {
				matchedTable = byKorean[0];
				reason = '컬럼 tableEnglishName이 테이블 한글명으로 입력되어 영문명으로 보정';
			}
		}

		if (!matchedTable && tableEnglish) {
			const byEnglish = tableByEnglish.get(tableEnglish) || [];
			if (byEnglish.length === 1) {
				matchedTable = byEnglish[0];
				reason = 'tableEnglishName 단일 매칭으로 schema/relatedEntity를 보정';
			}
		}

		if (!matchedTable && schema && relatedEntity) {
			const byEntity = tableBySchemaRelatedEntity.get(`${schema}|${relatedEntity}`) || [];
			if (byEntity.length === 1) {
				matchedTable = byEntity[0];
				reason = 'schema+relatedEntityName 단일 매칭으로 tableEnglishName을 보정';
			}
		}

		if (!matchedTable) continue;

		const patch: ColumnPatch = {};
		const changedFields: Array<RelationSyncChange['field']> = [];
		const targetLabel = column.columnEnglishName || column.columnKoreanName || column.id;

		if (matchedTable.schemaName && matchedTable.schemaName !== column.schemaName) {
			patch.schemaName = matchedTable.schemaName;
			changedFields.push('schemaName');
		}
		if (matchedTable.tableEnglishName && matchedTable.tableEnglishName !== column.tableEnglishName) {
			patch.tableEnglishName = matchedTable.tableEnglishName;
			changedFields.push('tableEnglishName');
		}
		if (matchedTable.relatedEntityName && matchedTable.relatedEntityName !== column.relatedEntityName) {
			patch.relatedEntityName = matchedTable.relatedEntityName;
			changedFields.push('relatedEntityName');
		}

		if (changedFields.length === 0) continue;

		columnUpdates.push({
			id: column.id,
			patch,
			targetLabel,
			reason
		});

		for (const field of changedFields) {
			changes.push({
				targetType: 'column',
				targetId: column.id,
				targetLabel,
				field,
				before: (column[field] || '') as string,
				after: (patch[field] || '') as string,
				reason
			});
		}
	}

	const columnPatchMap = new Map(columnUpdates.map((update) => [update.id, update.patch]));
	const effectiveColumns = context.columns.map((column) => ({
		...column,
		...(columnPatchMap.get(column.id) || {})
	}));

	const suggestions = buildAttributeColumnSuggestions({
		...context,
		tables: effectiveTables,
		columns: effectiveColumns
	});

	return {
		tableUpdates,
		columnUpdates,
		preview: {
			counts: {
				tableCandidates: tableUpdates.length,
				columnCandidates: columnUpdates.length,
				totalCandidates: tableUpdates.length + columnUpdates.length,
				fieldChanges: changes.length,
				attributeColumnSuggestions: suggestions.length
			},
			changes,
			suggestions
		}
	};
}
