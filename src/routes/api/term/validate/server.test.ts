import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { TermEntry } from '$lib/types/term';
import type { VocabularyData } from '$lib/types/vocabulary';

// Mock 모듈들
vi.mock('$lib/utils/file-handler.js', () => ({
	loadTermData: vi.fn(),
	listTermFiles: vi.fn(),
	loadVocabularyData: vi.fn()
}));

vi.mock('$lib/utils/validation.js', () => ({
	validateTermNameSuffix: vi.fn(() => null),
	validateTermNameUniqueness: vi.fn(() => null),
	validateTermUniqueness: vi.fn(() => null)
}));

// Mock import
import { loadTermData, listTermFiles, loadVocabularyData } from '$lib/utils/file-handler.js';
import { validateTermNameSuffix, validateTermNameUniqueness, validateTermUniqueness } from '$lib/utils/validation.js';

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: {
	body?: unknown;
	searchParams?: Record<string, string>;
}): RequestEvent {
	const url = new URL('http://localhost/api/term/validate');

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
		route: { id: '/api/term/validate' },
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

describe('Term Validate API: /api/term/validate', () => {
	const mockTermData = {
		entries: [
			{
				id: '1',
				termName: '사용자_이름',
				columnName: 'USER_NAME',
				domainName: '사용자분류_VARCHAR(50)',
				isMappedTerm: true,
				isMappedColumn: true,
				isMappedDomain: true,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z'
			}
		],
		lastUpdated: '2024-01-01T00:00:00.000Z',
		totalCount: 1,
		mapping: {
			vocabulary: 'vocabulary.json',
			domain: 'domain.json'
		}
	};

	const mockVocabularyData: VocabularyData = {
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
			}
		],
		lastUpdated: '2024-01-01T00:00:00.000Z',
		totalCount: 2
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadTermData).mockResolvedValue(mockTermData);
		vi.mocked(listTermFiles).mockResolvedValue(['term.json']);
		vi.mocked(loadVocabularyData).mockResolvedValue(mockVocabularyData);
		vi.mocked(validateTermNameSuffix).mockReturnValue(null);
		vi.mocked(validateTermNameUniqueness).mockReturnValue(null);
		vi.mocked(validateTermUniqueness).mockReturnValue(null);
	});

	it('용어 유효성 검증 성공: 유효한 용어 입력 시 success를 반환한다', async () => {
		const request = createMockRequestEvent({
			body: {
				termName: '사용자_이름',
				columnName: 'USER_NAME',
				domainName: '사용자분류_VARCHAR(50)'
			}
		});

		const response = await POST(request);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.message).toBe('Validation passed');
	});

	it('필수 필드 누락: termName 누락 시 400 에러를 반환한다', async () => {
		const request = createMockRequestEvent({
			body: {
				columnName: 'USER_NAME',
				domainName: '사용자분류_VARCHAR(50)'
			}
		});

		const response = await POST(request);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(result.error).toContain('용어명');
	});

	it('필수 필드 누락: columnName 누락 시 400 에러를 반환한다', async () => {
		const request = createMockRequestEvent({
			body: {
				termName: '사용자_이름',
				domainName: '사용자분류_VARCHAR(50)'
			}
		});

		const response = await POST(request);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(result.error).toContain('컬럼명');
	});

	it('용어명이 2단어 미만인 경우 400 에러를 반환한다', async () => {
		const request = createMockRequestEvent({
			body: {
				termName: '사용자',
				columnName: 'USER',
				domainName: '사용자분류_VARCHAR(50)'
			}
		});

		const response = await POST(request);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(result.error).toContain('2단어 이상');
	});

	it('용어명 접미사 validation 실패 시 400 에러를 반환한다', async () => {
		vi.mocked(validateTermNameSuffix).mockReturnValue('용어명 접미사 검증 실패');

		const request = createMockRequestEvent({
			body: {
				termName: '사용자_이름',
				columnName: 'USER_NAME',
				domainName: '사용자분류_VARCHAR(50)'
			}
		});

		const response = await POST(request);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(result.error).toContain('접미사 검증 실패');
	});

	it('용어명 중복 검사 (신규): 이미 존재하는 termName 입력 시 409 에러를 반환한다', async () => {
		vi.mocked(validateTermNameUniqueness).mockReturnValue('이미 존재하는 용어명입니다.');

		const request = createMockRequestEvent({
			body: {
				termName: '사용자_이름',
				columnName: 'USER_NAME',
				domainName: '사용자분류_VARCHAR(50)'
			}
		});

		const response = await POST(request);
		const result = await response.json();

		expect(response.status).toBe(409);
		expect(result.success).toBe(false);
		expect(result.error).toContain('이미 존재하는 용어명');
	});

	it('용어명 중복 검사 (수정): 자기 자신을 제외하고 중복 검사를 통과한다', async () => {
		const request = createMockRequestEvent({
			body: {
				termName: '사용자_이름',
				columnName: 'USER_NAME',
				domainName: '사용자분류_VARCHAR(50)',
				entryId: '1'
			}
		});

		const response = await POST(request);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
	});

	it('should use specified filename parameter', async () => {
		const request = createMockRequestEvent({
			body: {
				termName: '사용자_이름',
				columnName: 'USER_NAME',
				domainName: '사용자분류_VARCHAR(50)'
			},
			searchParams: { filename: 'custom-term.json' }
		});

		await POST(request);

		expect(loadTermData).toHaveBeenCalledWith('custom-term.json');
	});

	it('should use default filename when not specified', async () => {
		const request = createMockRequestEvent({
			body: {
				termName: '사용자_이름',
				columnName: 'USER_NAME',
				domainName: '사용자분류_VARCHAR(50)'
			}
		});

		await POST(request);

		expect(loadTermData).toHaveBeenCalledWith('term.json');
	});
});
