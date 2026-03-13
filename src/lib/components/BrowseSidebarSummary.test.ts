import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import BrowseSidebarSummary from './BrowseSidebarSummary.svelte';

describe('BrowseSidebarSummary', () => {
	it('renders the current browse summary and hides it below lg screens', () => {
		render(BrowseSidebarSummary, {
			props: {
				totalCount: 12345,
				currentPage: 2,
				totalPages: 7,
				searchQuery: '고객',
				ariaLabel: '단어집 검색 결과 요약'
			}
		});

		const region = screen.getByRole('region', { name: '단어집 검색 결과 요약' });
		const summaryGrid = region.querySelector('.grid');
		expect(region).toHaveClass('hidden');
		expect(region).toHaveClass('lg:block');
		expect(summaryGrid).toHaveClass('grid-cols-1');
		expect(summaryGrid).not.toHaveClass('grid-cols-2');
		expect(screen.getByText('12,345')).toBeInTheDocument();
		expect(screen.getByText('2 / 7')).toBeInTheDocument();
		expect(screen.getByText('고객')).toBeInTheDocument();
	});

	it('renders a standalone sidebar card variant and falls back to 전체 when search is empty', () => {
		render(BrowseSidebarSummary, {
			props: {
				totalCount: 0,
				currentPage: 1,
				totalPages: 1,
				searchQuery: '',
				variant: 'card'
			}
		});

		const region = screen.getByRole('region', { name: '검색 결과 요약' });
		expect(region).toHaveClass('rounded-2xl');
		expect(region).toHaveClass('shadow-xl');
		expect(screen.getByText('전체')).toBeInTheDocument();
	});

	it('shows a busy overlay while the summary is refreshing', () => {
		render(BrowseSidebarSummary, {
			props: {
				totalCount: 5,
				currentPage: 1,
				totalPages: 1,
				searchQuery: '고객',
				variant: 'card',
				loading: true,
				loadingText: '검색 결과 요약을 다시 계산하는 중입니다.'
			}
		});

		const region = screen.getByRole('region', { name: '검색 결과 요약' });
		expect(region).toHaveAttribute('aria-busy', 'true');
		expect(screen.getByText('갱신 중')).toBeInTheDocument();
		expect(screen.getByText('검색 결과 요약을 다시 계산하는 중입니다.')).toBeInTheDocument();
	});

	it('renders custom summary items with value styling overrides in a single-column stack', () => {
		render(BrowseSidebarSummary, {
			props: {
				totalCount: 0,
				currentPage: 1,
				totalPages: 1,
				variant: 'card',
				ariaLabel: '데이터 소스 요약',
				subtitle: '저장된 연결 현황',
				items: [
					{ label: '저장된 연결', value: 3 },
					{ label: 'SSL 사용', value: 1 },
					{
						label: '최근 점검',
						value: '2026. 3. 13. 오후 2:00',
						span: 2,
						valueClass: 'mt-1 text-sm font-medium text-content'
					}
				]
			}
		});

		const region = screen.getByRole('region', { name: '데이터 소스 요약' });
		const summaryGrid = region.querySelector('.grid');
		expect(screen.getByText('저장된 연결')).toBeInTheDocument();
		expect(screen.getByText('SSL 사용')).toBeInTheDocument();
		expect(summaryGrid).toHaveClass('grid-cols-1');
		expect(screen.getByText('최근 점검').closest('div')).not.toHaveClass('col-span-2');
		expect(screen.getByText('2026. 3. 13. 오후 2:00')).toHaveClass(
			'mt-1',
			'text-sm',
			'font-medium',
			'text-content'
		);
		expect(region).toHaveClass('hidden');
		expect(region).toHaveClass('lg:block');
	});
});
