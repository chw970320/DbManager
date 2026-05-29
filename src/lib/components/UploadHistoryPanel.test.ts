import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import UploadHistoryPanel from './UploadHistoryPanel.svelte';

const { mockShowConfirm } = vi.hoisted(() => ({
	mockShowConfirm: vi.fn()
}));

vi.mock('$lib/stores/confirm-store', () => ({
	showConfirm: mockShowConfirm
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const historyEntry = {
	id: 'history-1',
	dataType: 'term',
	filename: 'term.json',
	createdAt: '2026-05-29T03:00:00.000Z',
	expiresAt: '2026-06-28T03:00:00.000Z',
	entryCount: 7
};

function createJsonResponse(data: unknown, ok = true) {
	return {
		ok,
		json: () => Promise.resolve(data)
	};
}

describe('UploadHistoryPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockShowConfirm.mockResolvedValue(true);
	});

	it('loads upload history with accessible recovery context', async () => {
		mockFetch.mockResolvedValueOnce(
			createJsonResponse({
				success: true,
				data: {
					entries: [historyEntry]
				}
			})
		);

		render(UploadHistoryPanel, {
			props: {
				dataType: 'term',
				filename: 'term.json'
			}
		});

		const region = screen.getByRole('region', { name: '파일 교체 이력' });
		expect(region).toHaveTextContent('term.json 업로드 교체 직전 JSON 본문');

		await waitFor(() => {
			expect(screen.getByRole('list', { name: 'term.json 업로드 교체 이력' })).toBeInTheDocument();
		});

		expect(within(region).getByText(/항목 수: 7/)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /이력 복원/ })).toBeInTheDocument();
		expect(mockFetch).toHaveBeenCalledWith('/api/upload-history?dataType=term&filename=term.json');
	});

	it('confirms restore with file context and emits restored entry after success', async () => {
		const onrestored = vi.fn();
		mockFetch
			.mockResolvedValueOnce(
				createJsonResponse({
					success: true,
					data: {
						entries: [historyEntry]
					}
				})
			)
			.mockResolvedValueOnce(
				createJsonResponse({
					success: true,
					data: {
						entry: historyEntry
					}
				})
			)
			.mockResolvedValueOnce(
				createJsonResponse({
					success: true,
					data: {
						entries: [historyEntry]
					}
				})
			);

		render(UploadHistoryPanel, {
			props: {
				dataType: 'term',
				filename: 'term.json',
				onrestored
			}
		});

		await fireEvent.click(await screen.findByRole('button', { name: /이력 복원/ }));

		expect(mockShowConfirm).toHaveBeenCalledWith(
			expect.objectContaining({
				title: '이력 복원',
				message: expect.stringContaining('term.json 파일을'),
				confirmText: '복원',
				variant: 'danger'
			})
		);

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/upload-history/restore',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({
						dataType: 'term',
						id: 'history-1'
					})
				})
			);
		});

		expect(onrestored).toHaveBeenCalledWith(expect.objectContaining({ entry: historyEntry }));
	});

	it('exposes empty and error states without hiding recovery status', async () => {
		mockFetch.mockResolvedValueOnce(
			createJsonResponse({
				success: true,
				data: {
					entries: []
				}
			})
		);

		const { unmount } = render(UploadHistoryPanel, {
			props: {
				dataType: 'term',
				filename: 'term.json'
			}
		});

		await waitFor(() => {
			expect(screen.getByText('저장된 업로드 교체 이력이 없습니다.')).toBeInTheDocument();
		});

		unmount();

		mockFetch.mockResolvedValueOnce(
			createJsonResponse(
				{
					success: false,
					error: '이력 파일을 읽을 수 없습니다.'
				},
				false
			)
		);

		render(UploadHistoryPanel, {
			props: {
				dataType: 'term',
				filename: 'term.json'
			}
		});

		await waitFor(() => {
			expect(screen.getByRole('alert')).toHaveTextContent(
				'파일 교체 이력 오류: 이력 파일을 읽을 수 없습니다.'
			);
		});
	});
});
