import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { TermData } from '$lib/types/term';
import type { VocabularyData } from '$lib/types/vocabulary';
import type { DomainData } from '$lib/types/domain';

// Mock 모듈들
vi.mock('$lib/registry/data-registry', () => ({
	loadTermData: vi.fn(),
	loadVocabularyData: vi.fn(),
	loadDomainData: vi.fn()
}));

import { loadTermData, loadVocabularyData, loadDomainData } from '$lib/registry/data-registry';

// 테스트용 Mock 데이터
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
			standardName: '이름',
			abbreviation: 'NAME',
			englishName: 'Name',
			domainCategory: '사용자분류',
			isDomainCategoryMapped: true,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 1
});

const createMockDomainData = (): DomainData => ({
	entries: [
		{
			id: 'domain-1',
			domainGroup: '공통표준도메인그룹',
			domainCategory: '사용자분류',
			standardDomainName: '사용자분류_VARCHAR(50)',
			physicalDataType: 'VARCHAR',
			dataLength: '50',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 1
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: { body?: unknown }): RequestEvent {
	const request = {
		json: vi.fn().mockResolvedValue(options.body || {}),
		method: 'POST'
	} as unknown as Request;

	return {
		request,
		url: new URL('http://localhost/api/term/recommend'),
		params: {},
		locals: {},
		platform: undefined,
		route: { id: '/api/term/recommend' },
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

describe('Term Recommend API: /api/term/recommend', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadTermData).mockResolvedValue(createMockTermData());
		vi.mocked(loadVocabularyData).mockResolvedValue(createMockVocabularyData());
		vi.mocked(loadDomainData).mockResolvedValue(createMockDomainData());
	});

	it('should return domain recommendations successfully', async () => {
		const event = createMockRequestEvent({
			body: {
				termName: '사용자_이름',
				filename: 'term.json'
			}
		});

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data.lastSegment).toBe('이름');
		expect(result.data.recommendations).toBeInstanceOf(Array);
	});

	it('should return empty recommendations when termName is empty', async () => {
		const event = createMockRequestEvent({
			body: {
				termName: '',
				filename: 'term.json'
			}
		});

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.recommendations).toEqual([]);
	});

	it('should return empty recommendations when last segment not found', async () => {
		const event = createMockRequestEvent({
			body: {
				termName: '없는단어',
				filename: 'term.json'
			}
		});

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.recommendations).toEqual([]);
	});

	it('should use specified filename parameter', async () => {
		const event = createMockRequestEvent({
			body: {
				termName: '사용자_이름',
				filename: 'custom-term.json'
			}
		});

		await POST(event);

		expect(loadTermData).toHaveBeenCalledWith('custom-term.json');
	});

	it('should use default filename when not specified', async () => {
		const event = createMockRequestEvent({
			body: {
				termName: '사용자_이름'
			}
		});

		await POST(event);

		expect(loadTermData).toHaveBeenCalledWith('term.json');
	});

	it('should return 500 on data load error', async () => {
		vi.mocked(loadTermData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

		const event = createMockRequestEvent({
			body: {
				termName: '사용자_이름',
				filename: 'term.json'
			}
		});

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
	});
});

