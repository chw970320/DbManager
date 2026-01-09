import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { DomainEntry } from '$lib/types/domain';

// Mock 모듈들
vi.mock('$lib/utils/file-handler.js', () => ({
	loadDomainData: vi.fn(),
	listDomainFiles: vi.fn()
}));

vi.mock('$lib/utils/validation.js', () => ({
	generateStandardDomainName: vi.fn((category, type, length, decimal) => {
		return `${category}_${type}${length ? `(${length})` : ''}${decimal ? `.${decimal}` : ''}`;
	}),
	validateDomainNameUniqueness: vi.fn(() => null)
}));

// Mock import
import { loadDomainData, listDomainFiles } from '$lib/utils/file-handler.js';
import { validateDomainNameUniqueness } from '$lib/utils/validation.js';

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: {
	body?: unknown;
	searchParams?: Record<string, string>;
}): RequestEvent {
	const url = new URL('http://localhost/api/domain/validate');

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
		route: { id: '/api/domain/validate' },
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

describe('Domain Validate API: /api/domain/validate', () => {
	const mockDomainData: { entries: DomainEntry[] } = {
		entries: [
			{
				id: '1',
				domainGroup: '공통표준도메인그룹',
				domainCategory: '사용자분류',
				standardDomainName: '사용자분류_VARCHAR(50)',
				physicalDataType: 'VARCHAR',
				dataLength: '50',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z'
			},
			{
				id: '2',
				domainGroup: '공통표준도메인그룹',
				domainCategory: '상태분류',
				standardDomainName: '상태분류_INT',
				physicalDataType: 'INT',
				createdAt: '2024-01-02T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z'
			}
		]
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadDomainData).mockResolvedValue({
			entries: mockDomainData.entries,
			lastUpdated: '2024-01-02T00:00:00.000Z',
			totalCount: 2
		});
		vi.mocked(listDomainFiles).mockResolvedValue(['domain.json']);
		vi.mocked(validateDomainNameUniqueness).mockReturnValue(null);
	});

	it('유효성 검증 성공: 유효한 도메인 정보 입력 시 success를 반환한다', async () => {
		const request = createMockRequestEvent({
			body: {
				domainCategory: '테스트분류',
				physicalDataType: 'VARCHAR',
				dataLength: '100'
			}
		});

		const response = await POST(request);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.message).toBe('Validation passed');
	});

	it('필수 필드 누락: domainCategory 누락 시 400 에러를 반환한다', async () => {
		const request = createMockRequestEvent({
			body: {
				physicalDataType: 'VARCHAR'
			}
		});

		const response = await POST(request);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(result.error).toContain('도메인 분류명');
	});

	it('필수 필드 누락: physicalDataType 누락 시 400 에러를 반환한다', async () => {
		const request = createMockRequestEvent({
			body: {
				domainCategory: '테스트분류'
			}
		});

		const response = await POST(request);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(result.error).toContain('물리 데이터타입');
	});

	it('중복 standardDomainName: 이미 존재하는 도메인명 입력 시 에러를 반환한다', async () => {
		vi.mocked(validateDomainNameUniqueness).mockReturnValue('이미 존재하는 도메인명입니다.');

		const request = createMockRequestEvent({
			body: {
				domainCategory: '사용자분류',
				physicalDataType: 'VARCHAR',
				dataLength: '50'
			}
		});

		const response = await POST(request);
		const result = await response.json();

		expect(response.status).toBe(409);
		expect(result.success).toBe(false);
		expect(result.error).toContain('이미 존재하는 도메인명');
	});

	it('영문약어 중복 검사 (수정): 자기 자신을 제외하고 중복 검사를 통과한다', async () => {
		const request = createMockRequestEvent({
			body: {
				domainCategory: '사용자분류',
				physicalDataType: 'VARCHAR',
				dataLength: '50',
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
				domainCategory: '테스트분류',
				physicalDataType: 'VARCHAR'
			},
			searchParams: { filename: 'custom-domain.json' }
		});

		await POST(request);

		expect(loadDomainData).toHaveBeenCalledWith('custom-domain.json');
	});

	it('should use default filename when not specified', async () => {
		const request = createMockRequestEvent({
			body: {
				domainCategory: '테스트분류',
				physicalDataType: 'VARCHAR'
			}
		});

		await POST(request);

		expect(loadDomainData).toHaveBeenCalledWith('domain.json');
	});
});
