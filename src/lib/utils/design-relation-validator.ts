import type { MappingContext } from '$lib/types/erd-mapping.js';
import type {
	DesignRelationValidationResult,
	RelationIssue,
	RelationSpec,
	RelationValidationSummary
} from '$lib/types/design-relation.js';
import { buildCompositeKey, normalizeKey } from '$lib/utils/mapping-key.js';

function makeIssue(
	spec: RelationSpec,
	targetId: string,
	targetLabel: string,
	expectedKey: string,
	reason: string
): RelationIssue {
	return {
		relationId: spec.id,
		severity: spec.severity,
		sourceType: spec.sourceType,
		targetType: spec.targetType,
		targetId,
		targetLabel,
		expectedKey,
		reason
	};
}

export const DESIGN_RELATION_SPECS: RelationSpec[] = [
	{
		id: 'DB_ENTITY',
		name: '데이터베이스 -> 엔터티',
		sourceType: 'database',
		targetType: 'entity',
		mappingKey: 'logicalDbName',
		cardinality: '1:N',
		severity: 'error',
		description: '엔터티의 logicalDbName이 데이터베이스 logicalDbName에 존재해야 합니다.'
	},
	{
		id: 'DB_TABLE',
		name: '데이터베이스 -> 테이블',
		sourceType: 'database',
		targetType: 'table',
		mappingKey: 'physicalDbName',
		cardinality: '1:N',
		severity: 'error',
		description: '테이블의 physicalDbName이 데이터베이스 physicalDbName에 존재해야 합니다.'
	},
	{
		id: 'ENTITY_ATTRIBUTE',
		name: '엔터티 -> 속성',
		sourceType: 'entity',
		targetType: 'attribute',
		mappingKey: 'schemaName + entityName',
		cardinality: '1:N',
		severity: 'error',
		description: '속성의 schemaName/entityName 조합이 엔터티에 존재해야 합니다.'
	},
	{
		id: 'ENTITY_TABLE',
		name: '엔터티 -> 테이블',
		sourceType: 'entity',
		targetType: 'table',
		mappingKey: 'schemaName + relatedEntityName(entityName)',
		cardinality: '1:N',
		severity: 'error',
		description:
			'테이블의 schemaName/relatedEntityName 조합이 엔터티 schemaName/entityName(보조: tableKoreanName)에 존재해야 합니다.'
	},
	{
		id: 'TABLE_COLUMN',
		name: '테이블 -> 컬럼',
		sourceType: 'table',
		targetType: 'column',
		mappingKey: 'schemaName + tableEnglishName',
		cardinality: '1:N',
		severity: 'error',
		description: '컬럼의 schemaName/tableEnglishName 조합이 테이블에 존재해야 합니다.'
	},
	{
		id: 'ATTRIBUTE_COLUMN',
		name: '속성 -> 컬럼(보조)',
		sourceType: 'attribute',
		targetType: 'column',
		mappingKey: 'schemaName + entityName(relatedEntityName) + attributeName(columnKoreanName)',
		cardinality: '1:1',
		severity: 'warning',
		description:
			'속성과 컬럼의 논리-물리 연결 후보를 점검합니다. 불일치는 경고로 취급합니다.'
	}
];

function createSummary(spec: RelationSpec): RelationValidationSummary {
	return {
		relationId: spec.id,
		relationName: spec.name,
		totalChecked: 0,
		matched: 0,
		unmatched: 0,
		severity: spec.severity,
		mappingKey: spec.mappingKey,
		issues: []
	};
}

