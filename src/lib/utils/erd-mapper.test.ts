import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	extractSuffix,
	mapDatabaseToEntity,
	mapEntityToAttribute,
	mapEntityInheritance,
	mapTableToEntity,
	mapColumnToDomain,
	mapColumnFK,
	generateAllMappings
} from './erd-mapper.js';
import type { MappingContext } from '../types/erd-mapping.js';
import type {
	DatabaseEntry,
	EntityEntry,
	AttributeEntry,
	TableEntry,
	ColumnEntry
} from '../types/database-design.js';
import type { DomainEntry } from '../types/domain.js';
import type { VocabularyEntry } from '../types/vocabulary.js';

// Mock uuid
vi.mock('uuid', () => ({
	v4: vi.fn(() => 'test-uuid-1234')
}));

// 테스트용 Mock 데이터 생성
function createMockDatabase(): DatabaseEntry {
	return {
		id: 'db-1',
		logicalDbName: 'TestDB',
		physicalDbName: 'test_db',
		organizationName: 'TestOrg',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z'
	};
}

function createMockEntity(): EntityEntry {
	return {
		id: 'entity-1',
		entityName: 'User',
		logicalDbName: 'TestDB',
		schemaName: 'public',
		primaryIdentifier: 'userId',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z'
	};
}

function createMockAttribute(): AttributeEntry {
	return {
		id: 'attr-1',
		entityName: 'User',
		attributeName: 'userName',
		schemaName: 'public',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z'
	};
}

function createMockTable(): TableEntry {
	return {
		id: 'table-1',
		tableEnglishName: 'users',
		tableKoreanName: '사용자',
		schemaName: 'public',
		physicalDbName: 'test_db',
		relatedEntityName: 'User',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z'
	};
}

function createMockColumn(): ColumnEntry {
	return {
		id: 'column-1',
		columnEnglishName: 'user_id',
		columnKoreanName: '사용자ID',
		tableEnglishName: 'users',
		schemaName: 'public',
		relatedEntityName: 'User',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z'
	};
}

function createMockDomain(): DomainEntry {
	return {
		id: 'domain-1',
		domainGroup: '공통표준도메인그룹',
		domainCategory: '사용자분류',
		standardDomainName: '사용자분류_VARCHAR(50)',
		physicalDataType: 'VARCHAR',
		dataLength: '50',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z'
	};
}

