import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TermTable from './TermTable.svelte';
import type { TermEntry } from '$lib/types/term';

const createMockEntries = (): TermEntry[] => [
	{
		id: 'entry-1',
		termName: '사용자_이름',
		columnName: 'USER_NAME',
		domainName: '사용자분류_VARCHAR(50)',
		isMappedTerm: true,
		isMappedColumn: true,
		isMappedDomain: true,
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z'
	},
	{
		id: 'entry-2',
		termName: '관리자_이름',
		columnName: 'ADMIN_NAME',
		domainName: '사용자분류_VARCHAR(50)',
		isMappedTerm: false,
		isMappedColumn: false,
		isMappedDomain: true,
		createdAt: '2024-01-02T00:00:00.000Z',
		updatedAt: '2024-01-02T00:00:00.000Z'
	}
];

const renderTable = (props: Record<string, unknown> = {}) =>
	render(TermTable, {
		props: {
			entries: createMockEntries(),
			onsort: vi.fn(),
			onpagechange: vi.fn(),
			...props
		}
	});

describe('TermTable', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('행, 검색 맥락, 매핑 상태를 렌더링한다', () => {
		const { container } = renderTable({ searchQuery: '사용자', totalCount: 2 });

		expect(screen.getAllByText('사용자', { selector: 'mark' }).length).toBeGreaterThan(0);
		expect(screen.getByText('관리자_이름')).toBeInTheDocument();
		expect(container).toHaveTextContent('"사용자" 검색 결과');
		expect(container).toHaveTextContent('USER_NAME');
		expect(container).toHaveTextContent('ADMIN_NAME');
	});

	it('로딩 중에는 스켈레톤을 표시하고 정렬/페이지 이동을 막는다', async () => {
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

		expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
		await fireEvent.click(screen.getByRole('button', { name: '용어명로 정렬' }));
		await fireEvent.click(screen.getByRole('button', { name: '다음' }));

		expect(onsort).not.toHaveBeenCalled();
		expect(onpagechange).not.toHaveBeenCalled();
		expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
	});

	it('일반 빈 상태와 검색 빈 상태를 구분한다', () => {
		const { unmount } = renderTable({ entries: [] });
		expect(screen.getByText('표시할 데이터가 없습니다')).toBeInTheDocument();

		unmount();
		const { container } = renderTable({ entries: [], searchQuery: '없는용어' });
		expect(container).toHaveTextContent('"없는용어" 검색 결과');
		expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument();
	});

	it.each([
		[undefined, 'asc'],
		['asc', 'desc'],
		['desc', null]
	] as const)(
		'정렬 클릭은 현재 방향 %s에서 %s로 순환한다',
		async (currentDirection, nextDirection) => {
			const onsort = vi.fn();
			renderTable({ onsort, sortConfig: { termName: currentDirection ?? null } });

			await fireEvent.click(screen.getByRole('button', { name: '용어명로 정렬' }));

			expect(onsort).toHaveBeenCalledWith({ column: 'termName', direction: nextDirection });
		}
	);

	it('키보드 Enter로 정렬을 실행한다', async () => {
		const onsort = vi.fn();
		renderTable({ onsort });

		await fireEvent.keyDown(screen.getByRole('button', { name: '용어명로 정렬' }), {
			key: 'Enter'
		});

		expect(onsort).toHaveBeenCalledWith({ column: 'termName', direction: 'asc' });
	});

	it('컬럼 필터를 열고 선택값을 전달한다', async () => {
		const onfilter = vi.fn();
		renderTable({
			onfilter,
			filterOptions: { termName: ['사용자_이름', '관리자_이름'] },
			activeFilters: { termName: '관리자_이름' }
		});

		await fireEvent.click(screen.getByRole('button', { name: '용어명 필터' }));

		expect(screen.getByRole('dialog', { name: '용어명 필터' })).toBeInTheDocument();
		expect(screen.getByRole('combobox')).toHaveValue('관리자_이름');

		await fireEvent.change(screen.getByRole('combobox'), { target: { value: '사용자_이름' } });

		expect(onfilter).toHaveBeenCalledWith({ column: 'termName', value: '사용자_이름' });
	});

	it('페이지 경계와 유효한 다음 페이지 이벤트를 보존한다', async () => {
		const onpagechange = vi.fn();
		renderTable({ currentPage: 1, totalPages: 2, pageSize: 1, onpagechange });

		expect(screen.getByRole('button', { name: '이전' })).toBeDisabled();
		await fireEvent.click(screen.getByRole('button', { name: '다음' }));

		expect(onpagechange).toHaveBeenCalledWith({ page: 2 });
	});

	it('검색어와 미매핑 하이라이트는 HTML을 실행하지 않고 텍스트로 렌더링한다', () => {
		const entries = [
			{
				...createMockEntries()[0],
				termName: '<mark onmouseover=alert(1)>위험_용어',
				isMappedTerm: false,
				unmappedTermParts: ['용어']
			}
		];

		const { container } = renderTable({ entries, searchQuery: '위험' });

		expect(container).toHaveTextContent('<mark onmouseover=alert(1)>위험_용어');
		expect(screen.getByText('위험', { selector: 'mark' })).toBeInTheDocument();
		expect(screen.getByText('용어', { selector: 'mark' })).toBeInTheDocument();
		expect(container.querySelector('[onmouseover]')).not.toBeInTheDocument();
	});
});
