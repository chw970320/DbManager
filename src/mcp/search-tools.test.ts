import { describe, expect, it } from 'vitest';

import { listFileBundles, resolveFileBundle, type FileBundle } from './bundles.js';
import { createDbManagerApiClient, DbManagerApiError } from './http-client.js';
import {
	convertTerm,
	getFilterOptions,
	searchBundle,
	searchDataType,
	searchVocabulary,
	segmentTerm,
	suggestVocabulary
} from './search-tools.js';
import { errorToolResult } from './tool-result.js';

type FetchCall = {
	url: string;
	method: string;
	body?: BodyInit | null;
};

const BIOMIMICRY_FILES: FileBundle = {
	vocabulary: 'biomimicry.json',
	domain: 'biomimicry.json',
	term: 'biomimicry.json',
	database: 'biomimicry.json',
	entity: 'biomimicry.json',
	attribute: 'biomimicry.json',
	table: 'biomimicry.json',
	column: 'biomimicry.json'
};

const ECOBANK_FILES: FileBundle = {
	vocabulary: 'ecobank.json',
	domain: 'ecobank.json',
	term: 'ecobank.json',
	database: 'ecobank.json',
	entity: 'ecobank.json',
	attribute: 'ecobank.json',
	table: 'ecobank.json',
	column: 'ecobank.json'
};

const DEFAULT_FILES: FileBundle = {
	vocabulary: 'vocabulary.json',
	domain: 'domain.json',
	term: 'term.json',
	database: 'database.json',
	entity: 'entity.json',
	attribute: 'attribute.json',
	table: 'table.json',
	column: 'column.json'
};

function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
	return new Response(JSON.stringify(data), {
		...init,
		headers: {
			'content-type': 'application/json',
			...init.headers
		}
	});
}

function createApiWithMock(
	handler?: (url: URL, init?: RequestInit) => Response | Promise<Response>
) {
	const calls: FetchCall[] = [];
	const fetchImpl: typeof fetch = async (input, init) => {
		const url = new URL(String(input));
		calls.push({
			url: String(input),
			method: init?.method ?? 'GET',
			body: init?.body
		});

		if (handler) {
			return handler(url, init);
		}

		if (url.pathname === '/api/design-snapshots') {
			return jsonResponse({
				success: true,
				data: {
					bundles: [
						{
							id: 'bio',
							name: 'biomimicry 번들',
							files: BIOMIMICRY_FILES,
							createdAt: '2026-01-01T00:00:00.000Z',
							updatedAt: '2026-01-02T00:00:00.000Z'
						},
						{
							id: 'eco',
							name: 'ecobank 번들',
							files: ECOBANK_FILES,
							createdAt: '2026-01-01T00:00:00.000Z',
							updatedAt: '2026-01-02T00:00:00.000Z'
						},
						{
							id: 'default-shared-file-mapping',
							name: '기본 공통 번들',
							files: DEFAULT_FILES,
							createdAt: '2026-01-01T00:00:00.000Z',
							updatedAt: '2026-01-02T00:00:00.000Z'
						}
					]
				}
			});
		}

		if (url.pathname === '/api/generator') {
			return jsonResponse({ success: true, data: { result: 'VSTR_CNT_PRST_YM' } });
		}

		if (url.pathname === '/api/generator/segment') {
			return jsonResponse({ success: true, data: { segmentedTerm: 'VSTR_CNT_PRST_YM' } });
		}

		return jsonResponse({
			success: true,
			data: {
				entries: [{ id: 'row-1' }],
				pagination: { currentPage: 1, totalPages: 1, totalCount: 1, limit: 20 }
			}
		});
	};

	return {
		api: createDbManagerApiClient({ baseUrl: 'http://localhost:5173', fetchImpl }),
		calls
	};
}

function lastUrl(calls: FetchCall): URL {
	return new URL(calls.url);
}

