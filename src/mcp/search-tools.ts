import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

import {
	bundleFilesInputSchema,
	DATA_TYPES,
	getBundleFilename,
	resolveFileBundle,
	type BundleSelector,
	type DataType,
	type FileBundleEntry
} from './bundles.js';
import type { DbManagerApiClient, QueryParams } from './http-client.js';
import { errorToolResult, jsonToolResult, toErrorPayload } from './tool-result.js';

type SearchableDataType = Exclude<DataType, 'vocabulary'>;
type SearchFieldValues = readonly [string, ...string[]];
type SortOrder = 'asc' | 'desc';
type Direction = 'ko-to-en' | 'en-to-ko';

interface FilenameSelector extends BundleSelector {
	filename?: string;
}

interface CommonSearchArgs extends FilenameSelector {
	query?: string;
	field?: string;
	page?: number;
	limit?: number;
	exact?: boolean;
	sortBy?: string | string[];
	sortOrder?: SortOrder | SortOrder[];
	filters?: Record<string, string>;
}

interface VocabularySearchArgs extends CommonSearchArgs {
	query: string;
	field?: 'all' | 'standardName' | 'abbreviation' | 'englishName';
	filter?: string;
	unmappedDomain?: boolean;
}

interface SuggestVocabularyArgs extends FilenameSelector {
	query: string;
	limit?: number;
}

interface FilterOptionsArgs extends FilenameSelector {
	type: DataType;
}

interface SearchBundleArgs extends BundleSelector {
	query: string;
	types?: DataType[];
	limitPerType?: number;
	exact?: boolean;
}

interface TermGeneratorArgs extends FilenameSelector {
	term: string;
	direction: Direction;
}

type FilenameResolution =
	| {
			ok: true;
			filename: string;
			bundle?: FileBundleEntry;
	  }
	| {
			ok: false;
			result: Exclude<Awaited<ReturnType<typeof resolveFileBundle>>, { status: 'resolved' }>;
	  };

const SEARCHABLE_DATA_TYPES = [
	'domain',
	'term',
	'database',
	'entity',
	'attribute',
	'table',
	'column'
] as const satisfies readonly SearchableDataType[];

const DEFAULT_BUNDLE_SEARCH_TYPES = DATA_TYPES;

const SEARCH_CONFIGS = {
	domain: {
		path: '/api/domain',
		fields: ['all', 'domainGroup', 'domainCategory', 'standardDomainName', 'physicalDataType']
	},
	term: {
		path: '/api/term',
		fields: ['all', 'termName', 'columnName', 'domainName']
	},
	database: {
		path: '/api/database',
		fields: ['all', 'organizationName', 'logicalDbName', 'physicalDbName']
	},
	entity: {
		path: '/api/entity',
		fields: [
			'all',
			'entityName',
			'schemaName',
			'primaryIdentifier',
			'superTypeEntityName',
			'tableKoreanName'
		]
	},
	attribute: {
		path: '/api/attribute',
		fields: ['all', 'schemaName', 'entityName', 'attributeName']
	},
	table: {
		path: '/api/table',
		fields: [
			'all',
			'physicalDbName',
			'schemaName',
			'tableEnglishName',
			'tableKoreanName',
			'tableType',
			'subjectArea'
		]
	},
	column: {
		path: '/api/column',
		fields: [
			'all',
			'schemaName',
			'tableEnglishName',
			'columnEnglishName',
			'columnKoreanName',
			'domainName',
			'dataType'
		]
	}
} as const satisfies Record<SearchableDataType, { path: string; fields: SearchFieldValues }>;

const bundleSelectorShape = {
	bundleId: z.string().min(1).optional(),
	bundleName: z.string().min(1).optional(),
	bundleFiles: bundleFilesInputSchema.optional()
};

const sortOrderSchema = z.enum(['asc', 'desc']);

const baseSearchShape = {
	...bundleSelectorShape,
	query: z.string().optional(),
	page: z.number().int().min(1).optional(),
	exact: z.boolean().optional(),
	sortBy: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
	sortOrder: z.union([sortOrderSchema, z.array(sortOrderSchema)]).optional(),
	filters: z.record(z.string(), z.string()).optional()
};

