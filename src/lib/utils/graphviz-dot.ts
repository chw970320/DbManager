/**
 * Graphviz DOT 직렬화 유틸리티
 */

import type {
	GraphvizERDMode,
	GraphvizERDModel,
	GraphvizERDTable,
	GraphvizERDColumn
} from './erd-graphviz-model.js';

export interface GraphvizDotOptions {
	mode?: GraphvizERDMode;
	title?: string;
}

const ERD_FONT_FAMILY =
	'Pretendard Variable,Pretendard,Inter,Malgun Gothic,Noto Sans CJK KR,Arial,sans-serif';

function xmlEscape(value: string | undefined | null): string {
	return (value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function dotEscape(value: string | undefined | null): string {
	return (value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function normalizeText(value: string | undefined | null): string {
	return (value ?? '').trim();
}

function formatDataType(column: GraphvizERDColumn): string {
	const dataType = normalizeText(column.dataType) || 'TYPE';
	const length = normalizeText(column.dataLength);
	const decimal = normalizeText(column.dataDecimalLength);
	if (!length || length === '-') return dataType;
	if (decimal && decimal !== '-' && decimal !== '0') return `${dataType}(${length},${decimal})`;
	return `${dataType}(${length})`;
}

function getTableTitle(table: GraphvizERDTable, mode: GraphvizERDMode): string {
	if (mode === 'logical') {
		return normalizeText(table.tableKoreanName) || table.tableEnglishName || '테이블';
	}
	const schema = normalizeText(table.schemaName);
	return schema ? `${schema}.${table.tableEnglishName}` : table.tableEnglishName || 'TABLE';
}

function getTableSubtitle(table: GraphvizERDTable, mode: GraphvizERDMode): string {
	const schema = normalizeText(table.schemaName);
	const physicalName = schema ? `${schema}.${table.tableEnglishName}` : table.tableEnglishName;
	if (mode === 'logical') {
		return [physicalName, table.subjectArea].filter(Boolean).join(' · ');
	}
	return [table.tableKoreanName, table.subjectArea].filter(Boolean).join(' · ');
}

function getColumnName(column: GraphvizERDColumn, mode: GraphvizERDMode): string {
	if (mode === 'logical') {
		return normalizeText(column.columnKoreanName) || column.columnEnglishName || '컬럼';
	}
	return column.columnEnglishName || 'COLUMN';
}

function getColumnSubName(column: GraphvizERDColumn, mode: GraphvizERDMode): string {
	if (mode === 'logical') return column.columnEnglishName;
	return normalizeText(column.columnKoreanName);
}

function getColumnBadges(column: GraphvizERDColumn): string {
	const badges: string[] = [];
	if (column.isPrimaryKey) badges.push('PK');
	if (column.isForeignKey) badges.push('FK');
	if (column.isNotNull) badges.push('NN');
	return badges.join(' ');
}

function buildColumnRow(column: GraphvizERDColumn, mode: GraphvizERDMode): string {
	const columnName = getColumnName(column, mode);
	const subName = getColumnSubName(column, mode);
	const badge = getColumnBadges(column);
	const type = formatDataType(column);
	const nameCell = subName
		? `${xmlEscape(columnName)}<BR/><FONT POINT-SIZE="9" COLOR="#64748B">${xmlEscape(subName)}</FONT>`
		: xmlEscape(columnName);

	return [
		'<TR>',
		`<TD ALIGN="LEFT" BALIGN="LEFT" PORT="${xmlEscape(column.id)}">${nameCell}</TD>`,
		`<TD ALIGN="LEFT"><FONT POINT-SIZE="10">${xmlEscape(type)}</FONT></TD>`,
		`<TD ALIGN="CENTER"><FONT POINT-SIZE="10" COLOR="#334155">${xmlEscape(badge)}</FONT></TD>`,
		'</TR>'
	].join('');
}

function buildTableLabel(table: GraphvizERDTable, mode: GraphvizERDMode): string {
	const headerColor = table.isExternal ? '#64748B' : '#2563EB';
	const title = getTableTitle(table, mode);
	const subtitle = getTableSubtitle(table, mode);
	const scopeText = table.inBusinessScope ? '사업범위' : '사업범위 외';
	const externalText = table.isExternal ? ' · 외부참조' : '';
	const rows = table.columns.length
		? table.columns.map((column) => buildColumnRow(column, mode)).join('\n')
		: '<TR><TD COLSPAN="3" ALIGN="CENTER"><FONT COLOR="#94A3B8">컬럼 없음</FONT></TD></TR>';

	return [
		'<',
		'<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6" COLOR="#CBD5E1">',
		`<TR><TD COLSPAN="3" BGCOLOR="${headerColor}"><FONT COLOR="#FFFFFF"><B>${xmlEscape(title)}</B></FONT></TD></TR>`,
		subtitle
			? `<TR><TD COLSPAN="3" BGCOLOR="#EFF6FF"><FONT POINT-SIZE="10" COLOR="#334155">${xmlEscape(subtitle)}</FONT></TD></TR>`
			: '',
		`<TR><TD COLSPAN="3" BGCOLOR="#F8FAFC"><FONT POINT-SIZE="9" COLOR="#475569">${xmlEscape(scopeText + externalText)}</FONT></TD></TR>`,
		'<TR><TD ALIGN="LEFT" BGCOLOR="#E2E8F0"><B>컬럼</B></TD><TD ALIGN="LEFT" BGCOLOR="#E2E8F0"><B>타입</B></TD><TD ALIGN="CENTER" BGCOLOR="#E2E8F0"><B>키</B></TD></TR>',
		rows,
		'</TABLE>',
		'>'
	].join('');
}

export function buildGraphvizDot(model: GraphvizERDModel, options: GraphvizDotOptions = {}): string {
	const mode = options.mode ?? 'logical';
	const title = options.title ?? 'DbManager ERD';
	const tableMap = new Map(model.tables.map((table) => [table.key, table]));
	const lines: string[] = [
		'digraph DbManagerERD {',
		`  graph [rankdir=LR, splines=ortho, overlap=false, pad="0.3", nodesep="0.8", ranksep="1.1", bgcolor="#F8FAFC", fontname="${dotEscape(ERD_FONT_FAMILY)}"];`,
		`  node [shape=plaintext, fontname="${dotEscape(ERD_FONT_FAMILY)}"];`,
		`  edge [fontname="${dotEscape(ERD_FONT_FAMILY)}", fontsize=10, color="#475569", arrowsize=0.8];`,
		`  label="${dotEscape(title)}";`,
		'  labelloc="t";',
		'  fontsize=18;'
	];

	for (const table of model.tables) {
		const tooltip = `${table.schemaName ?? ''}.${table.tableEnglishName}`.replace(/^\./, '');
		lines.push(
			`  ${table.nodeId} [label=${buildTableLabel(table, mode)}, tooltip="${dotEscape(tooltip)}"];`
		);
	}

	for (const relationship of model.relationships) {
		const source = tableMap.get(relationship.sourceTableKey);
		const target = tableMap.get(relationship.targetTableKey);
		if (!source || !target) continue;
		const color = relationship.isExternalReference ? '#94A3B8' : '#475569';
		lines.push(
			`  ${source.nodeId} -> ${target.nodeId} [label="${dotEscape(relationship.label)}", color="${color}", fontcolor="${color}", dir="both", arrowtail="crow", arrowhead="tee"];`
		);
	}

	if (model.tables.length === 0) {
		lines.push(
			'  empty [shape=box, label="조건에 맞는 ERD 테이블이 없습니다.", color="#CBD5E1", fontcolor="#64748B", style="rounded,filled", fillcolor="#FFFFFF"];'
		);
	}

	lines.push('}');
	return lines.join('\n');
}

export const graphvizDotTestUtils = {
	xmlEscape,
	dotEscape,
	formatDataType
};
