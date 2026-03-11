import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import DomainDataTypeMappingModal from './DomainDataTypeMappingModal.svelte';

const { mockShowConfirm, mockAddToast } = vi.hoisted(() => ({
	mockShowConfirm: vi.fn(),
	mockAddToast: vi.fn()
}));

vi.mock('$lib/stores/confirm-store', () => ({
	showConfirm: mockShowConfirm
}));

vi.mock('$lib/stores/toast-store', () => ({
	addToast: mockAddToast
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const baseEntries = [
	{
		id: 'map-1',
		dataType: 'VARCHAR',
		abbreviation: 'V',
		createdAt: '2026-03-11T00:00:00.000Z',
		updatedAt: '2026-03-11T00:00:00.000Z'
	}
];

const syncSummary = {
	domainFilesUpdated: 1,
	domainsUpdated: 2,
	termFilesUpdated: 1,
	termsUpdated: 2,
	columnFilesUpdated: 1,
	columnsUpdated: 1
};

describe('DomainDataTypeMappingModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockShowConfirm.mockResolvedValue(true);
		mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method || 'GET';

			if (url.includes('/api/domain/type-mappings') && method === 'GET') {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							success: true,
							data: {
								entries: baseEntries,
								lastUpdated: '2026-03-11T00:00:00.000Z',
								totalCount: 1
							}
						})
				});
			}

			if (url.includes('/api/domain/type-mappings') && method === 'POST') {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							success: true,
							data: {
								entry: {
									id: 'map-2',
									dataType: 'TIMESTAMP',
									abbreviation: 'TS',
									createdAt: '2026-03-11T00:00:00.000Z',
									updatedAt: '2026-03-11T00:00:00.000Z'
								},
								data: {
									entries: [
										...baseEntries,
										{
											id: 'map-2',
											dataType: 'TIMESTAMP',
											abbreviation: 'TS',
											createdAt: '2026-03-11T00:00:00.000Z',
											updatedAt: '2026-03-11T00:00:00.000Z'
										}
									],
									lastUpdated: '2026-03-11T00:00:00.000Z',
									totalCount: 2
								},
								sync: syncSummary
							}
						})
				});
			}

			if (url.includes('/api/domain/type-mappings') && method === 'PUT') {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							success: true,
							data: {
								entry: {
									id: 'map-1',
									dataType: 'VARCHAR',
									abbreviation: 'VC',
									createdAt: '2026-03-11T00:00:00.000Z',
									updatedAt: '2026-03-11T00:00:00.000Z'
								},
								data: {
									entries: [
										{
											id: 'map-1',
											dataType: 'VARCHAR',
											abbreviation: 'VC',
											createdAt: '2026-03-11T00:00:00.000Z',
											updatedAt: '2026-03-11T00:00:00.000Z'
										}
									],
									lastUpdated: '2026-03-11T00:00:00.000Z',
									totalCount: 1
								},
								sync: syncSummary
							}
						})
				});
			}

			if (url.includes('/api/domain/type-mappings') && method === 'DELETE') {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							success: true,
							data: {
								data: {
									entries: [],
									lastUpdated: '2026-03-11T00:00:00.000Z',
									totalCount: 0
								},
								sync: syncSummary
							}
						})
				});
			}

			return Promise.resolve({
				ok: false,
				json: () => Promise.resolve({ success: false, error: 'unexpected request' })
			});
		});
	});

	it('should load and render mapping rows when opened', async () => {
		render(DomainDataTypeMappingModal, {
			props: {
				isOpen: true
			}
		});

		await waitFor(() => {
			expect(screen.getByText('VARCHAR')).toBeInTheDocument();
		});

		expect(screen.getByText('V')).toBeInTheDocument();
	});

	it('should create a new mapping and emit change event', async () => {
		render(DomainDataTypeMappingModal, {
			props: {
				isOpen: true
			}
		});

		await waitFor(() => {
			expect(screen.getByText('VARCHAR')).toBeInTheDocument();
		});

		await fireEvent.input(screen.getByRole('textbox', { name: /^데이터타입/ }), {
			target: { value: 'TIMESTAMP' }
		});
		await fireEvent.input(screen.getByRole('textbox', { name: /^매핑약어/ }), {
			target: { value: 'TS' }
		});
		await fireEvent.click(screen.getByRole('button', { name: /^등록$/ }));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/domain/type-mappings',
				expect.objectContaining({
					method: 'POST'
				})
			);
		});

		expect(mockAddToast).toHaveBeenCalled();
		expect(screen.getByText('TIMESTAMP')).toBeInTheDocument();
	});

	it('should switch to edit mode and submit update', async () => {
		render(DomainDataTypeMappingModal, {
			props: {
				isOpen: true
			}
		});

		await waitFor(() => {
			expect(screen.getByText('VARCHAR')).toBeInTheDocument();
		});

		await fireEvent.click(screen.getByRole('button', { name: /VARCHAR 매핑 수정/ }));

		const abbreviationInput = screen.getByRole('textbox', {
			name: /^매핑약어/
		}) as HTMLInputElement;
		expect(abbreviationInput.value).toBe('V');

		await fireEvent.input(abbreviationInput, {
			target: { value: 'VC' }
		});
		await fireEvent.click(screen.getByRole('button', { name: /수정 저장/ }));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/domain/type-mappings',
				expect.objectContaining({
					method: 'PUT'
				})
			);
		});
	});

	it('should confirm and delete mapping', async () => {
		render(DomainDataTypeMappingModal, {
			props: {
				isOpen: true
			}
		});

		await waitFor(() => {
			expect(screen.getByText('VARCHAR')).toBeInTheDocument();
		});

		await fireEvent.click(screen.getByRole('button', { name: /VARCHAR 매핑 삭제/ }));

		expect(mockShowConfirm).toHaveBeenCalled();

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/domain/type-mappings',
				expect.objectContaining({
					method: 'DELETE'
				})
			);
		});
	});
});
