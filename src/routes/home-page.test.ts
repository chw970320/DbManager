import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import Page from './+page.svelte';
import { menuGroups } from '$lib/utils/navigation';

describe('Home page IA', () => {
	it('전역 navigation 그룹과 같은 제품 영역 빠른 이동을 렌더링한다', () => {
		render(Page);

		const quickNav = screen.getByRole('region', { name: '제품 영역 빠른 이동' });
		expect(quickNav).toHaveTextContent('전역 메뉴와 같은 그룹');

		for (const group of menuGroups) {
			expect(within(quickNav).getByRole('heading', { name: group.label })).toBeInTheDocument();

			for (const item of group.items) {
				expect(within(quickNav).getByRole('link', { name: item.label })).toHaveAttribute(
					'href',
					item.href
				);
			}
		}
	});
});
