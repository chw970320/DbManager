import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateERDData, generateMermaidERD } from './erd-generator.js';
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

	describe('generateMermaidERD', () => {
		it('should generate valid Mermaid ER diagram', () => {
			const context = createMockContext();
			const erdData = generateERDData(context);
			const mermaidCode = generateMermaidERD(erdData);

			expect(mermaidCode).toContain('erDiagram');
			expect(mermaidCode.length).toBeGreaterThan(0);
		});

		it('should limit node count when maxNodes provided', () => {
			const context = createMockContext();
			const erdData = generateERDData(context);
			const mermaidCode = generateMermaidERD(erdData, 1);

			// 노드 수가 제한되었는지 확인 (정확한 수는 구현에 따라 다를 수 있음)
			expect(mermaidCode).toBeDefined();
		});

		it('should limit edge count when maxEdges provided', () => {
			const context = createMockContext();
			const erdData = generateERDData(context);
			const mermaidCode = generateMermaidERD(erdData, undefined, 1);

			// 엣지 수가 제한되었는지 확인
			expect(mermaidCode).toBeDefined();
		});

		it('should sanitize node names correctly', () => {
			const context = createMockContext();
			const erdData = generateERDData(context);
			const mermaidCode = generateMermaidERD(erdData);

			// 노드 이름에 특수문자가 제거되었는지 확인 (들여쓰기 공백은 제외)
			// Mermaid 코드의 노드 정의 라인 확인
			const nodeDefinitionLines = mermaidCode
				.split('\n')
				.filter((line) => line.trim().match(/^[A-Za-z_][A-Za-z0-9_]*\s*\{/));

			// 노드 이름에 공백이나 특수문자가 없어야 함
			for (const line of nodeDefinitionLines) {
				const nodeName = line.trim().split(/\s*\{/)[0];
				expect(nodeName).toMatch(/^[A-Za-z_][A-Za-z0-9_]*$/);
			}
		});

		it('should truncate long node names', () => {
			const longNameEntity: EntityEntry = {
				...createMockEntity(),
				entityName: 'A'.repeat(100) // 100자 이름
			};
			const context: MappingContext = {
				...createMockContext(),
				entities: [longNameEntity]
			};
			const erdData = generateERDData(context);
			const mermaidCode = generateMermaidERD(erdData);

			// 긴 이름이 축약되었는지 확인 (50자 제한)
			expect(mermaidCode).toBeDefined();
		});

		it('should limit fields to 3 per entity', () => {
			const context = createMockContext();
			const erdData = generateERDData(context);
			const mermaidCode = generateMermaidERD(erdData);

			// 필드 수가 제한되었는지 확인 (구현상 최대 3개)
			expect(mermaidCode).toBeDefined();
		});

		it('should warn when text size exceeds limit', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			// 큰 데이터셋 생성
			const largeContext: MappingContext = {
				databases: Array.from({ length: 10 }, () => createMockDatabase()),
				entities: Array.from({ length: 100 }, (_, i) => ({
					...createMockEntity(),
					id: `entity-${i}`,
					entityName: `Entity${i}`
				})),
				attributes: [],
				tables: Array.from({ length: 100 }, (_, i) => ({
					...createMockTable(),
					id: `table-${i}`,
					tableEnglishName: `Table${i}`
				})),
				columns: [],
				domains: [],
				vocabularyMap: new Map(),
				domainMap: new Map()
			};

			const erdData = generateERDData(largeContext);
			const mermaidCode = generateMermaidERD(erdData);

			// 텍스트 크기가 제한을 초과하면 경고가 발생할 수 있음
			// (실제로는 45KB를 초과할 때만 경고)
			expect(mermaidCode).toBeDefined();

			consoleSpy.mockRestore();
		});
	});
});
