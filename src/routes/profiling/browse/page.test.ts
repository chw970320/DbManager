import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import Page from './+page.svelte';

const { mockAddToast, mockScrollIntoView } = vi.hoisted(() => ({
	mockAddToast: vi.fn(),
	mockScrollIntoView: vi.fn()
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

function createProfileTargets() {
	return [
		{
			schema: 'public',
			table: 'customers',
			tableType: 'BASE TABLE',
			estimatedRowCount: 1200,
			columnCount: 4
		},
		...Array.from({ length: 11 }, (_, index) => ({
			schema: 'public',
			table: `table_${String(index + 2).padStart(2, '0')}`,
			tableType: 'BASE TABLE',
			estimatedRowCount: 100 + index,
			columnCount: 3
		}))
	];
}

const sourceEntry = {
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

describe('Profiling browse page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
			configurable: true,
			value: mockScrollIntoView
		});
		mockFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method || 'GET';

			if (url === '/api/data-sources' && method === 'GET') {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: [sourceEntry]
					})
				);
			}

			if (url === '/api/data-sources/profile/targets?dataSourceId=source-1' && method === 'GET') {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: {
							dataSourceId: 'source-1',
							dataSourceName: '운영 PostgreSQL',
							defaultSchema: 'public',
							schemas: ['public'],
							tables: createProfileTargets()
						}
					})
				);
			}

			if (url === '/api/data-sources/profile/run' && method === 'POST') {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: {
							dataSourceId: 'source-1',
							dataSourceName: '운영 PostgreSQL',
							schema: 'public',
							table: 'customers',
							rowCount: 1200,
							profiledAt: '2026-03-12T00:00:00.000Z',
							columns: [
								{
									columnName: 'customer_id',
									ordinalPosition: 1,
									dataType: 'integer',
									isNullable: false,
									nullCount: 0,
									nullRatio: 0,
									distinctCount: 1200,
									distinctRatio: 1,
									minLength: 1,
									maxLength: 5
								},
								{
									columnName: 'email',
									ordinalPosition: 2,
									dataType: 'character varying(255)',
									isNullable: true,
									nullCount: 12,
									nullRatio: 0.01,
									distinctCount: 1180,
									distinctRatio: 0.9833,
									minLength: 12,
									maxLength: 48
								}
							],
							qualityRuleEvaluation: {
								evaluatedAt: '2026-03-12T00:00:00.000Z',
								summary: {
									totalRules: 2,
									matchedRules: 2,
									passedRules: 1,
									failedRules: 1,
									errorCount: 0,
									warningCount: 1
								},
								violations: [
									{
										ruleId: 'rule-1',
										ruleName: '고객 이메일 NULL 비율 5% 이하',
										severity: 'warning',
										scope: 'column',
										target: {
											schema: 'public',
											table: 'customers',
											column: 'email'
										},
										metric: 'nullRatio',
										operator: 'lte',
										threshold: 0.05,
										actualValue: 0.01,
										message: 'email 컬럼의 NULL 비율이 기준값을 초과했습니다.'
									}
								]
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

	it('should load profile targets for the selected data source and render the result', async () => {
		render(Page);

		await waitFor(() => {
			expect(screen.getByLabelText('저장된 데이터 소스')).toBeInTheDocument();
		});

		const targetSelectionCard = screen.getByText('대상 선택').closest('section');
		expect(targetSelectionCard).not.toBeNull();
		expect(
			within(targetSelectionCard as HTMLElement).getByRole('button', { name: '테이블 불러오기' })
		).toBeInTheDocument();
		expect(
			within(targetSelectionCard as HTMLElement).getByRole('button', {
				name: '데이터 소스 새로고침'
			})
		).toBeInTheDocument();

		await fireEvent.click(
			within(targetSelectionCard as HTMLElement).getByRole('button', { name: '테이블 불러오기' })
		);

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/data-sources/profile/targets?dataSourceId=source-1'
			);
		});

		expect(screen.getByText('customers')).toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: /프로파일링 실행$/ })).toHaveLength(10);

		await fireEvent.click(screen.getByRole('button', { name: /customers 프로파일링 실행/ }));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/data-sources/profile/run',
				expect.objectContaining({
					method: 'POST'
				})
			);
		});

		expect(screen.getByText('customer_id')).toBeInTheDocument();
		expect(screen.getByText('character varying(255)')).toBeInTheDocument();
		expect(screen.getAllByText('1,200').length).toBeGreaterThan(0);
		expect(screen.getByText('품질 규칙 평가')).toBeInTheDocument();
		expect(screen.getByText('고객 이메일 NULL 비율 5% 이하')).toBeInTheDocument();
		expect(mockScrollIntoView).toHaveBeenCalled();
	});

	it('should paginate profile targets in groups of ten rows', async () => {
		render(Page);

		await waitFor(() => {
			expect(screen.getByLabelText('저장된 데이터 소스')).toBeInTheDocument();
		});

		await fireEvent.click(screen.getByRole('button', { name: '테이블 불러오기' }));

		await waitFor(() => {
			expect(
				screen.getByRole('navigation', { name: '프로파일링 대상 페이지네이션' })
			).toBeInTheDocument();
		});

		expect(screen.getByText('customers')).toBeInTheDocument();
		expect(screen.queryByText('table_11')).not.toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: /프로파일링 실행$/ })).toHaveLength(10);

		await fireEvent.click(screen.getByRole('button', { name: '다음' }));

		await waitFor(() => {
			expect(screen.getByText('table_11')).toBeInTheDocument();
		});

		expect(screen.queryByText('customers')).not.toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: /프로파일링 실행$/ })).toHaveLength(2);
	});

	it('should show an empty state when there are no saved data sources', async () => {
		mockFetch.mockImplementationOnce(() =>
			Promise.resolve(
				createJsonResponse({
					success: true,
					data: []
				})
			)
		);

		render(Page);

		await waitFor(() => {
			expect(screen.getByText('저장된 데이터 소스가 없습니다.')).toBeInTheDocument();
		});
	});

	it('should render the desktop-only summary in the left sidebar without a mobile toggle', async () => {
		render(Page);

		await waitFor(() => {
			expect(screen.getByLabelText('저장된 데이터 소스')).toBeInTheDocument();
		});

		const summaryRegion = screen.getByRole('region', { name: '프로파일링 요약' });
		expect(summaryRegion.closest('aside')).not.toBeNull();
		expect(summaryRegion).toHaveClass('hidden');
		expect(summaryRegion).toHaveClass('lg:block');
		expect(within(summaryRegion).getByText('저장된 데이터 소스')).toBeInTheDocument();
		expect(within(summaryRegion).getByText('조회된 테이블')).toBeInTheDocument();
		expect(within(summaryRegion).getByText('목록 페이지')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '사이드바 열기' })).not.toBeInTheDocument();
	});
});
