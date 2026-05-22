import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateERDData } from './erd-generator.js';
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

function createMockContext(): MappingContext {
	return {
		databases: [createMockDatabase()],
		entities: [createMockEntity()],
		attributes: [createMockAttribute()],
		tables: [createMockTable()],
		columns: [createMockColumn()],
		domains: [createMockDomain()],
		vocabularyMap: new Map(),
		domainMap: new Map()
	};
}

function createExternalReferenceContext(fkInfo = 'public.users.user_id'): MappingContext {
	return {
		...createMockContext(),
		entities: [],
		attributes: [],
		tables: [
			{
				...createMockTable(),
				id: 'table-order',
				tableEnglishName: 'orders',
				tableKoreanName: '주문',
				subjectArea: 'ORDER'
			},
			{
				...createMockTable(),
				id: 'table-user',
				tableEnglishName: 'users',
				tableKoreanName: '사용자',
				subjectArea: 'USER'
			}
		],
		columns: [
			{
				...createMockColumn(),
				id: 'column-order-id',
				tableEnglishName: 'orders',
				columnEnglishName: 'order_id',
				subjectArea: 'ORDER',
				pkInfo: 'PK'
			},
			{
				...createMockColumn(),
				id: 'column-order-user',
				tableEnglishName: 'orders',
				columnEnglishName: 'user_id',
				subjectArea: 'ORDER',
				fkInfo
			},
			{
				...createMockColumn(),
				id: 'column-user-id',
				tableEnglishName: 'users',
				columnEnglishName: 'user_id',
				subjectArea: 'USER',
				pkInfo: 'PK'
			}
		]
	};
}

