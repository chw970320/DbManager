import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SearchBar from './SearchBar.svelte';

const renderSearchBar = (props: Record<string, unknown> = {}) =>
	render(SearchBar, {
		props: {
			onsearch: vi.fn(),
			onclear: vi.fn(),
			...props
		}
	});

describe('SearchBar', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('검색 영역과 로딩 상태를 접근성 속성으로 노출한다', () => {
		renderSearchBar({ loading: true });

		expect(screen.getByRole('search', { name: '검색 조건' })).toHaveAttribute('aria-busy', 'true');
		expect(screen.getByText('검색 결과를 불러오는 중입니다.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '고급 검색' })).toHaveAttribute(
			'aria-expanded',
			'false'
		);
	});

	it('검색 입력을 debounce 후 onsearch로 전달한다', async () => {
		const onsearch = vi.fn();
		renderSearchBar({ onsearch });

		await fireEvent.input(screen.getByPlaceholderText('단어를 검색하세요...'), {
			target: { value: '고객' }
		});
		expect(onsearch).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(300);

		expect(onsearch).toHaveBeenCalledWith({ query: '고객', field: 'all', exact: false });
	});

	it('고급 검색 범위와 정확 일치 옵션을 검색 조건에 반영한다', async () => {
		const onsearch = vi.fn();
		renderSearchBar({ onsearch, query: 'user' });

		const advancedButton = screen.getByRole('button', { name: '고급 검색' });
		await fireEvent.click(advancedButton);

		expect(advancedButton).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByLabelText('검색 범위')).toBeInTheDocument();

		await fireEvent.change(screen.getByLabelText('검색 범위'), {
			target: { value: 'englishName' }
		});
		await vi.advanceTimersByTimeAsync(300);

		expect(onsearch).toHaveBeenLastCalledWith({
			query: 'user',
			field: 'englishName',
			exact: false
		});

		await fireEvent.click(screen.getByLabelText('정확히 일치'));
		await vi.advanceTimersByTimeAsync(300);

		expect(onsearch).toHaveBeenLastCalledWith({
			query: 'user',
			field: 'englishName',
			exact: true
		});
	});

	it('검색어 지우기와 Escape는 조건을 초기화하고 입력 포커스를 유지한다', async () => {
		const onclear = vi.fn();
		renderSearchBar({ query: '고객', onclear });

		const input = screen.getByPlaceholderText('단어를 검색하세요...');
		await fireEvent.click(screen.getByRole('button', { name: '검색어 지우기' }));

		expect(onclear).toHaveBeenCalledTimes(1);
		expect(input).toHaveValue('');
		expect(document.activeElement).toBe(input);

		await fireEvent.input(input, { target: { value: '재검색' } });
		await fireEvent.keyDown(input, { key: 'Escape' });

		expect(onclear).toHaveBeenCalledTimes(2);
		expect(input).toHaveValue('');
	});
});