const vocabularySearchShape = {
	...baseSearchShape,
	limit: z.number().int().min(1).max(500).optional()
};

const genericSearchShape = {
	...baseSearchShape,
	limit: z.number().int().min(1).max(100).optional()
};

export function registerSearchTools(server: McpServer, apiClient: DbManagerApiClient): void {
	server.registerTool(
		'search_vocabulary',
		{
			title: 'Search vocabulary',
			description:
				'Search DbManager vocabulary entries through GET /api/search. Requires a bundle selector.',
			inputSchema: {
				...vocabularySearchShape,
				query: z.string().min(1),
				field: z.enum(['all', 'standardName', 'abbreviation', 'englishName']).optional(),
				filter: z.string().optional(),
				unmappedDomain: z.boolean().optional()
			}
		},
		(args) => runTool(() => searchVocabulary(apiClient, args))
	);

	server.registerTool(
		'suggest_vocabulary',
		{
			title: 'Suggest vocabulary',
			description:
				'Return vocabulary autocomplete suggestions through POST /api/search. Requires a bundle selector.',
			inputSchema: {
				...bundleSelectorShape,
				query: z.string().min(1),
				limit: z.number().int().min(1).max(50).optional()
			}
		},
		(args) => runTool(() => suggestVocabulary(apiClient, args))
	);

	for (const type of SEARCHABLE_DATA_TYPES) {
		registerGenericSearchTool(server, apiClient, type);
	}

	server.registerTool(
		'get_filter_options',
		{
			title: 'Get filter options',
			description:
				'Read filter option values from /api/{type}/filter-options. Requires a bundle selector.',
			inputSchema: {
				...bundleSelectorShape,
				type: z.enum(DATA_TYPES)
			}
		},
		(args) => runTool(() => getFilterOptions(apiClient, args))
	);

	server.registerTool(
		'search_bundle',
		{
			title: 'Search connected bundle',
			description:
				'Search a connected DbManager bundle as a grouped set. Requires bundleId, bundleName, or complete bundleFiles.',
			inputSchema: {
				bundleId: z.string().min(1).optional(),
				bundleName: z.string().min(1).optional(),
				bundleFiles: bundleFilesInputSchema.optional(),
				query: z.string().min(1),
				types: z.array(z.enum(DATA_TYPES)).optional(),
				limitPerType: z.number().int().min(1).max(100).optional(),
				exact: z.boolean().optional()
			}
		},
		(args) => runTool(() => searchBundle(apiClient, args))
	);

	registerTermGeneratorTool(server, apiClient, 'convert_term', '/api/generator');
	registerTermGeneratorTool(server, apiClient, 'segment_term', '/api/generator/segment');
}

export async function searchVocabulary(apiClient: DbManagerApiClient, args: VocabularySearchArgs) {
	const filename = await requireFilename(apiClient, 'vocabulary', args);
	if (!filename.ok) {
		return filename.result;
	}

	const params = buildSearchParams({
		...args,
		filename: filename.filename,
		field: args.field ?? 'all'
	});
	params.q = args.query;
	params.filter = args.filter;
	params.unmappedDomain = args.unmappedDomain;

	const response = await apiClient.get<unknown>('/api/search', params);
	return withToolMetadata('ok', 'search_vocabulary', 'vocabulary', filename, response);
}

export async function suggestVocabulary(
	apiClient: DbManagerApiClient,
	args: SuggestVocabularyArgs
) {
	const filename = await requireFilename(apiClient, 'vocabulary', args);
	if (!filename.ok) {
		return filename.result;
	}

	const response = await apiClient.post<unknown>(
		'/api/search',
		{
			query: args.query,
			limit: args.limit
		},
		{ filename: filename.filename }
	);
	return withToolMetadata('ok', 'suggest_vocabulary', 'vocabulary', filename, response);
}

