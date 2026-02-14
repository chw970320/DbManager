import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { TermEntry } from '$lib/types/term';
import type { VocabularyData } from '$lib/types/vocabulary';

// Mock 모듈들
vi.mock('$lib/registry/data-registry', () => ({
	loadData: vi.fn(),
	listFiles: vi.fn()
}));

vi.mock('$lib/registry/cache-registry', () => ({
	getCachedData: vi.fn()
}));

vi.mock('$lib/registry/mapping-registry', () => ({
	resolveRelatedFilenames: vi.fn()
}));

vi.mock('$lib/utils/validation.js', () => ({
	validateTermNameSuffix: vi.fn(() => null),
	validateTermNameUniqueness: vi.fn(() => null),
	validateTermUniqueness: vi.fn(() => null),
	validateTermNameMapping: vi.fn(() => null),
	validateColumnNameMapping: vi.fn(() => null),
	validateTermColumnOrderMapping: vi.fn(() => ({
		error: null,
		mismatches: [],
		correctedColumnName: null
	}))
}));

// Mock import
import { loadData, listFiles } from '$lib/registry/data-registry';
import { getCachedData } from '$lib/registry/cache-registry';
import { resolveRelatedFilenames } from '$lib/registry/mapping-registry';
import {
	validateTermNameSuffix,
	validateTermNameUniqueness,
	validateTermUniqueness,
	validateTermNameMapping,
	validateColumnNameMapping,
	validateTermColumnOrderMapping
} from '$lib/utils/validation.js';

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
		vi.mocked(resolveRelatedFilenames).mockResolvedValue(
			new Map([
				['vocabulary', 'vocabulary.json'],
				['domain', 'domain.json']
			])
		);
		vi.mocked(loadData).mockImplementation(async (type: string) => {
			if (type === 'term') return mockTermData;
			return { entries: [], lastUpdated: '', totalCount: 0 };
		});
		vi.mocked(listFiles).mockResolvedValue(['term.json']);
		vi.mocked(getCachedData).mockResolvedValue(mockVocabularyData);
		vi.mocked(validateTermNameSuffix).mockReturnValue(null);
		vi.mocked(validateTermNameUniqueness).mockReturnValue(null);
		vi.mocked(validateTermUniqueness).mockReturnValue(null);
		vi.mocked(validateTermNameMapping).mockReturnValue(null);
		vi.mocked(validateColumnNameMapping).mockReturnValue(null);
		vi.mocked(validateTermColumnOrderMapping).mockReturnValue({
			error: null,
			mismatches: [],
			correctedColumnName: null
		});
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

		expect(loadData).toHaveBeenCalledWith('term', 'custom-term.json');
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

		expect(loadData).toHaveBeenCalledWith('term', 'term.json');
	});

	// 새로 추가된 검증 기능 테스트
	describe('용어명 매핑 validation', () => {
		it('용어명에 단어집에 없는 단어가 포함된 경우 400 에러를 반환한다', async () => {
			vi.mocked(validateTermNameMapping).mockReturnValue(
				"용어명의 다음 부분이 단어집에 등록되지 않았습니다: 가능"
			);

			const request = createMockRequestEvent({
				body: {
					termName: '가능_여부',
					columnName: '##_YN',
					domainName: ''
				}
			});

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('단어집에 등록되지 않았습니다');
			// 상세 오류 목록도 반환되어야 함
			expect(result.data).toBeDefined();
			expect(result.data.errors).toBeDefined();
			expect(result.data.errors.length).toBeGreaterThan(0);
		});

		it('용어명 매핑이 성공하면 validateTermNameMapping을 호출한다', async () => {
			const request = createMockRequestEvent({
				body: {
					termName: '사용자_이름',
					columnName: 'USER_NAME',
					domainName: ''
				}
			});

			await POST(request);

			expect(validateTermNameMapping).toHaveBeenCalledWith('사용자_이름', expect.any(Array));
		});
	});

	describe('컬럼명 매핑 validation', () => {
		it('컬럼명에 영문약어에 없는 단어가 포함된 경우 400 에러를 반환한다', async () => {
			vi.mocked(validateColumnNameMapping).mockReturnValue(
				"컬럼명의 다음 부분이 영문약어로 등록되지 않았습니다: ##"
			);

			const request = createMockRequestEvent({
				body: {
					termName: '가능_여부',
					columnName: '##_YN',
					domainName: ''
				}
			});

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('영문약어로 등록되지 않았습니다');
		});

		it('컬럼명 매핑 validation이 호출된다', async () => {
			const request = createMockRequestEvent({
				body: {
					termName: '사용자_이름',
					columnName: 'USER_NAME',
					domainName: ''
				}
			});

			await POST(request);

			expect(validateColumnNameMapping).toHaveBeenCalledWith('USER_NAME', expect.any(Array));
		});
	});

	describe('용어명-컬럼명 순서 일치 validation', () => {
		it('순서가 불일치하면 400 에러를 반환한다', async () => {
			vi.mocked(validateTermColumnOrderMapping).mockReturnValue({
				error: '용어명과 컬럼명의 단어 순서가 일치하지 않습니다.',
				mismatches: [
					{
						index: 0,
						termPart: '사용자',
						expectedAbbreviation: 'USER',
						actualColumnPart: 'NAME'
					}
				],
				correctedColumnName: 'USER_NAME'
			});

			const request = createMockRequestEvent({
				body: {
					termName: '사용자_이름',
					columnName: 'NAME_USER',
					domainName: ''
				}
			});

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('순서가 일치하지 않습니다');
		});

		it('용어명 매핑이 실패하면 순서 검증을 건너뛴다', async () => {
			vi.mocked(validateTermNameMapping).mockReturnValue('매핑 실패');

			const request = createMockRequestEvent({
				body: {
					termName: '가능_여부',
					columnName: '##_YN',
					domainName: ''
				}
			});

			await POST(request);

			// 용어명 매핑이 실패하면 순서 검증은 호출되지 않아야 함
			expect(validateTermColumnOrderMapping).not.toHaveBeenCalled();
		});

		it('컬럼명 매핑이 실패하면 순서 검증을 건너뛴다', async () => {
			vi.mocked(validateColumnNameMapping).mockReturnValue('매핑 실패');

			const request = createMockRequestEvent({
				body: {
					termName: '사용자_이름',
					columnName: '##_NAME',
					domainName: ''
				}
			});

			await POST(request);

			// 컬럼명 매핑이 실패하면 순서 검증은 호출되지 않아야 함
			expect(validateTermColumnOrderMapping).not.toHaveBeenCalled();
		});
	});

	describe('복수 오류 처리', () => {
		it('여러 검증이 동시에 실패하면 모든 오류를 반환한다', async () => {
			vi.mocked(validateTermNameMapping).mockReturnValue('용어명 매핑 실패');
			vi.mocked(validateColumnNameMapping).mockReturnValue('컬럼명 매핑 실패');
			vi.mocked(validateTermNameSuffix).mockReturnValue('접미사 검증 실패');

			const request = createMockRequestEvent({
				body: {
					termName: '가능_여부',
					columnName: '##_YN',
					domainName: ''
				}
			});

			const response = await POST(request);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.data).toBeDefined();
			expect(result.data.errors).toBeDefined();
			// 용어명 매핑, 컬럼명 매핑, 접미사 = 3개 오류
			expect(result.data.errors.length).toBe(3);
			expect(result.data.errorCount).toBe(3);
		});

		it('오류가 우선순위대로 정렬된다', async () => {
			vi.mocked(validateTermNameSuffix).mockReturnValue('접미사 검증 실패');
			vi.mocked(validateTermNameMapping).mockReturnValue('용어명 매핑 실패');

			const request = createMockRequestEvent({
				body: {
					termName: '가능_여부',
					columnName: 'ABLE_YN',
					domainName: ''
				}
			});

			const response = await POST(request);
			const result = await response.json();

			expect(result.data.errors[0].type).toBe('TERM_NAME_MAPPING');
			expect(result.data.errors[1].type).toBe('TERM_NAME_SUFFIX');
		});
	});
});
