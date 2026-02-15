import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/registry/data-registry', () => ({
	loadData: vi.fn()
}));

vi.mock('$lib/registry/mapping-registry', () => ({
	resolveRelatedFilenames: vi.fn()
}));

import { loadData } from '$lib/registry/data-registry';
import { resolveRelatedFilenames } from '$lib/registry/mapping-registry';

function createEvent(searchParams?: Record<string, string>): RequestEvent {
	const url = new URL('http://localhost/api/term/relationship-summary');
	if (searchParams) {
		for (const [key, value] of Object.entries(searchParams)) {
			url.searchParams.set(key, value);
		}
	}
	return { url } as RequestEvent;
}

describe('API: /api/term/relationship-summary', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(resolveRelatedFilenames).mockResolvedValue(
			new Map([
				['vocabulary', 'vocabulary.json'],
				['domain', 'domain.json']
			])
		);
		vi.mocked(loadData).mockImplementation((async (type: string) => {
			if (type === 'term') {
				return {
					entries: [
						{ id: 't1', termName: '사용자_이름', columnName: 'USER_NAME', domainName: 'USER_NAME_DOM' },
						{ id: 't2', termName: '없는_이름', columnName: 'NOPE_NAME', domainName: 'MISSING_DOM' }
					],
					lastUpdated: '',
					totalCount: 2
				};
			}
			if (type === 'vocabulary') {
				return {
					entries: [
						{ id: 'v1', standardName: '사용자', abbreviation: 'USER', domainCategory: '회원' },
						{ id: 'v2', standardName: '이름', abbreviation: 'NAME', domainCategory: '회원' }
					],
					lastUpdated: '',
					totalCount: 2
				};
			}
			if (type === 'domain') {
				return {
					entries: [
						{ id: 'd1', domainCategory: '회원', standardDomainName: 'USER_NAME_DOM' },
						{ id: 'd2', domainCategory: '회원', standardDomainName: 'UNUSED_DOM' }
					],
					lastUpdated: '',
					totalCount: 2
				};
			}
			throw new Error('unsupported');
		}) as never);
	});

	it('should return summary and samples', async () => {
		const response = await GET(createEvent({ termFilename: 'term.json' }));
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.summary.termTotalCount).toBe(2);
		expect(result.data.summary.missingDomainCount).toBe(1);
		expect(Array.isArray(result.data.samples.missingTermParts)).toBe(true);
	});

	it('should return 500 on error', async () => {
		vi.mocked(loadData).mockRejectedValue(new Error('failed'));
		const response = await GET(createEvent());
		const result = await response.json();
		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
	});
});
