import { describe, expect, it } from 'vitest';

import type { TableEntry } from '$lib/types/database-design.js';
import {
	buildErdDefinitionLinks,
	getErdTableDisplayDetail,
	getErdTableDisplayName
} from './erd-definition-links';

function createTableEntry(overrides: Partial<TableEntry> = {}): TableEntry {
	return {
		id: 'table-1',
		businessClassification: '공통',
		tableVolume: 'SMALL',
		nonPublicReason: '',
		openDataList: '',
		schemaName: 'PUBLIC',
		tableEnglishName: 'TB_USER',
		tableKoreanName: '사용자',
		relatedEntityName: '사용자',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		...overrides
	};
}

describe('ERD 정의서 바로가기 링크', () => {
	it('테이블/컬럼/엔터티/속성 정의서 링크를 파일명과 검색 조건까지 담아 만든다', () => {
		const links = buildErdDefinitionLinks(createTableEntry(), {
			table: 'table.json',
			column: 'column.json',
			entity: 'entity.json',
			attribute: 'attribute.json'
		});

		expect(links.map((link) => link.type)).toEqual(['table', 'column', 'entity', 'attribute']);
		expect(links[0].href).toBe(
			'/table/browse?filename=table.json&q=TB_USER&field=tableEnglishName&exact=true&target=table-1&open=detail'
		);
		expect(links[1].href).toBe(
			'/column/browse?filename=column.json&q=TB_USER&field=tableEnglishName&exact=true'
		);
		expect(links[2].href).toBe(
			'/entity/browse?filename=entity.json&q=%EC%82%AC%EC%9A%A9%EC%9E%90&field=entityName&exact=true'
		);
		expect(links[3].href).toBe(
			'/attribute/browse?filename=attribute.json&q=%EC%82%AC%EC%9A%A9%EC%9E%90&field=entityName&exact=true'
		);
	});

	it('관련 엔터티명이 없으면 논리 정의서 링크를 만들지 않는다', () => {
		const links = buildErdDefinitionLinks(createTableEntry({ relatedEntityName: '-' }));

		expect(links.map((link) => link.type)).toEqual(['table', 'column']);
	});

	it('테이블영문명이 없으면 컬럼 정의서 링크를 만들지 않는다', () => {
		const links = buildErdDefinitionLinks(
			createTableEntry({ tableEnglishName: '', relatedEntityName: '' })
		);

		expect(links.map((link) => link.type)).toEqual(['table']);
		expect(links[0].href).toBe('/table/browse?target=table-1&open=detail');
	});

	it('노드 제목은 한글명, 부제목은 스키마와 영문명으로 표시한다', () => {
		const table = createTableEntry();

		expect(getErdTableDisplayName(table)).toBe('사용자');
		expect(getErdTableDisplayDetail(table)).toBe('PUBLIC · TB_USER');
		expect(getErdTableDisplayName(createTableEntry({ tableKoreanName: '' }))).toBe('TB_USER');
	});
});
