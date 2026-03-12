import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { ALL_DATA_TYPES, DEFAULT_FILENAMES, type DataType } from '$lib/types/base.js';
import type {
	SharedFileMappingBundle,
	SharedFileMappingBundleEntry,
	SharedFileMappingRegistryData
} from '$lib/types/shared-file-mapping.js';
import { safeReadFile, safeWriteFile } from '$lib/utils/file-lock.js';

const DATA_DIR = process.env.DATA_PATH || 'static/data';
const SETTINGS_DIR = join(DATA_DIR, 'settings');
const SHARED_FILE_MAPPINGS_FILENAME = 'shared-file-mappings.json';

function getSharedFileMappingPath(): string {
	return resolve(SETTINGS_DIR, SHARED_FILE_MAPPINGS_FILENAME);
}

async function ensureSettingsDirectory(): Promise<void> {
	if (!existsSync(DATA_DIR)) {
		await mkdir(DATA_DIR, { recursive: true });
	}

	if (!existsSync(SETTINGS_DIR)) {
		await mkdir(SETTINGS_DIR, { recursive: true });
	}
}

function createDefaultBundle(): SharedFileMappingBundle {
	return { ...DEFAULT_FILENAMES };
}

function normalizeBundle(
	files: Partial<Record<DataType, string>> | undefined
): SharedFileMappingBundle | null {
	const bundle = {} as SharedFileMappingBundle;

	for (const type of ALL_DATA_TYPES) {
		const filename = files?.[type];
		if (typeof filename !== 'string' || filename.trim() === '') {
			return null;
		}
		bundle[type] = filename.trim();
	}

	return bundle;
}

function areBundlesEqual(a: SharedFileMappingBundle, b: SharedFileMappingBundle): boolean {
	return ALL_DATA_TYPES.every((type) => a[type] === b[type]);
}

function hasBundleConflict(a: SharedFileMappingBundle, b: SharedFileMappingBundle): boolean {
	return ALL_DATA_TYPES.some((type) => a[type] === b[type]);
}

function normalizeBundleEntry(
	entry: Partial<SharedFileMappingBundleEntry>
): SharedFileMappingBundleEntry | null {
	if (!entry.id || typeof entry.id !== 'string' || entry.id.trim() === '') {
		return null;
	}

	const bundle = normalizeBundle(entry.files);
	if (!bundle) {
		return null;
	}

	const createdAt =
		typeof entry.createdAt === 'string' && entry.createdAt.trim()
			? entry.createdAt
			: new Date().toISOString();
	const updatedAt =
		typeof entry.updatedAt === 'string' && entry.updatedAt.trim() ? entry.updatedAt : createdAt;

	return {
		id: entry.id.trim(),
		files: bundle,
		createdAt,
		updatedAt
	};
}

