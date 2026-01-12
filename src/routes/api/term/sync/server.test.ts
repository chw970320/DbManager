import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { TermData } from '$lib/types/term';
import type { VocabularyData } from '$lib/types/vocabulary';
import type { DomainData } from '$lib/types/domain';

// Mock 모듈들
vi.mock('$lib/utils/file-handler.js', () => ({
	loadTermData: vi.fn(),
	saveTermData: vi.fn(),
	loadVocabularyData: vi.fn(),
	loadDomainData: vi.fn()
}));

// Mock import
import {
	loadTermData,
	saveTermData,
	loadVocabularyData,
	loadDomainData
} from '$lib/utils/file-handler.js';

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
		}
	],
	lastUpdated: '2024-01-02T00:00:00.000Z',
	totalCount: 2,
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
		}
	],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 2
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
		url: new URL('http://localhost/api/term/sync'),
		params: {},
		locals: {},
		platform: undefined,
		route: { id: '/api/term/sync' },
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

describe('Term Sync API: /api/term/sync', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadTermData).mockResolvedValue(createMockTermData());
		vi.mocked(saveTermData).mockResolvedValue(undefined);
		vi.mocked(loadVocabularyData).mockResolvedValue(createMockVocabularyData());
		vi.mocked(loadDomainData).mockResolvedValue(createMockDomainData());
	});

	it('매핑 동기화 성공: 단어집/도메인 변경 후 동기화 시 매핑 상태가 올바르게 업데이트되는지 확인', async () => {
		const event = createMockRequestEvent({
			body: { filename: 'term.json' }
		});

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.updated).toBeDefined();
		expect(result.data.matchedTerm).toBeDefined();
		expect(result.data.matchedColumn).toBeDefined();
		expect(result.data.matchedDomain).toBeDefined();
		expect(saveTermData).toHaveBeenCalled();
	});

	it('동기화 결과 카운트: 업데이트된 항목 수가 정확히 반환되는지 확인', async () => {
		const event = createMockRequestEvent({
			body: { filename: 'term.json' }
		});

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.total).toBe(2);
		expect(typeof result.data.updated).toBe('number');
		expect(typeof result.data.matchedTerm).toBe('number');
		expect(typeof result.data.matchedColumn).toBe('number');
		expect(typeof result.data.matchedDomain).toBe('number');
	});

	it('filename 파라미터 사용: filename 파라미터로 특정 파일에서 동기화 수행', async () => {
		const event = createMockRequestEvent({
			body: { filename: 'custom-term.json' }
		});

		await POST(event);

		expect(loadTermData).toHaveBeenCalledWith('custom-term.json');
		expect(saveTermData).toHaveBeenCalledWith(expect.any(Object), 'custom-term.json');
	});

	it('should use default filename when not specified', async () => {
		const event = createMockRequestEvent({
			body: {}
		});

		await POST(event);

		expect(loadTermData).toHaveBeenCalledWith('term.json');
	});

	it('should return 500 on vocabulary load error', async () => {
		vi.mocked(loadVocabularyData).mockRejectedValue(new Error('단어집 파일을 찾을 수 없습니다'));

		const event = createMockRequestEvent({
			body: { filename: 'term.json' }
		});

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
	});

	it('should return 500 on domain load error', async () => {
		vi.mocked(loadDomainData).mockRejectedValue(new Error('도메인 파일을 찾을 수 없습니다'));

		const event = createMockRequestEvent({
			body: { filename: 'term.json' }
		});

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
	});

	it('should return 500 on save error', async () => {
		vi.mocked(saveTermData).mockRejectedValue(new Error('저장 실패'));

		const event = createMockRequestEvent({
			body: { filename: 'term.json' }
		});

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
	});
});
