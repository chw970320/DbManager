/**
 * ERD 생성을 위한 매핑 로직 구현
 */

import { v4 as uuidv4 } from 'uuid';
import type {
	DatabaseEntry,
	EntityEntry,
	AttributeEntry,
	TableEntry,
	ColumnEntry
} from '../types/database-design.js';
import type { DomainEntry } from '../types/domain.js';
import type { VocabularyEntry } from '../types/vocabulary.js';
import type {
	ERDMapping,
	DatabaseEntityMapping,
	EntityAttributeMapping,
	EntityInheritanceMapping,
	AttributeEntityRefMapping,
	AttributeAttributeRefMapping,
	DatabaseTableMapping,
	TableColumnMapping,
	ColumnFKMapping,
	TableEntityMapping,
	ColumnEntityMapping,
	AttributeColumnMapping,
	ColumnDomainMapping,
	MappingContext
} from '../types/erd-mapping.js';

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 빈 값 체크 (null, undefined, 빈 문자열, "-")
 */
function isEmpty(value: string | undefined | null): boolean {
	return !value || value.trim() === '' || value.trim() === '-';
}

/**
 * 문자열 정규화 (trim, lowercase)
 */
function normalizeString(value: string | undefined | null): string {
	return value ? value.trim().toLowerCase() : '';
}

/**
 * 컬럼영문명에서 접미사 추출
 */
export function extractSuffix(columnEnglishName: string | undefined | null): string | null {
	if (!columnEnglishName) return null;

	const parts = columnEnglishName
		.split('_')
		.map((p) => p.trim())
		.filter((p) => p.length > 0);
	if (parts.length === 0) return null;

	return parts[parts.length - 1].toUpperCase();
}

// ============================================================================
// 논리적 계층 매핑
// ============================================================================

/**
 * Database → Entity 매핑 생성
 */
export function mapDatabaseToEntity(
	database: DatabaseEntry,
	entities: EntityEntry[]
): DatabaseEntityMapping[] {
	if (!database.logicalDbName || isEmpty(database.logicalDbName)) {
		return [];
	}

	const dbLogicalName = normalizeString(database.logicalDbName);
	const mappings: DatabaseEntityMapping[] = [];

	for (const entity of entities) {
		if (entity.logicalDbName && normalizeString(entity.logicalDbName) === dbLogicalName) {
			mappings.push({
				id: uuidv4(),
				sourceId: database.id,
				targetId: entity.id,
				sourceType: 'database',
				targetType: 'entity',
				layerType: 'logical',
				mappingKey: 'logicalDbName',
				relationshipType: '1:N'
			});
		}
	}

	return mappings;
}

/**
 * Entity → Attribute 매핑 생성
 */
export function mapEntityToAttribute(
	entity: EntityEntry,
	attributes: AttributeEntry[]
): EntityAttributeMapping[] {
	if (
		!entity.schemaName ||
		!entity.entityName ||
		isEmpty(entity.schemaName) ||
		isEmpty(entity.entityName)
	) {
		return [];
	}

	const entitySchema = normalizeString(entity.schemaName);
	const entityName = normalizeString(entity.entityName);
	const mappings: EntityAttributeMapping[] = [];

	for (const attribute of attributes) {
		if (
			attribute.schemaName &&
			attribute.entityName &&
			normalizeString(attribute.schemaName) === entitySchema &&
			normalizeString(attribute.entityName) === entityName
		) {
			mappings.push({
				id: uuidv4(),
				sourceId: entity.id,
				targetId: attribute.id,
				sourceType: 'entity',
				targetType: 'attribute',
				layerType: 'logical',
				mappingKey: 'schemaName+entityName',
				relationshipType: '1:N',
				schemaName: entity.schemaName,
				entityName: entity.entityName
			});
		}
	}

	return mappings;
}

/**
 * Entity → Entity (상속) 매핑 생성
 */
export function mapEntityInheritance(entities: EntityEntry[]): EntityInheritanceMapping[] {
	const mappings: EntityInheritanceMapping[] = [];
	const entityMap = new Map<string, EntityEntry>();

	// 엔터티 맵 생성
	for (const entity of entities) {
		if (entity.entityName && !isEmpty(entity.entityName)) {
			entityMap.set(normalizeString(entity.entityName), entity);
		}
	}

	// 상속 관계 매핑
	for (const entity of entities) {
		if (entity.superTypeEntityName && !isEmpty(entity.superTypeEntityName)) {
			const superTypeName = normalizeString(entity.superTypeEntityName);
			const superTypeEntity = entityMap.get(superTypeName);

			if (superTypeEntity) {
				mappings.push({
					id: uuidv4(),
					sourceId: superTypeEntity.id,
					targetId: entity.id,
					sourceType: 'entity',
					targetType: 'entity',
					layerType: 'logical',
					mappingKey: 'superTypeEntityName',
					relationshipType: '1:N',
					superTypeEntityName: entity.superTypeEntityName
				});
			}
		}
	}

	return mappings;
}

