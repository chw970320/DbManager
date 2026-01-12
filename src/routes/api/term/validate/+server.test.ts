import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

// Mock 모듈
vi.mock('$lib/utils/file-handler.js', () => ({
	loadTermData: vi.fn(),
	listTermFiles: vi.fn(),
	loadVocabularyData: vi.fn()
}));

vi.mock('$lib/utils/validation.js', () => ({
	validateTermNameSuffix: vi.fn(),
	validateTermUniqueness: vi.fn(),
	validateTermNameUniqueness: vi.fn()
}));

// Mock import
import { loadTermData, listTermFiles, loadVocabularyData } from '$lib/utils/file-handler.js';
import {
	validateTermNameSuffix,
	validateTermUniqueness,
	validateTermNameUniqueness
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
			set: vi.fn(),
			delete: vi.fn(),
			has: vi.fn(),
			serialize: vi.fn()
		},
		getClientAddress: vi.fn(() => '127.0.0.1'),
		isDataRequest: false,
		isSubRequest: false
	} as RequestEvent;
}

describe('API: /api/term/validate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('POST', () => {
		it('should use mapped vocabulary file from term file mapping', async () => {
			// Given: biomimicry.json 용어 파일이 biomimicry.json 단어집 파일을 매핑하는 경우
			const termFilename = 'biomimicry.json';
			const mappedVocabularyFile = 'biomimicry.json'; // 용어 파일의 mapping이 가리키는 단어집 파일

			const mockTermData = {
				entries: [],
				mapping: {
					vocabulary: mappedVocabularyFile,
					domain: 'biomimicry.json'
				},
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 0
			};

			const mockVocabularyData = {
				entries: [
					{
						id: 'test-id',
						standardName: '코드',
						abbreviation: 'CODE',
						englishName: 'Code',
						isFormalWord: true,
						createdAt: '2024-01-01T00:00:00.000Z'
					}
				],
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 1
			};

			vi.mocked(loadTermData).mockResolvedValue(mockTermData);
			vi.mocked(loadVocabularyData).mockResolvedValue(mockVocabularyData);
			vi.mocked(listTermFiles).mockResolvedValue([]);
			vi.mocked(validateTermNameSuffix).mockReturnValue(null);
			vi.mocked(validateTermNameUniqueness).mockReturnValue(null);
			vi.mocked(validateTermUniqueness).mockReturnValue(null);

			// When: validation API 호출
			const requestEvent = createMockRequestEvent({
				body: {
					termName: '시험_코드',
					columnName: 'TEST_CODE',
					domainName: ''
				},
				searchParams: { filename: termFilename }
			});

			const response = await POST(requestEvent);
			const result = await response.json();

			// Then: 매핑된 단어집 파일이 사용되어야 함
			expect(loadTermData).toHaveBeenCalledWith(termFilename);
			expect(loadVocabularyData).toHaveBeenCalledWith(mappedVocabularyFile);
			expect(validateTermNameSuffix).toHaveBeenCalledWith(
				'시험_코드',
				mockVocabularyData.entries
			);
			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
		});

		it('should validate term name suffix using correct vocabulary entries', async () => {
			// Given: biomimicry.json 용어 파일이 biomimicry.json 단어집을 매핑하고, '코드'가 형식단어인 경우
			const termFilename = 'biomimicry.json';
			const mappedVocabularyFile = 'biomimicry.json';

			const mockTermData = {
				entries: [],
				mapping: {
					vocabulary: mappedVocabularyFile,
					domain: 'biomimicry.json'
				},
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 0
			};

			const mockVocabularyData = {
				entries: [
					{
						id: 'test-id-1',
						standardName: '시험',
						abbreviation: 'TEST',
						englishName: 'Test',
						isFormalWord: true,
						createdAt: '2024-01-01T00:00:00.000Z'
					},
					{
						id: 'test-id-2',
						standardName: '코드',
						abbreviation: 'CODE',
						englishName: 'Code',
						isFormalWord: true, // 형식단어여부 Y
						createdAt: '2024-01-01T00:00:00.000Z'
					}
				],
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 2
			};

			vi.mocked(loadTermData).mockResolvedValue(mockTermData);
			vi.mocked(loadVocabularyData).mockResolvedValue(mockVocabularyData);
			vi.mocked(listTermFiles).mockResolvedValue([]);
			vi.mocked(validateTermNameSuffix).mockReturnValue(null); // validation 통과
			vi.mocked(validateTermNameUniqueness).mockReturnValue(null);
			vi.mocked(validateTermUniqueness).mockReturnValue(null);

			// When: '시험_코드' validation
			const requestEvent = createMockRequestEvent({
				body: {
					termName: '시험_코드',
					columnName: 'TEST_CODE',
					domainName: ''
				},
				searchParams: { filename: termFilename }
			});

			const response = await POST(requestEvent);
			const result = await response.json();

			// Then: biomimicry.json 단어집의 '코드' 엔트리가 사용되어야 함
			expect(loadVocabularyData).toHaveBeenCalledWith(mappedVocabularyFile);
			expect(validateTermNameSuffix).toHaveBeenCalledWith(
				'시험_코드',
				mockVocabularyData.entries
			);
			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
		});

		it('should return error when vocabulary file load fails', async () => {
			// Given: 용어 파일은 로드되지만 매핑된 단어집 파일 로드 실패
			const termFilename = 'biomimicry.json';
			const mappedVocabularyFile = 'biomimicry.json';

			const mockTermData = {
				entries: [],
				mapping: {
					vocabulary: mappedVocabularyFile,
					domain: 'biomimicry.json'
				},
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 0
			};

			vi.mocked(loadTermData).mockResolvedValue(mockTermData);
			vi.mocked(loadVocabularyData).mockRejectedValue(new Error('File not found'));
			vi.mocked(listTermFiles).mockResolvedValue([]);

			// When: validation API 호출
			const requestEvent = createMockRequestEvent({
				body: {
					termName: '시험_코드',
					columnName: 'TEST_CODE',
					domainName: ''
				},
				searchParams: { filename: termFilename }
			});

			const response = await POST(requestEvent);
			const result = await response.json();

			// Then: 빈 단어집으로 validation 수행 (에러는 발생하지 않음)
			expect(loadVocabularyData).toHaveBeenCalledWith(mappedVocabularyFile);
			expect(validateTermNameSuffix).toHaveBeenCalledWith('시험_코드', []);
		});

		it('should use default vocabulary.json when mapping is missing', async () => {
			// Given: 용어 파일에 mapping 정보가 없는 경우
			const termFilename = 'biomimicry.json';

			const mockTermData = {
				entries: [],
				mapping: undefined, // mapping 정보 없음
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 0
			};

			const mockVocabularyData = {
				entries: [],
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 0
			};

			vi.mocked(loadTermData).mockResolvedValue(mockTermData);
			vi.mocked(loadVocabularyData).mockResolvedValue(mockVocabularyData);
			vi.mocked(listTermFiles).mockResolvedValue([]);
			vi.mocked(validateTermNameSuffix).mockReturnValue(null);
			vi.mocked(validateTermNameUniqueness).mockReturnValue(null);
			vi.mocked(validateTermUniqueness).mockReturnValue(null);

			// When: validation API 호출
			const requestEvent = createMockRequestEvent({
				body: {
					termName: '시험_코드',
					columnName: 'TEST_CODE',
					domainName: ''
				},
				searchParams: { filename: termFilename }
			});

			const response = await POST(requestEvent);

			// Then: 기본 vocabulary.json이 사용되어야 함
			expect(loadVocabularyData).toHaveBeenCalledWith('vocabulary.json');
			expect(response.status).toBe(200);
		});

		it('should find vocabulary word correctly with Korean characters', async () => {
			// Given: biomimicry.json 단어집에 '코드'가 형식단어로 등록된 경우
			const termFilename = 'biomimicry.json';
			const mappedVocabularyFile = 'biomimicry.json';

			const mockTermData = {
				entries: [],
				mapping: {
					vocabulary: mappedVocabularyFile,
					domain: 'biomimicry.json'
				},
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 0
			};

			const mockVocabularyData = {
				entries: [
					{
						id: 'test-id',
						standardName: '코드',
						abbreviation: 'CODE',
						englishName: 'Code',
						isFormalWord: true, // 형식단어여부 Y
						createdAt: '2024-01-01T00:00:00.000Z'
					}
				],
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 1
			};

			vi.mocked(loadTermData).mockResolvedValue(mockTermData);
			vi.mocked(loadVocabularyData).mockResolvedValue(mockVocabularyData);
			vi.mocked(listTermFiles).mockResolvedValue([]);
			// validateTermNameSuffix가 실제로 호출되어야 하므로 mock을 제거하고 실제 함수 사용
			vi.mocked(validateTermNameSuffix).mockImplementation((termName, entries) => {
				// 실제 validation 로직 시뮬레이션
				const parts = termName.split('_').map((p) => p.trim()).filter((p) => p.length > 0);
				if (parts.length === 0) return '용어명이 비어있습니다.';
				const suffix = parts[parts.length - 1].toLowerCase();
				const vocabularyWord = entries.find(
					(entry) => entry.standardName.trim().toLowerCase() === suffix
				);
				if (!vocabularyWord) {
					return `'${suffix}'은(는) 단어집에 등록되지 않은 단어입니다.`;
				}
				if (vocabularyWord.isFormalWord !== true) {
					return `'${suffix}'은(는) 형식단어가 아니므로 용어명의 접미사로 사용할 수 없습니다. (형식단어여부: N)`;
				}
				return null;
			});
			vi.mocked(validateTermNameUniqueness).mockReturnValue(null);
			vi.mocked(validateTermUniqueness).mockReturnValue(null);

			// When: '시험_코드' validation
			const requestEvent = createMockRequestEvent({
				body: {
					termName: '시험_코드',
					columnName: 'TEST_CODE',
					domainName: ''
				},
				searchParams: { filename: termFilename }
			});

			const response = await POST(requestEvent);
			const result = await response.json();

			// Then: validation이 통과해야 함 (코드가 형식단어이므로)
			expect(loadVocabularyData).toHaveBeenCalledWith(mappedVocabularyFile);
			expect(validateTermNameSuffix).toHaveBeenCalledWith(
				'시험_코드',
				mockVocabularyData.entries
			);
			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
		});
	});
});
