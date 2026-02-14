import { describe, it, expect } from 'vitest';
import { validateDesignRelations } from './design-relation-validator.js';
import type { MappingContext } from '$lib/types/erd-mapping.js';

function createContext(): MappingContext {
	return {
		databases: [
			{
				id: 'db-1',
				organizationName: '기관',
				departmentName: '부서',
				appliedTask: '업무',
				relatedLaw: '법령',
				buildDate: '2026-01-01',
				osInfo: 'Linux',
				exclusionReason: '-',
				logicalDbName: 'LDB_MAIN',
				physicalDbName: 'PDB_MAIN',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z'
			}
		],
		entities: [
			{
				id: 'entity-1',
				logicalDbName: 'LDB_MAIN',
				schemaName: 'BKSP',
				entityName: '사용자',
				tableKoreanName: '사용자',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z'
			},
			{
				id: 'entity-2',
				logicalDbName: 'LDB_MISSING',
				schemaName: 'BKSP',
				entityName: '미존재엔터티',
				tableKoreanName: '미존재엔터티',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z'
			}
		],
		attributes: [
			{
				id: 'attr-1',
				requiredInput: 'Y',
				refEntityName: '-',
				schemaName: 'BKSP',
				entityName: '사용자',
				attributeName: '이름',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z'
			},
			{
				id: 'attr-2',
				requiredInput: 'Y',
				refEntityName: '-',
				schemaName: 'BKSP',
				entityName: '없는엔터티',
				attributeName: '없는속성',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z'
			}
		],
		tables: [
			{
				id: 'table-1',
				businessClassification: '업무',
				tableVolume: '1',
				nonPublicReason: '-',
				openDataList: '-',
				physicalDbName: 'PDB_MAIN',
				schemaName: 'BKSP',
				tableEnglishName: 'TB_USER',
				relatedEntityName: '사용자',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z'
			},
			{
				id: 'table-2',
				businessClassification: '업무',
				tableVolume: '1',
				nonPublicReason: '-',
				openDataList: '-',
				physicalDbName: 'PDB_MISSING',
				schemaName: 'BKSP',
				tableEnglishName: 'TB_UNKNOWN',
				relatedEntityName: '없는엔터티',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z'
			}
		],
		columns: [
			{
				id: 'col-1',
				dataLength: '100',
				dataDecimalLength: '0',
				dataFormat: '-',
				pkInfo: '',
				indexName: '',
				indexOrder: '',
				akInfo: '',
				constraint: '',
				schemaName: 'BKSP',
				tableEnglishName: 'TB_USER',
				columnEnglishName: 'USER_NM',
				columnKoreanName: '이름',
				relatedEntityName: '사용자',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z'
			},
			{
				id: 'col-2',
				dataLength: '100',
				dataDecimalLength: '0',
				dataFormat: '-',
				pkInfo: '',
				indexName: '',
				indexOrder: '',
				akInfo: '',
				constraint: '',
				schemaName: 'BKSP',
				tableEnglishName: 'TB_MISSING',
				columnEnglishName: 'MISSING_NM',
				columnKoreanName: '없는컬럼',
				relatedEntityName: '사용자',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z'
			}
		],
		domains: []
	};
}

describe('design-relation-validator', () => {
	it('should validate all 5-definition relations with summary counts', () => {
		const result = validateDesignRelations(createContext());

		expect(result.specs).toHaveLength(6);
		expect(result.summaries).toHaveLength(6);

		const byId = new Map(result.summaries.map((s) => [s.relationId, s]));
		expect(byId.get('DB_ENTITY')).toMatchObject({ matched: 1, unmatched: 1 });
		expect(byId.get('DB_TABLE')).toMatchObject({ matched: 1, unmatched: 1 });
		expect(byId.get('ENTITY_ATTRIBUTE')).toMatchObject({ matched: 1, unmatched: 1 });
		expect(byId.get('ENTITY_TABLE')).toMatchObject({ matched: 1, unmatched: 1 });
		expect(byId.get('TABLE_COLUMN')).toMatchObject({ matched: 1, unmatched: 1 });
		expect(byId.get('ATTRIBUTE_COLUMN')).toMatchObject({ matched: 1, unmatched: 1 });

		expect(result.totals.unmatched).toBe(6);
		expect(result.totals.errorCount).toBe(5);
		expect(result.totals.warningCount).toBe(1);
	});
});

