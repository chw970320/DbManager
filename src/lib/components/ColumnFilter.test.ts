import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ColumnFilter from './ColumnFilter.svelte';

describe('ColumnFilter', () => {
	it('필터 버튼 클릭 시 해당 컬럼 열림 요청을 보낸다', async () => {
		const onOpen = vi.fn();

		render(ColumnFilter, {
			props: {
				columnKey: 'dbmsInfo',
				columnLabel: 'DBMS정보',
				onOpen,
				onClose: vi.fn()
			}
		});

		const filterButton = screen.getByRole('button', { name: 'DBMS정보 필터' });
		await fireEvent.click(filterButton);

		expect(onOpen).toHaveBeenCalledWith('dbmsInfo');
		expect(filterButton).toHaveAttribute('aria-expanded', 'false');
		expect(filterButton).toHaveAttribute('aria-pressed', 'false');
		expect(screen.queryByText('적용')).not.toBeInTheDocument();
	});

	it('선택값을 적용하고 드롭다운 닫힘 요청을 보낸다', async () => {
		const onApply = vi.fn();
		const onClose = vi.fn();

		render(ColumnFilter, {
			props: {
				columnKey: 'dbmsInfo',
				columnLabel: 'DBMS정보',
				isOpen: true,
				options: ['MySQL', 'PostgreSQL'],
				onApply,
				onClose
			}
		});

		expect(screen.getByRole('dialog', { name: 'DBMS정보 필터' })).toBeInTheDocument();

		const select = screen.getByRole('combobox');
		await fireEvent.change(select, { target: { value: 'MySQL' } });

		expect(onApply).toHaveBeenCalledWith('MySQL');
		expect(onClose).toHaveBeenCalled();
	});

	it('활성 필터는 색상 외 상태와 현재 선택값을 함께 표시한다', () => {
		render(ColumnFilter, {
			props: {
				columnKey: 'dbmsInfo',
				columnLabel: 'DBMS정보',
				currentValue: 'MySQL',
				isOpen: true,
				options: ['MySQL', 'PostgreSQL'],
				onClose: vi.fn()
			}
		});

		const filterButton = screen.getByRole('button', { name: 'DBMS정보 필터' });
		expect(filterButton).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByText('적용')).toBeInTheDocument();
		expect(screen.getByText('필터 적용됨')).toHaveClass('sr-only');
		expect(screen.getByText('현재 선택: MySQL')).toBeInTheDocument();
	});

	it('전체 옵션 선택 시 null 필터를 적용한다', async () => {
		const onApply = vi.fn();

		render(ColumnFilter, {
			props: {
				columnKey: 'dbmsInfo',
				columnLabel: 'DBMS정보',
				currentValue: 'MySQL',
				isOpen: true,
				options: ['MySQL'],
				onApply,
				onClose: vi.fn()
			}
		});

		const select = screen.getByRole('combobox');
		await fireEvent.change(select, { target: { value: '' } });

		expect(onApply).toHaveBeenCalledWith(null);
	});
});
