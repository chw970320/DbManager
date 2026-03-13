import { describe, expect, it } from 'vitest';
import { findNavigationMatch, getNavigationBreadcrumbItems } from './navigation';

describe('navigation', () => {
	it('should resolve a grouped route to its menu group and current item', () => {
		const match = findNavigationMatch('/profiling/browse');

		expect(match).toMatchObject({
			group: { id: 'tools', label: '운영 · 품질' },
			item: { href: '/profiling/browse', label: '프로파일링', icon: 'chart-bar' }
		});
	});

	it('should build breadcrumb items with sibling menu links for grouped pages', () => {
		const items = getNavigationBreadcrumbItems('/quality-rule/browse');

		expect(items).toEqual([
			{
				label: '운영 · 품질',
				href: '/data-source/browse',
				children: [
					{ href: '/data-source/browse', label: '데이터 소스', icon: 'link' },
					{ href: '/quality-rule/browse', label: '품질 규칙', icon: 'check-circle' },
					{ href: '/profiling/browse', label: '프로파일링', icon: 'chart-bar' },
					{ href: '/snapshot/browse', label: '스냅샷', icon: 'save' }
				]
			},
			{
				label: '품질 규칙',
				href: '/quality-rule/browse'
			}
		]);
	});
});
