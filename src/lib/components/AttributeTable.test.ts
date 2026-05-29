import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import AttributeTable from './AttributeTable.svelte';
import type { AttributeEntry } from '$lib/types/database-design';

const createMockEntries = (): AttributeEntry[] => [
	{
		id: 'entry-1',
		schemaName: '스키마1',
		entityName: '엔터티1',
		attributeName: '속성1',
		attributeType: 'VARCHAR',
		requiredInput: 'Y',
		identifierFlag: 'Y',
		refEntityName: '엔터티2',
		refAttributeName: '속성2',
		attributeDescription: '속성 설명1',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z'
	},
	{
		id: 'entry-2',
		schemaName: '스키마2',
		entityName: '엔터티2',
		attributeName: '속성2',
		attributeType: 'INTEGER',
		requiredInput: 'N',
		refEntityName: '',
		createdAt: '2024-01-02T00:00:00.000Z',
		updatedAt: '2024-01-02T00:00:00.000Z'
	}
];

const renderTable = (props: Record<string, unknown> = {}) =>
	render(AttributeTable, {
		props: {
			entries: createMockEntries(),
			onsort: vi.fn(),
			onpagechange: vi.fn(),
			...props
		}
	});

describe('AttributeTable', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('행, 검색 맥락, 하이라이트를 렌더링한다', () => {
		const { container } = renderTable({ searchQuery: '속성', totalCount: 2 });

		expect(screen.getAllByText('속성', { selector: 'mark' }).length).toBeGreaterThan(0);
		expect(container).toHaveTextContent('속성1');
		expect(container).toHaveTextContent('속성2');
		expect(container).toHaveTextContent('"속성" 검색 결과');
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
		await fireEvent.click(screen.getByRole('button', { name: '속성명로 정렬' }));
		await fireEvent.click(screen.getByRole('button', { name: '다음' }));

		expect(onsort).not.toHaveBeenCalled();
		expect(onpagechange).not.toHaveBeenCalled();
		expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
	});

	it('일반 빈 상태와 검색 빈 상태를 구분한다', () => {
		const { unmount } = renderTable({ entries: [] });
		expect(screen.getByText('표시할 데이터가 없습니다')).toBeInTheDocument();

		unmount();
		const { container } = renderTable({ entries: [], searchQuery: '없는속성' });
		expect(container).toHaveTextContent('"없는속성" 검색 결과');
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
			renderTable({ onsort, sortConfig: { attributeName: currentDirection ?? null } });

			await fireEvent.click(screen.getByRole('button', { name: '속성명로 정렬' }));

			expect(onsort).toHaveBeenCalledWith({ column: 'attributeName', direction: nextDirection });
		}
	);

	it('키보드 Enter로 정렬을 실행한다', async () => {
		const onsort = vi.fn();
		renderTable({ onsort });

		await fireEvent.keyDown(screen.getByRole('button', { name: '속성명로 정렬' }), {
			key: 'Enter'
		});

		expect(onsort).toHaveBeenCalledWith({ column: 'attributeName', direction: 'asc' });
	});

	it('컬럼 필터를 열고 선택값을 전달한다', async () => {
		const onfilter = vi.fn();
		renderTable({
			onfilter,
			filterOptions: { schemaName: ['스키마1', '스키마2'] },
			activeFilters: { schemaName: '스키마2' }
		});

		await fireEvent.click(screen.getByRole('button', { name: '스키마명 필터' }));

		expect(screen.getByRole('dialog', { name: '스키마명 필터' })).toBeInTheDocument();
		expect(screen.getByRole('combobox')).toHaveValue('스키마2');

		await fireEvent.change(screen.getByRole('combobox'), { target: { value: '스키마1' } });

		expect(onfilter).toHaveBeenCalledWith({ column: 'schemaName', value: '스키마1' });
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

		await fireEvent.click(screen.getByText('속성1').closest('tr') as HTMLTableRowElement);

		expect(onentryclick).toHaveBeenCalled();
		expect(onentryclick.mock.calls[0][0].entry.id).toBe('entry-1');
	});

	it('검색어 하이라이트는 HTML을 실행하지 않고 텍스트로 렌더링한다', () => {
		const entries = [
			{
				...createMockEntries()[0],
				attributeName: '<img src=x onerror=alert(1)>위험속성'
			}
		];

		const { container } = renderTable({ entries, searchQuery: '위험속성' });

		expect(container).toHaveTextContent('<img src=x onerror=alert(1)>위험속성');
		expect(screen.getByText('위험속성', { selector: 'mark' })).toBeInTheDocument();
		expect(container.querySelector('img')).not.toBeInTheDocument();
	});
});
