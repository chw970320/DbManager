import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { DomainData } from '$lib/types/domain';

// Mock 모듈들
vi.mock('$lib/utils/file-handler.js', () => ({
	loadDomainData: vi.fn(),
	mergeDomainData: vi.fn(),
	listDomainFiles: vi.fn()
}));

vi.mock('$lib/utils/validation.js', () => ({
	validateXlsxFile: vi.fn(),
	generateStandardDomainName: vi.fn((category, type, length, decimal) => {
		return `${category}_${type}${length ? `(${length})` : ''}${decimal ? `.${decimal}` : ''}`;
	}),
	validateDomainNameUniqueness: vi.fn(() => null)
}));

vi.mock('$lib/utils/xlsx-parser.js', () => ({
	parseDomainXlsxToJson: vi.fn()
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

import { loadDomainData, mergeDomainData, listDomainFiles } from '$lib/utils/file-handler.js';
import { validateXlsxFile, validateDomainNameUniqueness } from '$lib/utils/validation.js';
import { parseDomainXlsxToJson } from '$lib/utils/xlsx-parser.js';
import { getRequiredFile } from '$lib/utils/type-guards.js';

// 테스트용 Mock 데이터
const createMockDomainData = (): DomainData => ({
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
	const url = new URL('http://localhost/api/domain/upload');

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
		route: { id: '/api/domain/upload' },
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

describe('Domain Upload API: /api/domain/upload', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadDomainData).mockResolvedValue(createMockDomainData());
		vi.mocked(listDomainFiles).mockResolvedValue(['domain.json']);
		vi.mocked(validateDomainNameUniqueness).mockReturnValue(null);
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
			vi.mocked(parseDomainXlsxToJson).mockReturnValue([
				{
					id: 'test-id',
					domainGroup: '공통표준도메인그룹',
					domainCategory: '테스트분류',
					standardDomainName: '테스트분류_VARCHAR(50)',
					physicalDataType: 'VARCHAR',
					dataLength: '50',
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z'
				}
			]);
			vi.mocked(mergeDomainData).mockResolvedValue({
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
				url: new URL('http://localhost/api/domain/upload'),
				params: {},
				locals: {},
				platform: undefined,
				route: { id: '/api/domain/upload' },
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
			const mockFile = new File(['mock content'], 'test.txt', { type: 'text/plain' });
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
			formData.append('filename', 'custom-domain.json');

			vi.mocked(getRequiredFile).mockReturnValue(mockFile);
			vi.mocked(validateXlsxFile).mockReturnValue(undefined);
			vi.mocked(parseDomainXlsxToJson).mockReturnValue([
				{
					id: 'test-id',
					domainGroup: '공통표준도메인그룹',
					domainCategory: '테스트분류',
					standardDomainName: '테스트분류_VARCHAR(50)',
					physicalDataType: 'VARCHAR',
					dataLength: '50',
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z'
				}
			]);
			vi.mocked(mergeDomainData).mockResolvedValue({
				entries: [],
				lastUpdated: '2024-01-01T00:00:00.000Z',
				totalCount: 1
			});

			const event = createMockRequestEvent({
				method: 'POST',
				formData
			});

			await POST(event);

			expect(mergeDomainData).toHaveBeenCalled();
		});
	});
});
