import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import Page from './+page.svelte';
import { resetAllStores } from '$lib/stores/unified-store';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createJsonResponse(data: unknown, ok = true) {
	return {
		ok,
		json: () => Promise.resolve(data)
	};
}

describe('Vocabulary browse page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetAllStores();

		mockFetch.mockImplementation((input: RequestInfo | URL) => {
			const url = String(input);

			if (url.includes('/api/vocabulary/files')) {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: ['vocabulary.json', 'user-vocabulary.json']
					})
				);
			}

			if (url.includes('/api/vocabulary/filter-options')) {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: {}
					})
				);
			}

			if (url.includes('/api/vocabulary?')) {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: {
							entries: [],
							pagination: {
								totalCount: 23,
								totalPages: 2
							}
						}
					})
				);
			}

			return Promise.resolve(
				createJsonResponse(
					{
						success: false,
						error: `unexpected request: ${url}`
					},
					false
				)
			);
		});
	});

	it('should render the result summary inside the left sidebar and keep it desktop-only', async () => {
		render(Page);

		await waitFor(() => {
			expect(
				mockFetch.mock.calls.some(([input]) => String(input).includes('/api/vocabulary?'))
			).toBe(true);
		});

		const summaryRegion = screen.getByRole('region', { name: '단어집 검색 결과 요약' });
		expect(summaryRegion.closest('aside')).not.toBeNull();
		expect(summaryRegion).toHaveClass('hidden');
		expect(summaryRegion).toHaveClass('lg:block');
		expect(within(summaryRegion).getByText('23')).toBeInTheDocument();
		expect(within(summaryRegion).getByText('1 / 2')).toBeInTheDocument();
		expect(within(summaryRegion).getByText('전체')).toBeInTheDocument();
	});
});
