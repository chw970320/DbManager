import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import Page from './+page.svelte';

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

function createJsonResponse(data: unknown, ok = true) {
	return {
		ok,
		json: () => Promise.resolve(data)
	};
}

const ruleEntry = {
	id: 'rule-1',
	name: '고객 이메일 NULL 비율 5% 이하',
	description: 'email 컬럼의 NULL 비율은 5%를 넘기면 안 됩니다.',
	enabled: true,
	severity: 'warning' as const,
	scope: 'column' as const,
	metric: 'nullRatio' as const,
	operator: 'lte' as const,
	threshold: 0.05,
	target: {
		schemaPattern: 'public',
		tablePattern: 'customers',
		columnPattern: 'email'
	},
	createdAt: '2026-03-12T00:00:00.000Z',
	updatedAt: '2026-03-12T00:00:00.000Z'
};

describe('Quality rule browse page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method || 'GET';

			if (url === '/api/quality-rules' && method === 'GET') {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: {
							entries: [ruleEntry],
							lastUpdated: '2026-03-12T00:00:00.000Z',
							totalCount: 1
						}
					})
				);
			}

			if (url === '/api/quality-rules' && method === 'POST') {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: {
							entry: {
								...ruleEntry,
								id: 'rule-2',
								name: '고객 수 1건 이상'
							},
							data: {
								entries: [
									ruleEntry,
									{
										...ruleEntry,
										id: 'rule-2',
										name: '고객 수 1건 이상'
									}
								],
								lastUpdated: '2026-03-12T00:10:00.000Z',
								totalCount: 2
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

	it('should load quality rules and render summary cards', async () => {
		render(Page);

		await waitFor(() => {
			expect(screen.getByText('고객 이메일 NULL 비율 5% 이하')).toBeInTheDocument();
		});

		expect(screen.getByText('활성 규칙')).toBeInTheDocument();
		expect(screen.getByText('warning')).toBeInTheDocument();
		expect(screen.getByText('column')).toBeInTheDocument();
	});

	it('should allow creating a rule from the editor modal', async () => {
		render(Page);

		await waitFor(() => {
			expect(screen.getByRole('button', { name: '새 품질 규칙 추가' })).toBeInTheDocument();
		});

		await fireEvent.click(screen.getByRole('button', { name: '새 품질 규칙 추가' }));

		await fireEvent.input(screen.getByLabelText('규칙 이름'), {
			target: { value: '고객 수 1건 이상' }
		});
		await fireEvent.change(screen.getByLabelText('범위'), {
			target: { value: 'table' }
		});
		await fireEvent.change(screen.getByLabelText('메트릭'), {
			target: { value: 'rowCount' }
		});
		await fireEvent.change(screen.getByLabelText('연산자'), {
			target: { value: 'gte' }
		});
		await fireEvent.input(screen.getByLabelText('기준값'), {
			target: { value: '1' }
		});
		await fireEvent.input(screen.getByLabelText('스키마 패턴'), {
			target: { value: 'public' }
		});
		await fireEvent.input(screen.getByLabelText('테이블 패턴'), {
			target: { value: 'customers' }
		});

		await fireEvent.click(screen.getByRole('button', { name: /^저장$/ }));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/quality-rules',
				expect.objectContaining({
					method: 'POST'
				})
			);
		});

		expect(screen.getByText('고객 수 1건 이상')).toBeInTheDocument();
	});
});