describe('DbManager MCP bundle resolution', () => {
	it('lists and resolves biomimicry bundles from the app API', async () => {
		const { api } = createApiWithMock();

		const bundles = await listFileBundles(api);
		const resolution = await resolveFileBundle(api, { bundleName: 'biomimicry' });

		expect(bundles).toHaveLength(2);
		expect(resolution.status).toBe('resolved');
		if (resolution.status === 'resolved') {
			expect(resolution.bundle.files.term).toBe('biomimicry.json');
		}
	});

	it('hides the default bundle when custom bundles exist', async () => {
		const { api } = createApiWithMock();

		const bundles = await listFileBundles(api);
		const result = await searchVocabulary(api, { query: '방문자' });

		expect(bundles.map((bundle) => bundle.id)).toEqual(['bio', 'eco']);
		expect(result.status).toBe('needs_bundle_selection');
		if (result.status === 'needs_bundle_selection') {
			expect(result.bundles.map((bundle) => bundle.id)).toEqual(['bio', 'eco']);
		}
	});

	it('shows the default bundle when it is the only available bundle', async () => {
		const { api } = createApiWithMock((url) => {
			if (url.pathname === '/api/design-snapshots') {
				return jsonResponse({
					success: true,
					data: {
						bundles: [
							{
								id: 'default-shared-file-mapping',
								name: '기본 공통 번들',
								files: DEFAULT_FILES
							}
						]
					}
				});
			}

			return jsonResponse({ success: true, data: { entries: [] } });
		});

		const bundles = await listFileBundles(api);
		const result = await searchVocabulary(api, { query: '방문자' });

		expect(bundles.map((bundle) => bundle.id)).toEqual(['default-shared-file-mapping']);
		expect(result.status).toBe('needs_bundle_selection');
		if (result.status === 'needs_bundle_selection') {
			expect(result.bundles.map((bundle) => bundle.id)).toEqual(['default-shared-file-mapping']);
		}
	});

	it('rejects conflicting bundleId and bundleName selectors', async () => {
		const { api } = createApiWithMock();

		const resolution = await resolveFileBundle(api, {
			bundleId: 'bio',
			bundleName: 'ecobank'
		});

		expect(resolution.status).toBe('bundle_resolution_error');
		if (resolution.status === 'bundle_resolution_error') {
			expect(resolution.message).toContain('different file bundles');
			expect(resolution.details?.bundleIdMatch).toBe('bio');
			expect(resolution.details?.bundleNameMatch).toBe('eco');
		}
	});

	it('rejects complete bundleFiles when bundleId and bundleName conflict', async () => {
		const { api } = createApiWithMock();

		const resolution = await resolveFileBundle(api, {
			bundleId: 'bio',
			bundleName: 'ecobank',
			bundleFiles: BIOMIMICRY_FILES
		});

		expect(resolution.status).toBe('bundle_resolution_error');
		if (resolution.status === 'bundle_resolution_error') {
			expect(resolution.message).toContain('different file bundles');
			expect(resolution.details?.bundleIdMatch).toBe('bio');
			expect(resolution.details?.bundleNameMatch).toBe('eco');
		}
	});

	it('returns needs_bundle_selection when no bundle selector or filename is provided', async () => {
		const { api } = createApiWithMock();

		const result = await searchVocabulary(api, { query: '방문자' });

		expect(result.status).toBe('needs_bundle_selection');
		if (result.status === 'needs_bundle_selection') {
			expect(result.bundles).toHaveLength(2);
		}
	});

	it('does not accept filename-only reads without a bundle selector', async () => {
		const { api } = createApiWithMock();

		const result = await searchVocabulary(api, {
			query: '방문자',
			filename: 'biomimicry.json'
		});

		expect(result.status).toBe('needs_bundle_selection');
		if (result.status === 'needs_bundle_selection') {
			expect(result.bundles).toHaveLength(2);
		}
	});

	it('rejects a filename that conflicts with the provided bundle selector', async () => {
		const { api } = createApiWithMock();

		const result = await searchVocabulary(api, {
			query: '방문자',
			bundleName: 'bio',
			filename: 'vocabulary.json'
		});

		expect(result.status).toBe('bundle_resolution_error');
		if (result.status === 'bundle_resolution_error') {
			expect(result.message).toContain('filename does not match');
			expect(result.details?.expectedFilename).toBe('biomimicry.json');
		}
	});
});

