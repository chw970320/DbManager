import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { TermData } from '$lib/types/term';

// Mock 모듈들
vi.mock('$lib/registry/data-registry', () => ({
	loadTermData: vi.fn(),
	mergeTermData: vi.fn(),
	listTermFiles: vi.fn(),
	loadVocabularyData: vi.fn(),
	loadDomainData: vi.fn()
}));

vi.mock('$lib/utils/validation.js', () => ({
	validateXlsxFile: vi.fn(),
	validateTermNameSuffix: vi.fn(() => null),
	validateTermNameUniqueness: vi.fn(() => null),
	validateTermNameMapping: vi.fn(() => null),
	validateColumnNameMapping: vi.fn(() => null),
	validateDomainNameMapping: vi.fn(() => null)
}));

vi.mock('$lib/utils/xlsx-parser.js', () => ({
	parseTermXlsxToJson: vi.fn()
}));

vi.mock('$lib/registry/cache-registry', () => ({
	getCachedVocabularyData: vi.fn(),
	getCachedDomainData: vi.fn(),
	invalidateCache: vi.fn()
}));

vi.mock('uuid', () => ({
	v4: vi.fn(() => 'test-uuid-1234')
}));

vi.mock('$lib/utils/type-guards.js', () => ({
	getRequiredFile: vi.fn(),
	getOptionalString: vi.fn((formData, key, defaultValue) => {
		return formData.get(key) || defaultValue;
	}),
	getOptionalBoolean: vi.fn((formData, key, defaultValue) => {
		const value = formData.get(key);
		if (value === null || value === undefined) return defaultValue ?? false;
		return value === 'true' || value === true;
	}),
	FormDataValidationError: class extends Error {
		constructor(message: string) {
			super(message);
			this.name = 'FormDataValidationError';
		}
	}
}));

import { loadTermData, mergeTermData, listTermFiles } from '$lib/registry/data-registry';
import {
	validateXlsxFile,
	validateTermNameSuffix,
	validateTermNameUniqueness,
	validateTermNameMapping,
	validateColumnNameMapping,
	validateDomainNameMapping
} from '$lib/utils/validation.js';
import { parseTermXlsxToJson } from '$lib/utils/xlsx-parser.js';
import { getRequiredFile } from '$lib/utils/type-guards.js';
import { getCachedVocabularyData, getCachedDomainData } from '$lib/registry/cache-registry';

// 테스트용 Mock 데이터
const createMockTermData = (): TermData => ({
	entries: [],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 0
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: {
	method?: string;
	formData?: FormData;
	searchParams?: Record<string, string>;
}): RequestEvent {
	const url = new URL('http://localhost/api/term/upload');

	if (options.searchParams) {
		Object.entries(options.searchParams).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});
	}

	const request = {
		formData: vi.fn().mockResolvedValue(options.formData || new FormData()),
		headers: {
			get: vi.fn((header: string) => {
				if (header === 'content-type') {
					return options.formData ? 'multipart/form-data' : 'application/json';
				}
				return null;
			})
		},
		method: options.method || 'GET'
	} as unknown as Request;

	return {
		url,
		request,
		params: {},
		locals: {},
		platform: undefined,
		route: { id: '/api/term/upload' },
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

describe('Term Upload API: /api/term/upload', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadTermData).mockResolvedValue(createMockTermData());
		vi.mocked(mergeTermData).mockResolvedValue(createMockTermData());
		vi.mocked(listTermFiles).mockResolvedValue(['term.json']);
		vi.mocked(getCachedVocabularyData).mockResolvedValue({
			entries: [],
			lastUpdated: '2024-01-01T00:00:00.000Z',
			totalCount: 0
		});
		vi.mocked(getCachedDomainData).mockResolvedValue({
			entries: [],
			lastUpdated: '2024-01-01T00:00:00.000Z',
			totalCount: 0
		});
		vi.mocked(validateTermNameSuffix).mockReturnValue(null);
		vi.mocked(validateTermNameUniqueness).mockReturnValue(null);
		vi.mocked(validateTermNameMapping).mockReturnValue(null);
		vi.mocked(validateColumnNameMapping).mockReturnValue(null);
		vi.mocked(validateDomainNameMapping).mockReturnValue(null);
	});

	describe('GET', () => {
		it('should return upload info successfully', async () => {
			const event = createMockRequestEvent({});
			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.supportedFormats).toContain('.xlsx');
			expect(result.data.requiredColumns).toBeInstanceOf(Array);
		});
	});

	describe('POST', () => {
		it('should upload XLSX file successfully', async () => {
			const mockFile = {
				name: 'test.xlsx',
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
			} as unknown as File;
			const formData = new FormData();
			formData.append('file', mockFile);

			vi.mocked(getRequiredFile).mockReturnValue(mockFile);
			vi.mocked(validateXlsxFile).mockReturnValue(undefined);
			vi.mocked(parseTermXlsxToJson).mockReturnValue([
				{
					termName: '사용자_이름',
					columnName: 'USER_NAME',
					domainName: '사용자분류_VARCHAR(50)'
				}
			]);
			vi.mocked(mergeTermData).mockResolvedValue({
				entries: [],
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 1
			});

			const event = createMockRequestEvent({
				method: 'POST',
				formData
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.uploadedCount).toBe(1);
		});

		it('should return 400 for invalid content type', async () => {
			const request = {
				formData: vi.fn().mockResolvedValue(new FormData()),
				headers: {
					get: vi.fn(() => 'application/json')
				},
				method: 'POST'
			} as unknown as Request;

			const event = {
				request,
				url: new URL('http://localhost/api/term/upload'),
				params: {},
				locals: {},
				platform: undefined,
				route: { id: '/api/term/upload' },
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

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('multipart/form-data');
		});

		it('should return 400 for invalid file format', async () => {
			const mockFile = {
				name: 'test.txt',
				type: 'text/plain',
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
			} as unknown as File;
			const formData = new FormData();
			formData.append('file', mockFile);

			vi.mocked(getRequiredFile).mockReturnValue(mockFile);
			vi.mocked(validateXlsxFile).mockImplementation(() => {
				throw new Error('지원하지 않는 파일 형식입니다.');
			});

			const event = createMockRequestEvent({
				method: 'POST',
				formData
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('지원하지 않는 파일 형식');
		});

		it('should use specified filename parameter', async () => {
			const mockFile = {
				name: 'test.xlsx',
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
			} as unknown as File;
			const formData = new FormData();
			formData.append('file', mockFile);
			formData.append('filename', 'custom-term.json');

			vi.mocked(getRequiredFile).mockReturnValue(mockFile);
			vi.mocked(validateXlsxFile).mockReturnValue(undefined);
			vi.mocked(parseTermXlsxToJson).mockReturnValue([
				{
					termName: '사용자_이름',
					columnName: 'USER_NAME',
					domainName: '사용자분류_VARCHAR(50)'
				}
			]);
			vi.mocked(mergeTermData).mockResolvedValue(createMockTermData());

			const event = createMockRequestEvent({
				method: 'POST',
				formData
			});

			await POST(event);

			expect(mergeTermData).toHaveBeenCalled();
		});
	});
});