/**
 * Attribute → Entity (참조) 매핑 생성
 */
export function mapAttributeToEntityRef(
	attribute: AttributeEntry,
	entities: EntityEntry[]
): AttributeEntityRefMapping | null {
	if (!attribute.refEntityName || isEmpty(attribute.refEntityName)) {
		return null;
	}

	const refEntityName = normalizeString(attribute.refEntityName);
	const targetEntity = entities.find(
		(e) => e.entityName && normalizeString(e.entityName) === refEntityName
	);

	if (!targetEntity) return null;

	return {
		id: uuidv4(),
		sourceId: attribute.id,
		targetId: targetEntity.id,
		sourceType: 'attribute',
		targetType: 'entity',
		layerType: 'logical',
		mappingKey: 'refEntityName',
		relationshipType: 'N:1',
		refEntityName: attribute.refEntityName
	};
}

/**
 * Attribute → Attribute (참조) 매핑 생성
 */
export function mapAttributeToAttributeRef(
	attribute: AttributeEntry,
	attributes: AttributeEntry[]
): AttributeAttributeRefMapping | null {
	if (!attribute.refAttributeName || isEmpty(attribute.refAttributeName)) {
		return null;
	}

	const refAttributeName = normalizeString(attribute.refAttributeName);
	const targetAttribute = attributes.find(
		(a) => a.attributeName && normalizeString(a.attributeName) === refAttributeName
	);

	if (!targetAttribute) return null;

	return {
		id: uuidv4(),
		sourceId: attribute.id,
		targetId: targetAttribute.id,
		sourceType: 'attribute',
		targetType: 'attribute',
		layerType: 'logical',
		mappingKey: 'refAttributeName',
		relationshipType: 'N:1',
		refAttributeName: attribute.refAttributeName
	};
}

// ============================================================================
// 물리적 계층 매핑
// ============================================================================

/**
 * Database → Table 매핑 생성
 */
export function mapDatabaseToTable(
	database: DatabaseEntry,
	tables: TableEntry[]
): DatabaseTableMapping[] {
	if (!database.physicalDbName || isEmpty(database.physicalDbName)) {
		return [];
	}

	const dbPhysicalName = normalizeString(database.physicalDbName);
	const mappings: DatabaseTableMapping[] = [];

	for (const table of tables) {
		if (table.physicalDbName && normalizeString(table.physicalDbName) === dbPhysicalName) {
			mappings.push({
				id: uuidv4(),
				sourceId: database.id,
				targetId: table.id,
				sourceType: 'database',
				targetType: 'table',
				layerType: 'physical',
				mappingKey: 'physicalDbName',
				relationshipType: '1:N'
			});
		}
	}

	return mappings;
}

/**
 * Table → Column 매핑 생성
 */
export function mapTableToColumn(table: TableEntry, columns: ColumnEntry[]): TableColumnMapping[] {
	if (
		!table.schemaName ||
		!table.tableEnglishName ||
		isEmpty(table.schemaName) ||
		isEmpty(table.tableEnglishName)
	) {
		return [];
	}

	const tableSchema = normalizeString(table.schemaName);
	const tableName = normalizeString(table.tableEnglishName);
	const mappings: TableColumnMapping[] = [];

	for (const column of columns) {
		if (
			column.schemaName &&
			column.tableEnglishName &&
			normalizeString(column.schemaName) === tableSchema &&
			normalizeString(column.tableEnglishName) === tableName
		) {
			mappings.push({
				id: uuidv4(),
				sourceId: table.id,
				targetId: column.id,
				sourceType: 'table',
				targetType: 'column',
				layerType: 'physical',
				mappingKey: 'schemaName+tableEnglishName',
				relationshipType: '1:N',
				schemaName: table.schemaName,
				tableEnglishName: table.tableEnglishName
			});
		}
	}

	return mappings;
}

/**
 * Column → Column (FK) 매핑 생성
 * FK 정보 파싱: "Y" 또는 특정 참조 정보 형식
 */
