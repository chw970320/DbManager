import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import Page from './+page.svelte';

const { mockAddToast } = vi.hoisted(() => ({
	mockAddToast: vi.fn()
}));

vi.mock('$lib/stores/toast-store', () => ({
	addToast: mockAddToast
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createJsonResponse(data: unknown, ok = true) {
	return {
		ok,
		json: () => Promise.resolve(data)
	};
}

const baseEntry = {
	id: 'source-1',
	name: '운영 PostgreSQL',
	type: 'postgresql' as const,
	description: '운영 메타데이터 저장소',
	config: {
		host: 'db.internal',
		port: 5432,
		database: 'metadata',
		schema: 'public',
		username: 'dbadmin',
		ssl: false,
		connectionTimeoutSeconds: 5,
		hasPassword: true
	},
	createdAt: '2026-03-12T00:00:00.000Z',
	updatedAt: '2026-03-12T00:00:00.000Z'
};

describe('Data source browse page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method || 'GET';

			if (url === '/api/data-sources' && method === 'GET') {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: [baseEntry]
					})
				);
			}

			if (url === '/api/data-sources/test' && method === 'POST') {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: {
							success: true,
							message: '연결에 성공했습니다.',
							details: {
								database: 'metadata',
								schema: 'public',
								serverVersion: 'PostgreSQL 16.2'
							},
							latencyMs: 11,
							testedAt: '2026-03-12T00:00:00.000Z'
						}
					})
				);
			}

			if (url === '/api/data-sources' && method === 'POST') {
				return Promise.resolve(
					createJsonResponse(
						{
							success: true,
							data: {
								entry: {
									id: 'source-2',
									name: '개발 PostgreSQL',
									type: 'postgresql',
									description: '개발 메타데이터 저장소',
									config: {
										host: 'localhost',
										port: 5432,
										database: 'dev_metadata',
										schema: 'public',
										username: 'postgres',
										ssl: false,
										connectionTimeoutSeconds: 5,
										hasPassword: true
									},
									createdAt: '2026-03-12T00:00:00.000Z',
									updatedAt: '2026-03-12T00:00:00.000Z'
								}
							}
						},
						true
					)
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

	it('should load the saved data sources and run a connection test from the list', async () => {
		render(Page);

		await waitFor(() => {
			expect(screen.getByText('운영 PostgreSQL')).toBeInTheDocument();
		});

		const row = screen.getByRole('row', { name: /운영 PostgreSQL/ });
		await fireEvent.click(within(row).getByRole('button', { name: /연결 테스트/ }));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/data-sources/test',
				expect.objectContaining({
					method: 'POST'
				})
			);
		});

		expect(screen.getByText('연결에 성공했습니다.')).toBeInTheDocument();
		expect(screen.getByText(/PostgreSQL 16.2/)).toBeInTheDocument();
	});

	it('should allow direct connection test and creation from the editor modal', async () => {
		render(Page);

		await waitFor(() => {
			expect(screen.getByText('운영 PostgreSQL')).toBeInTheDocument();
		});

		await fireEvent.click(screen.getByRole('button', { name: '새 데이터 소스 추가' }));

		await fireEvent.input(screen.getByLabelText(/연결 이름/), {
			target: { value: '개발 PostgreSQL' }
		});
		await fireEvent.input(screen.getByLabelText(/호스트/), {
			target: { value: 'localhost' }
		});
		await fireEvent.input(screen.getByLabelText(/^데이터베이스$/), {
			target: { value: 'dev_metadata' }
		});
		await fireEvent.input(screen.getByLabelText(/사용자명/), {
			target: { value: 'postgres' }
		});
		await fireEvent.input(screen.getByLabelText(/비밀번호/), {
			target: { value: 'secret' }
		});

		await fireEvent.click(screen.getByRole('button', { name: '연결 테스트 실행' }));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/data-sources/test',
				expect.objectContaining({
					method: 'POST'
				})
			);
		});

		await fireEvent.click(screen.getByRole('button', { name: /^저장$/ }));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/data-sources',
				expect.objectContaining({
					method: 'POST'
				})
			);
		});

		expect(screen.getByText('개발 PostgreSQL')).toBeInTheDocument();
	});

	it('should render breadcrumb navigation and expose sibling pages from the group crumb', async () => {
		render(Page);

		await waitFor(() => {
			expect(screen.getByText('운영 PostgreSQL')).toBeInTheDocument();
		});

		await fireEvent.click(screen.getByLabelText('운영 · 품질 메뉴 열기'));

		expect(screen.getByRole('link', { name: '품질 규칙' })).toHaveAttribute(
			'href',
			'/quality-rule/browse'
		);
		expect(screen.getByRole('link', { name: '프로파일링' })).toHaveAttribute(
			'href',
			'/profiling/browse'
		);
		expect(screen.getByRole('link', { name: '스냅샷' })).toHaveAttribute(
			'href',
			'/snapshot/browse'
		);
	});
});
