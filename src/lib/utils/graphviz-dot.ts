/**
 * Graphviz DOT 직렬화 유틸리티
 */

import type {
	GraphvizERDMode,
	GraphvizERDModel,
	GraphvizERDTable,
	GraphvizERDColumn,
	GraphvizERDRelationship
} from './erd-graphviz-model.js';

export interface GraphvizDotOptions {
	mode?: GraphvizERDMode;
	title?: string;
}

const ERD_FONT_FAMILY =
	'Pretendard Variable,Pretendard,Inter,Malgun Gothic,Noto Sans CJK KR,Arial,sans-serif';
const BUSINESS_SCOPE_HEADER_COLOR = '#4A90E2';
const OUT_OF_SCOPE_HEADER_COLOR = '#9B9B9B';
const EXTERNAL_HEADER_COLOR = '#64748B';
const TABLE_BORDER_COLOR = '#CBD5E1';
const EXTERNAL_BORDER_COLOR = '#94A3B8';

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

function getTableSubtitle(table: GraphvizERDTable): string {
	return normalizeText(table.subjectArea);
}

function getColumnName(column: GraphvizERDColumn, mode: GraphvizERDMode): string {
	if (mode === 'logical') {
		return normalizeText(column.columnKoreanName) || column.columnEnglishName || '컬럼';
	}
	return column.columnEnglishName || 'COLUMN';
}

function getTableTooltip(table: GraphvizERDTable, mode: GraphvizERDMode): string {
	if (mode === 'logical') {
		return normalizeText(table.tableKoreanName) || table.tableEnglishName;
	}
	const schema = normalizeText(table.schemaName);
	return schema ? `${schema}.${table.tableEnglishName}` : table.tableEnglishName;
}

function findColumnByEnglishName(
	table: GraphvizERDTable,
	columnEnglishName: string | undefined
): GraphvizERDColumn | undefined {
	const normalizedName = normalizeText(columnEnglishName).toLowerCase();
	if (!normalizedName) return undefined;
	return table.columns.find(
		(column) => normalizeText(column.columnEnglishName).toLowerCase() === normalizedName
	);
}

function getRelationshipLabel(
	relationship: GraphvizERDRelationship,
	source: GraphvizERDTable,
	target: GraphvizERDTable,
	mode: GraphvizERDMode
): string {
	if (mode === 'physical') {
		return `${relationship.sourceColumnName ?? 'FK'} → ${relationship.targetColumnName ?? 'PK'}`;
	}

	const sourceColumn = findColumnByEnglishName(source, relationship.sourceColumnName);
	const targetColumn = findColumnByEnglishName(target, relationship.targetColumnName);
	const sourceName = normalizeText(sourceColumn?.columnKoreanName);
	const targetName = normalizeText(targetColumn?.columnKoreanName);
	return sourceName && targetName ? `${sourceName} → ${targetName}` : '';
}

function getHeaderColor(table: GraphvizERDTable): string {
	if (table.isExternal) return EXTERNAL_HEADER_COLOR;
	return table.inBusinessScope ? BUSINESS_SCOPE_HEADER_COLOR : OUT_OF_SCOPE_HEADER_COLOR;
}

function getBorderColor(table: GraphvizERDTable): string {
	return table.isExternal ? EXTERNAL_BORDER_COLOR : TABLE_BORDER_COLOR;
}

