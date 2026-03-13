import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { DomainData } from '$lib/types/domain.js';
import type { TermData } from '$lib/types/term.js';

vi.mock('$lib/registry/data-registry', () => ({
	loadData: vi.fn()
}));

vi.mock('$lib/registry/mapping-registry', () => ({
	resolveRelatedFilenames: vi.fn()
}));

import { loadData } from '$lib/registry/data-registry';
import { resolveRelatedFilenames } from '$lib/registry/mapping-registry';

const createMockTermData = (): TermData => ({
	entries: [
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
		}
	],
	lastUpdated: '2026-03-13T00:00:00.000Z',
	totalCount: 1
});

const createMockDomainData = (): DomainData => ({
	entries: [
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
	],
	lastUpdated: '2026-03-13T00:00:00.000Z',
	totalCount: 1
});

function createMockRequestEvent(body?: unknown): RequestEvent {
	return {
		request: {
			json: vi.fn().mockResolvedValue(body || {})
		} as unknown as Request
	} as RequestEvent;
}

describe('Column Recommend Standard API: /api/column/recommend-standard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(resolveRelatedFilenames).mockResolvedValue(
			new Map([
				['term', 'term.json'],
				['domain', 'domain.json']
			])
		);
		vi.mocked(loadData).mockImplementation(async (type: string) => {
			if (type === 'term') {
				return createMockTermData();
			}
			if (type === 'domain') {
				return createMockDomainData();
			}
			throw new Error('unsupported');
		});
	});

	it('단건 컬럼 기준 표준 추천을 반환한다', async () => {
		const response = await POST(
			createMockRequestEvent({
				columnFilename: 'column.json',
				entry: {
					columnEnglishName: 'USER_NAME',
					columnKoreanName: '이름',
					domainName: 'OLD_DOM',
					dataType: 'CHAR',
					dataLength: '50'
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.files).toEqual({
			column: 'column.json',
			term: 'term.json',
			domain: 'domain.json'
		});
		expect(result.data.summary.status).toBe('recommended');
		expect(result.data.matchedTerm.termName).toBe('사용자명');
		expect(result.data.matchedDomain.standardDomainName).toBe('USER_NAME_DOM');
		expect(result.data.changes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ field: 'columnKoreanName', recommendedValue: '사용자명' }),
				expect.objectContaining({ field: 'domainName', recommendedValue: 'USER_NAME_DOM' }),
				expect.objectContaining({ field: 'dataType', recommendedValue: 'VARCHAR' })
			])
		);
	});

	it('전달된 파일명을 우선 사용한다', async () => {
		await POST(
			createMockRequestEvent({
				columnFilename: 'custom-column.json',
				termFilename: 'custom-term.json',
				domainFilename: 'custom-domain.json',
				entry: {
					columnEnglishName: 'USER_NAME'
				}
			})
		);

		expect(loadData).toHaveBeenCalledWith('term', 'custom-term.json');
		expect(loadData).toHaveBeenCalledWith('domain', 'custom-domain.json');
	});

	it('컬럼명이 비어 있으면 미매핑 경고를 반환한다', async () => {
		const response = await POST(
			createMockRequestEvent({
				entry: {
					columnEnglishName: ''
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.data.summary.status).toBe('unmatched');
		expect(result.data.issues[0].code).toBe('COLUMN_NAME_EMPTY');
	});

	it('용어 또는 도메인 로드 실패 시 500을 반환한다', async () => {
		vi.mocked(loadData).mockRejectedValueOnce(new Error('term load failed'));

		const response = await POST(
			createMockRequestEvent({
				entry: {
					columnEnglishName: 'USER_NAME'
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
	});
});
