import { describe, expect, it } from 'vitest';

import { createBrowseHref, readBrowseUrlState } from './browse-url-state';

describe('browse URL state', () => {
	it('reads assistant navigation query params', () => {
		expect(
			readBrowseUrlState('?filename=biomimicry.json&q=%EB%B0%A9%EB%AC%B8%EC%9E%90&exact=true')
		).toEqual({
			filename: 'biomimicry.json',
			query: '방문자',
			field: 'all',
			exact: true
		});
	});

	it('builds a route href with filename and search context', () => {
		expect(
			createBrowseHref('/browse', {
				filename: 'biomimicry.json',
				query: '방문자',
				field: 'all',
				exact: false
			})
		).toBe('/browse?filename=biomimicry.json&q=%EB%B0%A9%EB%AC%B8%EC%9E%90&field=all&exact=false');
	});
});