export function mapColumnFK(column: ColumnEntry, columns: ColumnEntry[]): ColumnFKMapping | null {
	if (!column.fkInfo || isEmpty(column.fkInfo)) {
		return null;
	}

	const fkInfo = column.fkInfo.trim().toUpperCase();

	// "Y"만 있는 경우는 참조 정보가 없으므로 null 반환
	if (fkInfo === 'Y' || fkInfo === 'YES') {
		return null;
	}

	// FK 정보에서 참조 테이블/컬럼 추출 시도
	// 형식 예: "TABLE_NAME.COLUMN_NAME" 또는 "TABLE_NAME:COLUMN_NAME"
	const parts = fkInfo
		.split(/[.:]/)
		.map((p) => p.trim())
		.filter((p) => p.length > 0);

	if (parts.length >= 2) {
		const referencedTable = parts[0];
		const referencedColumn = parts[1];

		// 참조 대상 컬럼 찾기
		const targetColumn = columns.find((c) => {
			const cTable = c.tableEnglishName ? normalizeString(c.tableEnglishName) : '';
			const cColumn = c.columnEnglishName ? normalizeString(c.columnEnglishName) : '';
			return (
				cTable === normalizeString(referencedTable) && cColumn === normalizeString(referencedColumn)
			);
		});

		if (targetColumn) {
			return {
				id: uuidv4(),
				sourceId: column.id,
				targetId: targetColumn.id,
				sourceType: 'column',
				targetType: 'column',
				layerType: 'physical',
				mappingKey: 'fkInfo',
				relationshipType: 'N:1',
				fkInfo: column.fkInfo,
				referencedTable,
				referencedColumn
			};
		}
	}

	return null;
}

// ============================================================================
// 논리-물리 매핑
// ============================================================================

/**
 * Table → Entity (논리-물리) 매핑 생성
 */
export function mapTableToEntity(
	table: TableEntry,
	entities: EntityEntry[]
): TableEntityMapping | null {
	if (!table.relatedEntityName || isEmpty(table.relatedEntityName)) {
		return null;
	}

	const relatedEntityName = normalizeString(table.relatedEntityName);
	const targetEntity = entities.find(
		(e) => e.entityName && normalizeString(e.entityName) === relatedEntityName
	);

	if (!targetEntity) return null;

	return {
		id: uuidv4(),
		sourceId: table.id,
		targetId: targetEntity.id,
		sourceType: 'table',
		targetType: 'entity',
		layerType: 'logical-physical',
		mappingKey: 'relatedEntityName',
		relationshipType: 'N:1',
		relatedEntityName: table.relatedEntityName
	};
}

/**
 * Column → Entity (논리-물리) 매핑 생성
 */
export function mapColumnToEntity(
	column: ColumnEntry,
	entities: EntityEntry[]
): ColumnEntityMapping | null {
	if (!column.relatedEntityName || isEmpty(column.relatedEntityName)) {
		return null;
	}

	const relatedEntityName = normalizeString(column.relatedEntityName);
	const targetEntity = entities.find(
		(e) => e.entityName && normalizeString(e.entityName) === relatedEntityName
	);

	if (!targetEntity) return null;

	return {
		id: uuidv4(),
		sourceId: column.id,
		targetId: targetEntity.id,
		sourceType: 'column',
		targetType: 'entity',
		layerType: 'logical-physical',
		mappingKey: 'relatedEntityName',
		relationshipType: 'N:1',
		relatedEntityName: column.relatedEntityName
	};
}

/**
 * Attribute → Column (논리-물리) 매핑 생성
 */
export function mapAttributeToColumn(
	attribute: AttributeEntry,
	columns: ColumnEntry[]
): AttributeColumnMapping[] {
	if (
		!attribute.schemaName ||
		!attribute.entityName ||
		!attribute.attributeName ||
		isEmpty(attribute.schemaName) ||
		isEmpty(attribute.entityName) ||
		isEmpty(attribute.attributeName)
	) {
		return [];
	}

	const attrSchema = normalizeString(attribute.schemaName);
	const attrEntity = normalizeString(attribute.entityName);
	const attrName = normalizeString(attribute.attributeName);
	const mappings: AttributeColumnMapping[] = [];

	for (const column of columns) {
		if (
			column.schemaName &&
			column.tableEnglishName &&
			column.columnKoreanName &&
			normalizeString(column.schemaName) === attrSchema &&
			normalizeString(column.columnKoreanName) === attrName
		) {
			// 같은 스키마와 엔터티명(테이블명)을 가진 경우 매핑
			mappings.push({
				id: uuidv4(),
				sourceId: attribute.id,
				targetId: column.id,
				sourceType: 'attribute',
				targetType: 'column',
				layerType: 'logical-physical',
				mappingKey: 'schemaName+entityName+attributeName',
				relationshipType: mappings.length === 0 ? '1:1' : '1:N',
				schemaName: attribute.schemaName,
				entityName: attribute.entityName,
				attributeName: attribute.attributeName,
				tableEnglishName: column.tableEnglishName,
				columnKoreanName: column.columnKoreanName
			});
		}
	}

	return mappings;
}

