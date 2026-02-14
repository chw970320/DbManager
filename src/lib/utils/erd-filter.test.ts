import { describe, it, expect, beforeEach } from 'vitest';
import { filterMappingContext, filterERDDataByTableIds } from './erd-filter.js';
import type { MappingContext } from '../types/erd-mapping.js';
import type {
	DatabaseEntry,
	EntityEntry,
	AttributeEntry,
	TableEntry,
	ColumnEntry
} from '../types/database-design.js';
import type { DomainEntry } from '../types/domain.js';

// 테스트용 Mock 데이터 생성
function createMockDatabase(): DatabaseEntry {
	return {
		id: 'db-1',
		logicalDbName: 'TestDB',
		physicalDbName: 'test_db',
		organizationName: 'TestOrg',
		departmentName: 'Platform',
		appliedTask: 'Catalog',
		relatedLaw: '',
		buildDate: '2024-01-01',
		osInfo: 'Linux',
		exclusionReason: '',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z'
	};
}

function createMockEntity(): EntityEntry {
	return {
		id: 'entity-1',
		entityName: 'User',
		logicalDbName: 'TestDB',
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
		requiredInput: 'Y',
		refEntityName: '',
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
		businessClassification: 'COMMON',
		tableVolume: 'SMALL',
		nonPublicReason: '',
		openDataList: '',
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
		dataLength: '50',
		dataDecimalLength: '0',
		dataFormat: '',
		pkInfo: '',
		indexName: '',
		indexOrder: '',
		akInfo: '',
		constraint: '',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z'
	};
}

function createMockContext(): MappingContext {
	return {
		databases: [createMockDatabase()],
		entities: [createMockEntity()],
		attributes: [createMockAttribute()],
		tables: [createMockTable()],
		columns: [createMockColumn()],
		domains: [],
		vocabularyMap: new Map(),
		domainMap: new Map()
	};
}