describe('DbManager MCP search tools', () => {
	it('routes vocabulary search and suggestions through the resolved vocabulary filename', async () => {
		const { api, calls } = createApiWithMock();

		const searchResult = await searchVocabulary(api, {
			query: '방문자',
			bundleName: 'bio',
			exact: true
		});
		const suggestResult = await suggestVocabulary(api, {
			query: '방',
			bundleName: 'bio',
			limit: 7
		});

		const searchUrl = lastUrl(calls[1]);
		const suggestUrl = lastUrl(calls[3]);
		expect(searchResult.status).toBe('ok');
		expect(suggestResult.status).toBe('ok');
		expect(searchUrl.pathname).toBe('/api/search');
		expect(searchUrl.searchParams.get('filename')).toBe('biomimicry.json');
		expect(searchUrl.searchParams.get('q')).toBe('방문자');
		expect(searchUrl.searchParams.get('exact')).toBe('true');
		expect(suggestUrl.searchParams.get('filename')).toBe('biomimicry.json');
		expect(calls[3].method).toBe('POST');
		expect(calls[3].body).toBe(JSON.stringify({ query: '방', limit: 7 }));
	});

	it('routes a DB design search through the resolved table filename and filters', async () => {
		const { api, calls } = createApiWithMock();

		const result = await searchDataType(api, 'table', {
			query: '방문자',
			field: 'tableKoreanName',
			bundleName: 'bio',
			filters: { schemaName: 'PUBLIC' }
		});

		const url = lastUrl(calls[1]);
		expect(result.status).toBe('ok');
		expect(url.pathname).toBe('/api/table');
		expect(url.searchParams.get('filename')).toBe('biomimicry.json');
		expect(url.searchParams.get('q')).toBe('방문자');
		expect(url.searchParams.get('field')).toBe('tableKoreanName');
		expect(url.searchParams.get('filters[schemaName]')).toBe('PUBLIC');
	});

	it('rejects generic search limits above the backend contract before calling APIs', async () => {
		const { api, calls } = createApiWithMock();

		const result = await searchDataType(api, 'table', {
			query: '방문자',
			bundleName: 'bio',
			limit: 101
		});

		expect(result.status).toBe('input_error');
		expect(calls).toHaveLength(0);
	});

	it('routes filter options through the resolved per-type filename', async () => {
		const { api, calls } = createApiWithMock();

		const result = await getFilterOptions(api, {
			type: 'column',
			bundleName: 'bio'
		});

		const url = lastUrl(calls[1]);
		expect(result.status).toBe('ok');
		expect(url.pathname).toBe('/api/column/filter-options');
		expect(url.searchParams.get('filename')).toBe('biomimicry.json');
	});

	it('returns grouped search_bundle results from the same resolved bundle', async () => {
		const { api } = createApiWithMock();

		const result = await searchBundle(api, {
			query: '방문자',
			bundleName: 'bio',
			types: ['vocabulary', 'term'],
			limitPerType: 2
		});

		expect(result.status).toBe('ok');
		if (result.status === 'ok') {
			expect(result.bundle.files.vocabulary).toBe('biomimicry.json');
			expect(result.results.vocabulary.filename).toBe('biomimicry.json');
			expect(result.results.term.filename).toBe('biomimicry.json');
		}
	});

	it('rejects search_bundle limits above the backend contract before calling APIs', async () => {
		const { api, calls } = createApiWithMock();

		const result = await searchBundle(api, {
			query: '방문자',
			bundleName: 'bio',
			limitPerType: 101
		});

		expect(result.status).toBe('input_error');
		expect(calls).toHaveLength(0);
	});

	it('searches all 8 bundle types by default', async () => {
		const { api } = createApiWithMock();

		const result = await searchBundle(api, {
			query: '방문자',
			bundleName: 'bio'
		});

		expect(result.status).toBe('ok');
		if (result.status === 'ok') {
			expect(Object.keys(result.results).sort()).toEqual([
				'attribute',
				'column',
				'database',
				'domain',
				'entity',
				'table',
				'term',
				'vocabulary'
			]);
		}
	});
});

describe('DbManager MCP generator tools', () => {
	it('uses the resolved term file for conversion and segmentation', async () => {
		const { api, calls } = createApiWithMock();

		const converted = await convertTerm(api, {
			term: '방문자_수_현황_연월',
			direction: 'ko-to-en',
			bundleName: 'bio'
		});
		const segmented = await segmentTerm(api, {
			term: 'VSTRCNTPRSTYM',
			direction: 'en-to-ko',
			bundleName: 'bio'
		});

		const convertUrl = lastUrl(calls[1]);
		const segmentUrl = lastUrl(calls[3]);
		expect(converted.status).toBe('ok');
		expect(segmented.status).toBe('ok');
		expect(convertUrl.pathname).toBe('/api/generator');
		expect(convertUrl.searchParams.get('filename')).toBe('biomimicry.json');
		expect(segmentUrl.pathname).toBe('/api/generator/segment');
		expect(segmentUrl.searchParams.get('filename')).toBe('biomimicry.json');
		expect(calls[1].body).toBe(
			JSON.stringify({ term: '방문자_수_현황_연월', direction: 'ko-to-en' })
		);
		expect(calls[3].body).toBe(JSON.stringify({ term: 'VSTRCNTPRSTYM', direction: 'en-to-ko' }));
	});
});

describe('DbManager MCP upstream errors', () => {
	it('propagates HTTP API errors with status and response body', async () => {
		const { api } = createApiWithMock((url) => {
			if (url.pathname === '/api/design-snapshots') {
				return jsonResponse({
					success: true,
					data: {
						bundles: [
							{
								id: 'bio',
								name: 'biomimicry 번들',
								files: BIOMIMICRY_FILES
							}
						]
					}
				});
			}

			return jsonResponse({ success: false, error: '데이터 로드 실패' }, { status: 500 });
		});

		await expect(
			searchVocabulary(api, { query: '방문자', bundleName: 'bio' })
		).rejects.toMatchObject({
			status: 500,
			responseBody: { success: false, error: '데이터 로드 실패' }
		});
	});

	it('formats missing app-server/network failures for MCP tool output', async () => {
		const api = createDbManagerApiClient({
			baseUrl: 'http://localhost:5173',
			fetchImpl: async () => {
				throw new Error('connect ECONNREFUSED 127.0.0.1:5173');
			}
		});

		let error: unknown;
		try {
			await listFileBundles(api);
		} catch (caught) {
			error = caught;
		}

		expect(error).toBeInstanceOf(DbManagerApiError);
		const result = errorToolResult(error);
		expect(result.structuredContent?.status).toBe('upstream_error');
		expect(result.structuredContent?.message).toContain('ECONNREFUSED');
	});
});
