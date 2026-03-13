import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import Page from './+page.svelte';
import { resetAllStores } from '$lib/stores/unified-store';
import { settingsStore } from '$lib/stores/settings-store';

const { mockAddToast, mockShowConfirm } = vi.hoisted(() => ({
	mockAddToast: vi.fn(),
	mockShowConfirm: vi.fn().mockResolvedValue(true)
}));

vi.mock('$lib/stores/toast-store', () => ({
	addToast: mockAddToast
}));

vi.mock('$lib/stores/confirm-store', () => ({
	showConfirm: mockShowConfirm
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;
let termDataResponses: Record<string, ReturnType<typeof createDeferredJsonResponse>>;
let relationshipResponses: Record<string, ReturnType<typeof createDeferredJsonResponse>>;

function createJsonResponse(data: unknown, ok = true) {
	return {
		ok,
		json: () => Promise.resolve(data)
	};
}

function createDeferredJsonResponse() {
	let resolveResponse: ((value: ReturnType<typeof createJsonResponse>) => void) | undefined;
	const promise = new Promise<ReturnType<typeof createJsonResponse>>((resolve) => {
		resolveResponse = resolve;
	});

	return {
		promise,
		resolve(data: unknown, ok = true) {
			resolveResponse?.(createJsonResponse(data, ok));
		}
	};
}

function createTermData(totalCount: number, totalPages: number) {
	return {
		success: true,
		data: {
			entries: [],
			pagination: {
				totalCount,
				totalPages
			},
			lastUpdated: '2026-03-13T00:00:00.000Z'
		}
	};
}

function createRelationshipSummary(termFilename: string, mappedCount: number) {
	return {
		success: true,
		data: {
			files: {
				term: termFilename,
				vocabulary: termFilename === 'term.json' ? 'vocabulary.json' : 'user-vocabulary.json',
				domain: termFilename === 'term.json' ? 'domain.json' : 'user-domain.json'
			},
			summary: {
				termTotalCount: 10,
				vocabularyTotalCount: 20,
				domainTotalCount: 30,
				termNameMappedCount: mappedCount,
				columnNameMappedCount: mappedCount + 1,
				termDomainMappedCount: mappedCount + 2,
				vocabularyDomainMappedCount: mappedCount + 3,
				missingTermPartCount: 1,
				missingColumnPartCount: 2,
				missingDomainCount: 3,
				orphanDomainCount: 4
			}
		}
	};
}

describe('Term browse page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetAllStores();
		settingsStore.set({
			showVocabularySystemFiles: false,
			showDomainSystemFiles: false,
			showTermSystemFiles: true,
			showDatabaseSystemFiles: false,
			showEntitySystemFiles: false,
			showAttributeSystemFiles: false,
			showTableSystemFiles: false,
			showColumnSystemFiles: false
		});

		termDataResponses = {
			'term.json': createDeferredJsonResponse(),
			'user-term.json': createDeferredJsonResponse()
		};
		relationshipResponses = {
			'term.json': createDeferredJsonResponse(),
			'user-term.json': createDeferredJsonResponse()
		};

		mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);

			if (url === '/api/settings' && (init?.method || 'GET') === 'GET') {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: {
							showVocabularySystemFiles: false,
							showDomainSystemFiles: false,
							showTermSystemFiles: true,
							showDatabaseSystemFiles: false,
							showEntitySystemFiles: false,
							showAttributeSystemFiles: false,
							showTableSystemFiles: false,
							showColumnSystemFiles: false
						}
					})
				);
			}

			if (url === '/api/settings' && init?.method === 'POST') {
				return Promise.resolve(createJsonResponse({ success: true }));
			}

			if (url.includes('/api/term/files')) {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: ['term.json', 'user-term.json']
					})
				);
			}

			if (url.includes('/api/term/filter-options')) {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: {}
					})
				);
			}

			if (
				url.includes('/api/term/relationship-summary?') &&
				url.includes('termFilename=term.json')
			) {
				return relationshipResponses['term.json'].promise;
			}

			if (
				url.includes('/api/term/relationship-summary?') &&
				url.includes('termFilename=user-term.json')
			) {
				return relationshipResponses['user-term.json'].promise;
			}

			if (url.includes('/api/term?') && url.includes('filename=term.json')) {
				return termDataResponses['term.json'].promise;
			}

			if (url.includes('/api/term?') && url.includes('filename=user-term.json')) {
				return termDataResponses['user-term.json'].promise;
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

	it('shows loading feedback while file changes refresh the sidebar summary and relationship diagnostics', async () => {
		render(Page);

		const summaryRegion = screen.getByRole('region', { name: '용어 검색 결과 요약' });
		const fileButtons = await screen.findAllByRole('button', { name: /term\.json/ });
		const initialButton =
			fileButtons.find((button) => button.className.includes('bg-blue-50')) ?? fileButtons[0];
		const initialFilename = initialButton.textContent?.trim() ?? 'term.json';
		const targetFilename = initialFilename === 'term.json' ? 'user-term.json' : 'term.json';

		await waitFor(() => {
			expect(summaryRegion).toHaveAttribute('aria-busy', 'true');
		});

		termDataResponses[initialFilename].resolve(createTermData(2, 1));
		relationshipResponses[initialFilename].resolve(createRelationshipSummary(initialFilename, 2));

		await waitFor(() => {
			expect(within(summaryRegion).getByText('2')).toBeInTheDocument();
		});

		await fireEvent.click(screen.getByRole('button', { name: targetFilename }));

		await waitFor(() => {
			expect(summaryRegion).toHaveAttribute('aria-busy', 'true');
		});

		termDataResponses[targetFilename].resolve(createTermData(5, 3));

		await waitFor(() => {
			expect(screen.getByText('용어계 관계 진단을 갱신하는 중입니다.')).toBeInTheDocument();
		});

		relationshipResponses[targetFilename].resolve(createRelationshipSummary(targetFilename, 9));

		await waitFor(() => {
			expect(summaryRegion).toHaveAttribute('aria-busy', 'false');
			expect(within(summaryRegion).getByText('5')).toBeInTheDocument();
			expect(within(summaryRegion).getByText('1 / 3')).toBeInTheDocument();
			expect(screen.getByText('용어계 관계 진단 요약').closest('section')).toHaveTextContent(
				`term: ${targetFilename}, vocabulary: ${
					targetFilename === 'term.json' ? 'vocabulary.json' : 'user-vocabulary.json'
				}, domain: ${targetFilename === 'term.json' ? 'domain.json' : 'user-domain.json'}`
			);
			expect(screen.getByText('용어계 관계 진단 요약').closest('section')).toHaveTextContent('9');
		});
	});
});
