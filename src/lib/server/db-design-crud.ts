import { json } from '@sveltejs/kit';

import { checkEntryReferences } from '$lib/registry/mapping-registry';
import type { DataType } from '$lib/types/base';
import type { DbDesignApiResponse } from '$lib/types/database-design';

type SortDirection = 'asc' | 'desc';

type SortConfig = {
	column: string;
	direction: SortDirection;
};

type DbDesignEntryBase = {
	createdAt?: string;
	updatedAt?: string;
};

type DbDesignListData<TEntry> = {
	entries: TEntry[];
	lastUpdated: string;
};

type MatchValue = (value: string | undefined | null) => boolean;

export type DbDesignSearchMatcher<TEntry> = (
	entry: TEntry,
	searchField: string,
	matchValue: MatchValue
) => boolean;

export type DbDesignListDescriptor<
	TEntry extends DbDesignEntryBase,
	TData extends DbDesignListData<TEntry>
> = {
	defaultFilename: string;
	loadData: (filename: string) => Promise<TData>;
	searchMatches: DbDesignSearchMatcher<TEntry>;
	invalidPaginationBody: DbDesignApiResponse;
	loadFailureBody: (error: unknown) => DbDesignApiResponse;
	serverErrorBody: DbDesignApiResponse;
	successMessage?: string;
	defaultSortDateFields?: readonly (keyof TEntry & string)[];
	errorLogPrefix?: string;
};

export function getMissingRequiredFields(
	source: Record<string, unknown>,
	requiredFields: readonly string[]
): string[] {
	return requiredFields.filter((field) => {
		const value = source[field];
		return !value || (typeof value === 'string' && value.trim() === '');
	});
}

// Keep mutation orchestration route-local. This helper only preserves the shared
// non-blocking warning-collection primitive used by the five DB design routes.
export async function collectDeleteWarnings(
	type: DataType,
	entry: unknown,
	filename: string,
	force: boolean
): Promise<unknown[]> {
	if (force) {
		return [];
	}

	try {
		const refCheck = await checkEntryReferences(type, entry, filename);
		if (!refCheck.canDelete && refCheck.references?.length) {
			return refCheck.references;
		}
	} catch (error) {
		console.warn('참조 검증 경고 수집 중 오류:', error);
	}

	return [];
}

function parseSortConfigs(url: URL): SortConfig[] {
	const sortByArray = url.searchParams.getAll('sortBy[]');
	const sortOrderArray = url.searchParams.getAll('sortOrder[]');
	const singleSortBy = url.searchParams.get('sortBy');
	const singleSortOrder = url.searchParams.get('sortOrder');
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

function parseColumnFilters(url: URL): Record<string, string> {
	const columnFilters: Record<string, string> = {};

	url.searchParams.forEach((value, key) => {
		const match = key.match(/^filters\[(.+)\]$/);
		if (match && value) {
			columnFilters[match[1]] = value;
		}
	});

	return columnFilters;
}

function applyColumnFilters<TEntry>(
	entries: TEntry[],
	columnFilters: Record<string, string>
): TEntry[] {
	if (Object.keys(columnFilters).length === 0) {
		return entries;
	}

	return entries.filter((entry) =>
		Object.entries(columnFilters).every(([columnKey, filterValue]) => {
			const entryValue = entry[columnKey as keyof TEntry];

			if (filterValue === '(빈값)') {
				return entryValue === null || entryValue === undefined || entryValue === '';
			}

			if (entryValue === null || entryValue === undefined) {
				return false;
			}

			return String(entryValue).toLowerCase().includes(filterValue.toLowerCase());
		})
	);
}

function defaultSortDate<TEntry extends DbDesignEntryBase>(
	entry: TEntry,
	defaultSortDateFields: readonly (keyof TEntry & string)[]
): string {
	for (const field of defaultSortDateFields) {
		const value = entry[field];
		if (value !== null && value !== undefined && value !== '') {
			return String(value);
		}
	}

	return '';
}

function sortEntries<TEntry extends DbDesignEntryBase>(
	entries: TEntry[],
	sortConfigs: SortConfig[],
	defaultSortDateFields: readonly (keyof TEntry & string)[]
): TEntry[] {
	return [...entries].sort((a, b) => {
		for (const config of sortConfigs) {
			const aValue = a[config.column as keyof TEntry];
			const bValue = b[config.column as keyof TEntry];

			if (aValue === null || aValue === undefined) {
				if (bValue === null || bValue === undefined) {
					continue;
				}
				return 1;
			}

			if (bValue === null || bValue === undefined) {
				return -1;
			}

			const comparison = String(aValue).localeCompare(String(bValue), 'ko');
			if (comparison !== 0) {
				return config.direction === 'desc' ? -comparison : comparison;
			}
		}

		return defaultSortDate(b, defaultSortDateFields).localeCompare(
			defaultSortDate(a, defaultSortDateFields)
		);
	});
}

export async function handleDbDesignList<
	TEntry extends DbDesignEntryBase,
	TData extends DbDesignListData<TEntry>
>(url: URL, descriptor: DbDesignListDescriptor<TEntry, TData>): Promise<Response> {
	try {
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const searchQuery = url.searchParams.get('q') || url.searchParams.get('query') || '';
		const searchField = url.searchParams.get('field') || 'all';
		const searchExact = url.searchParams.get('exact') === 'true';
		const filename = url.searchParams.get('filename') || descriptor.defaultFilename;
		const sortConfigs = parseSortConfigs(url);
		const columnFilters = parseColumnFilters(url);

		if (page < 1 || limit < 1 || limit > 100) {
			return json(descriptor.invalidPaginationBody, { status: 400 });
		}

		let data: TData;
		try {
			data = await descriptor.loadData(filename);
		} catch (error) {
			return json(descriptor.loadFailureBody(error), { status: 500 });
		}

		let filteredEntries = data.entries;

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			const matchValue: MatchValue = (value) => {
				if (!value) {
					return false;
				}

				const target = value.toLowerCase();
				return searchExact ? target === query : target.includes(query);
			};

			filteredEntries = data.entries.filter((entry) =>
				descriptor.searchMatches(entry, searchField, matchValue)
			);
		}

		filteredEntries = applyColumnFilters(filteredEntries, columnFilters);
		filteredEntries = sortEntries(
			filteredEntries,
			sortConfigs,
			descriptor.defaultSortDateFields ?? ['updatedAt']
		);

		const startIndex = (page - 1) * limit;
		const paginatedEntries = filteredEntries.slice(startIndex, startIndex + limit);
		const totalPages = Math.ceil(filteredEntries.length / limit);
		const body: DbDesignApiResponse = {
			success: true,
			data: {
				entries: paginatedEntries,
				pagination: {
					currentPage: page,
					totalPages,
					totalCount: filteredEntries.length,
					limit,
					hasNextPage: page < totalPages,
					hasPrevPage: page > 1
				},
				lastUpdated: data.lastUpdated
			},
			...(descriptor.successMessage ? { message: descriptor.successMessage } : {})
		};

		return json(body, { status: 200 });
	} catch (error) {
		if (descriptor.errorLogPrefix) {
			console.error(descriptor.errorLogPrefix, error);
		}

		return json(descriptor.serverErrorBody, { status: 500 });
	}
}
