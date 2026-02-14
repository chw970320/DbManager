import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { TermData } from '$lib/types/term';
import type { VocabularyData } from '$lib/types/vocabulary';
import type { DomainData } from '$lib/types/domain';

vi.mock('$lib/registry/data-registry', () => ({
	loadData: vi.fn(),
	saveData: vi.fn()
}));

vi.mock('$lib/registry/mapping-registry', () => ({
	resolveRelatedFilenames: vi.fn()
}));

import { loadData, saveData } from '$lib/registry/data-registry';
import { resolveRelatedFilenames } from '$lib/registry/mapping-registry';

const createMockTermData = (): TermData => ({
	entries: [
		{
			id: 'entry-1',
			termName: '사용자_이름',
			columnName: 'USER_NAME',
			domainName: '사용자분류_VARCHAR(50)',
			isMappedTerm: true,
			isMappedColumn: true,
			isMappedDomain: true,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'entry-2',
			termName: '관리자_이름',
			columnName: 'ADMIN_NAME',
			domainName: '사용자분류_VARCHAR(50)',
			isMappedTerm: false,
			isMappedColumn: false,
			isMappedDomain: true,
			createdAt: '2024-01-02T00:00:00.000Z',
			updatedAt: '2024-01-02T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-02T00:00:00.000Z',
	totalCount: 2,
	mapping: {
		vocabulary: 'vocabulary.json',
		domain: 'domain.json'
	}
});

const createMockVocabularyData = (): VocabularyData => ({
	entries: [
		{
			id: 'vocab-1',
			standardName: '사용자',
			abbreviation: 'USER',
			englishName: 'User',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'vocab-2',
			standardName: '이름',
			abbreviation: 'NAME',
			englishName: 'Name',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'vocab-3',
			standardName: '관리자',
			abbreviation: 'ADMIN',
			englishName: 'Admin',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 3
});

const createMockDomainData = (): DomainData => ({
	entries: [
		{
			id: 'domain-1',
			domainGroup: '공통표준도메인그룹',
			domainCategory: '사용자분류',
			standardDomainName: '사용자분류_VARCHAR(50)',
			physicalDataType: 'VARCHAR',
			dataLength: '50',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 1
});

function createMockRequestEvent(options: { body?: unknown }): RequestEvent {
	const request = {
		json: vi.fn().mockResolvedValue(options.body || {}),
		method: 'POST'
	} as unknown as Request;

	return {
		request,
		url: new URL('http://localhost/api/term/sync')
	} as RequestEvent;
}

describe('Term Sync API: /api/term/sync', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(resolveRelatedFilenames).mockResolvedValue(
			new Map([
				['vocabulary', 'vocabulary.json'],
				['domain', 'domain.json']
			])
		);
		vi.mocked(saveData).mockResolvedValue(undefined);
		vi.mocked(loadData).mockImplementation(async (type: string) => {
			if (type === 'term') return createMockTermData();
			if (type === 'vocabulary') return createMockVocabularyData();
			if (type === 'domain') return createMockDomainData();
			throw new Error('unsupported');
		});
	});

	it('매핑 동기화 성공', async () => {
		const event = createMockRequestEvent({ body: { filename: 'term.json' } });

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.total).toBe(2);
		expect(saveData).toHaveBeenCalledWith('term', expect.any(Object), 'term.json');
	});

	it('filename 파라미터 사용', async () => {
		const event = createMockRequestEvent({
			body: { filename: 'custom-term.json' }
		});

		await POST(event);

		expect(loadData).toHaveBeenCalledWith('term', 'custom-term.json');
		expect(resolveRelatedFilenames).toHaveBeenCalledWith(
			'term',
			'custom-term.json',
			expect.any(Object)
		);
	});

	it('default filename 사용', async () => {
		const event = createMockRequestEvent({ body: {} });
		await POST(event);

		expect(loadData).toHaveBeenCalledWith('term', 'term.json');
	});

	it('vocabulary 로드 에러 시 500', async () => {
		vi.mocked(loadData).mockImplementation(async (type: string) => {
			if (type === 'term') return createMockTermData();
			if (type === 'vocabulary') throw new Error('단어집 파일을 찾을 수 없습니다');
			if (type === 'domain') return createMockDomainData();
			throw new Error('unsupported');
		});

		const event = createMockRequestEvent({ body: { filename: 'term.json' } });
		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
	});

	it('domain 로드 에러 시 500', async () => {
		vi.mocked(loadData).mockImplementation(async (type: string) => {
			if (type === 'term') return createMockTermData();
			if (type === 'vocabulary') return createMockVocabularyData();
			if (type === 'domain') throw new Error('도메인 파일을 찾을 수 없습니다');
			throw new Error('unsupported');
		});

		const event = createMockRequestEvent({ body: { filename: 'term.json' } });
		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
	});

	it('save 에러 시 500', async () => {
		vi.mocked(saveData).mockRejectedValue(new Error('저장 실패'));

		const event = createMockRequestEvent({ body: { filename: 'term.json' } });
		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
	});
});