function buildColumnRow(column: GraphvizERDColumn, mode: GraphvizERDMode): string {
	const columnName = getColumnName(column, mode);
	const type = formatDataType(column);
	const nameCell = `<FONT POINT-SIZE="10">${xmlEscape(columnName)}</FONT>`;
	const primaryKeyCell = column.isPrimaryKey
		? '<FONT POINT-SIZE="9" COLOR="#1D4ED8"><B>PK</B></FONT>'
		: '';
	const foreignKeyCell = column.isForeignKey
		? '<FONT POINT-SIZE="9" COLOR="#B45309"><B>FK</B></FONT>'
		: '';
	const notNullCell = column.isNotNull
		? '<FONT POINT-SIZE="9" COLOR="#334155"><B>NN</B></FONT>'
		: '';

	return [
		'<TR>',
		`<TD WIDTH="24" ALIGN="CENTER">${primaryKeyCell}</TD>`,
		`<TD WIDTH="24" ALIGN="CENTER">${foreignKeyCell}</TD>`,
		`<TD ALIGN="LEFT" BALIGN="LEFT" PORT="${xmlEscape(column.id)}">${nameCell}</TD>`,
		`<TD ALIGN="LEFT"><FONT POINT-SIZE="10">${xmlEscape(type)}</FONT></TD>`,
		`<TD WIDTH="28" ALIGN="CENTER">${notNullCell}</TD>`,
		'</TR>'
	].join('');
}

function buildTableLabel(table: GraphvizERDTable, mode: GraphvizERDMode): string {
	const headerColor = getHeaderColor(table);
	const borderColor = getBorderColor(table);
	const title = getTableTitle(table, mode);
	const subtitle = getTableSubtitle(table);
	const scopeText = table.inBusinessScope ? '사업범위' : '사업범위 외';
	const externalText = table.isExternal ? ' · 외부참조' : '';
	const rows = table.columns.length
		? table.columns.map((column) => buildColumnRow(column, mode)).join('\n')
		: '<TR><TD COLSPAN="5" ALIGN="CENTER"><FONT COLOR="#94A3B8">컬럼 없음</FONT></TD></TR>';

	return [
		'<',
		`<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6" COLOR="${borderColor}">`,
		`<TR><TD COLSPAN="5" BGCOLOR="${headerColor}"><FONT POINT-SIZE="14" COLOR="#FFFFFF"><B>${xmlEscape(title)}</B></FONT></TD></TR>`,
		subtitle
			? `<TR><TD COLSPAN="5" BGCOLOR="#EFF6FF"><FONT POINT-SIZE="10" COLOR="#334155">${xmlEscape(subtitle)}</FONT></TD></TR>`
			: '',
		`<TR><TD COLSPAN="5" BGCOLOR="#F8FAFC"><FONT POINT-SIZE="9" COLOR="#475569">${xmlEscape(scopeText + externalText)}</FONT></TD></TR>`,
		'<TR><TD WIDTH="24" ALIGN="CENTER" BGCOLOR="#E2E8F0"><B>PK</B></TD><TD WIDTH="24" ALIGN="CENTER" BGCOLOR="#E2E8F0"><B>FK</B></TD><TD ALIGN="LEFT" BGCOLOR="#E2E8F0"><B>컬럼</B></TD><TD ALIGN="LEFT" BGCOLOR="#E2E8F0"><B>타입</B></TD><TD WIDTH="28" ALIGN="CENTER" BGCOLOR="#E2E8F0"><B>NN</B></TD></TR>',
		rows,
		'</TABLE>',
		'>'
	].join('');
}

export function buildGraphvizDot(
	model: GraphvizERDModel,
	options: GraphvizDotOptions = {}
): string {
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
		const tooltip = getTableTooltip(table, mode);
		const style = table.isExternal ? ', style="dashed"' : '';
		lines.push(
			`  ${table.nodeId} [label=${buildTableLabel(table, mode)}, tooltip="${dotEscape(tooltip)}"${style}];`
		);
	}

	for (const relationship of model.relationships) {
		const source = tableMap.get(relationship.sourceTableKey);
		const target = tableMap.get(relationship.targetTableKey);
		if (!source || !target) continue;
		const color = relationship.isExternalReference ? '#94A3B8' : '#475569';
		const style = relationship.isExternalReference ? ', style="dashed"' : '';
		const label = getRelationshipLabel(relationship, source, target, mode);
		const labelAttribute = label
			? `label="${dotEscape(label)}", fontcolor="${color}", `
			: '';
		lines.push(
			`  ${source.nodeId} -> ${target.nodeId} [${labelAttribute}color="${color}", dir="both", arrowtail="crow", arrowhead="tee"${style}];`
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