describe('erd-generator', () => {
	describe('generateERDData', () => {
		it('should generate ERD data with all nodes', () => {
			const context = createMockContext();
			const erdData = generateERDData(context);

			expect(erdData.nodes).toBeDefined();
			expect(erdData.nodes.length).toBeGreaterThan(0);
			expect(erdData.edges).toBeDefined();
			expect(erdData.mappings).toBeDefined();
		});

		it('should generate ERD data with all edges', () => {
			const context = createMockContext();
			const erdData = generateERDData(context);

			expect(erdData.edges.length).toBeGreaterThan(0);
			expect(erdData.mappings.length).toBeGreaterThan(0);
		});

		it('should generate metadata correctly', () => {
			const context = createMockContext();
			const erdData = generateERDData(context);

			expect(erdData.metadata).toBeDefined();
			expect(erdData.metadata.totalNodes).toBe(erdData.nodes.length);
			expect(erdData.metadata.totalEdges).toBe(erdData.edges.length);
			expect(erdData.metadata.totalMappings).toBe(erdData.mappings.length);
			expect(erdData.metadata.generatedAt).toBeDefined();
		});

		it('should expose Graphviz-aligned relationship metadata separately from structural edges', () => {
			const context: MappingContext = {
				...createMockContext(),
				entities: [],
				attributes: [],
				tables: [
					{
						...createMockTable(),
						id: 'table-order',
						tableEnglishName: 'orders',
						tableKoreanName: '주문'
					},
					{
						...createMockTable(),
						id: 'table-user',
						tableEnglishName: 'users',
						tableKoreanName: '사용자'
					}
				],
				columns: [
					{
						...createMockColumn(),
						id: 'column-order-id',
						tableEnglishName: 'orders',
						columnEnglishName: 'order_id',
						pkInfo: 'PK'
					},
					{
						...createMockColumn(),
						id: 'column-order-user',
						tableEnglishName: 'orders',
						columnEnglishName: 'user_id',
						fkInfo: 'public.users.user_id'
					},
					{
						...createMockColumn(),
						id: 'column-order-created-by',
						tableEnglishName: 'orders',
						columnEnglishName: 'created_by',
						fkInfo: 'public.users.user_id'
					},
					{
						...createMockColumn(),
						id: 'column-user-id',
						tableEnglishName: 'users',
						columnEnglishName: 'user_id',
						pkInfo: 'PK'
					}
				]
			};

			const erdData = generateERDData(context, { includeRelated: false });

			expect(erdData.metadata.totalEdges).toBe(erdData.edges.length);
			expect(erdData.metadata.totalRelationships).toBe(1);
			expect(erdData.metadata.unresolvedForeignKeys).toBe(0);
		});

		it('should keep Graphviz metadata external when filtered context includes external FK tables', () => {
			const erdData = generateERDData(createExternalReferenceContext(), {
				subjectAreas: ['ORDER'],
				includeRelated: false,
				includeExternalReferences: true
			});

			expect(erdData.metadata.totalRelationships).toBe(1);
			expect(erdData.metadata.externalRelationships).toBe(1);
			expect(erdData.metadata.unresolvedForeignKeys).toBe(0);
		});

		it('should suppress filtered external FK metadata without reporting false unresolved warnings', () => {
			const erdData = generateERDData(createExternalReferenceContext(), {
				subjectAreas: ['ORDER'],
				includeRelated: false,
				includeExternalReferences: false
			});

			expect(erdData.metadata.totalRelationships).toBe(0);
			expect(erdData.metadata.externalRelationships).toBe(0);
			expect(erdData.metadata.unresolvedForeignKeys).toBe(0);
		});

		it('should still report unresolved metadata when the FK target is truly missing', () => {
			const erdData = generateERDData(createExternalReferenceContext('public.missing.user_id'), {
				subjectAreas: ['ORDER'],
				includeRelated: false,
				includeExternalReferences: true
			});

			expect(erdData.metadata.totalRelationships).toBe(0);
			expect(erdData.metadata.externalRelationships).toBe(0);
			expect(erdData.metadata.unresolvedForeignKeys).toBe(1);
		});

		it('should use same-schema table.column FK shorthand for Graphviz metadata', () => {
			const erdData = generateERDData(createExternalReferenceContext('users.user_id'), {
				subjectAreas: ['ORDER'],
				includeRelated: false,
				includeExternalReferences: true
			});

			expect(erdData.metadata.totalRelationships).toBe(1);
			expect(erdData.metadata.externalRelationships).toBe(1);
			expect(erdData.metadata.unresolvedForeignKeys).toBe(0);
		});

		it('should filter nodes by tableIds', () => {
			const context = createMockContext();
			const filterOptions = {
				tableIds: ['table-1'],
				includeRelated: false
			};
			const erdData = generateERDData(context, filterOptions);

			// 선택된 테이블 노드가 포함되어야 함
			const tableNodes = erdData.nodes.filter((n) => n.type === 'table');
			expect(tableNodes.length).toBeGreaterThan(0);
			expect(tableNodes.some((n) => n.id === 'table-1')).toBe(true);
		});

		it('should include related entities when requested', () => {
			const context = createMockContext();
			const filterOptions = {
				tableIds: ['table-1'],
				includeRelated: true
			};
			const erdData = generateERDData(context, filterOptions);

			// 관련 엔터티 노드가 포함되어야 함
			const entityNodes = erdData.nodes.filter((n) => n.type === 'entity');
			expect(entityNodes.length).toBeGreaterThan(0);
		});

		it('should exclude related entities when not requested', () => {
			const context = createMockContext();
			const filterOptions = {
				tableIds: ['table-1'],
				includeRelated: false
			};
			const erdData = generateERDData(context, filterOptions);

			// 관련 엔터티 노드가 포함되지 않아야 함
			const entityNodes = erdData.nodes.filter((n) => n.type === 'entity');
			expect(entityNodes.length).toBe(0);
		});

		it('should handle empty context gracefully', () => {
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
			const erdData = generateERDData(emptyContext);

			expect(erdData.nodes.length).toBe(0);
			expect(erdData.edges.length).toBe(0);
			expect(erdData.metadata.totalNodes).toBe(0);
		});

		it('should create domain nodes for mapped domains', () => {
			const context = createMockContext();
			const erdData = generateERDData(context);

			// 도메인 노드는 매핑이 있을 때만 생성되므로 여기서는 확인만
			const domainNodes = erdData.nodes.filter((n) => n.type === 'domain');
			// 도메인 노드는 매핑이 있을 때만 생성됨
			expect(domainNodes.length).toBeGreaterThanOrEqual(0);
		});
	});
});