export function validateDesignRelations(context: MappingContext): DesignRelationValidationResult {
	const specMap = new Map(DESIGN_RELATION_SPECS.map((s) => [s.id, s]));
	const summaryMap = new Map<RelationSpec['id'], RelationValidationSummary>();
	for (const spec of DESIGN_RELATION_SPECS) {
		summaryMap.set(spec.id, createSummary(spec));
	}

	const dbLogicalKeySet = new Set(
		context.databases
			.map((db) => normalizeKey(db.logicalDbName, { emptyLikeDash: true }))
			.filter((k) => k !== '')
	);
	const dbPhysicalKeySet = new Set(
		context.databases
			.map((db) => normalizeKey(db.physicalDbName, { emptyLikeDash: true }))
			.filter((k) => k !== '')
	);

	const entityKeySet = new Set(
		context.entities
			.map((entity) =>
				buildCompositeKey([entity.schemaName, entity.entityName], { emptyLikeDash: true })
			)
			.filter((k) => k !== '')
	);
	const entityKoreanKeySet = new Set(
		context.entities
			.map((entity) =>
				buildCompositeKey([entity.schemaName, entity.tableKoreanName], { emptyLikeDash: true })
			)
			.filter((k) => k !== '')
	);

	const tableKeySet = new Set(
		context.tables
			.map((table) =>
				buildCompositeKey([table.schemaName, table.tableEnglishName], { emptyLikeDash: true })
			)
			.filter((k) => k !== '')
	);

	const columnLogicalKeySet = new Set(
		context.columns
			.map(
				(column) =>
					buildCompositeKey(
						[column.schemaName, column.relatedEntityName, column.columnKoreanName],
						{ emptyLikeDash: true }
					)
			)
			.filter((k) => k !== '')
	);

	// DB -> Entity
	{
		const spec = specMap.get('DB_ENTITY')!;
		const summary = summaryMap.get(spec.id)!;
		for (const entity of context.entities) {
			const key = normalizeKey(entity.logicalDbName, { emptyLikeDash: true });
			if (!key) continue;
			summary.totalChecked += 1;
			if (dbLogicalKeySet.has(key)) {
				summary.matched += 1;
				continue;
			}
			summary.unmatched += 1;
			summary.issues.push(
				makeIssue(
					spec,
					entity.id,
					entity.entityName || entity.tableKoreanName || entity.id,
					entity.logicalDbName || '',
					'참조하는 logicalDbName이 데이터베이스 정의서에 없습니다.'
				)
			);
		}
	}

	// DB -> Table
	{
		const spec = specMap.get('DB_TABLE')!;
		const summary = summaryMap.get(spec.id)!;
		for (const table of context.tables) {
			const key = normalizeKey(table.physicalDbName, { emptyLikeDash: true });
			if (!key) continue;
			summary.totalChecked += 1;
			if (dbPhysicalKeySet.has(key)) {
				summary.matched += 1;
				continue;
			}
			summary.unmatched += 1;
			summary.issues.push(
				makeIssue(
					spec,
					table.id,
					table.tableEnglishName || table.tableKoreanName || table.id,
					table.physicalDbName || '',
					'참조하는 physicalDbName이 데이터베이스 정의서에 없습니다.'
				)
			);
		}
	}

	// Entity -> Attribute
	{
		const spec = specMap.get('ENTITY_ATTRIBUTE')!;
		const summary = summaryMap.get(spec.id)!;
		for (const attr of context.attributes) {
			const schema = normalizeKey(attr.schemaName, { emptyLikeDash: true });
			const entityName = normalizeKey(attr.entityName, { emptyLikeDash: true });
			if (!schema || !entityName) continue;
			summary.totalChecked += 1;
			const key = buildCompositeKey([schema, entityName]);
			if (entityKeySet.has(key)) {
				summary.matched += 1;
				continue;
			}
			summary.unmatched += 1;
			summary.issues.push(
				makeIssue(
					spec,
					attr.id,
					attr.attributeName || attr.id,
					`${attr.schemaName || ''}|${attr.entityName || ''}`,
					'속성이 참조하는 schema/entity 조합이 엔터티 정의서에 없습니다.'
				)
			);
		}
	}

	// Entity -> Table
	{
		const spec = specMap.get('ENTITY_TABLE')!;
		const summary = summaryMap.get(spec.id)!;
		for (const table of context.tables) {
			const schema = normalizeKey(table.schemaName, { emptyLikeDash: true });
			const relatedEntity = normalizeKey(table.relatedEntityName, { emptyLikeDash: true });
			if (!schema || !relatedEntity) continue;
			summary.totalChecked += 1;
			const key = buildCompositeKey([schema, relatedEntity]);
			if (entityKeySet.has(key) || entityKoreanKeySet.has(key)) {
				summary.matched += 1;
				continue;
			}
			summary.unmatched += 1;
			summary.issues.push(
				makeIssue(
					spec,
					table.id,
					table.tableEnglishName || table.tableKoreanName || table.id,
					`${table.schemaName || ''}|${table.relatedEntityName || ''}`,
					'테이블의 relatedEntityName이 엔터티 정의서(entityName/tableKoreanName)에 없습니다.'
				)
			);
		}
	}

	// Table -> Column
	{
		const spec = specMap.get('TABLE_COLUMN')!;
		const summary = summaryMap.get(spec.id)!;
		for (const column of context.columns) {
			const schema = normalizeKey(column.schemaName, { emptyLikeDash: true });
			const tableName = normalizeKey(column.tableEnglishName, { emptyLikeDash: true });
			if (!schema || !tableName) continue;
			summary.totalChecked += 1;
			const key = buildCompositeKey([schema, tableName]);
			if (tableKeySet.has(key)) {
				summary.matched += 1;
				continue;
			}
			summary.unmatched += 1;
			summary.issues.push(
				makeIssue(
					spec,
					column.id,
					column.columnEnglishName || column.columnKoreanName || column.id,
					`${column.schemaName || ''}|${column.tableEnglishName || ''}`,
					'컬럼이 참조하는 schema/table 조합이 테이블 정의서에 없습니다.'
				)
			);
		}
	}

	// Attribute -> Column (assist)
	{
		const spec = specMap.get('ATTRIBUTE_COLUMN')!;
		const summary = summaryMap.get(spec.id)!;
		for (const attr of context.attributes) {
			const schema = normalizeKey(attr.schemaName, { emptyLikeDash: true });
			const entityName = normalizeKey(attr.entityName, { emptyLikeDash: true });
			const attributeName = normalizeKey(attr.attributeName, { emptyLikeDash: true });
			if (!schema || !entityName || !attributeName) continue;
			summary.totalChecked += 1;
			const key = buildCompositeKey([schema, entityName, attributeName]);
			if (columnLogicalKeySet.has(key)) {
				summary.matched += 1;
				continue;
			}
			summary.unmatched += 1;
			summary.issues.push(
				makeIssue(
					spec,
					attr.id,
					attr.attributeName || attr.id,
					`${attr.schemaName || ''}|${attr.entityName || ''}|${attr.attributeName || ''}`,
					'속성명 기준으로 연결 가능한 컬럼(relatedEntityName + columnKoreanName)을 찾지 못했습니다.'
				)
			);
		}
	}

	const summaries = DESIGN_RELATION_SPECS.map((spec) => summaryMap.get(spec.id)!);
	const totals = summaries.reduce(
		(acc, summary) => {
			acc.totalChecked += summary.totalChecked;
			acc.matched += summary.matched;
			acc.unmatched += summary.unmatched;
			if (summary.severity === 'error') acc.errorCount += summary.unmatched;
			if (summary.severity === 'warning') acc.warningCount += summary.unmatched;
			return acc;
		},
		{ totalChecked: 0, matched: 0, unmatched: 0, errorCount: 0, warningCount: 0 }
	);

	return {
		specs: DESIGN_RELATION_SPECS,
		summaries,
		totals
	};
}
