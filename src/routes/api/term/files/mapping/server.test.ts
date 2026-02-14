import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { TermData } from '$lib/types/term';

vi.mock('$lib/registry/data-registry', () => ({
	loadData: vi.fn(),
	saveData: vi.fn()
}));

vi.mock('$lib/registry/mapping-registry', () => ({
	resolveRelatedFilenames: vi.fn(),
	getMappingsFor: vi.fn(),
	updateMapping: vi.fn(),
	addMapping: vi.fn()
}));

import { loadData, saveData } from '$lib/registry/data-registry';
import {
	resolveRelatedFilenames,
	getMappingsFor,
	updateMapping,
	addMapping
} from '$lib/registry/mapping-registry';

const createMockTermData = (mapping?: { vocabulary: string; domain: string }): TermData => ({
	entries: [],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 0,
	mapping
});

function createMockRequestEvent(options: {
	method?: string;
	body?: unknown;
	searchParams?: Record<string, string>;
}): RequestEvent {
	const url = new URL('http://localhost/api/term/files/mapping');

	if (options.searchParams) {
		Object.entries(options.searchParams).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});
	}

	const request = {
		json: vi.fn().mockResolvedValue(options.body || {}),
		method: options.method || 'GET'
	} as unknown as Request;

	return {
		url,
		request
	} as RequestEvent;
}

describe('Term Mapping API: /api/term/files/mapping', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(resolveRelatedFilenames).mockResolvedValue(
			new Map([
				['vocabulary', 'vocabulary.json'],
				['domain', 'domain.json']
			])
		);
		vi.mocked(getMappingsFor).mockResolvedValue([]);
	});

	describe('GET', () => {
		it('should return mapping info successfully', async () => {
			vi.mocked(loadData).mockResolvedValue(
				createMockTermData({ vocabulary: 'custom-vocab.json', domain: 'custom-domain.json' })
			);
			vi.mocked(resolveRelatedFilenames).mockResolvedValue(
				new Map([
					['vocabulary', 'custom-vocab.json'],
					['domain', 'custom-domain.json']
				])
			);

			const event = createMockRequestEvent({});
			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.mapping.vocabulary).toBe('custom-vocab.json');
			expect(result.data.mapping.domain).toBe('custom-domain.json');
		});

		it('should use default filename when not specified', async () => {
			vi.mocked(loadData).mockResolvedValue(createMockTermData());

			const event = createMockRequestEvent({});
			await GET(event);

			expect(loadData).toHaveBeenCalledWith('term', 'term.json');
		});
	});

	describe('PUT', () => {
		it('should save mapping info with dual-write successfully', async () => {
			vi.mocked(loadData).mockResolvedValue(createMockTermData());
			vi.mocked(saveData).mockResolvedValue(undefined);

			const event = createMockRequestEvent({
				method: 'PUT',
				body: {
					filename: 'term.json',
					mapping: { vocabulary: 'new-vocab.json', domain: 'new-domain.json' }
				}
			});
			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.mapping.vocabulary).toBe('new-vocab.json');
			expect(result.data.mapping.domain).toBe('new-domain.json');
			expect(saveData).toHaveBeenCalledWith(
				'term',
				expect.objectContaining({
					mapping: { vocabulary: 'new-vocab.json', domain: 'new-domain.json' }
				}),
				'term.json'
			);
			expect(addMapping).toHaveBeenCalledTimes(2);
		});

		it('should update existing registry mappings when present', async () => {
			vi.mocked(loadData).mockResolvedValue(createMockTermData());
			vi.mocked(getMappingsFor).mockResolvedValue([
				{
					relatedType: 'vocabulary',
					relation: { id: 'rel-vocab' }
				},
				{
					relatedType: 'domain',
					relation: { id: 'rel-domain' }
				}
			] as never);

			const event = createMockRequestEvent({
				method: 'PUT',
				body: {
					filename: 'term.json',
					mapping: { vocabulary: 'vocab-x.json', domain: 'domain-x.json' }
				}
			});
			await PUT(event);

			expect(updateMapping).toHaveBeenCalledWith('rel-vocab', {
				targetFilename: 'vocab-x.json'
			});
			expect(updateMapping).toHaveBeenCalledWith('rel-domain', {
				targetFilename: 'domain-x.json'
			});
			expect(addMapping).not.toHaveBeenCalled();
		});

		it('should return 400 when mapping is invalid', async () => {
			const event = createMockRequestEvent({
				method: 'PUT',
				body: { filename: 'term.json', mapping: { vocabulary: 'v.json' } }
			});

			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
		});

		it('should keep success even if registry dual-write fails', async () => {
			vi.mocked(loadData).mockResolvedValue(createMockTermData());
			vi.mocked(getMappingsFor).mockRejectedValue(new Error('registry failed'));

			const event = createMockRequestEvent({
				method: 'PUT',
				body: {
					filename: 'term.json',
					mapping: { vocabulary: 'v.json', domain: 'd.json' }
				}
			});

			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(saveData).toHaveBeenCalled();
		});
	});
});