export async function searchDataType(
	apiClient: DbManagerApiClient,
	type: SearchableDataType,
	args: CommonSearchArgs
) {
	if (args.limit && args.limit > 100) {
		return {
			status: 'input_error',
			message: `limit must be between 1 and 100 for search_${type}.`,
			details: {
				limit: args.limit,
				maxLimit: 100,
				type
			}
		};
	}

	const filename = await requireFilename(apiClient, type, args);
	if (!filename.ok) {
		return filename.result;
	}

	const params = buildSearchParams({
		...args,
		filename: filename.filename
	});
	if (args.query) {
		params.q = args.query;
	}

	const response = await apiClient.get<unknown>(SEARCH_CONFIGS[type].path, params);
	return withToolMetadata('ok', `search_${type}`, type, filename, response);
}

export async function getFilterOptions(apiClient: DbManagerApiClient, args: FilterOptionsArgs) {
	const filename = await requireFilename(apiClient, args.type, args);
	if (!filename.ok) {
		return filename.result;
	}

	const response = await apiClient.get<unknown>(`/api/${args.type}/filter-options`, {
		filename: filename.filename
	});
	return withToolMetadata('ok', 'get_filter_options', args.type, filename, response);
}

export async function searchBundle(apiClient: DbManagerApiClient, args: SearchBundleArgs) {
	if (
		args.limitPerType !== undefined &&
		(!Number.isInteger(args.limitPerType) || args.limitPerType < 1 || args.limitPerType > 100)
	) {
		return {
			status: 'input_error' as const,
			message: 'limitPerType must be between 1 and 100 for search_bundle.',
			details: {
				limitPerType: args.limitPerType,
				maxLimit: 100,
				type: 'search_bundle'
			}
		};
	}

	const resolution = await resolveFileBundle(apiClient, args);
	if (resolution.status !== 'resolved') {
		return resolution;
	}

	const types = args.types?.length ? args.types : [...DEFAULT_BUNDLE_SEARCH_TYPES];
	const limit = args.limitPerType ?? 5;
	const results = await Promise.all(
		types.map(async (type) => {
			try {
				const filename = getBundleFilename(resolution.bundle, type);
				const response =
					type === 'vocabulary'
						? await apiClient.get<unknown>('/api/search', {
								q: args.query,
								field: 'all',
								page: 1,
								limit,
								exact: args.exact,
								filename
							})
						: await apiClient.get<unknown>(`/api/${type}`, {
								q: args.query,
								field: 'all',
								page: 1,
								limit,
								exact: args.exact,
								filename
							});

				return [
					type,
					{
						status: 'ok',
						filename,
						response
					}
				] as const;
			} catch (error) {
				return [
					type,
					{
						...toErrorPayload(error),
						filename: getBundleFilename(resolution.bundle, type)
					}
				] as const;
			}
		})
	);

	return {
		status: 'ok' as const,
		tool: 'search_bundle',
		query: args.query,
		bundle: resolution.bundle,
		types,
		results: Object.fromEntries(results)
	};
}

export async function convertTerm(apiClient: DbManagerApiClient, args: TermGeneratorArgs) {
	return runTermGenerator(apiClient, '/api/generator', 'convert_term', args);
}

export async function segmentTerm(apiClient: DbManagerApiClient, args: TermGeneratorArgs) {
	return runTermGenerator(apiClient, '/api/generator/segment', 'segment_term', args);
}

function registerGenericSearchTool(
	server: McpServer,
	apiClient: DbManagerApiClient,
	type: SearchableDataType
): void {
	const config = SEARCH_CONFIGS[type];
	server.registerTool(
		`search_${type}`,
		{
			title: `Search ${type}`,
			description: `Search DbManager ${type} entries through ${config.path}. Requires a bundle selector.`,
			inputSchema: {
				...genericSearchShape,
				field: z.enum(config.fields).optional()
			}
		},
		(args) => runTool(() => searchDataType(apiClient, type, args))
	);
}

function registerTermGeneratorTool(
	server: McpServer,
	apiClient: DbManagerApiClient,
	name: 'convert_term' | 'segment_term',
	path: '/api/generator' | '/api/generator/segment'
): void {
	server.registerTool(
		name,
		{
			title: name === 'convert_term' ? 'Convert term' : 'Segment term',
			description:
				name === 'convert_term'
					? 'Convert standard term tokens through POST /api/generator using the resolved term file.'
					: 'Segment joined Korean or English terms through POST /api/generator/segment using the resolved term file.',
			inputSchema: {
				...bundleSelectorShape,
				term: z.string().min(1),
				direction: z.enum(['ko-to-en', 'en-to-ko'])
			}
		},
		(args) =>
			runTool(() =>
				path === '/api/generator' ? convertTerm(apiClient, args) : segmentTerm(apiClient, args)
			)
	);
}

