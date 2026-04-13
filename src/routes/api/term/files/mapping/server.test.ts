import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { GET, PUT } from './+server';

vi.mock('$lib/registry/db-design-file-mapping', () => ({
	resolveDbDesignFileMappingBundle: vi.fn(),
	saveDbDesignFileMappingBundle: vi.fn()
}));

vi.mock('$lib/registry/generator-cache', () => ({
	invalidateAllGeneratorCaches: vi.fn()
}));

import {
	resolveDbDesignFileMappingBundle,
	saveDbDesignFileMappingBundle
} from '$lib/registry/db-design-file-mapping';
import { invalidateAllGeneratorCaches } from '$lib/registry/generator-cache';

const FULL_BUNDLE = {
	vocabulary: 'vocabulary.json',
	domain: 'domain.json',
	term: 'term.json',
	database: 'database.json',
	entity: 'entity.json',
	attribute: 'attribute.json',
	table: 'table.json',
	column: 'column.json'
} as const;

function createCurrentMapping(excludedType: keyof typeof FULL_BUNDLE) {
	return Object.fromEntries(
		Object.entries(FULL_BUNDLE).filter(([type]) => type !== excludedType)
	) as Record<string, string>;
}

function createMockRequestEvent(options: {
	method?: string;
	body?: unknown;
	searchParams?: Record<string, string>;
	fetchImpl?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}): RequestEvent {
	const url = new URL('http://localhost/api/term/files/mapping');
	if (options.searchParams) {
		for (const [key, value] of Object.entries(options.searchParams)) {
			url.searchParams.set(key, value);
		}
	}

	const request = {
		json: vi.fn().mockResolvedValue(options.body || {}),
		method: options.method || 'GET'
	} as unknown as Request;

	return {
		url,
		request,
		fetch:
			(options.fetchImpl ||
				(async () =>
					new Response(JSON.stringify({ success: true, data: { updated: 0 } }), {
						status: 200,
						headers: { 'Content-Type': 'application/json' }
					}))) as RequestEvent['fetch']
	} as RequestEvent;
}

describe('Term Mapping API: /api/term/files/mapping', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(resolveDbDesignFileMappingBundle).mockResolvedValue({ ...FULL_BUNDLE });
		vi.mocked(saveDbDesignFileMappingBundle).mockResolvedValue({
			bundle: { ...FULL_BUNDLE },
			currentMapping: createCurrentMapping('term')
		});
	});

	it('GET should return the shared mapping bundle for the other seven files', async () => {
		const response = await GET(createMockRequestEvent({}));
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.mapping).toEqual(createCurrentMapping('term'));
	});

	it('PUT should save the shared mapping bundle', async () => {
		const fetchMock = vi.fn(async () =>
			new Response(
				JSON.stringify({
					success: true,
					data: { updated: 7 }
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			)
		);
		const mapping = {
			vocabulary: 'vocabulary-b.json',
			domain: 'domain-b.json',
			database: 'database-b.json',
			entity: 'entity-b.json',
			attribute: 'attribute-b.json',
			table: 'table-b.json',
			column: 'column-b.json'
		};
		const response = await PUT(
			createMockRequestEvent({
				method: 'PUT',
				fetchImpl: fetchMock,
				body: {
					filename: 'term.json',
					mapping
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(saveDbDesignFileMappingBundle).toHaveBeenCalledWith({
			currentType: 'term',
			currentFilename: 'term.json',
			mapping
		});
		expect(invalidateAllGeneratorCaches).toHaveBeenCalledTimes(1);
		expect(result.data.saved).toBe(true);
		expect(result.data.autoSync.success).toBe(true);
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/term/sync',
			expect.objectContaining({ method: 'POST', body: expect.any(String) })
		);
		const fetchCall = fetchMock.mock.calls[0] as unknown as
			| [string, RequestInit | undefined]
			| undefined;
		const requestBody = JSON.parse(String(fetchCall?.[1]?.body ?? '{}'));
		expect(requestBody).toMatchObject({
			apply: true,
			filename: 'term.json'
		});
	});

	it('PUT should return 400 on invalid mapping', async () => {
		const response = await PUT(
			createMockRequestEvent({
				method: 'PUT',
				body: {
					filename: 'term.json',
					mapping: {
						vocabulary: 'vocabulary-only.json',
						domain: 'domain-only.json'
					}
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(saveDbDesignFileMappingBundle).not.toHaveBeenCalled();
	});
});
