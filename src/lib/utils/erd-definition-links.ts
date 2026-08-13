/**
 * ERD 테이블 노드에서 연결된 정의서 화면으로 이동하는 링크 생성 유틸리티
 */

import type { TableEntry } from '$lib/types/database-design.js';
import { createBrowseHref } from './browse-url-state.js';

export type ErdDefinitionLinkType = 'table' | 'column' | 'entity' | 'attribute';

/** 각 정의서 링크에 사용할 파일명 (ERD 매핑 기준) */
export type ErdDefinitionFiles = Partial<Record<ErdDefinitionLinkType, string>>;

export interface ErdDefinitionLink {
	type: ErdDefinitionLinkType;
	label: string;
	description: string;
	href: string;
}

const LINK_LABELS: Record<ErdDefinitionLinkType, string> = {
	table: '테이블 정의서',
	column: '컬럼 정의서',
	entity: '엔터티 정의서',
	attribute: '속성 정의서'
};

const ROUTE_BY_LINK_TYPE: Record<ErdDefinitionLinkType, string> = {
	table: '/table/browse',
	column: '/column/browse',
	entity: '/entity/browse',
	attribute: '/attribute/browse'
};

function normalizeText(value: string | undefined | null): string {
	const text = (value ?? '').trim();
	return text === '-' ? '' : text;
}

/**
 * ERD 노드에 표시할 제목 (한글명 우선)
 */
export function getErdTableDisplayName(
	table: Pick<TableEntry, 'tableEnglishName' | 'tableKoreanName'>
): string {
	return normalizeText(table.tableKoreanName) || normalizeText(table.tableEnglishName) || '테이블';
}

/**
 * ERD 노드에 표시할 부제목 (스키마 · 영문명)
 */
export function getErdTableDisplayDetail(
	table: Pick<TableEntry, 'tableEnglishName' | 'schemaName'>
): string {
	return [normalizeText(table.schemaName), normalizeText(table.tableEnglishName)]
		.filter(Boolean)
		.join(' · ');
}

/**
 * 테이블 정의서 엔트리를 기준으로 이동 가능한 정의서 링크 목록을 만든다.
 */
export function buildErdDefinitionLinks(
	table: TableEntry,
	files: ErdDefinitionFiles = {}
): ErdDefinitionLink[] {
	const tableEnglishName = normalizeText(table.tableEnglishName);
	const relatedEntityName = normalizeText(table.relatedEntityName);
	const links: ErdDefinitionLink[] = [];

	if (tableEnglishName || table.id) {
		links.push({
			type: 'table',
			label: LINK_LABELS.table,
			description: tableEnglishName || '선택한 테이블',
			href: createBrowseHref(ROUTE_BY_LINK_TYPE.table, {
				filename: files.table,
				query: tableEnglishName,
				field: 'tableEnglishName',
				exact: true,
				targetId: table.id,
				open: 'detail'
			})
		});
	}

	if (tableEnglishName) {
		links.push({
			type: 'column',
			label: LINK_LABELS.column,
			description: `${tableEnglishName} 컬럼`,
			href: createBrowseHref(ROUTE_BY_LINK_TYPE.column, {
				filename: files.column,
				query: tableEnglishName,
				field: 'tableEnglishName',
				exact: true
			})
		});
	}

	if (relatedEntityName) {
		links.push({
			type: 'entity',
			label: LINK_LABELS.entity,
			description: relatedEntityName,
			href: createBrowseHref(ROUTE_BY_LINK_TYPE.entity, {
				filename: files.entity,
				query: relatedEntityName,
				field: 'entityName',
				exact: true
			})
		});
		links.push({
			type: 'attribute',
			label: LINK_LABELS.attribute,
			description: `${relatedEntityName} 속성`,
			href: createBrowseHref(ROUTE_BY_LINK_TYPE.attribute, {
				filename: files.attribute,
				query: relatedEntityName,
				field: 'entityName',
				exact: true
			})
		});
	}

	return links;
}
