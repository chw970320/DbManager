import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

import type { DbManagerApiClient } from './http-client.js';
import { errorToolResult, jsonToolResult } from './tool-result.js';

export const DATA_TYPES = [
	'vocabulary',
	'domain',
	'term',
	'database',
	'entity',
	'attribute',
	'table',
	'column'
] as const;

export type DataType = (typeof DATA_TYPES)[number];
export type FileBundle = Record<DataType, string>;

export interface FileBundleEntry {
	id: string;
	name: string;
	files: FileBundle;
	createdAt?: string;
	updatedAt?: string;
}

export interface BundleSelector {
	bundleId?: string;
	bundleName?: string;
	bundleFiles?: Partial<Record<DataType, string>>;
}

export type BundleResolution =
	| {
			status: 'resolved';
			bundle: FileBundleEntry;
	  }
	| {
			status: 'needs_bundle_selection';
			message: string;
			bundles: FileBundleEntry[];
	  }
	| {
			status: 'bundle_resolution_error';
			message: string;
			bundles: FileBundleEntry[];
			details?: Record<string, unknown>;
	  };

type DesignSnapshotsResponse = {
	success?: boolean;
	data?: {
		bundles?: unknown;
	};
	error?: string;
	message?: string;
};

const bundleFileShape = Object.fromEntries(
	DATA_TYPES.map((type) => [type, z.string().min(1)])
) as Record<DataType, z.ZodString>;

export const bundleFilesInputSchema = z.object(bundleFileShape);

const resolveBundleInputSchema = {
	bundleId: z.string().min(1).optional().describe('Exact shared file bundle id.'),
	bundleName: z.string().min(1).optional().describe('Shared file bundle name or unique substring.'),
	bundleFiles: bundleFilesInputSchema
		.optional()
		.describe('Explicit 8-file bundle. Use only when the caller already knows every filename.')
};

export function registerBundleTools(server: McpServer, apiClient: DbManagerApiClient): void {
	server.registerTool(
		'list_file_bundles',
		{
			title: 'List DbManager file bundles',
			description:
				'Return the available shared 8-file bundles from the running DbManager app server. Read-only.'
		},
		async () => {
			try {
				const bundles = await listFileBundles(apiClient);
				return jsonToolResult(
					{
						status: 'ok',
						bundles
					},
					`Found ${bundles.length} shared file bundle(s).`
				);
			} catch (error) {
				return errorToolResult(error, 'Failed to list DbManager file bundles.');
			}
		}
	);

	server.registerTool(
		'resolve_file_bundle',
		{
			title: 'Resolve DbManager file bundle',
			description:
				'Resolve a bundle id/name to the connected vocabulary/domain/term/database/entity/attribute/table/column filenames. Missing selectors return needs_bundle_selection.',
			inputSchema: resolveBundleInputSchema
		},
		async (args) => {
			try {
				const resolution = await resolveFileBundle(apiClient, args);
				return jsonToolResult(resolution, describeBundleResolution(resolution));
			} catch (error) {
				return errorToolResult(error, 'Failed to resolve DbManager file bundle.');
			}
		}
	);
}

export async function listFileBundles(apiClient: DbManagerApiClient): Promise<FileBundleEntry[]> {
	const response = await apiClient.get<DesignSnapshotsResponse>('/api/design-snapshots');

	if (response?.success === false) {
		throw new Error(response.error ?? response.message ?? 'Failed to load file bundles.');
	}

	const rawBundles = response?.data?.bundles;
	if (!Array.isArray(rawBundles)) {
		throw new Error('DbManager design snapshot response did not include data.bundles.');
	}

	return rawBundles.map((bundle, index) => normalizeBundleEntry(bundle, index));
}

