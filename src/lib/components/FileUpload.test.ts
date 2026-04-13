import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FileUpload from './FileUpload.svelte';

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('$lib/stores/confirm-store', () => ({
	showConfirm: vi.fn().mockResolvedValue(true)
}));

describe('FileUpload', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({
				success: true,
				data: {
					success: true,
					message: '업로드 완료'
				}
			})
		});
	});

	it('단순 교체 모드만 노출한다', () => {
		render(FileUpload, {
			props: {
				onuploadstart: vi.fn(),
				onuploadsuccess: vi.fn(),
				onuploaderror: vi.fn(),
				onuploadcomplete: vi.fn()
			}
		});

		expect(screen.queryByText('검증 교체 모드')).not.toBeInTheDocument();
		expect(screen.queryByText('검증+동기화 교체 모드')).not.toBeInTheDocument();
		expect(screen.getByText(/단순 교체/)).toBeInTheDocument();
	});

	it('업로드 요청을 단일 교체 payload로 전송한다', async () => {
		const onuploadsuccess = vi.fn();
		render(FileUpload, {
			props: {
				apiEndpoint: '/api/term/upload',
				filename: 'term.json',
				onuploadstart: vi.fn(),
				onuploadsuccess,
				onuploaderror: vi.fn(),
				onuploadcomplete: vi.fn()
			}
		});

		const file = new File(['xlsx'], 'sample.xlsx', {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		});
		const input = document.querySelector('input[type="file"]') as HTMLInputElement;
		await fireEvent.change(input, {
			target: {
				files: [file]
			}
		});
		await fireEvent.click(screen.getByRole('button', { name: '업로드' }));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalled();
		});

		const request = mockFetch.mock.calls[0];
		const formData = request[1].body as FormData;

		expect(formData.get('replace')).toBe('true');
		expect(formData.get('validation')).toBe('false');
		expect(formData.get('postProcessMode')).toBe('none');
		expect(formData.get('filename')).toBe('term.json');
		expect(onuploadsuccess).toHaveBeenCalled();
	});
});
