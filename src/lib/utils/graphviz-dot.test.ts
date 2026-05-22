import { describe, expect, it } from 'vitest';
import { buildGraphvizDot } from './graphviz-dot.js';
import type { GraphvizERDModel } from './erd-graphviz-model.js';

function createModel(): GraphvizERDModel {
	return {
		tables: [
			{
				id: 'table-1',
				key: 'bksp|tb_order',
				nodeId: 't_bksp_tb_order',
				schemaName: 'bksp',
				tableEnglishName: 'TB_ORDER',
				tableKoreanName: '주문<관리>',
				subjectArea: '주문&결제',
				scopeFlag: 'Y',
				inBusinessScope: true,
				isExternal: false,
				columns: [
					{
						id: 'column-1',
						columnEnglishName: 'ORDER_ID',
						columnKoreanName: '주문ID',
						dataType: 'VARCHAR',
						dataLength: '20',
						dataDecimalLength: '0',
						pkInfo: 'PK',
						isPrimaryKey: true,
						isForeignKey: false,
						isNotNull: true,
						raw: {} as never
					}
				]
			},
			{
				id: 'table-2',
				key: 'bksp|tb_user',
				nodeId: 't_bksp_tb_user',
				schemaName: 'bksp',
				tableEnglishName: 'TB_USER',
				tableKoreanName: '사용자',
				inBusinessScope: false,
				isExternal: true,
				columns: [],
				raw: {} as never
			}
		],
		relationships: [
			{
				id: 'rel-1',
				sourceTableKey: 'bksp|tb_order',
				targetTableKey: 'bksp|tb_user',
				sourceColumnName: 'USER_ID',
				targetColumnName: 'USER_ID',
				label: 'USER_ID → USER_ID',
				fkInfo: 'bksp.TB_USER.USER_ID',
				isExternalReference: true
			}
		],
		warnings: [],
		filters: {
			tableIds: [],
			subjectAreas: [],
			schemas: [],
			tableSearch: '',
			scopeFlags: [],
			includeExternalReferences: true
		},
		metadata: {
			generatedAt: '2026-01-01T00:00:00.000Z',
			totalTables: 2,
			totalColumns: 1,
			totalRelationships: 1,
			externalTables: 1
		}
	};
}

describe('buildGraphvizDot', () => {
	it('Graphviz digraph와 HTML table label을 생성한다', () => {
		const dot = buildGraphvizDot(createModel(), { mode: 'logical' });

		expect(dot).toContain('digraph DbManagerERD');
		expect(dot).toContain('<TABLE');
		expect(dot).toContain('PK');
		expect(dot).toContain('t_bksp_tb_order -> t_bksp_tb_user');
	});

	it('HTML label 특수문자를 escape한다', () => {
		const dot = buildGraphvizDot(createModel(), { mode: 'logical' });

		expect(dot).toContain('주문&lt;관리&gt;');
		expect(dot).toContain('주문&amp;결제');
	});

	it('물리 모드에서는 schema.table 이름을 우선 표시한다', () => {
		const dot = buildGraphvizDot(createModel(), { mode: 'physical' });

		expect(dot).toContain('bksp.TB_ORDER');
	});

	it('서비스 폰트 스택을 ERD 렌더링 폰트로 사용한다', () => {
		const dot = buildGraphvizDot(createModel(), { mode: 'logical' });

		expect(dot).toContain('Pretendard Variable,Pretendard,Inter');
	});
});
