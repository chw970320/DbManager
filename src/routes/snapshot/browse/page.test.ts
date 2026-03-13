import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import Page from './+page.svelte';

const { mockAddToast, mockShowConfirm } = vi.hoisted(() => ({
	mockAddToast: vi.fn(),
	mockShowConfirm: vi.fn()
}));

vi.mock('$lib/stores/toast-store', () => ({
	addToast: mockAddToast
}));

vi.mock('$lib/stores/confirm-store', () => ({
	showConfirm: mockShowConfirm
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createJsonResponse(data: unknown, ok = true) {
	return {
		ok,
		json: () => Promise.resolve(data)
	};
}

const mockBundle = {
	id: 'bundle-1',
	files: {
		vocabulary: 'vocabulary.json',
		domain: 'domain.json',
		term: 'term.json',
		database: 'database.json',
		entity: 'entity.json',
		attribute: 'attribute.json',
		table: 'table.json',
		column: 'column.json'
	},
	createdAt: '2026-03-13T01:00:00.000Z',
	updatedAt: '2026-03-13T01:00:00.000Z'
};

const mockSnapshot = {
	id: 'snapshot-1',
	name: '기준 스냅샷',
	description: '복원 테스트용',
	bundle: mockBundle.files,
	counts: {
		vocabulary: 1,
		domain: 1,
		term: 1,
		database: 1,
		entity: 1,
		attribute: 1,
		table: 1,
		column: 1
	},
	createdAt: '2026-03-13T01:00:00.000Z',
	updatedAt: '2026-03-13T01:00:00.000Z'
};

describe('Snapshot browse page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockShowConfirm.mockResolvedValue(true);
		mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method || 'GET';

			if (url === '/api/design-snapshots' && method === 'GET') {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: {
							snapshots: [mockSnapshot],
							bundles: [mockBundle]
						}
					})
				);
			}

			if (url === '/api/design-snapshots' && method === 'POST') {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: {
							entry: {
								...mockSnapshot,
								id: 'snapshot-2',
								name: '표준 보정 전'
							}
						}
					})
				);
			}

			if (url === '/api/design-snapshots/restore' && method === 'POST') {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: {
							entry: {
								...mockSnapshot,
								restoredAt: '2026-03-13T02:00:00.000Z'
							}
						}
					})
				);
			}

			return Promise.resolve(
				createJsonResponse(
					{
						success: false,
						error: `unexpected request: ${method} ${url}`
					},
					false
				)
			);
		});
	});

	it('should load the saved snapshots and restore one from the list', async () => {
		render(Page);

		await waitFor(() => {
			expect(screen.getByText('기준 스냅샷')).toBeInTheDocument();
		});

		const row = screen.getByRole('row', { name: /기준 스냅샷/ });
		await fireEvent.click(within(row).getByRole('button', { name: /복원/ }));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/design-snapshots/restore',
				expect.objectContaining({
					method: 'POST'
				})
			);
		});

		expect(mockShowConfirm).toHaveBeenCalled();
		expect(mockAddToast).toHaveBeenCalledWith('스냅샷을 복원했습니다.', 'success');
	});

	it('should create a snapshot for the selected bundle', async () => {
		render(Page);

		await waitFor(() => {
			expect(screen.getByText('기준 스냅샷')).toBeInTheDocument();
		});

		await fireEvent.input(screen.getByLabelText(/스냅샷명/), {
			target: { value: '표준 보정 전' }
		});
		await fireEvent.input(screen.getByLabelText(/설명/), {
			target: { value: '자동 보정 실행 전 상태' }
		});

		await fireEvent.click(screen.getAllByRole('button', { name: '스냅샷 저장' })[0]);

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/design-snapshots',
				expect.objectContaining({
					method: 'POST'
				})
			);
		});

		expect(screen.getByText('표준 보정 전')).toBeInTheDocument();
		expect(mockAddToast).toHaveBeenCalledWith('스냅샷을 저장했습니다.', 'success');
	});

	it('should render the summary in the left sidebar and not expose a mobile sidebar toggle', async () => {
		render(Page);

		await waitFor(() => {
			expect(screen.getByText('기준 스냅샷')).toBeInTheDocument();
		});

		const summaryRegion = screen.getByRole('region', { name: '스냅샷 요약' });
		expect(summaryRegion.closest('aside')).not.toBeNull();
		expect(summaryRegion).toHaveClass('hidden');
		expect(summaryRegion).toHaveClass('lg:block');
		expect(within(summaryRegion).getByText('저장된 스냅샷')).toBeInTheDocument();
		expect(within(summaryRegion).getByText('사용 가능한 번들')).toBeInTheDocument();
		expect(within(summaryRegion).getByText('최근 복원')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '사이드바 열기' })).not.toBeInTheDocument();
	});
});
