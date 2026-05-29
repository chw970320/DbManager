import type { ReferenceCheckResult } from '$lib/types/base';

export type SortDirection = 'asc' | 'desc';

export type SortConfig = {
	column: string;
	direction: SortDirection;
};

export type PaginationParams = {
	page: number;
	limit: number;
};

export type PaginationResult<TEntry> = {
	entries: TEntry[];
	totalCount: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
};

export function parsePaginationParams(
	searchParams: URLSearchParams,
	defaultLimit: number
): PaginationParams {
	return {
		page: parseInt(searchParams.get('page') || '1'),
		limit: parseInt(searchParams.get('limit') || String(defaultLimit))
	};
}

export function isInvalidPagination(
	pagination: PaginationParams,
	options: { maxLimit: number }
): boolean {
	return pagination.page < 1 || pagination.limit < 1 || pagination.limit > options.maxLimit;
}

export function parseSortConfigs(searchParams: URLSearchParams): SortConfig[] {
	const sortByArray = searchParams.getAll('sortBy[]');
	const sortOrderArray = searchParams.getAll('sortOrder[]');
	const singleSortBy = searchParams.get('sortBy');
	const singleSortOrder = searchParams.get('sortOrder');
	const sortConfigs: SortConfig[] = [];

	if (sortByArray.length > 0 && sortOrderArray.length > 0) {
		for (let index = 0; index < Math.min(sortByArray.length, sortOrderArray.length); index += 1) {
			const direction = sortOrderArray[index];
			if (direction === 'asc' || direction === 'desc') {
				sortConfigs.push({ column: sortByArray[index], direction });
			}
		}
	} else if (singleSortBy && (singleSortOrder === 'asc' || singleSortOrder === 'desc')) {
		sortConfigs.push({ column: singleSortBy, direction: singleSortOrder });
	}

	return sortConfigs;
}

export function parseColumnFilters(searchParams: URLSearchParams): Record<string, string> {
	const columnFilters: Record<string, string> = {};

	searchParams.forEach((value, key) => {
		const match = key.match(/^filters\[(.+)\]$/);
		if (match && value) {
			columnFilters[match[1]] = value;
		}
	});

	return columnFilters;
}

export function findInvalidField(
	fields: readonly string[],
	allowedFields: readonly string[]
): string | undefined {
	return fields.find((field) => !allowedFields.includes(field));
}

export function paginateEntries<TEntry>(
	entries: TEntry[],
	pagination: PaginationParams
): PaginationResult<TEntry> {
	const totalCount = entries.length;
	const totalPages = Math.ceil(totalCount / pagination.limit);
	const startIndex = (pagination.page - 1) * pagination.limit;

	return {
		entries: entries.slice(startIndex, startIndex + pagination.limit),
		totalCount,
		totalPages,
		hasNextPage: pagination.page < totalPages,
		hasPrevPage: pagination.page > 1
	};
}

export function getMissingRequiredFields(
	source: Record<string, unknown>,
	requiredFields: readonly string[]
): string[] {
	return requiredFields.filter((field) => !source[field]);
}

export function extractReferenceWarnings(
	refCheck: ReferenceCheckResult
): ReferenceCheckResult['references'] {
	if (!refCheck.canDelete && refCheck.references?.length) {
		return refCheck.references;
	}
	return [];
}
