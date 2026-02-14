import { describe, expect, it } from 'vitest';
import { buildDesignRelationSyncPlan } from './design-relation-sync.js';
import type { MappingContext } from '$lib/types/erd-mapping.js';

function createContext(): MappingContext {
	return {
		databases: [],
		entities: [
			{
				id: 'entity-1',
				schemaName: 'MAIN',
				entityName: '사용자',
				tableKoreanName: '사용자테이블',
				createdAt: '2026-02-14T00:00:00.000Z',
				updatedAt: '2026-02-14T00:00:00.000Z'
			}
		],
		attributes: [
			{
				id: 'attr-1',
				schemaName: 'MAIN',
				entityName: '사용자',
				attributeName: '사용자아이디코드',
				requiredInput: 'Y',
				refEntityName: '-',
				createdAt: '2026-02-14T00:00:00.000Z',
				updatedAt: '2026-02-14T00:00:00.000Z'
			}
		],
		tables: [
			{
				id: 'table-1',
				schemaName: 'MAIN',
				tableEnglishName: 'TB_USER',
				tableKoreanName: '사용자테이블',
				relatedEntityName: '사용자테이블',
				businessClassification: '업무',
				tableVolume: '100',
				nonPublicReason: '-',
				openDataList: '-',
				createdAt: '2026-02-14T00:00:00.000Z',
				updatedAt: '2026-02-14T00:00:00.000Z'
			}
		],
		columns: [
			{
				id: 'col-1',
				schemaName: 'MAIN',
				tableEnglishName: '사용자테이블',
				columnEnglishName: 'USER_ID',
				columnKoreanName: '사용자아이디',
				relatedEntityName: '사용자',
				dataLength: '20',
				dataDecimalLength: '0',
				dataFormat: '-',
				pkInfo: '-',
				indexName: '-',
				indexOrder: '-',
				akInfo: '-',
				constraint: '-',
				createdAt: '2026-02-14T00:00:00.000Z',
				updatedAt: '2026-02-14T00:00:00.000Z'
			},
			{
				id: 'col-2',
				schemaName: '',
				tableEnglishName: 'TB_USER',
				columnEnglishName: 'USER_NAME',
				columnKoreanName: '사용자이름',
				relatedEntityName: '',
				dataLength: '20',
				dataDecimalLength: '0',
				dataFormat: '-',
				pkInfo: '-',
				indexName: '-',
				indexOrder: '-',
				akInfo: '-',
				constraint: '-',
				createdAt: '2026-02-14T00:00:00.000Z',
				updatedAt: '2026-02-14T00:00:00.000Z'
			}
		],
		domains: []
	};
}

describe('design-relation-sync', () => {
	it('should build table/column sync updates and attribute-column suggestions', () => {
		const plan = buildDesignRelationSyncPlan(createContext());

		expect(plan.preview.counts.tableCandidates).toBe(1);
		expect(plan.preview.counts.columnCandidates).toBe(2);
		expect(plan.preview.counts.totalCandidates).toBe(3);
		expect(plan.preview.counts.attributeColumnSuggestions).toBe(1);

		const tablePatch = plan.tableUpdates.find((u) => u.id === 'table-1');
		expect(tablePatch?.patch.relatedEntityName).toBe('사용자');

		const columnPatch1 = plan.columnUpdates.find((u) => u.id === 'col-1');
		expect(columnPatch1?.patch.tableEnglishName).toBe('TB_USER');
		expect(columnPatch1?.patch.relatedEntityName).toBeUndefined();

		const columnPatch2 = plan.columnUpdates.find((u) => u.id === 'col-2');
		expect(columnPatch2?.patch.schemaName).toBe('MAIN');
		expect(columnPatch2?.patch.relatedEntityName).toBe('사용자');
	});

	it('should skip ambiguous table matches for columns', () => {
		const plan = buildDesignRelationSyncPlan({
			databases: [],
			entities: [],
			attributes: [],
			tables: [
				{
					id: 'table-a',
					schemaName: 'A',
					tableEnglishName: 'TB_DUP',
					relatedEntityName: '엔터티A',
					businessClassification: '업무',
					tableVolume: '100',
					nonPublicReason: '-',
					openDataList: '-',
					createdAt: '2026-02-14T00:00:00.000Z',
					updatedAt: '2026-02-14T00:00:00.000Z'
				},
				{
					id: 'table-b',
					schemaName: 'B',
					tableEnglishName: 'TB_DUP',
					relatedEntityName: '엔터티B',
					businessClassification: '업무',
					tableVolume: '100',
					nonPublicReason: '-',
					openDataList: '-',
					createdAt: '2026-02-14T00:00:00.000Z',
					updatedAt: '2026-02-14T00:00:00.000Z'
				}
			],
			columns: [
				{
					id: 'col-dup',
					tableEnglishName: 'TB_DUP',
					columnEnglishName: 'COL1',
					columnKoreanName: '컬럼1',
					dataLength: '10',
					dataDecimalLength: '0',
					dataFormat: '-',
					pkInfo: '-',
					indexName: '-',
					indexOrder: '-',
					akInfo: '-',
					constraint: '-',
					createdAt: '2026-02-14T00:00:00.000Z',
					updatedAt: '2026-02-14T00:00:00.000Z'
				}
			],
			domains: []
		});

		expect(plan.preview.counts.columnCandidates).toBe(0);
		expect(plan.columnUpdates).toHaveLength(0);
	});
});
