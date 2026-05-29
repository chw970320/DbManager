import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DatabaseTable from './DatabaseTable.svelte';
import type { DatabaseEntry } from '$lib/types/database-design';

// 테스트용 Mock 데이터
const createMockEntry = (): DatabaseEntry => ({
	id: 'entry-1',
	organizationName: '기관1',
	departmentName: '부서1',
	appliedTask: '업무1',
	relatedLaw: '법령1',
	logicalDbName: '논리DB1',
	physicalDbName: '물리DB1',
	buildDate: '2024-01-01',
	dbDescription: '설명1',
	dbmsInfo: 'MySQL',
	osInfo: 'Linux',
	exclusionReason: '',
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z'
});

describe('DatabaseTable', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('entries props에 따른 행 렌더링', () => {
			const entries = [createMockEntry()];
			render(DatabaseTable, {
				props: {
					entries,
					onsort: vi.fn(),
					onpagechange: vi.fn()
				}
			});

			expect(screen.getByText('기관1')).toBeInTheDocument();
			expect(screen.getByText('부서1')).toBeInTheDocument();
		});

		it('빈 entries 배열 처리', () => {
			render(DatabaseTable, {
				props: {
					entries: [],
					onsort: vi.fn(),
					onpagechange: vi.fn()
				}
			});

			expect(screen.getByText(/기관명/)).toBeInTheDocument();
			expect(screen.getByText('표시할 데이터가 없습니다')).toBeInTheDocument();
			expect(
				screen.getByText('먼저 파일을 업로드하여 데이터베이스 정의서를 등록해주세요.')
			).toBeInTheDocument();
		});

		it('검색 결과가 없을 때 검색 맥락의 EmptyState를 표시', () => {
			render(DatabaseTable, {
				props: {
					entries: [],
					searchQuery: '없는DB',
					onsort: vi.fn(),
					onpagechange: vi.fn()
				}
			});

			expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument();
			expect(screen.getByText('다른 검색어를 시도해보세요.')).toBeInTheDocument();
		});

		it('로딩 상태 표시', () => {
			const { container } = render(DatabaseTable, {
				props: {
					entries: [],
					loading: true,
					pageSize: 3,
					onsort: vi.fn(),
					onpagechange: vi.fn()
				}
			});

			const table = screen.getByRole('table', { name: '데이터베이스 정의서 목록' });
			expect(table).toHaveAttribute('aria-busy', 'true');
			expect(screen.getByText('데이터베이스 정의서 목록을 불러오는 중입니다.')).toBeInTheDocument();
			expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
		});
	});

	describe('Sorting', () => {
		it('컬럼 헤더 클릭 시 정렬 이벤트 발생', async () => {
			const onsort = vi.fn();
			const entries = [createMockEntry()];

			render(DatabaseTable, {
				props: {
					entries,
					onsort,
					onpagechange: vi.fn()
				}
			});

			const sortableHeader = screen.getByRole('button', { name: '기관명로 정렬' });
			await fireEvent.click(sortableHeader);

			expect(onsort).toHaveBeenCalledWith({ column: 'organizationName', direction: 'asc' });
		});
	});

	describe('Pagination', () => {
		it('페이지 변경 시 이벤트 발생', async () => {
			const onpagechange = vi.fn();
			const entries = Array.from({ length: 25 }, (_, i) => ({
				...createMockEntry(),
				id: `entry-${i}`
			}));

			render(DatabaseTable, {
				props: {
					entries,
					currentPage: 1,
					totalPages: 2,
					pageSize: 20,
					onsort: vi.fn(),
					onpagechange
				}
			});

			const nextButton = screen.getByRole('button', { name: '다음' });
			await fireEvent.click(nextButton);

			expect(onpagechange).toHaveBeenCalledWith({ page: 2 });
		});
	});

	describe('Row Click', () => {
		it('행 클릭 시 entryclick 이벤트 발생', async () => {
			const onentryclick = vi.fn();
			const entry = createMockEntry();
			const entries = [entry];

			render(DatabaseTable, {
				props: {
					entries,
					onsort: vi.fn(),
					onpagechange: vi.fn(),
					onentryclick
				}
			});

			// 행 찾기 및 클릭 (실제 컴포넌트 구조에 따라 조정)
			const row = screen.getByText('기관1').closest('tr');
			if (row) {
				await fireEvent.click(row);
				expect(onentryclick).toHaveBeenCalled();
				const detail = onentryclick.mock.calls[0][0] as { entry: DatabaseEntry };
				expect(detail.entry.id).toBe('entry-1');
			}
		});
	});

	describe('Filtering', () => {
		it('필터 옵션 제공 시 필터 UI 표시', () => {
			const filterOptions = {
				organizationName: ['기관1', '기관2'],
				dbmsInfo: ['MySQL', 'PostgreSQL']
			};

			render(DatabaseTable, {
				props: {
					entries: [createMockEntry()],
					filterOptions,
					onsort: vi.fn(),
					onpagechange: vi.fn()
				}
			});

			expect(screen.getByRole('button', { name: '기관명 필터' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'DBMS정보 필터' })).toBeInTheDocument();
		});

		it('필터 적용 시 이벤트 발생', async () => {
			const onfilter = vi.fn();
			const onsort = vi.fn();
			const filterOptions = {
				organizationName: ['기관1', '기관2']
			};

			render(DatabaseTable, {
				props: {
					entries: [createMockEntry()],
					filterOptions,
					onsort,
					onpagechange: vi.fn(),
					onfilter
				}
			});

			await fireEvent.click(screen.getByRole('button', { name: '기관명 필터' }));

			expect(screen.getByRole('dialog', { name: '기관명 필터' })).toBeInTheDocument();
			expect(onsort).not.toHaveBeenCalled();

			await fireEvent.change(screen.getByRole('combobox'), { target: { value: '기관1' } });

			expect(onfilter).toHaveBeenCalledWith({ column: 'organizationName', value: '기관1' });
		});

		it('검색어 하이라이트는 HTML을 실행하지 않고 텍스트로 렌더링한다', () => {
			const entries = [
				{
					...createMockEntry(),
					organizationName: '<img src=x onerror=alert(1)>기관1'
				}
			];

			const { container } = render(DatabaseTable, {
				props: {
					entries,
					searchQuery: '기관1',
					onsort: vi.fn(),
					onpagechange: vi.fn()
				}
			});

			expect(container).toHaveTextContent('<img src=x onerror=alert(1)>기관1');
			expect(screen.getByText('기관1', { selector: 'mark' })).toBeInTheDocument();
			expect(container.querySelector('img')).not.toBeInTheDocument();
		});
	});
});
