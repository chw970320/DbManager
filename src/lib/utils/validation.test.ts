import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	isValidUUID,
	isValidISODate,
	isNonEmptyString,
	isPositiveInteger,
	isValidArray,
	DataValidationError,
	validateVocabularyEntryStrict,
	validateDomainEntryStrict,
	validateTermEntryStrict,
	validateIdParam,
	validatePagination,
	validateTermColumnOrderMapping
} from './validation';
import type { VocabularyEntry } from '$lib/types/vocabulary';
import type { DomainEntry } from '$lib/types/domain';
import type { TermEntry } from '$lib/types/term';

describe('validation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('isValidUUID', () => {
		it('should return true for valid UUID v4', () => {
			expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
		});

		it('should return false for invalid UUID', () => {
			expect(isValidUUID('invalid-uuid')).toBe(false);
			expect(isValidUUID('123')).toBe(false);
			expect(isValidUUID(null)).toBe(false);
		});
	});

	describe('isValidISODate', () => {
		it('should return true for valid ISO date', () => {
			expect(isValidISODate('2024-01-01T00:00:00.000Z')).toBe(true);
		});

		it('should return false for invalid date', () => {
			expect(isValidISODate('2024-01-01')).toBe(false);
			expect(isValidISODate('invalid-date')).toBe(false);
			expect(isValidISODate(null)).toBe(false);
		});
	});

	describe('isNonEmptyString', () => {
		it('should return true for non-empty string', () => {
			expect(isNonEmptyString('test')).toBe(true);
			expect(isNonEmptyString('  test  ')).toBe(true);
		});

		it('should return false for empty string or whitespace', () => {
			expect(isNonEmptyString('')).toBe(false);
			expect(isNonEmptyString('   ')).toBe(false);
			expect(isNonEmptyString(null)).toBe(false);
		});
	});

	describe('isPositiveInteger', () => {
		it('should return true for positive integer', () => {
			expect(isPositiveInteger(1)).toBe(true);
			expect(isPositiveInteger(100)).toBe(true);
		});

		it('should return false for non-positive or non-integer', () => {
			expect(isPositiveInteger(0)).toBe(false);
			expect(isPositiveInteger(-1)).toBe(false);
			expect(isPositiveInteger(1.5)).toBe(false);
			expect(isPositiveInteger('1')).toBe(false);
		});
	});

	describe('isValidArray', () => {
		it('should return true for array', () => {
			expect(isValidArray([])).toBe(true);
			expect(isValidArray([1, 2, 3])).toBe(true);
		});

		it('should return false for non-array', () => {
			expect(isValidArray({})).toBe(false);
			expect(isValidArray('array')).toBe(false);
			expect(isValidArray(null)).toBe(false);
		});
	});

	describe('validateVocabularyEntryStrict', () => {
		it('should validate valid vocabulary entry', () => {
			const entry: VocabularyEntry = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				standardName: '테스트단어',
				abbreviation: 'TEST',
				englishName: 'Test Word',
				description: '테스트 설명',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z'
			};

			expect(() => validateVocabularyEntryStrict(entry)).not.toThrow();
		});

		it('should throw error for invalid UUID', () => {
			const entry = {
				id: 'invalid-uuid',
				standardName: '테스트단어',
				abbreviation: 'TEST',
				englishName: 'Test Word',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z'
			};

			expect(() => validateVocabularyEntryStrict(entry)).toThrow(DataValidationError);
		});

		it('should throw error for missing required field', () => {
			const entry = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				standardName: '',
				abbreviation: 'TEST',
				englishName: 'Test Word',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z'
			};

			expect(() => validateVocabularyEntryStrict(entry)).toThrow(DataValidationError);
		});
	});

	describe('validateDomainEntryStrict', () => {
		it('should validate valid domain entry', () => {
			const entry: DomainEntry = {
				id: '550e8400-e29b-41d4-a716-446655440001',
				domainGroup: '테스트그룹',
				domainCategory: '테스트카테고리',
				standardDomainName: 'TEST_DOMAIN',
				physicalDataType: 'VARCHAR',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z'
			};

			expect(() => validateDomainEntryStrict(entry)).not.toThrow();
		});

		it('should throw error for invalid entry', () => {
			const entry = {
				id: 'invalid-uuid',
				domainGroup: '테스트그룹',
				domainCategory: '테스트카테고리',
				standardDomainName: 'TEST_DOMAIN',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z'
			};

			expect(() => validateDomainEntryStrict(entry)).toThrow(DataValidationError);
		});
	});

	describe('validateTermEntryStrict', () => {
		it('should validate valid term entry', () => {
			const entry: TermEntry = {
				id: '550e8400-e29b-41d4-a716-446655440002',
				termName: '테스트용어',
				columnName: 'TEST_COLUMN',
				domainName: 'TEST_DOMAIN',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z'
			};

			expect(() => validateTermEntryStrict(entry)).not.toThrow();
		});

		it('should throw error for invalid entry', () => {
			const entry = {
				id: 'invalid-uuid',
				termName: '테스트용어',
				columnName: 'TEST_COLUMN',
				domainName: 'TEST_DOMAIN',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z'
			};

			expect(() => validateTermEntryStrict(entry)).toThrow(DataValidationError);
		});
	});

	describe('validateIdParam', () => {
		it('should not throw for valid UUID string', () => {
			expect(() => validateIdParam('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
		});

		it('should throw for invalid id', () => {
			expect(() => validateIdParam('invalid')).toThrow();
			expect(() => validateIdParam(null)).toThrow();
			expect(() => validateIdParam(undefined)).toThrow();
		});
	});

	describe('validatePagination', () => {
		it('should return valid pagination params', () => {
			const result = validatePagination('1', '20');
			expect(result.page).toBe(1);
			expect(result.limit).toBe(20);
		});

		it('should use default values for invalid params', () => {
			const result = validatePagination('invalid', 'invalid');
			expect(result.page).toBe(1);
			expect(result.limit).toBe(20);
		});

		it('should clamp values to valid ranges', () => {
			const result1 = validatePagination('0', '200');
			expect(result1.page).toBe(1);
			expect(result1.limit).toBe(20); // 200 > 100이므로 기본값 20

			const result2 = validatePagination('-1', '0');
			expect(result2.page).toBe(1);
			expect(result2.limit).toBe(20); // 0은 양의 정수가 아니므로 기본값 20
		});
	});

	describe('validateTermColumnOrderMapping', () => {
		const vocabularyEntries = [
			{ standardName: '방문자', abbreviation: 'VSTR' },
			{ standardName: '로그아웃', abbreviation: 'LGOT' },
			{ standardName: '수', abbreviation: 'CNT' },
			{ standardName: '사용자', abbreviation: 'USER' },
			{ standardName: '이름', abbreviation: 'NAME' },
			{ standardName: '일자', abbreviation: 'DT' }
		];

		it('should pass when term and column order match correctly', () => {
			const result = validateTermColumnOrderMapping(
				'방문자_로그아웃_수',
				'VSTR_LGOT_CNT',
				vocabularyEntries
			);
			expect(result.error).toBeNull();
			expect(result.mismatches).toHaveLength(0);
			expect(result.correctedColumnName).toBeNull();
		});

		it('should detect order mismatch when column parts are swapped', () => {
			// 용어명: 방문자_로그아웃_수 → VSTR_LGOT_CNT 이어야 하지만
			// 컬럼명: LGOT_VSTR_CNT (1번째와 2번째가 바뀜)
			const result = validateTermColumnOrderMapping(
				'방문자_로그아웃_수',
				'LGOT_VSTR_CNT',
				vocabularyEntries
			);
			expect(result.error).not.toBeNull();
			expect(result.error).toContain('순서가 일치하지 않습니다');
			expect(result.mismatches).toHaveLength(2);
			// 1번째: 방문자→VSTR이어야 하지만 LGOT
			expect(result.mismatches[0]).toEqual({
				index: 0,
				termPart: '방문자',
				expectedAbbreviation: 'VSTR',
				actualColumnPart: 'LGOT'
			});
			// 2번째: 로그아웃→LGOT이어야 하지만 VSTR
			expect(result.mismatches[1]).toEqual({
				index: 1,
				termPart: '로그아웃',
				expectedAbbreviation: 'LGOT',
				actualColumnPart: 'VSTR'
			});
			expect(result.correctedColumnName).toBe('VSTR_LGOT_CNT');
		});

		it('should detect when a valid abbreviation from vocabulary is in wrong position', () => {
			// 용어명: 사용자_이름 → USER_NAME 이어야 하지만
			// 컬럼명: NAME_USER (순서 반대)
			const result = validateTermColumnOrderMapping(
				'사용자_이름',
				'NAME_USER',
				vocabularyEntries
			);
			expect(result.error).not.toBeNull();
			expect(result.mismatches).toHaveLength(2);
			expect(result.correctedColumnName).toBe('USER_NAME');
		});

		it('should skip validation when term and column part counts differ', () => {
			const result = validateTermColumnOrderMapping(
				'방문자_로그아웃_수',
				'VSTR_LGOT',
				vocabularyEntries
			);
			expect(result.error).toBeNull();
			expect(result.mismatches).toHaveLength(0);
		});

		it('should skip validation when termName is empty', () => {
			const result = validateTermColumnOrderMapping('', 'VSTR_LGOT', vocabularyEntries);
			expect(result.error).toBeNull();
			expect(result.mismatches).toHaveLength(0);
		});

		it('should skip validation when columnName is empty', () => {
			const result = validateTermColumnOrderMapping('방문자_로그아웃', '', vocabularyEntries);
			expect(result.error).toBeNull();
			expect(result.mismatches).toHaveLength(0);
		});

		it('should not report mismatch when column part is not in vocabulary (handled by COLUMN_NAME_MAPPING)', () => {
			// 컬럼명의 부분이 단어집에 없으면 이 검증에서는 무시 (COLUMN_NAME_MAPPING에서 처리)
			const result = validateTermColumnOrderMapping(
				'방문자_로그아웃_수',
				'VSTR_LGOT_UNKNOWN',
				vocabularyEntries
			);
			// UNKNOWN은 단어집에 없으므로 순서 불일치로 보지 않음
			expect(result.error).toBeNull();
			expect(result.mismatches).toHaveLength(0);
		});

		it('should not report mismatch when term part is not in vocabulary (handled by TERM_NAME_MAPPING)', () => {
			// 용어명의 부분이 단어집에 없으면 이 검증에서는 해당 위치 스킵
			const result = validateTermColumnOrderMapping(
				'미등록단어_로그아웃_수',
				'VSTR_LGOT_CNT',
				vocabularyEntries
			);
			// 미등록단어는 단어집에 없으므로 순서 검증 스킵
			expect(result.error).toBeNull();
			expect(result.mismatches).toHaveLength(0);
		});

		it('should handle case-insensitive comparison', () => {
			const result = validateTermColumnOrderMapping(
				'방문자_로그아웃_수',
				'vstr_lgot_cnt',
				vocabularyEntries
			);
			expect(result.error).toBeNull();
			expect(result.mismatches).toHaveLength(0);
		});

		it('should detect partial order mismatch (only some positions swapped)', () => {
			// 용어명: 방문자_사용자_수 → VSTR_USER_CNT 이어야 하지만
			// 컬럼명: USER_VSTR_CNT (1번째와 2번째만 바뀜, 3번째는 맞음)
			const result = validateTermColumnOrderMapping(
				'방문자_사용자_수',
				'USER_VSTR_CNT',
				vocabularyEntries
			);
			expect(result.error).not.toBeNull();
			expect(result.mismatches).toHaveLength(2);
			expect(result.mismatches[0].index).toBe(0);
			expect(result.mismatches[0].expectedAbbreviation).toBe('VSTR');
			expect(result.mismatches[0].actualColumnPart).toBe('USER');
			expect(result.mismatches[1].index).toBe(1);
			expect(result.mismatches[1].expectedAbbreviation).toBe('USER');
			expect(result.mismatches[1].actualColumnPart).toBe('VSTR');
			expect(result.correctedColumnName).toBe('VSTR_USER_CNT');
		});
	});
});
