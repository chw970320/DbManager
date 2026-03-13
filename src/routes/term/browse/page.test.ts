import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import Page from './+page.svelte';
import { resetAllStores, termDataStore } from '$lib/stores/unified-store';
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
let initialTermData: ReturnType<typeof createDeferredJsonResponse>;
let initialRelationshipSummary: ReturnType<typeof createDeferredJsonResponse>;
let delayedTermData: ReturnType<typeof createDeferredJsonResponse>;
let delayedRelationshipSummary: ReturnType<typeof createDeferredJsonResponse>;

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
		termDataStore.set({ selectedFilename: 'term.json' });
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

		initialTermData = createDeferredJsonResponse();
		initialRelationshipSummary = createDeferredJsonResponse();
		delayedTermData = createDeferredJsonResponse();
		delayedRelationshipSummary = createDeferredJsonResponse();

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
				return initialRelationshipSummary.promise;
			}

			if (
				url.includes('/api/term/relationship-summary?') &&
				url.includes('termFilename=user-term.json')
			) {
				return delayedRelationshipSummary.promise;
			}

			if (url.includes('/api/term?') && url.includes('filename=term.json')) {
				return initialTermData.promise;
			}

			if (url.includes('/api/term?') && url.includes('filename=user-term.json')) {
				return delayedTermData.promise;
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
		await waitFor(() => {
			expect(summaryRegion).toHaveAttribute('aria-busy', 'true');
		});

		initialTermData.resolve(createTermData(2, 1));
		initialRelationshipSummary.resolve(createRelationshipSummary('term.json', 2));

		await waitFor(() => {
			expect(summaryRegion).toHaveAttribute('aria-busy', 'false');
			expect(within(summaryRegion).getByText('2')).toBeInTheDocument();
		});

		await fireEvent.click(screen.getByRole('button', { name: 'user-term.json' }));

		await waitFor(() => {
			expect(summaryRegion).toHaveAttribute('aria-busy', 'true');
		});

		delayedTermData.resolve(createTermData(5, 3));

		await waitFor(() => {
			expect(screen.getByText('용어계 관계 진단을 갱신하는 중입니다.')).toBeInTheDocument();
		});

		delayedRelationshipSummary.resolve(createRelationshipSummary('user-term.json', 9));

		await waitFor(() => {
			expect(summaryRegion).toHaveAttribute('aria-busy', 'false');
			expect(within(summaryRegion).getByText('5')).toBeInTheDocument();
			expect(within(summaryRegion).getByText('1 / 3')).toBeInTheDocument();
			expect(screen.getByText('용어계 관계 진단 요약').closest('section')).toHaveTextContent(
				'term: user-term.json, vocabulary: user-vocabulary.json, domain: user-domain.json'
			);
			expect(screen.getByText('용어계 관계 진단 요약').closest('section')).toHaveTextContent('9');
		});
	});
});
