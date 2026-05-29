import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import EntityTable from './EntityTable.svelte';
import type { EntityEntry } from '$lib/types/database-design';

const createMockEntries = (): EntityEntry[] => [
	{
		id: 'entry-1',
		logicalDbName: '논리DB1',
		schemaName: '스키마1',
		entityName: '엔터티1',
		primaryIdentifier: 'ID1',
		tableKoreanName: '테이블한글명1',
		entityDescription: '엔터티 설명1',
		superTypeEntityName: '수퍼타입1',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z'
	},
	{
		id: 'entry-2',
		logicalDbName: '논리DB2',
		schemaName: '스키마2',
		entityName: '엔터티2',
		primaryIdentifier: 'ID2',
		tableKoreanName: '테이블한글명2',
		createdAt: '2024-01-02T00:00:00.000Z',
		updatedAt: '2024-01-02T00:00:00.000Z'
	}
];

const renderTable = (props: Record<string, unknown> = {}) =>
	render(EntityTable, {
		props: {
			entries: createMockEntries(),
			onsort: vi.fn(),
			onpagechange: vi.fn(),
			...props
		}
	});

describe('EntityTable', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('행, 검색 맥락, 하이라이트를 렌더링한다', () => {
		const { container } = renderTable({ searchQuery: '엔터티', totalCount: 2 });

		expect(screen.getAllByText('엔터티', { selector: 'mark' }).length).toBeGreaterThan(0);
		expect(container).toHaveTextContent('엔터티1');
		expect(container).toHaveTextContent('엔터티2');
		expect(container).toHaveTextContent('"엔터티" 검색 결과');
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
		expect(screen.getByRole('table', { name: '엔터티 정의서 목록' })).toHaveAttribute(
			'aria-busy',
			'true'
		);
		expect(screen.getByText('엔터티 정의서 목록을 불러오는 중입니다.')).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: '엔터티명로 정렬' }));
		await fireEvent.click(screen.getByRole('button', { name: '다음' }));

		expect(onsort).not.toHaveBeenCalled();
		expect(onpagechange).not.toHaveBeenCalled();
		expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
	});

	it('일반 빈 상태와 검색 빈 상태를 구분한다', () => {
		const { unmount } = renderTable({ entries: [] });
		expect(screen.getByText('표시할 데이터가 없습니다')).toBeInTheDocument();

		unmount();
		const { container } = renderTable({ entries: [], searchQuery: '없는엔터티' });
		expect(container).toHaveTextContent('"없는엔터티" 검색 결과');
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
			renderTable({ onsort, sortConfig: { entityName: currentDirection ?? null } });

			await fireEvent.click(screen.getByRole('button', { name: '엔터티명로 정렬' }));

			expect(onsort).toHaveBeenCalledWith({ column: 'entityName', direction: nextDirection });
		}
	);

	it('키보드 Enter로 정렬을 실행한다', async () => {
		const onsort = vi.fn();
		renderTable({ onsort });

		await fireEvent.keyDown(screen.getByRole('button', { name: '엔터티명로 정렬' }), {
			key: 'Enter'
		});

		expect(onsort).toHaveBeenCalledWith({ column: 'entityName', direction: 'asc' });
	});

	it('컬럼 필터를 열고 선택값을 전달한다', async () => {
		const onfilter = vi.fn();
		renderTable({
			onfilter,
			filterOptions: { logicalDbName: ['논리DB1', '논리DB2'] },
			activeFilters: { logicalDbName: '논리DB2' }
		});

		await fireEvent.click(screen.getByRole('button', { name: '논리DB명 필터' }));

		expect(screen.getByRole('dialog', { name: '논리DB명 필터' })).toBeInTheDocument();
		expect(screen.getByRole('combobox')).toHaveValue('논리DB2');

		await fireEvent.change(screen.getByRole('combobox'), { target: { value: '논리DB1' } });

		expect(onfilter).toHaveBeenCalledWith({ column: 'logicalDbName', value: '논리DB1' });
	});

	it('페이지 경계와 유효한 다음 페이지 이벤트를 보존한다', async () => {
		const onpagechange = vi.fn();
		renderTable({ currentPage: 1, totalPages: 2, pageSize: 1, onpagechange });

		expect(screen.getByRole('button', { name: '이전' })).toBeDisabled();
		await fireEvent.click(screen.getByRole('button', { name: '다음' }));

		expect(onpagechange).toHaveBeenCalledWith({ page: 2 });
	});

	it('행 클릭은 entryclick 계약을 유지한다', async () => {
		const onentryclick = vi.fn();
		renderTable({ onentryclick });

		await fireEvent.click(screen.getByText('엔터티1').closest('tr') as HTMLTableRowElement);

		expect(onentryclick).toHaveBeenCalled();
		expect(onentryclick.mock.calls[0][0].entry.id).toBe('entry-1');
	});

	it('검색어 하이라이트는 HTML을 실행하지 않고 텍스트로 렌더링한다', () => {
		const entries = [
			{
				...createMockEntries()[0],
				entityName: '<img src=x onerror=alert(1)>위험엔터티'
			}
		];

		const { container } = renderTable({ entries, searchQuery: '위험엔터티' });

		expect(container).toHaveTextContent('<img src=x onerror=alert(1)>위험엔터티');
		expect(screen.getByText('위험엔터티', { selector: 'mark' })).toBeInTheDocument();
		expect(container.querySelector('img')).not.toBeInTheDocument();
	});
});
