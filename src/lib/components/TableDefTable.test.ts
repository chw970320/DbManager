import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TableDefTable from './TableDefTable.svelte';
import type { TableEntry } from '$lib/types/database-design';

const createMockEntries = (): TableEntry[] => [
	{
		id: 'entry-1',
		physicalDbName: '물리DB1',
		tableOwner: '소유자1',
		subjectArea: '주제영역1',
		schemaName: '스키마1',
		tableEnglishName: 'TABLE1',
		tableKoreanName: '테이블1',
		tableType: '일반',
		relatedEntityName: '엔터티1',
		publicFlag: 'Y',
		businessClassification: '',
		tableVolume: '',
		nonPublicReason: '',
		openDataList: '',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z'
	},
	{
		id: 'entry-2',
		physicalDbName: '물리DB2',
		tableOwner: '소유자2',
		subjectArea: '주제영역2',
		schemaName: '스키마2',
		tableEnglishName: 'TABLE2',
		tableKoreanName: '테이블2',
		tableType: '임시',
		relatedEntityName: '엔터티2',
		publicFlag: 'N',
		businessClassification: '',
		tableVolume: '',
		nonPublicReason: '',
		openDataList: '',
		createdAt: '2024-01-02T00:00:00.000Z',
		updatedAt: '2024-01-02T00:00:00.000Z'
	}
];

const renderTable = (props: Record<string, unknown> = {}) =>
	render(TableDefTable, {
		props: {
			entries: createMockEntries(),
			onsort: vi.fn(),
			onpagechange: vi.fn(),
			...props
		}
	});

describe('TableDefTable', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('행, 검색 맥락, 하이라이트를 렌더링한다', () => {
		const { container } = renderTable({ searchQuery: '테이블', totalCount: 2 });

		expect(screen.getAllByText('테이블', { selector: 'mark' }).length).toBeGreaterThan(0);
		expect(container).toHaveTextContent('테이블1');
		expect(container).toHaveTextContent('테이블2');
		expect(container).toHaveTextContent('"테이블" 검색 결과');
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
		expect(screen.getByRole('table', { name: '테이블 정의서 목록' })).toHaveAttribute(
			'aria-busy',
			'true'
		);
		expect(screen.getByText('테이블 정의서 목록을 불러오는 중입니다.')).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: '테이블한글명로 정렬' }));
		await fireEvent.click(screen.getByRole('button', { name: '다음' }));

		expect(onsort).not.toHaveBeenCalled();
		expect(onpagechange).not.toHaveBeenCalled();
		expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
	});

	it('일반 빈 상태와 검색 빈 상태를 구분한다', () => {
		const { unmount } = renderTable({ entries: [] });
		expect(screen.getByText('표시할 데이터가 없습니다')).toBeInTheDocument();

		unmount();
		const { container } = renderTable({ entries: [], searchQuery: '없는테이블' });
		expect(container).toHaveTextContent('"없는테이블" 검색 결과');
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
			renderTable({ onsort, sortConfig: { tableKoreanName: currentDirection ?? null } });

			await fireEvent.click(screen.getByRole('button', { name: '테이블한글명로 정렬' }));

			expect(onsort).toHaveBeenCalledWith({ column: 'tableKoreanName', direction: nextDirection });
		}
	);

	it('키보드 Enter로 정렬을 실행한다', async () => {
		const onsort = vi.fn();
		renderTable({ onsort });

		await fireEvent.keyDown(screen.getByRole('button', { name: '테이블한글명로 정렬' }), {
			key: 'Enter'
		});

		expect(onsort).toHaveBeenCalledWith({ column: 'tableKoreanName', direction: 'asc' });
	});

	it('컬럼 필터를 열고 선택값을 전달한다', async () => {
		const onfilter = vi.fn();
		renderTable({
			onfilter,
			filterOptions: { tableKoreanName: ['테이블1', '테이블2'] },
			activeFilters: { tableKoreanName: '테이블2' }
		});

		await fireEvent.click(screen.getByRole('button', { name: '테이블한글명 필터' }));

		expect(screen.getByRole('dialog', { name: '테이블한글명 필터' })).toBeInTheDocument();
		expect(screen.getByRole('combobox')).toHaveValue('테이블2');

		await fireEvent.change(screen.getByRole('combobox'), { target: { value: '테이블1' } });

		expect(onfilter).toHaveBeenCalledWith({ column: 'tableKoreanName', value: '테이블1' });
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

		await fireEvent.click(screen.getByText('테이블1').closest('tr') as HTMLTableRowElement);

		expect(onentryclick).toHaveBeenCalled();
		expect(onentryclick.mock.calls[0][0].entry.id).toBe('entry-1');
	});

	it('검색어 하이라이트는 HTML을 실행하지 않고 텍스트로 렌더링한다', () => {
		const entries = [
			{
				...createMockEntries()[0],
				tableKoreanName: '<img src=x onerror=alert(1)>위험테이블'
			}
		];

		const { container } = renderTable({ entries, searchQuery: '위험테이블' });

		expect(container).toHaveTextContent('<img src=x onerror=alert(1)>위험테이블');
		expect(screen.getByText('위험테이블', { selector: 'mark' })).toBeInTheDocument();
		expect(container.querySelector('img')).not.toBeInTheDocument();
	});
});
