import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/registry/data-registry', () => ({
	loadVocabularyData: vi.fn(),
	loadForbiddenWords: vi.fn()
}));

import { loadVocabularyData, loadForbiddenWords } from '$lib/registry/data-registry';

function createEvent(searchParams?: Record<string, string>): RequestEvent {
	const url = new URL('http://localhost/api/vocabulary/validate-all');
	if (searchParams) {
		for (const [key, value] of Object.entries(searchParams)) {
			url.searchParams.set(key, value);
		}
	}
	return { url } as RequestEvent;
}

describe('API: /api/vocabulary/validate-all', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadVocabularyData).mockResolvedValue({
			entries: [
				{
					id: 'v1',
					standardName: '사용자',
					abbreviation: 'USER',
					englishName: 'User',
					createdAt: '',
					updatedAt: ''
				},
				{
					id: 'v2',
					standardName: '관리자',
					abbreviation: 'USER',
					englishName: 'Admin',
					createdAt: '',
					updatedAt: ''
				}
			],
			lastUpdated: '',
			totalCount: 2
		});
		vi.mocked(loadForbiddenWords).mockResolvedValue([
			{ type: 'standardName', keyword: '금지' }
		]);
	});

	it('should return validation summary', async () => {
		const response = await GET(createEvent({ filename: 'vocabulary.json' }));
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.totalCount).toBe(2);
		expect(result.data.failedCount).toBe(2);
		expect(result.data.failedEntries[0].errors.length).toBeGreaterThan(0);
	});

	it('should return 500 on error', async () => {
		vi.mocked(loadVocabularyData).mockRejectedValue(new Error('failed'));

		const response = await GET(createEvent());
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
	});
});
