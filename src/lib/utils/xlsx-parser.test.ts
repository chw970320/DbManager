import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseWorkbookToArray, parseArrayField, isEmptyRow, parseXlsxToJson } from './xlsx-parser';
import type { VocabularyEntry } from '$lib/types/vocabulary';

// Mock xlsx-js-style
vi.mock('xlsx-js-style', () => ({
	default: {
		read: vi.fn(),
		utils: {
			sheet_to_json: vi.fn()
		}
	}
}));

// Mock uuid
vi.mock('uuid', () => ({
	v4: vi.fn(() => 'test-uuid-1234')
}));

// Mock validation
vi.mock('./validation', () => ({
	validateVocabularyEntry: vi.fn((entry) => entry)
}));

import XLSX from 'xlsx-js-style';

describe('xlsx-parser', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('parseWorkbookToArray', () => {
		it('should parse valid workbook to array', () => {
			const mockWorkbook = {
				SheetNames: ['Sheet1'],
				Sheets: {
					Sheet1: {}
				}
			};
			const mockData = [
				['표준단어명', '영문약어', '영문명'],
				['테스트단어', 'TEST', 'Test Word']
			];

			vi.mocked(XLSX.read).mockReturnValue(mockWorkbook as any);
			vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData as any);

			const result = parseWorkbookToArray(Buffer.from('mock-xlsx'));

			expect(result).toEqual(mockData);
		});

		it('should throw error when workbook has no sheets', () => {
			const mockWorkbook = {
				SheetNames: [],
				Sheets: {}
			};

			vi.mocked(XLSX.read).mockReturnValue(mockWorkbook as any);

			expect(() => parseWorkbookToArray(Buffer.from('mock-xlsx'))).toThrow('Excel 파일에 시트가 없습니다.');
		});

		it('should throw error when data is insufficient', () => {
			const mockWorkbook = {
				SheetNames: ['Sheet1'],
				Sheets: {
					Sheet1: {}
				}
			};
			const mockData = [['표준단어명', '영문약어', '영문명']]; // 헤더만 있음

			vi.mocked(XLSX.read).mockReturnValue(mockWorkbook as any);
			vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData as any);

			expect(() => parseWorkbookToArray(Buffer.from('mock-xlsx'))).toThrow('Excel 파일에 데이터가 충분하지 않습니다');
		});
	});

	describe('parseArrayField', () => {
		it('should parse comma-separated string to array', () => {
			expect(parseArrayField('item1, item2, item3')).toEqual(['item1', 'item2', 'item3']);
		});

		it('should return empty array for empty or dash value', () => {
			expect(parseArrayField('')).toEqual([]);
			expect(parseArrayField('-')).toEqual([]);
			expect(parseArrayField(undefined)).toEqual([]);
		});

		it('should trim whitespace from items', () => {
			expect(parseArrayField('  item1  ,  item2  ')).toEqual(['item1', 'item2']);
		});
	});

	describe('isEmptyRow', () => {
		it('should return true for empty row', () => {
			expect(isEmptyRow([])).toBe(true);
			expect(isEmptyRow(['', '', ''])).toBe(true);
			expect(isEmptyRow(['   ', '   '])).toBe(true);
			expect(isEmptyRow(undefined)).toBe(true);
		});

		it('should return false for row with content', () => {
			expect(isEmptyRow(['test', '', ''])).toBe(false);
			expect(isEmptyRow(['', 'test', ''])).toBe(false);
		});
	});

	describe('parseXlsxToJson', () => {
		it('should parse valid XLSX to vocabulary entries', () => {
			const mockWorkbook = {
				SheetNames: ['Sheet1'],
				Sheets: {
					Sheet1: {}
				}
			};
			const mockData = [
				['번호', '표준단어명', '영문약어', '영문명', '단어 설명'],
				['1', '테스트단어', 'TEST', 'Test Word', '테스트 설명']
			];

			vi.mocked(XLSX.read).mockReturnValue(mockWorkbook as any);
			vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData as any);

			const result = parseXlsxToJson(Buffer.from('mock-xlsx'));

			expect(result).toBeInstanceOf(Array);
			expect(result.length).toBeGreaterThan(0);
		});

		it('should skip empty rows', () => {
			const mockWorkbook = {
				SheetNames: ['Sheet1'],
				Sheets: {
					Sheet1: {}
				}
			};
			const mockData = [
				['번호', '표준단어명', '영문약어', '영문명'],
				['1', '테스트단어', 'TEST', 'Test Word'],
				['', '', '', ''], // 빈 행
				['2', '테스트단어2', 'TEST2', 'Test Word 2']
			];

			vi.mocked(XLSX.read).mockReturnValue(mockWorkbook as any);
			vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mockData as any);

			const result = parseXlsxToJson(Buffer.from('mock-xlsx'));

			// 빈 행이 제외되어야 함
			expect(result.length).toBe(2);
		});
	});
});