// ============================================================================
// 도메인 매핑
// ============================================================================

/**
 * Column → Domain (접미사 기반) 매핑 생성
 */
export function mapColumnToDomain(
	column: ColumnEntry,
	vocabularyEntries: VocabularyEntry[],
	domainEntries: DomainEntry[]
): ColumnDomainMapping | null {
	if (!column.columnEnglishName) {
		return null;
	}

	const suffix = extractSuffix(column.columnEnglishName);
	if (!suffix) return null;

	const suffixLower = suffix.toLowerCase();
	const matchedDomainCategories = new Set<string>();

	// 단어집에서 접미사에 해당하는 표준단어명 또는 약어 찾기
	for (const vocab of vocabularyEntries) {
		const standardName = vocab.standardName ? normalizeString(vocab.standardName) : '';
		const abbreviation = vocab.abbreviation ? normalizeString(vocab.abbreviation) : '';

		if (standardName === suffixLower || abbreviation === suffixLower) {
			if (vocab.domainCategory && vocab.isDomainCategoryMapped !== false) {
				matchedDomainCategories.add(normalizeString(vocab.domainCategory));
			}
		}
	}

	// 도메인 데이터에서 해당 도메인분류에 매핑된 도메인 찾기
	for (const domain of domainEntries) {
		if (!domain.domainCategory || !domain.standardDomainName) continue;

		const categoryLower = normalizeString(domain.domainCategory);
		if (matchedDomainCategories.has(categoryLower)) {
			return {
				id: uuidv4(),
				sourceId: column.id,
				targetId: domain.id,
				sourceType: 'column',
				targetType: 'domain',
				layerType: 'domain',
				mappingKey: 'columnEnglishName_suffix',
				relationshipType: 'N:1',
				suffix,
				domainCategory: domain.domainCategory,
				standardDomainName: domain.standardDomainName
			};
		}
	}

	return null;
}

// ============================================================================
// 전체 매핑 생성
// ============================================================================

/**
 * 전체 매핑 관계 생성
 */
export function generateAllMappings(context: MappingContext): ERDMapping[] {
	const mappings: ERDMapping[] = [];

	// 논리적 계층 매핑
	for (const database of context.databases) {
		mappings.push(...mapDatabaseToEntity(database, context.entities));
	}

	for (const entity of context.entities) {
		mappings.push(...mapEntityToAttribute(entity, context.attributes));
	}

	mappings.push(...mapEntityInheritance(context.entities));

	for (const attribute of context.attributes) {
		const attrEntityRef = mapAttributeToEntityRef(attribute, context.entities);
		if (attrEntityRef) mappings.push(attrEntityRef);

		const attrAttrRef = mapAttributeToAttributeRef(attribute, context.attributes);
		if (attrAttrRef) mappings.push(attrAttrRef);
	}

	// 물리적 계층 매핑
	for (const database of context.databases) {
		mappings.push(...mapDatabaseToTable(database, context.tables));
	}

	for (const table of context.tables) {
		mappings.push(...mapTableToColumn(table, context.columns));
	}

	for (const column of context.columns) {
		const fkMapping = mapColumnFK(column, context.columns);
		if (fkMapping) mappings.push(fkMapping);
	}

	// 논리-물리 매핑
	for (const table of context.tables) {
		const tableEntityMapping = mapTableToEntity(table, context.entities);
		if (tableEntityMapping) mappings.push(tableEntityMapping);
	}

	for (const column of context.columns) {
		const columnEntityMapping = mapColumnToEntity(column, context.entities);
		if (columnEntityMapping) mappings.push(columnEntityMapping);
	}

	for (const attribute of context.attributes) {
		mappings.push(...mapAttributeToColumn(attribute, context.columns));
	}

	// 도메인 매핑
	if (context.vocabularyMap && context.domains.length > 0) {
		// VocabularyEntry 배열을 Map에서 추출
		const vocabularyEntries: VocabularyEntry[] = [];
		if (context.vocabularyMap) {
			for (const [key, value] of context.vocabularyMap.entries()) {
				vocabularyEntries.push({
					id: '',
					standardName: value.standardName,
					abbreviation: value.abbreviation,
					englishName: '',
					description: '',
					createdAt: '',
					updatedAt: '',
					domainCategory: value.domainCategory,
					isDomainCategoryMapped: true
				} as VocabularyEntry);
			}
		}

		for (const column of context.columns) {
			const domainMapping = mapColumnToDomain(column, vocabularyEntries, context.domains);
			if (domainMapping) mappings.push(domainMapping);
		}
	}

	return mappings;
}
