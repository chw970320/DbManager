import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { VocabularyData } from '$lib/types/vocabulary';

// Mock 모듈들
vi.mock('$lib/utils/file-handler.js', () => ({
	loadVocabularyData: vi.fn()
}));

vi.mock('$lib/utils/duplicate-handler.js', () => ({
	getDuplicateDetails: vi.fn(() => new Map())
}));

vi.mock('$lib/utils/xlsx-parser.js', () => ({
	exportJsonToXlsxBuffer: vi.fn(() => Buffer.from('mock-xlsx-data'))
}));

import { loadVocabularyData } from '$lib/utils/file-handler.js';
import { getDuplicateDetails } from '$lib/utils/duplicate-handler.js';
import { exportJsonToXlsxBuffer } from '$lib/utils/xlsx-parser.js';

// 테스트용 Mock 데이터
const createMockVocabularyData = (): VocabularyData => ({
	entries: [
		{
			id: 'entry-1',
			standardName: '사용자',
			abbreviation: 'USER',
			englishName: 'User',
			description: '시스템 사용자',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		{
			id: 'entry-2',
			standardName: '관리자',
			abbreviation: 'ADMIN',
			englishName: 'Administrator',
			description: '시스템 관리자',
			createdAt: '2024-01-02T00:00:00.000Z',
			updatedAt: '2024-01-02T00:00:00.000Z'
		}
	],
	lastUpdated: '2024-01-02T00:00:00.000Z',
	totalCount: 2
});

// RequestEvent Mock 생성 헬퍼
function createMockRequestEvent(options: { searchParams?: Record<string, string> }): RequestEvent {
	const url = new URL('http://localhost/api/vocabulary/download');

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
		route: { id: '/api/vocabulary/download' },
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

describe('Vocabulary Download API: /api/vocabulary/download', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(loadVocabularyData).mockResolvedValue(createMockVocabularyData());
		vi.mocked(getDuplicateDetails).mockReturnValue(new Map());
		vi.mocked(exportJsonToXlsxBuffer).mockReturnValue(Buffer.from('mock-xlsx-data'));
	});

	it('should download XLSX file successfully', async () => {
		const event = createMockRequestEvent({});
		const response = await GET(event);

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe(
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		);
		expect(response.headers.get('Content-Disposition')).toContain('attachment');
		expect(response.headers.get('Content-Disposition')).toContain('.xlsx');
		expect(exportJsonToXlsxBuffer).toHaveBeenCalled();
	});

	it('should apply sortBy and sortOrder correctly', async () => {
		const event = createMockRequestEvent({
			searchParams: { sortBy: 'abbreviation', sortOrder: 'desc' }
		});

		await GET(event);

		expect(exportJsonToXlsxBuffer).toHaveBeenCalled();
		const callArgs = vi.mocked(exportJsonToXlsxBuffer).mock.calls[0][0] as VocabularyEntry[];
		expect(callArgs).toBeInstanceOf(Array);
		// 정렬 확인: desc 정렬이므로 USER('user')가 ADMIN('admin')보다 앞에 와야 함 (알파벳 순서: u > a)
		const abbreviations = callArgs.map((entry) => entry.abbreviation);
		expect(abbreviations[0]).toBe('USER');
		expect(abbreviations[1]).toBe('ADMIN');
	});

	it('should apply filter correctly', async () => {
		const mockData: VocabularyData = {
			entries: [
				{
					id: '1',
					standardName: '사용자',
					abbreviation: 'USER',
					englishName: 'User',
					createdAt: '',
					updatedAt: '',
					description: ''
				},
				{
					id: '2',
					standardName: '관리자',
					abbreviation: 'USER', // 중복
					englishName: 'Admin',
					createdAt: '',
					updatedAt: '',
					description: ''
				}
			],
			lastUpdated: '',
			totalCount: 2
		};

		const duplicateMap = new Map();
		duplicateMap.set('1', { abbreviation: true });
		duplicateMap.set('2', { abbreviation: true });

		vi.mocked(loadVocabularyData).mockResolvedValue(mockData);
		vi.mocked(getDuplicateDetails).mockReturnValue(duplicateMap);

		const event = createMockRequestEvent({
			searchParams: { filter: 'duplicates:abbreviation' }
		});

		await GET(event);

		expect(exportJsonToXlsxBuffer).toHaveBeenCalled();
		const callArgs = vi.mocked(exportJsonToXlsxBuffer).mock.calls[0][0];
		expect(callArgs.length).toBe(2); // 중복된 항목들
	});

	it('should return 400 for invalid sort field', async () => {
		const event = createMockRequestEvent({
			searchParams: { sortBy: 'invalidField' }
		});

		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
		expect(result.error).toContain('정렬 필드');
	});

	it('should return 500 on data load error', async () => {
		vi.mocked(loadVocabularyData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

		const event = createMockRequestEvent({});
		const response = await GET(event);
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
	});

	it('should use specified filename parameter', async () => {
		const event = createMockRequestEvent({
			searchParams: { filename: 'custom-vocabulary.json' }
		});

		await GET(event);

		expect(loadVocabularyData).toHaveBeenCalledWith('custom-vocabulary.json');
	});

	it('should use default filename when not specified', async () => {
		const event = createMockRequestEvent({});

		await GET(event);

		expect(loadVocabularyData).toHaveBeenCalledWith(undefined);
	});
});
