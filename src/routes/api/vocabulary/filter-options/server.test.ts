import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { VocabularyData } from '$lib/types/vocabulary';

// Mock 모듈들
vi.mock('$lib/utils/file-handler.js', () => ({
	loadVocabularyData: vi.fn()
}));

import { loadVocabularyData } from '$lib/utils/file-handler.js';

// 테스트용 Mock 데이터
const createMockVocabularyData = (): VocabularyData => ({
	entries: [
		{
			id: 'entry-1',
			standardName: '사용자',
			abbreviation: 'USER',
			englishName: 'User',
			description: '시스템 사용자',
			domainGroup: 'SYS',
			domainCategory: '시스템',
			isFormalWord: true,
			source: '내부',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'entry-2',
			standardName: '관리자',
			abbreviation: 'ADMIN',
			englishName: 'Administrator',
			description: '시스템 관리자',
			domainGroup: 'SYS',
			domainCategory: '시스템',
			isFormalWord: false,
			source: '',
			createdAt: '2024-01-02T00:00:00.000Z',
			updatedAt: '2024-01-02T00:00:00.000Z'
		},
		{
			id: 'entry-3',
			standardName: '계정',
			abbreviation: 'ACCT',
			englishName: 'Account',
			description: '사용자 계정',
			domainGroup: 'FIN',
			domainCategory: '',
			isFormalWord: true,
			source: null,
			createdAt: '2024-01-03T00:00:00.000Z',
			updatedAt: '2024-01-03T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-03T00:00:00.000Z',
	totalCount: 3
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: { searchParams?: Record<string, string> }): RequestEvent {
	const url = new URL('http://localhost/api/vocabulary/filter-options');

	if (options.searchParams) {
		Object.entries(options.searchParams).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});
	}

	return {
		url,
		request: new Request(url),
		params: {},
		locals: {},
		platform: undefined,
		route: { id: '/api/vocabulary/filter-options' },
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

describe('Vocabulary Filter Options API: /api/vocabulary/filter-options', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadVocabularyData).mockResolvedValue(createMockVocabularyData());
	});

	it('should return filter options successfully', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data.standardName).toBeInstanceOf(Array);
		expect(result.data.abbreviation).toBeInstanceOf(Array);
		expect(result.data.englishName).toBeInstanceOf(Array);
	});

	it('should return unique values for each filterable column', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.data.abbreviation).toHaveLength(3); // USER, ADMIN, ACCT
		expect(result.data.domainGroup).toHaveLength(2); // SYS, FIN
		expect(result.data.domainCategory).toContain('시스템');
	});

	it('should include "(빈값)" option for nullable fields', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		// domainCategory는 빈값이 있으므로 "(빈값)" 포함
		expect(result.data.domainCategory).toContain('(빈값)');
		// source도 빈값이 있으므로 "(빈값)" 포함
		expect(result.data.source).toContain('(빈값)');
	});

	it('should convert isFormalWord boolean to Y/N', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.data.isFormalWord).toContain('Y');
		expect(result.data.isFormalWord).toContain('N');
	});

	it('should use specified filename parameter', async () => {
		const event = createMockRequestEvent({
			searchParams: { filename: 'custom-vocabulary.json' }
		});

		await GET(event);

		expect(loadVocabularyData).toHaveBeenCalledWith('custom-vocabulary.json');
	});

	it('should use default filename when not specified', async () => {
		const event = createMockRequestEvent({});

		await GET(event);

		expect(loadVocabularyData).toHaveBeenCalledWith('vocabulary.json');
	});

	it('should return 500 on data load error', async () => {
		vi.mocked(loadVocabularyData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
		// API는 loadError.message를 그대로 반환하므로 실제 에러 메시지 확인
		expect(result.error).toBe('파일을 찾을 수 없습니다');
	});

	it('should sort filter options alphabetically', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		// abbreviation 정렬 확인
		const abbreviations = result.data.abbreviation;
		expect(abbreviations[0]).toBe('ACCT');
		expect(abbreviations[1]).toBe('ADMIN');
		expect(abbreviations[2]).toBe('USER');
	});

	it('should handle empty entries array', async () => {
		const emptyData: VocabularyData = {
			entries: [],
			lastUpdated: '2024-01-01T00:00:00.000Z',
			totalCount: 0
		};
		vi.mocked(loadVocabularyData).mockResolvedValue(emptyData);

		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		// 모든 필터 옵션이 빈 배열이어야 함
		expect(result.data.standardName).toEqual([]);
		expect(result.data.abbreviation).toEqual([]);
	});
});
