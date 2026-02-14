import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { DatabaseData, DatabaseEntry } from '$lib/types/database-design';

// Mock 모듈들
vi.mock('$lib/registry/data-registry', () => ({
	loadDatabaseData: vi.fn(),
	mergeDatabaseData: vi.fn()
}));

vi.mock('$lib/utils/validation.js', () => ({
	validateXlsxFile: vi.fn()
}));

vi.mock('$lib/utils/database-design-xlsx-parser.js', () => ({
	parseDatabaseXlsxToJson: vi.fn()
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

import { loadDatabaseData, mergeDatabaseData } from '$lib/registry/data-registry';
import { validateXlsxFile } from '$lib/utils/validation.js';
import { parseDatabaseXlsxToJson } from '$lib/utils/database-design-xlsx-parser.js';
import { getRequiredFile } from '$lib/utils/type-guards.js';

// 테스트용 Mock 데이터
const createMockDatabaseData = (): DatabaseData => ({
	entries: [],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 0
});

const createMockDatabaseEntry = (): DatabaseEntry => ({
	id: 'test-id',
	organizationName: '기관1',
	departmentName: '부서1',
	appliedTask: '업무1',
	relatedLaw: '',
	logicalDbName: '논리DB1',
	physicalDbName: '물리DB1',
	buildDate: '2024-01-01',
	dbDescription: '설명1',
	dbmsInfo: 'MySQL',
	osInfo: 'Linux',
	exclusionReason: '',
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z'
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: {
	method?: string;
	formData?: FormData;
	searchParams?: Record<string, string>;
}): RequestEvent {
	const url = new URL('http://localhost/api/database/upload');

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
		route: { id: '/api/database/upload' },
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

describe('Database Upload API: /api/database/upload', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadDatabaseData).mockResolvedValue(createMockDatabaseData());
		vi.mocked(mergeDatabaseData).mockResolvedValue(createMockDatabaseData());
	});

	describe('GET', () => {
		it('업로드 정보 조회 성공', async () => {
			const event = createMockRequestEvent({});
			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.data.supportedFormats).toContain('.xlsx');
			expect(result.data.requiredColumns).toBeInstanceOf(Array);
			expect(loadDatabaseData).toHaveBeenCalledWith('database.json');
		});

		it('filename 파라미터로 특정 파일 정보 조회', async () => {
			const event = createMockRequestEvent({
				searchParams: { filename: 'custom-database.json' }
			});
			const response = await GET(event);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(loadDatabaseData).toHaveBeenCalledWith('custom-database.json');
		});
	});

	describe('POST', () => {
		it('XLSX 파일 업로드 성공', async () => {
			const mockFile = {
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
				name: 'test.xlsx',
				size: 1024
			} as unknown as File;

			const formData = new FormData();
			formData.append('file', mockFile);
			formData.append('filename', 'database.json');

			vi.mocked(getRequiredFile).mockReturnValue(mockFile);
			vi.mocked(validateXlsxFile).mockReturnValue(undefined);
			vi.mocked(parseDatabaseXlsxToJson).mockReturnValue([createMockDatabaseEntry()]);
			vi.mocked(mergeDatabaseData).mockResolvedValue({
				entries: [createMockDatabaseEntry()],
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
			expect(mergeDatabaseData).toHaveBeenCalledWith(
				expect.arrayContaining([expect.any(Object)]),
				false,
				'database.json'
			);
		});

		it('filename 파라미터로 특정 파일에 업로드', async () => {
			const mockFile = {
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
				name: 'test.xlsx',
				size: 1024
			} as unknown as File;

			const formData = new FormData();
			formData.append('file', mockFile);
			formData.append('filename', 'custom-database.json');

			vi.mocked(getRequiredFile).mockReturnValue(mockFile);
			vi.mocked(validateXlsxFile).mockReturnValue(undefined);
			vi.mocked(parseDatabaseXlsxToJson).mockReturnValue([createMockDatabaseEntry()]);
			vi.mocked(mergeDatabaseData).mockResolvedValue({
				entries: [createMockDatabaseEntry()],
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
			expect(mergeDatabaseData).toHaveBeenCalledWith(
				expect.any(Array),
				false,
				'custom-database.json'
			);
		});

		it('잘못된 Content-Type 처리', async () => {
			const request = {
				formData: vi.fn().mockResolvedValue(new FormData()),
				headers: {
					get: vi.fn(() => 'application/json')
				},
				method: 'POST'
			} as unknown as Request;

			const event = {
				...createMockRequestEvent({ method: 'POST' }),
				request
			};

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
			expect(result.error).toContain('multipart/form-data');
		});

		it('파일 검증 실패 처리', async () => {
			const mockFile = {
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
				name: 'test.txt',
				size: 1024
			} as unknown as File;

			const formData = new FormData();
			formData.append('file', mockFile);

			vi.mocked(getRequiredFile).mockReturnValue(mockFile);
			vi.mocked(validateXlsxFile).mockImplementation(() => {
				throw new Error('지원하지 않는 파일 형식입니다');
			});

			const event = createMockRequestEvent({
				method: 'POST',
				formData
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.success).toBe(false);
		});

		it('Excel 파싱 실패 처리', async () => {
			const mockFile = {
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
				name: 'test.xlsx',
				size: 1024
			} as unknown as File;

			const formData = new FormData();
			formData.append('file', mockFile);

			vi.mocked(getRequiredFile).mockReturnValue(mockFile);
			vi.mocked(validateXlsxFile).mockReturnValue(undefined);
			vi.mocked(parseDatabaseXlsxToJson).mockImplementation(() => {
				throw new Error('필수 컬럼이 누락되었습니다');
			});

			const event = createMockRequestEvent({
				method: 'POST',
				formData
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(422);
			expect(result.success).toBe(false);
		});

		it('빈 데이터 처리', async () => {
			const mockFile = {
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
				name: 'test.xlsx',
				size: 1024
			} as unknown as File;

			const formData = new FormData();
			formData.append('file', mockFile);

			vi.mocked(getRequiredFile).mockReturnValue(mockFile);
			vi.mocked(validateXlsxFile).mockReturnValue(undefined);
			vi.mocked(parseDatabaseXlsxToJson).mockReturnValue([]);

			const event = createMockRequestEvent({
				method: 'POST',
				formData
			});

			const response = await POST(event);
			const result = await response.json();

			expect(response.status).toBe(422);
			expect(result.success).toBe(false);
			expect(result.error).toContain('유효한 데이터를 찾을 수 없습니다');
		});

		it('replace 모드로 업로드', async () => {
			const mockFile = {
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
				name: 'test.xlsx',
				size: 1024
			} as unknown as File;

			const formData = new FormData();
			formData.append('file', mockFile);
			formData.append('replace', 'true');

			vi.mocked(getRequiredFile).mockReturnValue(mockFile);
			vi.mocked(validateXlsxFile).mockReturnValue(undefined);
			vi.mocked(parseDatabaseXlsxToJson).mockReturnValue([createMockDatabaseEntry()]);
			vi.mocked(mergeDatabaseData).mockResolvedValue({
				entries: [createMockDatabaseEntry()],
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
			expect(result.data.replaceMode).toBe(true);
			expect(mergeDatabaseData).toHaveBeenCalledWith(expect.any(Array), true, 'database.json');
		});
	});
});