async function runTool(action: () => Promise<unknown>): Promise<CallToolResult> {
	try {
		const payload = await action();
		return jsonToolResult(payload, summarizePayload(payload));
	} catch (error) {
		return errorToolResult(error, 'DbManager API request failed.');
	}
}

async function runTermGenerator(
	apiClient: DbManagerApiClient,
	path: '/api/generator' | '/api/generator/segment',
	tool: 'convert_term' | 'segment_term',
	args: TermGeneratorArgs
) {
	const filename = await requireFilename(apiClient, 'term', args);
	if (!filename.ok) {
		return filename.result;
	}

	const response = await apiClient.post<unknown>(
		path,
		{
			term: args.term,
			direction: args.direction
		},
		{ filename: filename.filename }
	);
	return withToolMetadata('ok', tool, 'term', filename, response);
}

async function requireFilename(
	apiClient: DbManagerApiClient,
	type: DataType,
	args: FilenameSelector
): Promise<FilenameResolution> {
	const filename = args.filename?.trim();
	if (filename) {
		if (hasBundleSelector(args)) {
			const resolution = await resolveFileBundle(apiClient, args);
			if (resolution.status !== 'resolved') {
				return {
					ok: false,
					result: resolution
				};
			}

			const bundleFilename = getBundleFilename(resolution.bundle, type);
			if (filename !== bundleFilename) {
				return {
					ok: false,
					result: {
						status: 'bundle_resolution_error',
						message: 'filename does not match the resolved bundle filename for this data type.',
						bundles: [resolution.bundle],
						details: {
							type,
							filename,
							expectedFilename: bundleFilename,
							bundleId: resolution.bundle.id,
							bundleName: resolution.bundle.name
						}
					}
				};
			}

			return {
				ok: true,
				filename,
				bundle: resolution.bundle
			};
		}
	}

	const resolution = await resolveFileBundle(apiClient, args);
	if (resolution.status !== 'resolved') {
		return {
			ok: false,
			result: resolution
		};
	}

	return {
		ok: true,
		filename: getBundleFilename(resolution.bundle, type),
		bundle: resolution.bundle
	};
}

function hasBundleSelector(args: FilenameSelector): boolean {
	return Boolean(args.bundleId?.trim() || args.bundleName?.trim() || args.bundleFiles);
}

function buildSearchParams(
	args: CommonSearchArgs & { field?: string; filter?: string }
): QueryParams {
	const params: QueryParams = {
		filename: args.filename,
		page: args.page,
		limit: args.limit,
		field: args.field,
		exact: args.exact
	};

	if (Array.isArray(args.sortBy) && Array.isArray(args.sortOrder)) {
		params['sortBy[]'] = args.sortBy;
		params['sortOrder[]'] = args.sortOrder;
	} else {
		params.sortBy = typeof args.sortBy === 'string' ? args.sortBy : undefined;
		params.sortOrder = typeof args.sortOrder === 'string' ? args.sortOrder : undefined;
	}

	if (args.filters) {
		for (const [key, value] of Object.entries(args.filters)) {
			params[`filters[${key}]`] = value;
		}
	}

	return params;
}

function withToolMetadata(
	status: 'ok',
	tool: string,
	type: DataType,
	filename: FilenameResolution & { ok: true },
	response: unknown
) {
	return {
		status,
		tool,
		type,
		filename: filename.filename,
		bundle: filename.bundle,
		response
	};
}

function summarizePayload(payload: unknown): string | undefined {
	if (!payload || typeof payload !== 'object') {
		return undefined;
	}

	const record = payload as Record<string, unknown>;
	if (typeof record.status === 'string' && record.status !== 'ok') {
		return String(record.message ?? record.status);
	}
	if (typeof record.tool === 'string') {
		return `${record.tool} completed.`;
	}
	if (record.status === 'ok') {
		return 'DbManager MCP tool completed.';
	}
	return undefined;
}
