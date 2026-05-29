import { describe, expect, it } from 'vitest';

import {
	extractReferenceWarnings,
	findInvalidField,
	getMissingRequiredFields,
	isInvalidPagination,
	paginateEntries,
	parseColumnFilters,
	parsePaginationParams,
	parseSortConfigs
} from './standardization-crud';

describe('standardization CRUD value helpers', () => {
	it('parses pagination params with route-provided default limits', () => {
		const params = new URLSearchParams();

		expect(parsePaginationParams(params, 20)).toEqual({ page: 1, limit: 20 });

		params.set('page', '2');
		params.set('limit', '50');
		expect(parsePaginationParams(params, 20)).toEqual({ page: 2, limit: 50 });
	});

	it('checks pagination bounds without constructing API responses', () => {
		expect(isInvalidPagination({ page: 0, limit: 20 }, { maxLimit: 100 })).toBe(true);
		expect(isInvalidPagination({ page: 1, limit: 0 }, { maxLimit: 100 })).toBe(true);
		expect(isInvalidPagination({ page: 1, limit: 101 }, { maxLimit: 100 })).toBe(true);
		expect(isInvalidPagination({ page: 1, limit: 100 }, { maxLimit: 100 })).toBe(false);
	});

	it('parses multi-sort first and single-sort fallback second', () => {
		const multi = new URLSearchParams([
			['sortBy[]', 'domainGroup'],
			['sortBy[]', 'updatedAt'],
			['sortOrder[]', 'asc'],
			['sortOrder[]', 'desc']
		]);
		expect(parseSortConfigs(multi)).toEqual([
			{ column: 'domainGroup', direction: 'asc' },
			{ column: 'updatedAt', direction: 'desc' }
		]);

		const single = new URLSearchParams([
			['sortBy', 'termName'],
			['sortOrder', 'asc']
		]);
		expect(parseSortConfigs(single)).toEqual([{ column: 'termName', direction: 'asc' }]);
	});

	it('keeps existing invalid sort-order behavior by dropping invalid directions', () => {
		const params = new URLSearchParams([
			['sortBy', 'termName'],
			['sortOrder', 'ascending']
		]);

		expect(parseSortConfigs(params)).toEqual([]);
	});

	it('extracts only non-empty filters[columnKey] query params', () => {
		const params = new URLSearchParams([
			['filters[termName]', '사용자'],
			['filters[columnName]', ''],
			['other', 'ignored']
		]);

		expect(parseColumnFilters(params)).toEqual({ termName: '사용자' });
	});

	it('finds the first invalid descriptor field', () => {
		expect(findInvalidField(['termName', 'unknown'], ['termName', 'columnName'])).toBe('unknown');
		expect(findInvalidField(['termName'], ['termName', 'columnName'])).toBeUndefined();
	});

	it('returns pagination slices and metadata as values only', () => {
		expect(paginateEntries(['a', 'b', 'c'], { page: 2, limit: 2 })).toEqual({
			entries: ['c'],
			totalCount: 3,
			totalPages: 2,
			hasNextPage: false,
			hasPrevPage: true
		});
	});

	it('preserves existing falsy-only required-field detection', () => {
		expect(
			getMissingRequiredFields({ name: '  ', code: '', kind: undefined }, ['name', 'code', 'kind'])
		).toEqual(['code', 'kind']);
	});

	it('extracts non-blocking reference warnings from check results', () => {
		const reference = { type: 'term' as const, filename: 'term.json', count: 1, entries: [] };

		expect(extractReferenceWarnings({ canDelete: false, references: [reference] })).toEqual([
			reference
		]);
		expect(extractReferenceWarnings({ canDelete: true, references: [reference] })).toEqual([]);
		expect(extractReferenceWarnings({ canDelete: false, references: [] })).toEqual([]);
	});
});
