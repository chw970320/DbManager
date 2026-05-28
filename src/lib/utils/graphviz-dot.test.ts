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
					},
					{
						id: 'column-2',
						columnEnglishName: 'USER_ID',
						columnKoreanName: '사용자ID',
						dataType: 'NUMBER',
						dataLength: '10',
						dataDecimalLength: '2',
						pkInfo: '',
						fkInfo: 'bksp.TB_USER.USER_ID',
						isPrimaryKey: false,
						isForeignKey: true,
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
				columns: [
					{
						id: 'column-user-id',
						columnEnglishName: 'USER_ID',
						columnKoreanName: '사용자ID',
						dataType: 'NUMBER',
						dataLength: '10',
						dataDecimalLength: '0',
						pkInfo: 'PK',
						isPrimaryKey: true,
						isForeignKey: false,
						isNotNull: true,
						raw: {} as never
					}
				],
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

function createDisconnectedModel(tableCount = 9): GraphvizERDModel {
	const baseModel = createModel();
	return {
		...baseModel,
		tables: Array.from({ length: tableCount }, (_, index) => ({
			...baseModel.tables[0],
			id: `table-${index + 1}`,
			key: `bksp|tb_${index + 1}`,
			nodeId: `t_bksp_tb_${index + 1}`,
			tableEnglishName: `TB_${index + 1}`,
			tableKoreanName: `테이블${index + 1}`,
			columns: baseModel.tables[0].columns.map((column, columnIndex) => ({
				...column,
				id: `column-${index + 1}-${columnIndex + 1}`
			}))
		})),
		relationships: [],
		metadata: {
			...baseModel.metadata,
			totalTables: tableCount,
			totalRelationships: 0,
			externalTables: 0
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

	it('HTML label 특수문자를 escape하고 보조 정보 행은 표시하지 않는다', () => {
		const dot = buildGraphvizDot(createModel(), { mode: 'logical' });

		expect(dot).toContain('주문&lt;관리&gt;');
		expect(dot).not.toContain('주문&amp;결제');
		expect(dot).not.toContain('사업범위');
		expect(dot).not.toContain('사업범위 외');
		expect(dot).not.toContain('외부참조');
	});

	it('그래프 전체 제목과 컬럼 머리행을 표시하지 않는다', () => {
		const dot = buildGraphvizDot(createModel(), { mode: 'logical' });

		expect(dot).not.toContain('label="논리 ERD"');
		expect(dot).not.toContain('labelloc="t"');
		expect(dot).not.toContain('fontsize=18');
		expect(dot).not.toContain('<B>컬럼</B>');
		expect(dot).not.toContain('<B>타입</B>');
		expect(dot).toContain('주문ID');
		expect(dot).toContain('VARCHAR(20)');
	});

	it('물리 모드에서는 스키마 없이 테이블 영문명만 표시한다', () => {
		const dot = buildGraphvizDot(createModel(), { mode: 'physical' });

		expect(dot).toContain('<B>TB_ORDER</B>');
		expect(dot).not.toContain('bksp.TB_ORDER');
	});

	it('논리 모드에서는 테이블/컬럼의 영문 보조명을 화면 label에 섞지 않는다', () => {
		const dot = buildGraphvizDot(createModel(), { mode: 'logical' });

		expect(dot).toContain('주문&lt;관리&gt;');
		expect(dot).toContain('주문ID');
		expect(dot).not.toContain('TB_ORDER');
		expect(dot).not.toContain('ORDER_ID');
		expect(dot).not.toContain('사용자ID → 사용자ID');
		expect(dot).not.toContain('USER_ID → USER_ID');
	});

	it('물리 모드에서는 테이블/컬럼의 한글 보조명을 화면 label에 섞지 않는다', () => {
		const dot = buildGraphvizDot(createModel(), { mode: 'physical' });

		expect(dot).toContain('<B>TB_ORDER</B>');
		expect(dot).not.toContain('<B>bksp.TB_ORDER</B>');
		expect(dot).toContain('ORDER_ID');
		expect(dot).not.toContain('주문&lt;관리&gt;');
		expect(dot).not.toContain('주문ID');
		expect(dot).not.toContain('사용자ID → 사용자ID');
		expect(dot).not.toContain('USER_ID → USER_ID');
	});

	it('서비스 폰트 스택을 ERD 렌더링 폰트로 사용한다', () => {
		const dot = buildGraphvizDot(createModel(), { mode: 'logical' });

		expect(dot).toContain('Pretendard Variable,Pretendard,Inter');
	});

	it('관계가 없는 다중 테이블은 grid형 packing 속성을 사용한다', () => {
		const dot = buildGraphvizDot(createDisconnectedModel(9), { mode: 'logical' });

		expect(dot).toContain('rankdir=LR');
		expect(dot).toContain('splines=ortho');
		expect(dot).toContain('pack=12');
		expect(dot).toContain('packmode="array_i3"');
		expect(dot).toContain('pad="0.15"');
		expect(dot).toContain('nodesep="0.45"');
		expect(dot).toContain('ranksep="0.65"');
		expect(dot).not.toContain('array_u');
		expect(dot).not.toContain('sortv=');
	});

	it('관계가 있는 모델은 edge 방향성을 보존하는 보수적 packing을 사용한다', () => {
		const dot = buildGraphvizDot(createModel(), { mode: 'logical' });

		expect(dot).toContain('rankdir=LR');
		expect(dot).toContain('splines=ortho');
		expect(dot).toContain('pack=true');
		expect(dot).toContain('packmode="graph"');
		expect(dot).toContain('arrowtail="crow"');
		expect(dot).toContain('arrowhead="tee"');
	});

	it('사업범위 여부와 외부 참조 상태에 맞는 헤더/외곽 스타일을 사용한다', () => {
		const dot = buildGraphvizDot(createModel(), { mode: 'logical' });

		expect(dot).toContain('BGCOLOR="#4A90E2"');
		expect(dot).toContain('BGCOLOR="#64748B"');
		expect(dot).toContain('style="dashed"');

		const nonScopeModel = createModel();
		nonScopeModel.tables[0].inBusinessScope = false;
		const nonScopeDot = buildGraphvizDot(nonScopeModel, { mode: 'logical' });

		expect(nonScopeDot).toContain('BGCOLOR="#9B9B9B"');
	});

	it('컬럼 데이터 행에 PK/FK 좁은 열과 타입 길이/소수점 및 NN을 분리해 표시한다', () => {
		const dot = buildGraphvizDot(createModel(), { mode: 'logical' });

		expect(dot).toContain('<B>PK</B>');
		expect(dot).toContain('<B>FK</B>');
		expect(dot).toContain('<B>NN</B>');
		expect(dot).toContain('VARCHAR(20)');
		expect(dot).toContain('NUMBER(10,2)');
		expect(dot).toMatch(/<TD[^>]*WIDTH="24"[^>]*>[\s\S]*PK/);
		expect(dot).toMatch(/<TD[^>]*WIDTH="24"[^>]*>[\s\S]*FK/);
	});

	it('관계선은 라벨 없이 crow-foot/one 방향성과 외부 관계 점선 스타일을 유지한다', () => {
		const dot = buildGraphvizDot(createModel(), { mode: 'logical' });

		const edgeLine = dot
			.split('\n')
			.find((line) => line.includes('t_bksp_tb_order -> t_bksp_tb_user'));
		expect(edgeLine).toBeDefined();
		expect(edgeLine).not.toContain('label=');
		expect(dot).toContain('arrowtail="crow"');
		expect(dot).toContain('arrowhead="tee"');
		expect(dot).toContain('style="dashed"');
	});

	it('빈 모델도 유효한 digraph와 빈 상태 노드를 생성한다', () => {
		const baseModel = createModel();
		const emptyModel: GraphvizERDModel = {
			...baseModel,
			tables: [],
			relationships: [],
			metadata: {
				...baseModel.metadata,
				totalTables: 0,
				totalRelationships: 0
			}
		};

		const dot = buildGraphvizDot(emptyModel, { mode: 'logical' });

		expect(dot).toContain('digraph DbManagerERD');
		expect(dot).toContain('조건에 맞는 ERD 테이블이 없습니다.');
	});
});
