import { describe, expect, it } from 'vitest';
import { buildGraphvizERDModel } from './erd-graphviz-model.js';
import type { MappingContext } from '$lib/types/erd-mapping.js';
import type { ColumnEntry, TableEntry } from '$lib/types/database-design.js';

function table(overrides: Partial<TableEntry>): TableEntry {
	return {
		id: overrides.id ?? 'table-id',
		businessClassification: '',
		tableVolume: '',
		nonPublicReason: '',
		openDataList: '',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		...overrides
	};
}

function column(overrides: Partial<ColumnEntry>): ColumnEntry {
	return {
		id: overrides.id ?? 'column-id',
		dataLength: overrides.dataLength ?? '20',
		dataDecimalLength: overrides.dataDecimalLength ?? '0',
		dataFormat: '',
		pkInfo: overrides.pkInfo ?? '',
		indexName: '',
		indexOrder: '',
		akInfo: '',
		constraint: '',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		...overrides
	};
}

function context(): MappingContext {
	return {
		databases: [],
		entities: [],
		attributes: [],
		domains: [],
		tables: [
			table({
				id: 'table-order',
				schemaName: 'bksp',
				tableEnglishName: 'TB_ORDER',
				tableKoreanName: '주문',
				subjectArea: '주문'
			}),
			table({
				id: 'table-user',
				schemaName: 'bksp',
				tableEnglishName: 'TB_USER',
				tableKoreanName: '사용자',
				subjectArea: '회원'
			})
		],
		columns: [
			column({
				id: 'order-id',
				scopeFlag: 'Y',
				subjectArea: '주문',
				schemaName: 'bksp',
				tableEnglishName: 'TB_ORDER',
				columnEnglishName: 'ORDER_ID',
				columnKoreanName: '주문ID',
				dataType: 'VARCHAR',
				pkInfo: 'PK'
			}),
			column({
				id: 'order-user-id',
				scopeFlag: 'Y',
				subjectArea: '주문',
				schemaName: 'bksp',
				tableEnglishName: 'TB_ORDER',
				columnEnglishName: 'USER_ID',
				columnKoreanName: '사용자ID',
				dataType: 'VARCHAR',
				fkInfo: 'bksp.TB_USER.USER_ID'
			}),
			column({
				id: 'user-id',
				scopeFlag: 'N',
				subjectArea: '회원',
				schemaName: 'bksp',
				tableEnglishName: 'TB_USER',
				columnEnglishName: 'USER_ID',
				columnKoreanName: '사용자ID',
				dataType: 'VARCHAR',
				pkInfo: 'PK'
			})
		]
	};
}

describe('buildGraphvizERDModel', () => {
	it('테이블 정의서와 컬럼 정의서를 schema+테이블명으로 조인한다', () => {
		const model = buildGraphvizERDModel(context());

		expect(model.tables).toHaveLength(2);
		expect(model.tables.find((item) => item.tableEnglishName === 'TB_ORDER')?.columns).toHaveLength(2);
		expect(model.tables.find((item) => item.tableEnglishName === 'TB_ORDER')?.tableKoreanName).toBe(
			'주문'
		);
	});

	it('주제영역, schema, 테이블명, 사업범위 필터를 적용한다', () => {
		const model = buildGraphvizERDModel(context(), {
			subjectAreas: ['주문'],
			schemas: ['BKSP'],
			tableSearch: '주문',
			scopeFlags: ['Y'],
			includeExternalReferences: false
		});

		expect(model.tables).toHaveLength(1);
		expect(model.tables[0].tableEnglishName).toBe('TB_ORDER');
		expect(model.tables[0].inBusinessScope).toBe(true);
	});

	it('외부 FK 참조 포함 옵션이 켜지면 필터 밖 테이블을 외부 노드로 포함한다', () => {
		const model = buildGraphvizERDModel(context(), {
			subjectAreas: ['주문'],
			includeExternalReferences: true
		});

		expect(model.tables).toHaveLength(2);
		expect(model.tables.find((item) => item.tableEnglishName === 'TB_USER')?.isExternal).toBe(true);
		expect(model.relationships).toHaveLength(1);
		expect(model.relationships[0].isExternalReference).toBe(true);
	});

	it('외부 FK 참조 제외 옵션이 꺼져 있으면 필터 밖 관계를 제거한다', () => {
		const model = buildGraphvizERDModel(context(), {
			subjectAreas: ['주문'],
			includeExternalReferences: false
		});

		expect(model.tables).toHaveLength(1);
		expect(model.relationships).toHaveLength(0);
	});
});
