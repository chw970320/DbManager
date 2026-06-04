import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import TablePagination from './TablePagination.svelte';

describe('TablePagination', () => {
	it('한 페이지뿐이면 페이지네이션을 렌더링하지 않는다', () => {
		render(TablePagination, { props: { currentPage: 1, totalPages: 1 } });

		expect(screen.queryByLabelText('Pagination')).not.toBeInTheDocument();
	});

	it('현재 페이지와 축약된 페이지 번호를 표시한다', () => {
		render(TablePagination, { props: { currentPage: 5, totalPages: 10 } });

		expect(screen.getByText(/총/)).toHaveTextContent('총 10 페이지 중 5 페이지');
		expect(screen.getByRole('button', { name: '5' })).toHaveAttribute('aria-current', 'page');
		expect(screen.getAllByText('...')).toHaveLength(2);
	});

	it('유효한 페이지 이동만 전달한다', async () => {
		const onpagechange = vi.fn();
		render(TablePagination, { props: { currentPage: 1, totalPages: 3, onpagechange } });

		await fireEvent.click(screen.getByRole('button', { name: '이전' }));
		expect(onpagechange).not.toHaveBeenCalled();

		await fireEvent.click(screen.getByRole('button', { name: '2' }));
		expect(onpagechange).toHaveBeenCalledWith({ page: 2 });
	});

	it('로딩 중에는 페이지 이동을 막는다', async () => {
		const onpagechange = vi.fn();
		render(TablePagination, {
			props: { currentPage: 2, totalPages: 3, loading: true, onpagechange }
		});

		await fireEvent.click(screen.getByRole('button', { name: '3' }));

		expect(onpagechange).not.toHaveBeenCalled();
		expect(screen.getByRole('button', { name: '3' })).toBeDisabled();
	});
});
