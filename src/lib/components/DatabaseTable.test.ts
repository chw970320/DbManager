import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DatabaseTable from './DatabaseTable.svelte';
import type { DatabaseEntry } from '$lib/types/database-design';

const createMockEntry = (overrides: Partial<DatabaseEntry> = {}): DatabaseEntry => ({
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
	updatedAt: '2024-01-01T00:00:00.000Z',
	...overrides
});

const renderTable = (props: Record<string, unknown> = {}) =>
	render(DatabaseTable, {
		props: {
			entries: [createMockEntry()],
			onsort: vi.fn(),
			onpagechange: vi.fn(),
			...props
		}
	});

describe('DatabaseTable', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('entries props에 따른 행 렌더링', () => {
			renderTable();

			expect(screen.getByText('기관1')).toBeInTheDocument();
			expect(screen.getByText('부서1')).toBeInTheDocument();
		});

		it('검색 맥락과 하이라이트를 렌더링한다', () => {
			const { container } = renderTable({ searchQuery: '기관', totalCount: 1 });

			expect(screen.getByText('기관', { selector: 'mark' })).toBeInTheDocument();
			expect(container).toHaveTextContent('"기관" 검색 결과');
		});

		it('빈 entries 배열 처리', () => {
			renderTable({ entries: [] });

			expect(screen.getByText(/기관명/)).toBeInTheDocument();
			expect(screen.getByText('표시할 데이터가 없습니다')).toBeInTheDocument();
			expect(
				screen.getByText('먼저 파일을 업로드하여 데이터베이스 정의서를 등록해주세요.')
			).toBeInTheDocument();
		});

		it('검색 결과가 없을 때 검색 맥락의 EmptyState를 표시', () => {
			const { container } = renderTable({ entries: [], searchQuery: '없는DB' });

			expect(container).toHaveTextContent('"없는DB" 검색 결과');
			expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument();
			expect(screen.getByText('다른 검색어를 시도해보세요.')).toBeInTheDocument();
		});

		it('로딩 상태 표시와 동작 차단', async () => {
			const onsort = vi.fn();
			const onpagechange = vi.fn();
			const { container } = renderTable({
				entries: [],
				loading: true,
				currentPage: 1,
				totalPages: 2,
				pageSize: 3,
				onsort,
				onpagechange
			});

			const table = screen.getByRole('table', { name: '데이터베이스 정의서 목록' });
			expect(table).toHaveAttribute('aria-busy', 'true');
			expect(screen.getByText('데이터베이스 정의서 목록을 불러오는 중입니다.')).toBeInTheDocument();
			expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);

			await fireEvent.click(screen.getByRole('button', { name: '기관명로 정렬' }));
			await fireEvent.click(screen.getByRole('button', { name: '다음' }));

			expect(onsort).not.toHaveBeenCalled();
			expect(onpagechange).not.toHaveBeenCalled();
			expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
		});
	});

	describe('Sorting', () => {
		it.each([
			[undefined, 'asc'],
			['asc', 'desc'],
			['desc', null]
		] as const)(
			'컬럼 헤더 클릭은 현재 방향 %s에서 %s로 순환한다',
			async (currentDirection, nextDirection) => {
				const onsort = vi.fn();
				renderTable({ onsort, sortConfig: { organizationName: currentDirection ?? null } });

				await fireEvent.click(screen.getByRole('button', { name: '기관명로 정렬' }));

				expect(onsort).toHaveBeenCalledWith({
					column: 'organizationName',
					direction: nextDirection
				});
			}
		);

		it('키보드 Enter로 정렬 이벤트를 실행한다', async () => {
			const onsort = vi.fn();
			renderTable({ onsort });

			await fireEvent.keyDown(screen.getByRole('button', { name: '기관명로 정렬' }), {
				key: 'Enter'
			});

			expect(onsort).toHaveBeenCalledWith({ column: 'organizationName', direction: 'asc' });
		});
	});

	describe('Pagination', () => {
		it('페이지 경계와 유효한 다음 페이지 이벤트를 보존한다', async () => {
			const onpagechange = vi.fn();
			const entries = Array.from({ length: 25 }, (_, i) =>
				createMockEntry({ id: `entry-${i}`, organizationName: `기관${i}` })
			);

			renderTable({
				entries,
				currentPage: 1,
				totalPages: 2,
				pageSize: 20,
				onpagechange
			});

			expect(screen.getByRole('button', { name: '이전' })).toBeDisabled();
			await fireEvent.click(screen.getByRole('button', { name: '다음' }));

			expect(onpagechange).toHaveBeenCalledWith({ page: 2 });
		});
	});

	describe('Row Click', () => {
		it('행 클릭 시 entryclick 이벤트 발생', async () => {
			const onentryclick = vi.fn();
			const entry = createMockEntry();

			renderTable({ entries: [entry], onentryclick });

			await fireEvent.click(screen.getByText('기관1').closest('tr') as HTMLTableRowElement);

			expect(onentryclick).toHaveBeenCalled();
			const detail = onentryclick.mock.calls[0][0] as { entry: DatabaseEntry };
			expect(detail.entry.id).toBe('entry-1');
		});
	});

	describe('Filtering', () => {
		it('필터 옵션 제공 시 필터 UI 표시', () => {
			renderTable({
				filterOptions: {
					organizationName: ['기관1', '기관2'],
					dbmsInfo: ['MySQL', 'PostgreSQL']
				}
			});

			expect(screen.getByRole('button', { name: '기관명 필터' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'DBMS정보 필터' })).toBeInTheDocument();
		});

		it('필터 적용 시 이벤트 발생', async () => {
			const onfilter = vi.fn();
			const onsort = vi.fn();

			renderTable({
				filterOptions: { organizationName: ['기관1', '기관2'] },
				activeFilters: { organizationName: '기관2' },
				onsort,
				onfilter
			});

			await fireEvent.click(screen.getByRole('button', { name: '기관명 필터' }));

			expect(screen.getByRole('dialog', { name: '기관명 필터' })).toBeInTheDocument();
			expect(screen.getByRole('combobox')).toHaveValue('기관2');
			expect(onsort).not.toHaveBeenCalled();

			await fireEvent.change(screen.getByRole('combobox'), { target: { value: '기관1' } });

			expect(onfilter).toHaveBeenCalledWith({ column: 'organizationName', value: '기관1' });
		});

		it('검색어 하이라이트는 HTML을 실행하지 않고 텍스트로 렌더링한다', () => {
			const entries = [
				createMockEntry({
					organizationName: '<img src=x onerror=alert(1)>기관1'
				})
			];

			const { container } = renderTable({ entries, searchQuery: '기관1' });

			expect(container).toHaveTextContent('<img src=x onerror=alert(1)>기관1');
			expect(screen.getByText('기관1', { selector: 'mark' })).toBeInTheDocument();
			expect(container.querySelector('img')).not.toBeInTheDocument();
		});
	});
});
