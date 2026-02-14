import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { VocabularyData } from '$lib/types/vocabulary';

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

const createMockVocabularyData = (mapping?: { domain: string }): VocabularyData => ({
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
	const url = new URL('http://localhost/api/vocabulary/files/mapping');

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

describe('Vocabulary Mapping API: /api/vocabulary/files/mapping', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(resolveRelatedFilenames).mockResolvedValue(new Map([['domain', 'domain.json']]));
		vi.mocked(getMappingsFor).mockResolvedValue([]);
	});

	describe('GET', () => {
		it('should return mapping info successfully', async () => {
			vi.mocked(loadData).mockResolvedValue(createMockVocabularyData({ domain: 'custom-domain.json' }));
			vi.mocked(resolveRelatedFilenames).mockResolvedValue(
				new Map([['domain', 'custom-domain.json']])
			);

			const event = createMockRequestEvent({});
			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.mapping.domain).toBe('custom-domain.json');
			expect(loadData).toHaveBeenCalledWith('vocabulary', 'vocabulary.json');
		});

		it('should use specified filename parameter', async () => {
			vi.mocked(loadData).mockResolvedValue(createMockVocabularyData());

			const event = createMockRequestEvent({
				searchParams: { filename: 'custom.json' }
			});
			await GET(event);

			expect(loadData).toHaveBeenCalledWith('vocabulary', 'custom.json');
		});

		it('should use default filename when not specified', async () => {
			vi.mocked(loadData).mockResolvedValue(createMockVocabularyData());

			const event = createMockRequestEvent({});
			await GET(event);

			expect(loadData).toHaveBeenCalledWith('vocabulary', 'vocabulary.json');
		});

		it('should return default mapping when resolver has no domain', async () => {
			vi.mocked(loadData).mockResolvedValue(createMockVocabularyData());
			vi.mocked(resolveRelatedFilenames).mockResolvedValue(new Map());

			const event = createMockRequestEvent({});
			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.data.mapping.domain).toBe('domain.json');
		});

		it('should return 500 on error', async () => {
			vi.mocked(loadData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

			const event = createMockRequestEvent({});
			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
			expect(result.error).toContain('찾을 수 없습니다');
		});
	});

	describe('PUT', () => {
		it('should save mapping info successfully', async () => {
			vi.mocked(loadData).mockResolvedValue(createMockVocabularyData());
			vi.mocked(saveData).mockResolvedValue(undefined);

			const event = createMockRequestEvent({
				method: 'PUT',
				body: {
					filename: 'vocabulary.json',
					mapping: { domain: 'new-domain.json' }
				}
			});
			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.mapping.domain).toBe('new-domain.json');
			expect(saveData).toHaveBeenCalledWith(
				'vocabulary',
				expect.objectContaining({
					mapping: { domain: 'new-domain.json' }
				}),
				'vocabulary.json'
			);
			expect(addMapping).toHaveBeenCalled();
		});

		it('should update existing registry mapping if present', async () => {
			vi.mocked(loadData).mockResolvedValue(createMockVocabularyData());
			vi.mocked(getMappingsFor).mockResolvedValue([
				{
					relatedType: 'domain',
					relation: { id: 'rel-1' }
				} as never
			]);

			const event = createMockRequestEvent({
				method: 'PUT',
				body: {
					filename: 'vocabulary.json',
					mapping: { domain: 'new-domain.json' }
				}
			});
			await PUT(event);

			expect(updateMapping).toHaveBeenCalledWith('rel-1', {
				targetFilename: 'new-domain.json'
			});
			expect(addMapping).not.toHaveBeenCalled();
		});

		it('should return 400 when filename is missing', async () => {
			const event = createMockRequestEvent({
				method: 'PUT',
				body: { mapping: { domain: 'domain.json' } }
			});
			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('파일명');
		});

		it('should return 400 when mapping is missing', async () => {
			const event = createMockRequestEvent({
				method: 'PUT',
				body: { filename: 'vocabulary.json' }
			});
			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('매핑 정보');
		});

		it('should return 400 when mapping.domain is missing', async () => {
			const event = createMockRequestEvent({
				method: 'PUT',
				body: { filename: 'vocabulary.json', mapping: {} }
			});
			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('domain');
		});

		it('should return 500 on file save error', async () => {
			vi.mocked(loadData).mockResolvedValue(createMockVocabularyData());
			vi.mocked(saveData).mockRejectedValue(new Error('저장 실패'));

			const event = createMockRequestEvent({
				method: 'PUT',
				body: {
					filename: 'vocabulary.json',
					mapping: { domain: 'domain.json' }
				}
			});
			const response = await PUT(event);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.success).toBe(false);
			expect(result.error).toContain('저장 실패');
		});
	});
});
