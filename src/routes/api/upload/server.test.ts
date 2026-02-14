import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { VocabularyData } from '$lib/types/vocabulary';

vi.mock('$lib/registry/data-registry', () => ({
	listVocabularyFiles: vi.fn(),
	loadVocabularyData: vi.fn(),
	mergeVocabularyData: vi.fn()
}));

vi.mock('$lib/utils/validation.js', () => ({
	validateXlsxFile: vi.fn(),
	validateForbiddenWordsAndSynonyms: vi.fn(() => null)
}));

vi.mock('$lib/utils/xlsx-parser.js', () => ({
	parseXlsxToJson: vi.fn()
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

import {
	listVocabularyFiles,
	loadVocabularyData,
	mergeVocabularyData
} from '$lib/registry/data-registry';
import { validateXlsxFile } from '$lib/utils/validation.js';
import { parseXlsxToJson } from '$lib/utils/xlsx-parser.js';
import { getRequiredFile } from '$lib/utils/type-guards.js';

const createMockVocabularyData = (): VocabularyData => ({
	entries: [],
	lastUpdated: '2024-01-01T00:00:00.000Z',
	totalCount: 0
});

function createMockRequestEvent(options: {
	method?: string;
	formData?: FormData;
	contentType?: string;
}): RequestEvent {
	const request = {
		formData: vi.fn().mockResolvedValue(options.formData || new FormData()),
		headers: {
			get: vi.fn((header: string) => {
				if (header === 'content-type') {
					return options.contentType ?? (options.formData ? 'multipart/form-data' : 'application/json');
				}
				return null;
			})
		},
		method: options.method || 'GET'
	} as unknown as Request;

	return {
		url: new URL('http://localhost/api/upload'),
		request,
		params: {},
		locals: {},
		platform: undefined,
		route: { id: '/api/upload' },
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

describe('Upload API: /api/upload', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(listVocabularyFiles).mockResolvedValue(['vocabulary.json']);
		vi.mocked(loadVocabularyData).mockResolvedValue(createMockVocabularyData());
		vi.mocked(mergeVocabularyData).mockResolvedValue({
			entries: [],
			lastUpdated: '2024-01-01T00:00:00.000Z',
			totalCount: 1
		});
	});

	it('GET should return upload metadata', async () => {
		const response = await GET();
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.endpoint).toBe('/api/upload');
	});

	it('POST should upload XLSX file successfully', async () => {
		const mockFile = {
			name: 'test.xlsx',
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			size: 1024,
			arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
		} as unknown as File;
		const formData = new FormData();
		formData.append('file', mockFile);

		vi.mocked(getRequiredFile).mockReturnValue(mockFile);
		vi.mocked(validateXlsxFile).mockReturnValue(true);
		vi.mocked(parseXlsxToJson).mockReturnValue([
			{
				id: 'test-id',
				standardName: '사용자',
				abbreviation: 'USR',
				englishName: 'USER',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z'
			}
		]);

		const event = createMockRequestEvent({
			method: 'POST',
			formData
		});

		const response = await POST(event);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(validateXlsxFile).toHaveBeenCalledWith(mockFile);
		expect(mergeVocabularyData).toHaveBeenCalled();
	});
});
