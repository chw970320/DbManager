import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { TermData } from '$lib/types/term';
import type { VocabularyData } from '$lib/types/vocabulary';
import { __clearGeneratorCacheForTest } from '$lib/registry/generator-cache';

vi.mock('$lib/registry/data-registry', () => ({
	loadTermData: vi.fn(),
	loadVocabularyData: vi.fn()
}));

import { loadTermData, loadVocabularyData } from '$lib/registry/data-registry';

const createMockTermData = (): TermData => ({
	entries: [],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 0,
	mapping: {
		vocabulary: 'vocabulary.json',
		domain: 'domain.json'
	}
});

const createMockVocabularyData = (): VocabularyData => ({
	entries: [
		{
			id: 'vocab-1',
			standardName: '방문자',
			abbreviation: 'VSTR',
			englishName: 'Visitor',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'vocab-2',
			standardName: '수',
			abbreviation: 'CNT',
			englishName: 'Count',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'vocab-3',
			standardName: '현황',
			abbreviation: 'PRST',
			englishName: 'Present',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'vocab-4',
			standardName: '연월',
			abbreviation: 'YM',
			englishName: 'Year Month',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 4
});

function createMockRequestEvent(options: {
	body?: unknown;
	searchParams?: Record<string, string>;
}): RequestEvent {
	const url = new URL('http://localhost/api/generator/segment');

	if (options.searchParams) {
		Object.entries(options.searchParams).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});
	}

	const request = {
		json: vi.fn().mockResolvedValue(options.body || {}),
		method: 'POST'
	} as unknown as Request;

	return {
		url,
		request,
		params: {},
		locals: {},
		platform: undefined,
		route: { id: '/api/generator/segment' },
		cookies: {
			get: vi.fn(),
			getAll: vi.fn(),
			set: vi.fn(),
			delete: vi.fn(),
			serialize: vi.fn()
		},
		fetch: vi.fn(),
		getClientAddress: vi.fn(() => '127.0.0.1'),
		setHeaders: vi.fn(),
		isDataRequest: false,
		isSubRequest: false
	} as unknown as RequestEvent;
}

describe('Generator Segment API: /api/generator/segment', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		__clearGeneratorCacheForTest();
		vi.mocked(loadTermData).mockResolvedValue(createMockTermData());
		vi.mocked(loadVocabularyData).mockResolvedValue(createMockVocabularyData());
	});

	it('should segment concatenated English abbreviations in en-to-ko direction', async () => {
		const event = createMockRequestEvent({
			body: {
				term: 'VSTRCNTPRSTYM',
				direction: 'en-to-ko'
			},
			searchParams: { filename: 'term.json' }
		});

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.segments).toContain('VSTR_CNT_PRST_YM');
	});

	it('should keep ## placeholder for unmatched English abbreviation parts', async () => {
		const event = createMockRequestEvent({
			body: {
				term: 'VSTR_UNKNOWN_YM',
				direction: 'en-to-ko'
			},
			searchParams: { filename: 'term.json' }
		});

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.segments).toContain('VSTR_##_YM');
	});

	it('should return 400 when direction is unsupported', async () => {
		const event = createMockRequestEvent({
			body: {
				term: 'VSTR_CNT',
				direction: 'invalid-direction'
			}
		});

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(result.error).toContain('변환 방향');
	});
});
