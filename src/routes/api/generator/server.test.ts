import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, __clearGeneratorCacheForTest } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { TermData } from '$lib/types/term';
import type { VocabularyData } from '$lib/types/vocabulary';

// Mock 모듈들
vi.mock('$lib/registry/data-registry', () => ({
	loadTermData: vi.fn(),
	loadVocabularyData: vi.fn()
}));

// Mock import
import { loadTermData, loadVocabularyData } from '$lib/registry/data-registry';

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
			standardName: '사용자',
			abbreviation: 'USER',
			englishName: 'User',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'vocab-2',
			standardName: '이름',
			abbreviation: 'NAME',
			englishName: 'Name',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'vocab-3',
			standardName: '방문자',
			abbreviation: 'VSTR',
			englishName: 'Visitor',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'vocab-4',
			standardName: '수',
			abbreviation: 'CNT',
			englishName: 'Count',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'vocab-5',
			standardName: '현황',
			abbreviation: 'PRST',
			englishName: 'Present',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'vocab-6',
			standardName: '연월',
			abbreviation: 'YM',
			englishName: 'Year Month',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 6
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: {
	body?: unknown;
	searchParams?: Record<string, string>;
}): RequestEvent {
	const url = new URL('http://localhost/api/generator');

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
		route: { id: '/api/generator' },
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

describe('Generator API: /api/generator', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		__clearGeneratorCacheForTest();
		vi.mocked(loadTermData).mockResolvedValue(createMockTermData());
		vi.mocked(loadVocabularyData).mockResolvedValue(createMockVocabularyData());
	});

	it('용어 조합 생성 성공: 한국어 입력 시 가능한 영문 컬럼명 조합 반환', async () => {
		const event = createMockRequestEvent({
			body: {
				term: '사용자_이름',
				direction: 'ko-to-en'
			},
			searchParams: { filename: 'term.json' }
		});

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.results).toBeInstanceOf(Array);
		expect(result.hasMultiple).toBeDefined();
	});

	it('단어집에 없는 단어: 단어집에 없는 단어 포함 시 빈 배열 또는 에러 반환', async () => {
		const event = createMockRequestEvent({
			body: {
				term: '없는단어_이름',
				direction: 'ko-to-en'
			},
			searchParams: { filename: 'term.json' }
		});

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		// '##'이 포함된 결과가 반환됨
		expect(result.results).toBeInstanceOf(Array);
	});

	it('한 단어 입력: 단일 단어 입력 시 조합 생성', async () => {
		const event = createMockRequestEvent({
			body: {
				term: '사용자',
				direction: 'ko-to-en'
			},
			searchParams: { filename: 'term.json' }
		});

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.results).toBeInstanceOf(Array);
	});

	it('영문 약어 입력: 영문→한글 방향으로 연결 단어집의 표준단어명을 반환', async () => {
		const event = createMockRequestEvent({
			body: {
				term: 'VSTR_CNT_PRST_YM',
				direction: 'en-to-ko'
			},
			searchParams: { filename: 'term.json' }
		});

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.results).toContain('방문자_수_현황_연월');
	});

	it('영문 약어 입력: 매칭되지 않는 영문 약어는 ##으로 표시', async () => {
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
		expect(result.results).toContain('방문자_##_연월');
	});

	it('filename 파라미터 사용: filename 파라미터로 특정 단어집 파일 사용', async () => {
		const event = createMockRequestEvent({
			body: {
				term: '사용자_이름',
				direction: 'ko-to-en'
			},
			searchParams: { filename: 'custom-term.json' }
		});

		await POST(event);

		expect(loadTermData).toHaveBeenCalledWith('custom-term.json');
	});

	it('should use default filename when not specified', async () => {
		const event = createMockRequestEvent({
			body: {
				term: '사용자_이름',
				direction: 'ko-to-en'
			}
		});

		await POST(event);

		expect(loadTermData).toHaveBeenCalledWith('term.json');
	});

	it('should return 400 when term is missing', async () => {
		const event = createMockRequestEvent({
			body: {
				direction: 'ko-to-en'
			}
		});

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(result.error).toContain('변환할 단어');
	});

	it('should return 400 when direction is unsupported', async () => {
		const event = createMockRequestEvent({
			body: {
				term: '사용자_이름',
				direction: 'invalid-direction'
			}
		});

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(result.error).toContain('변환 방향');
	});

	it('should return 500 on vocabulary load error', async () => {
		vi.mocked(loadVocabularyData).mockRejectedValue(new Error('단어집 파일을 찾을 수 없습니다'));

		const event = createMockRequestEvent({
			body: {
				term: '사용자_이름',
				direction: 'ko-to-en'
			}
		});

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
	});
});
