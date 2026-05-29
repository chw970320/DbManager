import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import VocabularyTable from './VocabularyTable.svelte';
import type { VocabularyEntry } from '$lib/types/vocabulary';

const createEntry = (overrides: Partial<VocabularyEntry> = {}): VocabularyEntry => ({
	id: 'vocabulary-1',
	standardName: '표준단어',
	abbreviation: 'STD',
	englishName: 'STANDARD',
	description: '설명',
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
	...overrides
});

const renderTable = (props: Record<string, unknown> = {}) =>
	render(VocabularyTable, {
		props: {
			entries: [
				createEntry({ id: 'vocabulary-1', standardName: '사용자', abbreviation: 'USER' }),
				createEntry({ id: 'vocabulary-2', standardName: '관리자', abbreviation: 'ADMIN' })
			],
			onsort: vi.fn(),
			onpagechange: vi.fn(),
			...props
		}
	});

describe('VocabularyTable', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('행, 검색 맥락, 하이라이트를 렌더링한다', () => {
		const { container } = renderTable({
			entries: [createEntry({ standardName: '사용자_단어' })],
			searchQuery: '사용자',
			totalCount: 1
		});

		expect(screen.getByText('사용자', { selector: 'mark' })).toBeInTheDocument();
		expect(container).toHaveTextContent('"사용자" 검색 결과');
		expect(container).toHaveTextContent('사용자_단어');
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
		await fireEvent.click(screen.getByRole('button', { name: '표준단어명로 정렬' }));
		await fireEvent.click(screen.getByRole('button', { name: '다음' }));

		expect(onsort).not.toHaveBeenCalled();
		expect(onpagechange).not.toHaveBeenCalled();
		expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
	});

	it('일반 빈 상태와 검색 빈 상태를 구분한다', () => {
		const { unmount } = renderTable({ entries: [] });
		expect(screen.getByText('표시할 데이터가 없습니다')).toBeInTheDocument();

		unmount();
		const { container } = renderTable({ entries: [], searchQuery: '없는단어' });
		expect(container).toHaveTextContent('"없는단어" 검색 결과');
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
			renderTable({
				onsort,
				sortConfig: { standardName: currentDirection ?? null }
			});

			await fireEvent.click(screen.getByRole('button', { name: '표준단어명로 정렬' }));

			expect(onsort).toHaveBeenCalledWith({ column: 'standardName', direction: nextDirection });
		}
	);

	it('키보드 Enter로 정렬을 실행한다', async () => {
		const onsort = vi.fn();
		renderTable({ onsort });

		await fireEvent.keyDown(screen.getByRole('button', { name: '표준단어명로 정렬' }), {
			key: 'Enter'
		});

		expect(onsort).toHaveBeenCalledWith({ column: 'standardName', direction: 'asc' });
	});

	it('컬럼 필터를 열고 선택값을 전달한다', async () => {
		const onfilter = vi.fn();
		renderTable({
			onfilter,
			filterOptions: { standardName: ['사용자', '관리자'] },
			activeFilters: { standardName: '관리자' }
		});

		await fireEvent.click(screen.getByRole('button', { name: '표준단어명 필터' }));

		expect(screen.getByRole('dialog', { name: '표준단어명 필터' })).toBeInTheDocument();
		expect(screen.getByRole('combobox')).toHaveValue('관리자');

		await fireEvent.change(screen.getByRole('combobox'), { target: { value: '사용자' } });

		expect(onfilter).toHaveBeenCalledWith({ column: 'standardName', value: '사용자' });
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

		await fireEvent.click(screen.getByText('사용자').closest('tr') as HTMLTableRowElement);

		expect(onentryclick).toHaveBeenCalled();
		expect(onentryclick.mock.calls[0][0].entry.id).toBe('vocabulary-1');
	});

	it('검색어 하이라이트는 HTML을 실행하지 않고 텍스트로 렌더링한다', () => {
		const entries = [
			createEntry({
				standardName: '<mark onmouseover=alert(1)>위험단어'
			})
		];

		const { container } = renderTable({
			entries,
			searchQuery: '위험단어'
		});

		expect(container).toHaveTextContent('<mark onmouseover=alert(1)>위험단어');
		expect(screen.getByText('위험단어', { selector: 'mark' })).toBeInTheDocument();
		expect(container.querySelector('[onmouseover]')).not.toBeInTheDocument();
	});
});