describe('erd-filter', () => {
	describe('filterMappingContext', () => {
		it('should return full context when no filter', () => {
			const context = createMockContext();
			const filtered = filterMappingContext(context, {});

			expect(filtered.databases.length).toBe(context.databases.length);
			expect(filtered.entities.length).toBe(context.entities.length);
			expect(filtered.tables.length).toBe(context.tables.length);
		});

		it('should filter tables by tableIds', () => {
			const context = createMockContext();
			const filterOptions = {
				tableIds: ['table-1'],
				includeRelated: false
			};
			const filtered = filterMappingContext(context, filterOptions);

			expect(filtered.tables.length).toBe(1);
			expect(filtered.tables[0].id).toBe('table-1');
		});

		it('should filter columns by selected tables', () => {
			const context = createMockContext();
			const filterOptions = {
				tableIds: ['table-1'],
				includeRelated: false
			};
			const filtered = filterMappingContext(context, filterOptions);

			// 선택된 테이블의 컬럼만 포함되어야 함
			expect(filtered.columns.length).toBeGreaterThan(0);
			expect(filtered.columns.every((col) => col.tableEnglishName === 'users')).toBe(true);
		});

		it('should include related entities when requested', () => {
			const context = createMockContext();
			const filterOptions = {
				tableIds: ['table-1'],
				includeRelated: true
			};
			const filtered = filterMappingContext(context, filterOptions);

			// 관련 엔터티가 포함되어야 함
			expect(filtered.entities.length).toBeGreaterThan(0);
			expect(filtered.entities.some((e) => e.entityName === 'User')).toBe(true);
		});

		it('should exclude related entities when not requested', () => {
			const context = createMockContext();
			const filterOptions = {
				tableIds: ['table-1'],
				includeRelated: false
			};
			const filtered = filterMappingContext(context, filterOptions);

			// 관련 엔터티가 제외되어야 함
			expect(filtered.entities.length).toBe(0);
		});

		it('should filter databases by physicalDbName', () => {
			const context = createMockContext();
			const filterOptions = {
				tableIds: ['table-1'],
				includeRelated: false
			};
			const filtered = filterMappingContext(context, filterOptions);

			// 선택된 테이블의 physicalDbName과 연결된 DB만 포함
			expect(filtered.databases.length).toBeGreaterThan(0);
			expect(filtered.databases.some((db) => db.physicalDbName === 'test_db')).toBe(true);
		});

		it('should handle empty tableIds array', () => {
			const context = createMockContext();
			const filterOptions = {
				tableIds: [],
				includeRelated: false
			};
			const filtered = filterMappingContext(context, filterOptions);

			// 빈 배열일 때 전체 반환
			expect(filtered.databases.length).toBe(context.databases.length);
			expect(filtered.tables.length).toBe(context.tables.length);
		});

		it('should preserve vocabulary and domain maps', () => {
			const context = createMockContext();
			const vocabularyMap = new Map([['test', { standardName: 'Test', abbreviation: 'TST' }]]);
			const domainMap = new Map([['domain-1', {} as DomainEntry]]);

			const contextWithMaps: MappingContext = {
				...context,
				vocabularyMap,
				domainMap
			};

			const filterOptions = {
				tableIds: ['table-1'],
				includeRelated: false
			};
			const filtered = filterMappingContext(contextWithMaps, filterOptions);

			// 맵이 유지되어야 함
			expect(filtered.vocabularyMap).toBe(vocabularyMap);
			expect(filtered.domainMap).toBe(domainMap);
		});
	});

	describe('filterERDDataByTableIds', () => {
		it('should filter nodes by selected table IDs', () => {
			const erdData = {
				nodes: [
					{ id: 'table-1', type: 'table' },
					{ id: 'table-2', type: 'table' },
					{ id: 'column-1', type: 'column' }
				],
				edges: [{ source: 'table-1', target: 'column-1' }],
				mappings: [
					{ sourceId: 'table-1', targetId: 'column-1', sourceType: 'table', targetType: 'column' }
				]
			};

			const filtered = filterERDDataByTableIds(erdData, ['table-1'], false);

			expect(filtered.nodes.some((n) => n.id === 'table-1')).toBe(true);
			expect(filtered.nodes.some((n) => n.id === 'table-2')).toBe(false);
		});

		it('should include related nodes when requested', () => {
			const erdData = {
				nodes: [
					{ id: 'table-1', type: 'table' },
					{ id: 'entity-1', type: 'entity' },
					{ id: 'column-1', type: 'column' }
				],
				edges: [
					{ source: 'table-1', target: 'entity-1' },
					{ source: 'table-1', target: 'column-1' }
				],
				mappings: [
					{ sourceId: 'table-1', targetId: 'entity-1', sourceType: 'table', targetType: 'entity' },
					{ sourceId: 'table-1', targetId: 'column-1', sourceType: 'table', targetType: 'column' }
				]
			};

			const filtered = filterERDDataByTableIds(erdData, ['table-1'], true);

			// 관련 엔터티가 포함되어야 함
			expect(filtered.nodes.some((n) => n.id === 'entity-1')).toBe(true);
		});

		it('should filter edges by included nodes', () => {
			const erdData = {
				nodes: [
					{ id: 'table-1', type: 'table' },
					{ id: 'table-2', type: 'table' },
					{ id: 'column-1', type: 'column' }
				],
				edges: [
					{ source: 'table-1', target: 'column-1' },
					{ source: 'table-2', target: 'column-1' }
				],
				mappings: [
					{ sourceId: 'table-1', targetId: 'column-1', sourceType: 'table', targetType: 'column' },
					{ sourceId: 'table-2', targetId: 'column-1', sourceType: 'table', targetType: 'column' }
				]
			};

			const filtered = filterERDDataByTableIds(erdData, ['table-1'], false);

			// table-1과 관련된 엣지만 포함되어야 함
			expect(filtered.edges.length).toBe(1);
			expect(filtered.edges[0].source).toBe('table-1');
		});

		it('should return full data when no tableIds', () => {
			const erdData = {
				nodes: [
					{ id: 'table-1', type: 'table' },
					{ id: 'table-2', type: 'table' }
				],
				edges: [{ source: 'table-1', target: 'table-2' }],
				mappings: [
					{ sourceId: 'table-1', targetId: 'table-2', sourceType: 'table', targetType: 'table' }
				]
			};

			const filtered = filterERDDataByTableIds(erdData, [], false);

			// 빈 배열일 때 전체 반환
			expect(filtered.nodes.length).toBe(erdData.nodes.length);
			expect(filtered.edges.length).toBe(erdData.edges.length);
		});
	});
});