describe('erd-mapper', () => {
	describe('extractSuffix', () => {
		it('should extract suffix from column name', () => {
			expect(extractSuffix('user_id')).toBe('ID');
			expect(extractSuffix('user_name')).toBe('NAME');
			expect(extractSuffix('product_price')).toBe('PRICE');
		});

		it('should handle empty or null values', () => {
			expect(extractSuffix(null)).toBeNull();
			expect(extractSuffix(undefined)).toBeNull();
			expect(extractSuffix('')).toBeNull();
		});

		it('should handle single word column names', () => {
			expect(extractSuffix('id')).toBe('ID');
			expect(extractSuffix('name')).toBe('NAME');
		});
	});

	describe('mapDatabaseToEntity', () => {
		it('should generate database-entity mappings', () => {
			const database = createMockDatabase();
			const entities = [createMockEntity()];
			const mappings = mapDatabaseToEntity(database, entities);

			expect(mappings.length).toBe(1);
			expect(mappings[0].sourceId).toBe(database.id);
			expect(mappings[0].targetId).toBe(entities[0].id);
			expect(mappings[0].sourceType).toBe('database');
			expect(mappings[0].targetType).toBe('entity');
		});

		it('should return empty array when no matching entities', () => {
			const database = createMockDatabase();
			const entities: EntityEntry[] = [];
			const mappings = mapDatabaseToEntity(database, entities);

			expect(mappings.length).toBe(0);
		});

		it('should return empty array when database has no logicalDbName', () => {
			const database = { ...createMockDatabase(), logicalDbName: undefined };
			const entities = [createMockEntity()];
			const mappings = mapDatabaseToEntity(database, entities);

			expect(mappings.length).toBe(0);
		});
	});

	describe('mapEntityToAttribute', () => {
		it('should generate entity-attribute mappings', () => {
			const entity = createMockEntity();
			const attributes = [createMockAttribute()];
			const mappings = mapEntityToAttribute(entity, attributes);

			expect(mappings.length).toBe(1);
			expect(mappings[0].sourceId).toBe(entity.id);
			expect(mappings[0].targetId).toBe(attributes[0].id);
			expect(mappings[0].sourceType).toBe('entity');
			expect(mappings[0].targetType).toBe('attribute');
		});

		it('should return empty array when no matching attributes', () => {
			const entity = createMockEntity();
			const attributes: AttributeEntry[] = [];
			const mappings = mapEntityToAttribute(entity, attributes);

			expect(mappings.length).toBe(0);
		});
	});

	describe('mapEntityInheritance', () => {
		it('should map entity inheritance relationships', () => {
			const parentEntity: EntityEntry = {
				...createMockEntity(),
				id: 'entity-parent',
				entityName: 'BaseEntity'
			};
			const childEntity: EntityEntry = {
				...createMockEntity(),
				id: 'entity-child',
				entityName: 'User',
				superTypeEntityName: 'BaseEntity'
			};
			const mappings = mapEntityInheritance([parentEntity, childEntity]);

			expect(mappings.length).toBe(1);
			expect(mappings[0].sourceId).toBe(parentEntity.id);
			expect(mappings[0].targetId).toBe(childEntity.id);
			expect(mappings[0].mappingKey).toBe('superTypeEntityName');
		});

		it('should handle entities without super type', () => {
			const entities = [createMockEntity()];
			const mappings = mapEntityInheritance(entities);

			expect(mappings.length).toBe(0);
		});

		it('should handle circular inheritance', () => {
			// 순환 참조는 실제로 매핑이 생성됨 (현재 구현은 순환 참조를 방지하지 않음)
			const entity1: EntityEntry = {
				...createMockEntity(),
				id: 'entity-1',
				entityName: 'Entity1',
				superTypeEntityName: 'Entity2'
			};
			const entity2: EntityEntry = {
				...createMockEntity(),
				id: 'entity-2',
				entityName: 'Entity2',
				superTypeEntityName: 'Entity1'
			};
			const mappings = mapEntityInheritance([entity1, entity2]);

			// 순환 참조도 매핑이 생성됨 (현재 구현)
			expect(mappings.length).toBe(2);
		});
	});

	describe('mapTableToEntity', () => {
		it('should map table to entity by relatedEntityName', () => {
			const table = createMockTable();
			const entities = [createMockEntity()];
			const mapping = mapTableToEntity(table, entities);

			expect(mapping).not.toBeNull();
			expect(mapping?.sourceId).toBe(table.id);
			expect(mapping?.targetId).toBe(entities[0].id);
			expect(mapping?.sourceType).toBe('table');
			expect(mapping?.targetType).toBe('entity');
		});

		it('should handle tables without related entity', () => {
			const table = { ...createMockTable(), relatedEntityName: undefined };
			const entities = [createMockEntity()];
			const mapping = mapTableToEntity(table, entities);

			expect(mapping).toBeNull();
		});

		it('should handle multiple tables to same entity', () => {
			const table1 = createMockTable();
			const table2 = { ...createMockTable(), id: 'table-2', tableEnglishName: 'users_backup' };
			const entities = [createMockEntity()];
			const mapping1 = mapTableToEntity(table1, entities);
			const mapping2 = mapTableToEntity(table2, entities);

			expect(mapping1).not.toBeNull();
			expect(mapping2).not.toBeNull();
			expect(mapping1?.targetId).toBe(mapping2?.targetId);
		});
	});

	describe('mapColumnToDomain', () => {
		it('should map column to domain by suffix', () => {
			const column: ColumnEntry = {
				...createMockColumn(),
				columnEnglishName: 'user_id'
			};
			const vocabularyEntries: VocabularyEntry[] = [
				{
					id: 'vocab-1',
					standardName: 'ID',
					abbreviation: 'ID',
					englishName: 'Identifier',
					description: '',
					domainCategory: '사용자ID',
					isDomainCategoryMapped: true,
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z'
				}
			];
			const domains: DomainEntry[] = [
				{
					...createMockDomain(),
					domainCategory: '사용자ID',
					standardDomainName: '사용자ID_VARCHAR(50)'
				}
			];

			const mapping = mapColumnToDomain(column, vocabularyEntries, domains);

			expect(mapping).not.toBeNull();
			expect(mapping?.sourceId).toBe(column.id);
			expect(mapping?.targetType).toBe('domain');
		});

		it('should extract suffix correctly', () => {
			const column: ColumnEntry = {
				...createMockColumn(),
				columnEnglishName: 'product_name'
			};
			const domains: DomainEntry[] = [];
			const vocabularyMap = new Map();
			const domainMap = new Map();

			// 접미사 추출 테스트
			const suffix = extractSuffix(column.columnEnglishName);
			expect(suffix).toBe('NAME');
		});

		it('should handle columns without matching domain', () => {
			const column = createMockColumn();
			const vocabularyEntries: VocabularyEntry[] = [];
			const domains: DomainEntry[] = [];

			const mapping = mapColumnToDomain(column, vocabularyEntries, domains);

			expect(mapping).toBeNull();
		});

		it('should prioritize exact suffix match', () => {
			const column: ColumnEntry = {
				...createMockColumn(),
				columnEnglishName: 'user_id'
			};
			const vocabularyEntries: VocabularyEntry[] = [
				{
					id: 'vocab-1',
					standardName: 'ID',
					abbreviation: 'ID',
					englishName: 'Identifier',
					domainCategory: '사용자ID',
					isDomainCategoryMapped: true,
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z'
				}
			];
			const exactDomain: DomainEntry = {
				...createMockDomain(),
				id: 'domain-exact',
				domainCategory: '사용자ID',
				standardDomainName: '사용자ID_VARCHAR(50)'
			};
			const partialDomain: DomainEntry = {
				...createMockDomain(),
				id: 'domain-partial',
				domainCategory: 'ID',
				standardDomainName: 'ID_VARCHAR(50)'
			};
			const domains = [exactDomain, partialDomain];

			const mapping = mapColumnToDomain(column, vocabularyEntries, domains);

			// 정확한 매칭이 우선되어야 함
			expect(mapping).not.toBeNull();
			expect(mapping?.targetId).toBe(exactDomain.id);
		});
	});

	describe('mapColumnFK', () => {
		it('should map foreign key relationships', () => {
			const column: ColumnEntry = {
				...createMockColumn(),
				fkInfo: 'users.id'
			};
			const targetColumn: ColumnEntry = {
				...createMockColumn(),
				id: 'column-target',
				tableEnglishName: 'users',
				columnEnglishName: 'id'
			};
			const columns = [column, targetColumn];

			const mapping = mapColumnFK(column, columns);

			expect(mapping).not.toBeNull();
			expect(mapping?.sourceId).toBe(column.id);
			expect(mapping?.targetId).toBe(targetColumn.id);
		});

		it('should parse fkInfo correctly', () => {
			const column: ColumnEntry = {
				...createMockColumn(),
				fkInfo: 'users.id'
			};
			const targetColumn: ColumnEntry = {
				...createMockColumn(),
				id: 'column-target',
				tableEnglishName: 'users',
				columnEnglishName: 'id',
				schemaName: 'public'
			};
			const columns = [targetColumn];

			const mapping = mapColumnFK(column, columns);

			expect(mapping).not.toBeNull();
		});

		it('should handle invalid fkInfo', () => {
			const column: ColumnEntry = {
				...createMockColumn(),
				fkInfo: 'invalid_format'
			};
			const columns: ColumnEntry[] = [];

			const mapping = mapColumnFK(column, columns);

			expect(mapping).toBeNull();
		});
	});

	describe('generateAllMappings', () => {
		it('should generate all mapping types', () => {
			const context: MappingContext = {
				databases: [createMockDatabase()],
				entities: [createMockEntity()],
				attributes: [createMockAttribute()],
				tables: [createMockTable()],
				columns: [createMockColumn()],
				domains: [createMockDomain()],
				vocabularyMap: new Map(),
				domainMap: new Map()
			};

			const mappings = generateAllMappings(context);

			expect(mappings.length).toBeGreaterThan(0);
			// 다양한 매핑 타입이 포함되어야 함
			const mappingTypes = new Set(mappings.map((m) => m.layerType));
			expect(mappingTypes.size).toBeGreaterThan(0);
		});

		it('should handle empty context', () => {
			const emptyContext: MappingContext = {
				databases: [],
				entities: [],
				attributes: [],
				tables: [],
				columns: [],
				domains: [],
				vocabularyMap: new Map(),
				domainMap: new Map()
			};

			const mappings = generateAllMappings(emptyContext);

			expect(mappings.length).toBe(0);
		});

		it('should handle missing vocabulary map', () => {
			const context: MappingContext = {
				databases: [createMockDatabase()],
				entities: [createMockEntity()],
				attributes: [],
				tables: [createMockTable()],
				columns: [createMockColumn()],
				domains: [],
				vocabularyMap: undefined,
				domainMap: new Map()
			};

			// vocabularyMap이 없어도 동작해야 함
			const mappings = generateAllMappings(context);

			expect(mappings).toBeDefined();
		});
	});
});