export async function resolveFileBundle(
	apiClient: DbManagerApiClient,
	selector: BundleSelector
): Promise<BundleResolution> {
	const explicitBundle = normalizeExplicitBundle(selector.bundleFiles);
	const bundleId = selector.bundleId?.trim();
	const bundleName = selector.bundleName?.trim();

	if (explicitBundle && !bundleId && !bundleName) {
		return {
			status: 'resolved',
			bundle: {
				id: 'explicit-bundle-files',
				name: 'Explicit bundle files',
				files: explicitBundle
			}
		};
	}

	const bundles = await listFileBundles(apiClient);
	if (selector.bundleFiles && !explicitBundle) {
		return {
			status: 'bundle_resolution_error',
			message: 'bundleFiles must include all 8 filenames before reading data.',
			bundles
		};
	}

	if (!bundleId && !bundleName) {
		return {
			status: 'needs_bundle_selection',
			message: 'bundleId, bundleName, or complete bundleFiles is required before reading data.',
			bundles
		};
	}

	const idMatch = bundleId ? bundles.find((bundle) => bundle.id === bundleId) : undefined;
	const nameResolution = bundleName ? resolveBundleName(bundles, bundleName) : undefined;

	if (bundleId && bundleName) {
		if (!idMatch) {
			return {
				status: 'bundle_resolution_error',
				message: `No shared file bundle matched bundleId "${bundleId}".`,
				bundles,
				details: { bundleId, bundleName }
			};
		}

		if (nameResolution?.status === 'ambiguous') {
			return {
				status: 'bundle_resolution_error',
				message: `Bundle name "${bundleName}" is ambiguous. Choose a bundleId.`,
				bundles: nameResolution.bundles,
				details: { bundleId, bundleName }
			};
		}

		if (nameResolution?.status !== 'resolved') {
			return {
				status: 'bundle_resolution_error',
				message: `No shared file bundle matched bundleName "${bundleName}".`,
				bundles,
				details: { bundleId, bundleName }
			};
		}

		if (idMatch.id !== nameResolution.bundle.id) {
			return {
				status: 'bundle_resolution_error',
				message: 'bundleId and bundleName resolve to different file bundles.',
				bundles: [idMatch, nameResolution.bundle],
				details: {
					bundleId,
					bundleName,
					bundleIdMatch: idMatch.id,
					bundleNameMatch: nameResolution.bundle.id
				}
			};
		}

		return resolveWithExplicitBundleCheck(idMatch, explicitBundle, bundles, {
			bundleId,
			bundleName
		});
	}

	if (idMatch) {
		return resolveWithExplicitBundleCheck(idMatch, explicitBundle, bundles, { bundleId });
	}

	if (nameResolution?.status === 'resolved') {
		return resolveWithExplicitBundleCheck(nameResolution.bundle, explicitBundle, bundles, {
			bundleName
		});
	}

	if (nameResolution?.status === 'ambiguous') {
		return {
			status: 'bundle_resolution_error',
			message: `Bundle name "${bundleName}" is ambiguous. Choose a bundleId.`,
			bundles: nameResolution.bundles
		};
	}

	return {
		status: 'bundle_resolution_error',
		message: 'No shared file bundle matched the provided selector.',
		bundles
	};
}

export function getBundleFilename(bundle: FileBundleEntry, type: DataType): string {
	return bundle.files[type];
}

function resolveWithExplicitBundleCheck(
	bundle: FileBundleEntry,
	explicitBundle: FileBundle | null,
	bundles: FileBundleEntry[],
	selectorDetails: Record<string, string | undefined>
): BundleResolution {
	if (!explicitBundle) {
		return { status: 'resolved', bundle };
	}

	const mismatchedTypes = DATA_TYPES.filter((type) => explicitBundle[type] !== bundle.files[type]);
	if (mismatchedTypes.length === 0) {
		return { status: 'resolved', bundle };
	}

	return {
		status: 'bundle_resolution_error',
		message: 'bundleFiles do not match the resolved shared file bundle.',
		bundles,
		details: {
			...selectorDetails,
			bundleIdMatch: bundle.id,
			bundleNameMatch: bundle.name,
			mismatchedTypes,
			expectedFiles: Object.fromEntries(mismatchedTypes.map((type) => [type, bundle.files[type]])),
			providedFiles: Object.fromEntries(mismatchedTypes.map((type) => [type, explicitBundle[type]]))
		}
	};
}

function resolveBundleName(
	bundles: FileBundleEntry[],
	bundleName: string
):
	| { status: 'resolved'; bundle: FileBundleEntry }
	| { status: 'ambiguous'; bundles: FileBundleEntry[] }
	| { status: 'not_found' } {
	const exactNameMatch = bundles.find((bundle) => bundle.name === bundleName);
	if (exactNameMatch) {
		return { status: 'resolved', bundle: exactNameMatch };
	}

	const lowerName = bundleName.toLowerCase();
	const containsMatches = bundles.filter((bundle) => bundle.name.toLowerCase().includes(lowerName));
	if (containsMatches.length === 1) {
		return { status: 'resolved', bundle: containsMatches[0] };
	}
	if (containsMatches.length > 1) {
		return { status: 'ambiguous', bundles: containsMatches };
	}

	return { status: 'not_found' };
}

function describeBundleResolution(resolution: BundleResolution): string {
	if (resolution.status === 'resolved') {
		return `Resolved bundle "${resolution.bundle.name}".`;
	}
	if (resolution.status === 'needs_bundle_selection') {
		return 'Bundle selection is required before reading DbManager data.';
	}
	return resolution.message;
}

function normalizeExplicitBundle(files: BundleSelector['bundleFiles']): FileBundle | null {
	if (!files) {
		return null;
	}

	const bundle = {} as FileBundle;
	for (const type of DATA_TYPES) {
		const filename = files[type];
		if (typeof filename !== 'string' || filename.trim() === '') {
			return null;
		}
		bundle[type] = filename.trim();
	}

	return bundle;
}

function normalizeBundleEntry(value: unknown, index: number): FileBundleEntry {
	if (!value || typeof value !== 'object') {
		throw new Error(`Invalid bundle entry at index ${index}.`);
	}

	const entry = value as Partial<FileBundleEntry>;
	const files = normalizeExplicitBundle(entry.files);
	if (!files) {
		throw new Error(`Bundle entry at index ${index} does not contain all 8 filenames.`);
	}

	if (typeof entry.id !== 'string' || entry.id.trim() === '') {
		throw new Error(`Bundle entry at index ${index} is missing id.`);
	}
	if (typeof entry.name !== 'string' || entry.name.trim() === '') {
		throw new Error(`Bundle entry at index ${index} is missing name.`);
	}

	return {
		id: entry.id.trim(),
		name: entry.name.trim(),
		files,
		createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : undefined,
		updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : undefined
	};
}
