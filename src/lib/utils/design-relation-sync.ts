import type { ColumnEntry, TableEntry } from '$lib/types/database-design.js';
import type {
	DesignRelationSyncPreview,
	RelationSyncChange,
	RelationSyncSuggestion
} from '$lib/types/design-relation.js';
import type { MappingContext } from '$lib/types/erd-mapping.js';
import { buildCompositeKey, normalizeKey } from '$lib/utils/mapping-key.js';

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
		const schema = normalizeKey(column.schemaName, { emptyLikeDash: true });
		const entity = normalizeKey(column.relatedEntityName, { emptyLikeDash: true });
		const columnKorean = normalizeKey(column.columnKoreanName, { emptyLikeDash: true });
		if (!schema || !entity) continue;

		const entityKey = buildCompositeKey([schema, entity]);
		addMapValue(bySchemaEntity, entityKey, column);

		if (columnKorean) {
			exactKeySet.add(`${entityKey}|${columnKorean}`);
		}
	}

	const suggestions: RelationSyncSuggestion[] = [];

	for (const attribute of context.attributes) {
		const schema = normalizeKey(attribute.schemaName, { emptyLikeDash: true });
		const entity = normalizeKey(attribute.entityName, { emptyLikeDash: true });
		const attrName = normalizeKey(attribute.attributeName, { emptyLikeDash: true });
		if (!schema || !entity || !attrName) continue;

		const exactKey = buildCompositeKey([schema, entity, attrName]);
		if (exactKeySet.has(exactKey)) {
			continue;
		}

		const candidates = (bySchemaEntity.get(buildCompositeKey([schema, entity])) || [])
			.filter((column) => {
				const colName = normalizeKey(column.columnKoreanName, { emptyLikeDash: true });
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
		const schema = normalizeKey(entity.schemaName, { emptyLikeDash: true });
		const entityName = normalizeKey(entity.entityName, { emptyLikeDash: true });
		const tableKoreanName = normalizeKey(entity.tableKoreanName, { emptyLikeDash: true });

		if (schema && entityName) {
			entityBySchemaName.set(buildCompositeKey([schema, entityName]), entity);
		}
		if (schema && tableKoreanName) {
			addMapValue(entityBySchemaKorean, buildCompositeKey([schema, tableKoreanName]), entity);
		}
	}

	const tableUpdates: RelationSyncUpdate<TablePatch>[] = [];
	const columnUpdates: RelationSyncUpdate<ColumnPatch>[] = [];
	const changes: RelationSyncChange[] = [];

	for (const table of context.tables) {
		const schema = normalizeKey(table.schemaName, { emptyLikeDash: true });
		if (!schema) continue;

		const relatedEntity = normalizeKey(table.relatedEntityName, { emptyLikeDash: true });
		const tableKorean = normalizeKey(table.tableKoreanName, { emptyLikeDash: true });

		let canonicalEntityName: string | undefined;
		let reason = '';

		if (relatedEntity) {
			if (entityBySchemaName.has(buildCompositeKey([schema, relatedEntity]))) {
				continue;
			}

			const byKorean = entityBySchemaKorean.get(buildCompositeKey([schema, relatedEntity])) || [];
			if (byKorean.length === 1 && byKorean[0].entityName) {
				canonicalEntityName = byKorean[0].entityName;
				reason = 'relatedEntityName이 엔터티 한글명과 일치하여 엔터티명으로 보정';
			}
		} else if (tableKorean) {
			const byTableName = entityBySchemaKorean.get(buildCompositeKey([schema, tableKorean])) || [];
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
		const schema = normalizeKey(table.schemaName, { emptyLikeDash: true });
		const tableEnglish = normalizeKey(table.tableEnglishName, { emptyLikeDash: true });
		const tableKorean = normalizeKey(table.tableKoreanName, { emptyLikeDash: true });
		const relatedEntity = normalizeKey(table.relatedEntityName, { emptyLikeDash: true });

		if (schema && tableEnglish) {
			tableBySchemaEnglish.set(buildCompositeKey([schema, tableEnglish]), table);
		}
		if (schema && tableKorean) {
			addMapValue(tableBySchemaKorean, buildCompositeKey([schema, tableKorean]), table);
		}
		if (tableEnglish) {
			addMapValue(tableByEnglish, tableEnglish, table);
		}
		if (schema && relatedEntity) {
			addMapValue(tableBySchemaRelatedEntity, buildCompositeKey([schema, relatedEntity]), table);
		}
	}

	for (const column of context.columns) {
		const schema = normalizeKey(column.schemaName, { emptyLikeDash: true });
		const tableEnglish = normalizeKey(column.tableEnglishName, { emptyLikeDash: true });
		const relatedEntity = normalizeKey(column.relatedEntityName, { emptyLikeDash: true });

		if (schema && tableEnglish && tableBySchemaEnglish.has(buildCompositeKey([schema, tableEnglish]))) {
			continue;
		}

		let matchedTable: TableEntry | null = null;
		let reason = '';

		if (schema && tableEnglish) {
			const byKorean = tableBySchemaKorean.get(buildCompositeKey([schema, tableEnglish])) || [];
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
			const byEntity =
				tableBySchemaRelatedEntity.get(buildCompositeKey([schema, relatedEntity])) || [];
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
