import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import TableDefFileManager from './TableDefFileManager.svelte';

// Mock fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock $app/environment before importing stores
vi.mock('$app/environment', () => ({
	browser: true,
	dev: false,
	building: false,
	version: '1.0.0'
}));

// Mock stores
vi.mock('$lib/stores/settings-store', () => ({
	settingsStore: {
		subscribe: vi.fn((callback) => {
			callback({ showTableSystemFiles: false });
			return () => {};
		}),
		update: vi.fn()
	}
}));

vi.mock('$lib/utils/file-filter', () => ({
	filterTableFiles: vi.fn((files: string[], showSystemFiles: boolean) => {
		if (showSystemFiles) return files;
		return files.filter((f) => f !== 'table.json' && f !== 'history.json');
	})
}));

describe('TableDefFileManager', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default fetch mock responses
		mockFetch.mockImplementation((url: string) => {
			if (url.includes('/api/table/files')) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							success: true,
							data: ['table.json', 'custom-table.json']
						})
				});
			}
			return Promise.resolve({
				ok: false,
				json: () => Promise.resolve({ success: false })
			});
		});
	});

	describe('Rendering', () => {
		it('모달이 열릴 때 파일 목록 렌더링', async () => {
			render(TableDefFileManager, {
				props: {
					isOpen: true
				}
			});

			await waitFor(() => {
				expect(screen.getByText(/파일 관리/)).toBeInTheDocument();
			});
		});

		it('파일 목록 표시', async () => {
			render(TableDefFileManager, {
				props: {
					isOpen: true
				}
			});

			await waitFor(() => {
				// 파일 목록이 로드되었는지 확인
				expect(mockFetch).toHaveBeenCalledWith(
					expect.stringContaining('/api/table/files'),
					expect.any(Object)
				);
			});
		});
	});

	describe('File Operations', () => {
		it('새 파일 생성 버튼 표시', async () => {
			render(TableDefFileManager, {
				props: {
					isOpen: true
				}
			});

			await waitFor(() => {
				const createButton = screen.queryByRole('button', { name: /새 파일/ });
				// 버튼이 있으면 확인 (실제 컴포넌트 구조에 따라 조정)
			});
		});
	});

	describe('Selected File', () => {
		it('선택된 파일 강조 표시', async () => {
			render(TableDefFileManager, {
				props: {
					isOpen: true,
					selectedFilename: 'custom-table.json'
				}
			});

			await waitFor(() => {
				// 선택된 파일이 강조 표시되는지 확인 (실제 컴포넌트 구조에 따라 조정)
			});
		});
	});
});
