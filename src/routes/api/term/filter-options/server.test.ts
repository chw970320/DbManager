import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { TermData } from '$lib/types/term';

// Mock 모듈들
vi.mock('$lib/utils/file-handler.js', () => ({
	loadTermData: vi.fn()
}));

import { loadTermData } from '$lib/utils/file-handler.js';

// 테스트용 Mock 데이터
const createMockTermData = (): TermData => ({
	entries: [
		{
			id: 'entry-1',
			termName: '사용자_이름',
			columnName: 'USER_NAME',
			domainName: '사용자분류_VARCHAR(50)',
			isMappedTerm: true,
			isMappedColumn: true,
			isMappedDomain: true,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'entry-2',
			termName: '관리자_이름',
			columnName: 'ADMIN_NAME',
			domainName: '사용자분류_VARCHAR(50)',
			isMappedTerm: false,
			isMappedColumn: false,
			isMappedDomain: true,
			createdAt: '2024-01-02T00:00:00.000Z',
			updatedAt: '2024-01-02T00:00:00.000Z'
		},
		{
			id: 'entry-3',
			termName: '사용자_이메일',
			columnName: 'USER_EMAIL',
			domainName: '이메일분류_VARCHAR(100)',
			isMappedTerm: true,
			isMappedColumn: true,
			isMappedDomain: true,
			createdAt: '2024-01-03T00:00:00.000Z',
			updatedAt: '2024-01-03T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-03T00:00:00.000Z',
	totalCount: 3
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: {
	searchParams?: Record<string, string>;
}): RequestEvent {
	const url = new URL('http://localhost/api/term/filter-options');

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
		route: { id: '/api/term/filter-options' },
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

describe('Term Filter Options API: /api/term/filter-options', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadTermData).mockResolvedValue(createMockTermData());
	});

	it('should return filter options successfully', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data).toBeDefined();
		expect(result.data.termName).toBeInstanceOf(Array);
		expect(result.data.columnName).toBeInstanceOf(Array);
		expect(result.data.domainName).toBeInstanceOf(Array);
	});

	it('should return unique values for each filterable column', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.data.termName).toHaveLength(3); // 사용자_이름, 관리자_이름, 사용자_이메일
		expect(result.data.columnName).toHaveLength(3); // USER_NAME, ADMIN_NAME, USER_EMAIL
		expect(result.data.domainName).toHaveLength(2); // 사용자분류_VARCHAR(50), 이메일분류_VARCHAR(100)
	});

	it('should use specified filename parameter', async () => {
		const event = createMockRequestEvent({
			searchParams: { filename: 'custom-term.json' }
		});

		await GET(event);

		expect(loadTermData).toHaveBeenCalledWith('custom-term.json');
	});

	it('should use default filename when not specified', async () => {
		const event = createMockRequestEvent({});

		await GET(event);

		expect(loadTermData).toHaveBeenCalledWith('term.json');
	});

	it('should return 500 on data load error', async () => {
		vi.mocked(loadTermData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
		expect(result.error).toBe('파일을 찾을 수 없습니다');
	});

	it('should sort filter options alphabetically', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		// termName 정렬 확인
		const termNames = result.data.termName;
		expect(termNames[0]).toBe('관리자_이름');
		expect(termNames[1]).toBe('사용자_이름');
		expect(termNames[2]).toBe('사용자_이메일');
	});

	it('should handle empty entries array', async () => {
		const emptyData: TermData = {
			entries: [],
			lastUpdated: '2024-01-01T00:00:00.000Z',
			totalCount: 0
		};
		vi.mocked(loadTermData).mockResolvedValue(emptyData);

		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.termName).toEqual([]);
		expect(result.data.columnName).toEqual([]);
		expect(result.data.domainName).toEqual([]);
	});
});
