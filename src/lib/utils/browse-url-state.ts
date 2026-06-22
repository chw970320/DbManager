export type BrowseOpenMode = '' | 'detail';

export interface BrowseUrlState {
	filename: string;
	query: string;
	field: string;
	exact: boolean;
	targetId: string;
	open: BrowseOpenMode;
}

export function readBrowseUrlState(search: string | URLSearchParams): BrowseUrlState {
	const params = typeof search === 'string' ? new URLSearchParams(search) : search;
	const targetId = normalizeParam(params.get('target'));
	return {
		filename: normalizeParam(params.get('filename')),
		query: normalizeParam(params.get('q')),
		field: normalizeParam(params.get('field')) || 'all',
		exact: params.get('exact') === 'true',
		targetId,
		open: targetId && params.get('open') === 'detail' ? 'detail' : ''
	};
}

export function createBrowseHref(
	route: string,
	options: {
		filename?: string;
		query?: string;
		field?: string;
		exact?: boolean;
		targetId?: string;
		open?: BrowseOpenMode;
	}
): string {
	const params = new URLSearchParams();
	const filename = normalizeParam(options.filename);
	const query = normalizeParam(options.query);
	const field = normalizeParam(options.field) || 'all';
	const targetId = normalizeParam(options.targetId);

	if (filename) {
		params.set('filename', filename);
	}
	if (query) {
		params.set('q', query);
		params.set('field', field);
		params.set('exact', String(options.exact === true));
	}
	if (targetId) {
		params.set('target', targetId);
		if (options.open === 'detail') {
			params.set('open', 'detail');
		}
	}

	const serialized = params.toString();
	return serialized ? `${route}?${serialized}` : route;
}

function normalizeParam(value: string | null | undefined): string {
	return value?.trim() ?? '';
}