function dedupeBundles(entries: SharedFileMappingBundleEntry[]): SharedFileMappingBundleEntry[] {
	const sorted = [...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	const deduped: SharedFileMappingBundleEntry[] = [];

	for (const entry of sorted) {
		if (deduped.some((existing) => areBundlesEqual(existing.files, entry.files))) {
			continue;
		}
		deduped.push(entry);
	}

	return deduped.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function createDefaultSharedFileMappingRegistryData(): SharedFileMappingRegistryData {
	const now = new Date().toISOString();

	return {
		version: '1.0',
		bundles: [
			{
				id: 'default-shared-file-mapping',
				files: createDefaultBundle(),
				createdAt: now,
				updatedAt: now
			}
		],
		lastUpdated: now
	};
}

function normalizeRegistryData(
	data: Partial<SharedFileMappingRegistryData>
): SharedFileMappingRegistryData {
	const bundles = Array.isArray(data.bundles)
		? dedupeBundles(
				data.bundles
					.map((entry) => normalizeBundleEntry(entry))
					.filter((entry): entry is SharedFileMappingBundleEntry => entry !== null)
			)
		: [];

	if (bundles.length === 0) {
		return createDefaultSharedFileMappingRegistryData();
	}

	return {
		version: '1.0',
		bundles,
		lastUpdated:
			typeof data.lastUpdated === 'string' && data.lastUpdated.trim()
				? data.lastUpdated
				: new Date().toISOString()
	};
}

export async function loadSharedFileMappingRegistryData(): Promise<SharedFileMappingRegistryData> {
	await ensureSettingsDirectory();
	const filePath = getSharedFileMappingPath();
	const raw = await safeReadFile(filePath);

	if (!raw || !raw.trim()) {
		const defaultData = createDefaultSharedFileMappingRegistryData();
		await saveSharedFileMappingRegistryData(defaultData);
		return defaultData;
	}

	const parsed = JSON.parse(raw) as Partial<SharedFileMappingRegistryData>;
	const normalized = normalizeRegistryData(parsed);

	if (normalized.bundles.length !== (parsed.bundles?.length ?? 0)) {
		await saveSharedFileMappingRegistryData(normalized);
	}

	return normalized;
}

export async function saveSharedFileMappingRegistryData(
	data: SharedFileMappingRegistryData
): Promise<SharedFileMappingRegistryData> {
	await ensureSettingsDirectory();
	const filePath = getSharedFileMappingPath();
	const normalized = normalizeRegistryData(data);
	const finalData: SharedFileMappingRegistryData = {
		...normalized,
		lastUpdated: new Date().toISOString()
	};

	await safeWriteFile(filePath, JSON.stringify(finalData, null, 2));
	return finalData;
}

export async function resolveSharedFileMappingBundle(
	currentType: DataType,
	currentFilename: string
): Promise<SharedFileMappingBundle | null> {
	const data = await loadSharedFileMappingRegistryData();
	const matched = data.bundles
		.filter((entry) => entry.files[currentType] === currentFilename)
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

	return matched ? { ...matched.files } : null;
}

export async function saveSharedFileMappingBundle(
	bundleInput: Partial<Record<DataType, string>>
): Promise<SharedFileMappingBundle> {
	const bundle = normalizeBundle(bundleInput);
	if (!bundle) {
		throw new Error('공통 파일 매핑 저장에 필요한 8종 파일명이 모두 제공되지 않았습니다.');
	}

	const data = await loadSharedFileMappingRegistryData();
	const now = new Date().toISOString();
	const exactMatch = data.bundles.find((entry) => areBundlesEqual(entry.files, bundle));
	const retained = data.bundles.filter(
		(entry) => areBundlesEqual(entry.files, bundle) || !hasBundleConflict(entry.files, bundle)
	);

	const nextEntry: SharedFileMappingBundleEntry = exactMatch
		? {
				...exactMatch,
				files: bundle,
				updatedAt: now
			}
		: {
				id: randomUUID(),
				files: bundle,
				createdAt: now,
				updatedAt: now
			};

	const nextData = await saveSharedFileMappingRegistryData({
		version: '1.0',
		bundles: [...retained.filter((entry) => !areBundlesEqual(entry.files, bundle)), nextEntry],
		lastUpdated: now
	});
	const savedEntry = nextData.bundles.find((entry) => areBundlesEqual(entry.files, bundle));

	return savedEntry ? { ...savedEntry.files } : bundle;
}

export async function syncSharedFileMappingsOnRename(
	type: DataType,
	oldFilename: string,
	newFilename: string
): Promise<number> {
	const data = await loadSharedFileMappingRegistryData();
	let updatedCount = 0;
	const now = new Date().toISOString();

	const nextBundles = data.bundles.map((entry) => {
		if (entry.files[type] !== oldFilename) {
			return entry;
		}

		updatedCount += 1;
		return {
			...entry,
			files: {
				...entry.files,
				[type]: newFilename
			},
			updatedAt: now
		};
	});

	if (updatedCount === 0) {
		return 0;
	}

	await saveSharedFileMappingRegistryData({
		version: '1.0',
		bundles: nextBundles,
		lastUpdated: now
	});

	return updatedCount;
}

export async function syncSharedFileMappingsOnDelete(
	type: DataType,
	filename: string
): Promise<number> {
	const data = await loadSharedFileMappingRegistryData();
	let updatedCount = 0;
	const now = new Date().toISOString();

	const nextBundles = data.bundles.map((entry) => {
		if (entry.files[type] !== filename) {
			return entry;
		}

		updatedCount += 1;
		return {
			...entry,
			files: {
				...entry.files,
				[type]: DEFAULT_FILENAMES[type]
			},
			updatedAt: now
		};
	});

	if (updatedCount === 0) {
		return 0;
	}

	await saveSharedFileMappingRegistryData({
		version: '1.0',
		bundles: nextBundles,
		lastUpdated: now
	});

	return updatedCount;
}
