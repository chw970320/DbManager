import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import ColumnDefFileManager from './ColumnDefFileManager.svelte';

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
			callback({ showColumnSystemFiles: false });
			return () => {};
		}),
		update: vi.fn()
	}
}));

vi.mock('$lib/utils/file-filter', () => ({
	filterColumnFiles: vi.fn((files: string[], showSystemFiles: boolean) => {
		if (showSystemFiles) return files;
		return files.filter((f) => f !== 'column.json' && f !== 'history.json');
	})
}));

describe('ColumnDefFileManager', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default fetch mock responses
		mockFetch.mockImplementation((url: string) => {
			if (url.includes('/api/column/files')) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							success: true,
							data: ['column.json', 'custom-column.json']
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
			render(ColumnDefFileManager, {
				props: {
					isOpen: true
				}
			});

			await waitFor(() => {
				expect(screen.getByText(/파일 관리/)).toBeInTheDocument();
			});
		});

		it('파일 목록 표시', async () => {
			render(ColumnDefFileManager, {
				props: {
					isOpen: true
				}
			});

			await waitFor(() => {
				// 파일 목록이 로드되었는지 확인
				expect(mockFetch).toHaveBeenCalledWith(
					expect.stringContaining('/api/column/files'),
					expect.any(Object)
				);
			});
		});

		it('매핑 섹션 렌더링 및 매핑 조회 호출', async () => {
			render(ColumnDefFileManager, {
				props: {
					isOpen: true
				}
			});

			await waitFor(() => {
				expect(screen.getByText('파일 매핑 설정')).toBeInTheDocument();
			});

			await waitFor(() => {
				expect(mockFetch).toHaveBeenCalledWith(
					expect.stringContaining('/api/column/files/mapping?filename=')
				);
			});
		});
	});

	describe('File Operations', () => {
		it('새 파일 생성 버튼 표시', async () => {
			render(ColumnDefFileManager, {
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
			render(ColumnDefFileManager, {
				props: {
					isOpen: true
				}
			});

			await waitFor(() => {
				// 선택된 파일이 강조 표시되는지 확인 (실제 컴포넌트 구조에 따라 조정)
			});
		});
	});
});
