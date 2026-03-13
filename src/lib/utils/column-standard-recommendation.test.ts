import { describe, expect, it } from 'vitest';
import type { ColumnEntry } from '$lib/types/database-design.js';
import type { DomainEntry } from '$lib/types/domain.js';
import type { TermEntry } from '$lib/types/term.js';
import {
	buildColumnStandardRecommendationMaps,
	createColumnStandardRecommendation
} from './column-standard-recommendation.js';

const termEntries: TermEntry[] = [
	{
		id: 'term-1',
		termName: '사용자명',
		columnName: 'USER_NAME',
		domainName: 'USER_NAME_DOM',
		isMappedTerm: true,
		isMappedColumn: true,
		isMappedDomain: true,
		createdAt: '2026-03-13T00:00:00.000Z',
		updatedAt: '2026-03-13T00:00:00.000Z'
	},
	{
		id: 'term-2',
		termName: '주문상태',
		columnName: 'ORDER_STATUS',
		domainName: '',
		isMappedTerm: true,
		isMappedColumn: true,
		isMappedDomain: false,
		createdAt: '2026-03-13T00:00:00.000Z',
		updatedAt: '2026-03-13T00:00:00.000Z'
	}
];

const domainEntries: DomainEntry[] = [
	{
		id: 'domain-1',
		domainGroup: '공통',
		domainCategory: '사용자명',
		standardDomainName: 'USER_NAME_DOM',
		physicalDataType: 'VARCHAR',
		dataLength: '200',
		decimalPlaces: '0',
		createdAt: '2026-03-13T00:00:00.000Z',
		updatedAt: '2026-03-13T00:00:00.000Z'
	}
];

const maps = buildColumnStandardRecommendationMaps(termEntries, domainEntries);

function createColumnEntry(overrides: Partial<ColumnEntry> = {}): Partial<ColumnEntry> {
	return {
		id: 'column-1',
		columnEnglishName: 'USER_NAME',
		columnKoreanName: '이름',
		domainName: 'LEGACY_DOM',
		dataType: 'CHAR',
		dataLength: '50',
		dataDecimalLength: '0',
		...overrides
	};
}

describe('column-standard-recommendation', () => {
	it('컬럼영문명이 비어 있으면 미매핑 상태를 반환한다', () => {
		const recommendation = createColumnStandardRecommendation(
			createColumnEntry({ columnEnglishName: '' }),
			maps
		);

		expect(recommendation.summary.status).toBe('unmatched');
		expect(recommendation.issues[0]?.code).toBe('COLUMN_NAME_EMPTY');
	});

	it('용어와 도메인이 모두 매핑되면 추천 변경값을 계산한다', () => {
		const recommendation = createColumnStandardRecommendation(createColumnEntry(), maps);

		expect(recommendation.summary.status).toBe('recommended');
		expect(recommendation.matchedTerm?.termName).toBe('사용자명');
		expect(recommendation.matchedDomain?.standardDomainName).toBe('USER_NAME_DOM');
		expect(recommendation.changes.map((change) => change.field)).toEqual([
			'columnKoreanName',
			'domainName',
			'dataType',
			'dataLength'
		]);
	});

	it('이미 정렬된 값이면 aligned 상태를 반환한다', () => {
		const recommendation = createColumnStandardRecommendation(
			createColumnEntry({
				columnKoreanName: '사용자명',
				domainName: 'USER_NAME_DOM',
				dataType: 'VARCHAR',
				dataLength: '200'
			}),
			maps
		);

		expect(recommendation.summary.status).toBe('aligned');
		expect(recommendation.changes).toHaveLength(0);
		expect(recommendation.issues).toHaveLength(0);
	});

	it('용어는 있지만 도메인이 비어 있으면 경고를 반환한다', () => {
		const recommendation = createColumnStandardRecommendation(
			createColumnEntry({ columnEnglishName: 'ORDER_STATUS' }),
			maps
		);

		expect(recommendation.summary.status).toBe('recommended');
		expect(recommendation.matchedTerm?.columnName).toBe('ORDER_STATUS');
		expect(recommendation.issues[0]?.code).toBe('TERM_DOMAIN_EMPTY');
		expect(recommendation.summary.domainResolved).toBe(false);
	});

	it('일치하는 용어가 없으면 미매핑 상태를 반환한다', () => {
		const recommendation = createColumnStandardRecommendation(
			createColumnEntry({ columnEnglishName: 'UNKNOWN_COLUMN' }),
			maps
		);

		expect(recommendation.summary.status).toBe('unmatched');
		expect(recommendation.issues[0]?.code).toBe('TERM_NOT_FOUND');
		expect(recommendation.changes).toHaveLength(0);
	});
});
