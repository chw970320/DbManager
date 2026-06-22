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
		window.history.pushState({}, '', '/browse');

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

			if (url.includes('/api/search?')) {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: {
							entries: [
								{
									id: 'vocabulary-1',
									standardName: '휴일',
									abbreviation: 'HLDY',
									englishName: 'Holiday',
									domainCategory: '일자',
									isFormalWord: true,
									createdAt: '2026-06-22T00:00:00.000Z',
									updatedAt: '2026-06-22T00:00:00.000Z'
								}
							],
							pagination: {
								totalResults: 1,
								totalPages: 1
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

	it('opens the target entry editor when assistant deep link includes target detail intent', async () => {
		window.history.pushState(
			{},
			'',
			'/browse?filename=vocabulary.json&q=%ED%9C%B4%EC%9D%BC&field=all&exact=false&target=vocabulary-1&open=detail'
		);

		render(Page);

		expect(await screen.findByRole('heading', { name: '단어 수정' })).toBeInTheDocument();
		const editorDialog = screen.getByRole('dialog');
		expect(within(editorDialog).getByLabelText(/표준단어명/)).toHaveValue('휴일');
		expect(
			mockFetch.mock.calls.some(
				([input]) =>
					String(input).includes('/api/search?') && String(input).includes('target') === false
			)
		).toBe(true);
	});
});
