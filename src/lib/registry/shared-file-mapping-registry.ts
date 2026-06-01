import { mkdir, readdir } from 'fs/promises';
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
import { getSharedFileMappingBundleDisplayName } from '$lib/utils/shared-file-mapping-name.js';

const DATA_DIR = process.env.DATA_PATH || 'static/data';
const SETTINGS_DIR = join(DATA_DIR, 'settings');
const SHARED_FILE_MAPPINGS_FILENAME = 'shared-file-mappings.json';
const SHARED_FILE_MAPPING_VERSION = '2.0';
const DEFAULT_SHARED_FILE_MAPPING_ID = 'default-shared-file-mapping';
const HISTORY_FILE = 'history.json';

function getSharedFileMappingPath(): string {
	return resolve(SETTINGS_DIR, SHARED_FILE_MAPPINGS_FILENAME);
}

function getRegistryPath(): string {
	return resolve(DATA_DIR, 'registry.json');
}

function getDataDirectory(type: DataType): string {
	return resolve(DATA_DIR, type);
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

function isDefaultBundle(bundle: SharedFileMappingBundle): boolean {
	return ALL_DATA_TYPES.every((type) => bundle[type] === DEFAULT_FILENAMES[type]);
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
	return ALL_DATA_TYPES.some((type) => a[type] === b[type] && a[type] !== DEFAULT_FILENAMES[type]);
}

function assertNoNonDefaultBundleConflicts(
	entries: SharedFileMappingBundleEntry[],
	context: string
): void {
	for (let i = 0; i < entries.length; i += 1) {
		for (let j = i + 1; j < entries.length; j += 1) {
			const left = entries[i];
			const right = entries[j];
			if (
				!isDefaultBundle(left.files) &&
				!isDefaultBundle(right.files) &&
				hasBundleConflict(left.files, right.files)
			) {
				throw new Error(
					`${context}: ${left.name} / ${right.name} 번들이 같은 비기본 파일을 서로 다른 조합으로 참조합니다.`
				);
			}
		}
	}
}

function createBundleKey(bundle: SharedFileMappingBundle): string {
	return ALL_DATA_TYPES.map((type) => `${type}:${bundle[type]}`).join('|');
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
		name:
			typeof entry.name === 'string' && entry.name.trim()
				? entry.name.trim()
				: getSharedFileMappingBundleDisplayName(bundle),
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
		version: SHARED_FILE_MAPPING_VERSION,
		bundles: [
			{
				id: DEFAULT_SHARED_FILE_MAPPING_ID,
				name: getSharedFileMappingBundleDisplayName(createDefaultBundle()),
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
		return {
			...createDefaultSharedFileMappingRegistryData(),
			version:
				data.version === '1.0' || data.version === '2.0'
					? data.version
					: SHARED_FILE_MAPPING_VERSION
		};
	}

	return {
		version:
			data.version === '1.0' || data.version === '2.0' ? data.version : SHARED_FILE_MAPPING_VERSION,
		bundles,
		lastUpdated:
			typeof data.lastUpdated === 'string' && data.lastUpdated.trim()
				? data.lastUpdated
				: new Date().toISOString()
	};
}

async function rawReadSharedFileMappingRegistryData(): Promise<SharedFileMappingRegistryData | null> {
	await ensureSettingsDirectory();
	const filePath = getSharedFileMappingPath();
	const raw = await safeReadFile(filePath);

	if (!raw || !raw.trim()) {
		return null;
	}

	const parsed = JSON.parse(raw) as Partial<SharedFileMappingRegistryData>;
	if (parsed.version === SHARED_FILE_MAPPING_VERSION) {
		if (!Array.isArray(parsed.bundles) || parsed.bundles.length === 0) {
			throw new Error('shared-file-mappings.json v2 번들 목록이 비어 있거나 올바르지 않습니다.');
		}

		const normalizedEntries = parsed.bundles.map((entry) => normalizeBundleEntry(entry));
		if (normalizedEntries.some((entry) => entry === null)) {
			throw new Error('shared-file-mappings.json v2 번들 항목이 올바르지 않습니다.');
		}

		const bundles = dedupeBundles(normalizedEntries as SharedFileMappingBundleEntry[]);
		if (bundles.length !== parsed.bundles.length) {
			throw new Error('shared-file-mappings.json v2 번들에 중복 조합이 포함되어 있습니다.');
		}
		assertNoNonDefaultBundleConflicts(bundles, 'shared-file-mappings.json v2');

		return {
			version: SHARED_FILE_MAPPING_VERSION,
			bundles,
			lastUpdated:
				typeof parsed.lastUpdated === 'string' && parsed.lastUpdated.trim()
					? parsed.lastUpdated
					: new Date().toISOString()
		};
	}

	return normalizeRegistryData({
		...parsed,
		version: '1.0'
	});
}

async function rawSaveSharedFileMappingRegistryData(
	data: SharedFileMappingRegistryData
): Promise<SharedFileMappingRegistryData> {
	await ensureSettingsDirectory();
	const filePath = getSharedFileMappingPath();
	const normalized = normalizeRegistryData(data);
	const finalData: SharedFileMappingRegistryData = {
		...normalized,
		version: SHARED_FILE_MAPPING_VERSION,
		lastUpdated: new Date().toISOString()
	};
	assertNoNonDefaultBundleConflicts(finalData.bundles, 'shared-file-mappings.json 저장');

	await safeWriteFile(filePath, JSON.stringify(finalData, null, 2));
	return finalData;
}

function normalizeMappingBundleFromLegacy(
	type: DataType,
	filename: string,
	mapping: unknown
): SharedFileMappingBundle {
	const bundle = createDefaultBundle();
	bundle[type] = filename;

	if (mapping && typeof mapping === 'object') {
		const rawMapping = mapping as Partial<Record<DataType, unknown>>;
		for (const relatedType of ALL_DATA_TYPES) {
			const relatedFilename = rawMapping[relatedType];
			if (typeof relatedFilename === 'string' && relatedFilename.trim()) {
				bundle[relatedType] = relatedFilename.trim();
			}
		}
	}

	return bundle;
}

function addCandidateBundle(
	candidates: SharedFileMappingBundle[],
	bundle: SharedFileMappingBundle,
	source: string
): void {
	if (candidates.some((candidate) => areBundlesEqual(candidate, bundle))) {
		return;
	}

	const conflicting = candidates.find(
		(candidate) =>
			!isDefaultBundle(candidate) &&
			!isDefaultBundle(bundle) &&
			!areBundlesEqual(candidate, bundle) &&
			hasBundleConflict(candidate, bundle)
	);
	if (conflicting) {
		throw new Error(
			`공통 파일 매핑 마이그레이션 충돌: ${source} 후보가 기존 번들과 같은 파일을 다른 조합으로 참조합니다.`
		);
	}

	candidates.push(bundle);
}

async function readLegacyDataFileMappingCandidates(): Promise<SharedFileMappingBundle[]> {
	const candidates: SharedFileMappingBundle[] = [];

	for (const type of ALL_DATA_TYPES) {
		let files: string[] = [];
		try {
			files = await readdir(getDataDirectory(type));
		} catch (error) {
			const code =
				error && typeof error === 'object' && 'code' in error
					? (error as { code?: unknown }).code
					: undefined;
			if (code === 'ENOENT') {
				continue;
			}
			throw new Error(
				`공통 파일 매핑 마이그레이션 실패: ${type} 데이터 디렉터리 조회 실패 (${
					error instanceof Error ? error.message : '알 수 없는 오류'
				})`
			);
		}

		for (const file of files) {
			if (!file.endsWith('.json') || file === HISTORY_FILE || file.includes('_backup_')) {
				continue;
			}

			const path = resolve(getDataDirectory(type), file);
			const raw = await safeReadFile(path);
			if (!raw || !raw.trim()) {
				continue;
			}

			const parsed = JSON.parse(raw) as { mapping?: unknown };
			if (
				(!parsed.mapping || typeof parsed.mapping !== 'object') &&
				file === DEFAULT_FILENAMES[type]
			) {
				continue;
			}

			addCandidateBundle(
				candidates,
				normalizeMappingBundleFromLegacy(
					type,
					file,
					parsed.mapping && typeof parsed.mapping === 'object' ? parsed.mapping : undefined
				),
				`${type}/${file}`
			);
		}
	}

	return candidates;
}

type LegacyRelation = {
	sourceType?: unknown;
	sourceFilename?: unknown;
	targetType?: unknown;
	targetFilename?: unknown;
};

function isDataType(value: unknown): value is DataType {
	return typeof value === 'string' && ALL_DATA_TYPES.includes(value as DataType);
}

async function readLegacyRegistryBundleCandidates(): Promise<SharedFileMappingBundle[]> {
	const raw = await safeReadFile(getRegistryPath());
	if (!raw || !raw.trim()) {
		return [];
	}

	const parsed = JSON.parse(raw) as { relations?: LegacyRelation[] };
	if (!Array.isArray(parsed.relations)) {
		return [];
	}

	const parent = new Map<string, string>();
	const nodes = new Set<string>();

	function node(type: DataType, filename: string): string {
		return `${type}:${filename}`;
	}

	function find(value: string): string {
		if (!parent.has(value)) {
			parent.set(value, value);
			return value;
		}
		const current = parent.get(value)!;
		if (current === value) return value;
		const root = find(current);
		parent.set(value, root);
		return root;
	}

	function union(a: string, b: string): void {
		const rootA = find(a);
		const rootB = find(b);
		if (rootA !== rootB) {
			parent.set(rootB, rootA);
		}
	}

	for (const relation of parsed.relations) {
		if (
			!isDataType(relation.sourceType) ||
			!isDataType(relation.targetType) ||
			typeof relation.sourceFilename !== 'string' ||
			typeof relation.targetFilename !== 'string' ||
			!relation.sourceFilename.trim() ||
			!relation.targetFilename.trim()
		) {
			continue;
		}

		const sourceNode = node(relation.sourceType, relation.sourceFilename.trim());
		const targetNode = node(relation.targetType, relation.targetFilename.trim());
		nodes.add(sourceNode);
		nodes.add(targetNode);
		union(sourceNode, targetNode);
	}

	const components = new Map<string, string[]>();
	for (const graphNode of nodes) {
		const root = find(graphNode);
		components.set(root, [...(components.get(root) ?? []), graphNode]);
	}

	const candidates: SharedFileMappingBundle[] = [];
	for (const graphNodes of components.values()) {
		const bundle = createDefaultBundle();
		const seen = new Map<DataType, string>();
		for (const graphNode of graphNodes) {
			const separator = graphNode.indexOf(':');
			const type = graphNode.slice(0, separator) as DataType;
			const filename = graphNode.slice(separator + 1);
			const previous = seen.get(type);
			if (previous && previous !== filename) {
				throw new Error(
					`공통 파일 매핑 마이그레이션 충돌: registry.json 컴포넌트에 ${type} 파일이 둘 이상 포함되었습니다.`
				);
			}
			seen.set(type, filename);
			bundle[type] = filename;
		}

		addCandidateBundle(candidates, bundle, 'registry.json');
	}

	return candidates;
}

async function buildMigratedRegistryData(
	currentData: SharedFileMappingRegistryData | null
): Promise<SharedFileMappingRegistryData> {
	const candidates: SharedFileMappingBundle[] = [];
	addCandidateBundle(candidates, createDefaultBundle(), 'default');

	const currentBundles = currentData?.bundles ?? [];
	for (const entry of currentBundles) {
		addCandidateBundle(candidates, entry.files, 'shared-file-mappings.json');
	}

	for (const bundle of await readLegacyRegistryBundleCandidates()) {
		addCandidateBundle(candidates, bundle, 'registry.json');
	}
	for (const bundle of await readLegacyDataFileMappingCandidates()) {
		addCandidateBundle(candidates, bundle, 'legacy mapping field');
	}

	const now = new Date().toISOString();
	const existingByKey = new Map(
		currentBundles.map((entry) => [createBundleKey(entry.files), entry] as const)
	);
	return {
		version: SHARED_FILE_MAPPING_VERSION,
		bundles: candidates.map((bundle) => {
			const existing = existingByKey.get(createBundleKey(bundle));
			return {
				id:
					existing?.id ?? (isDefaultBundle(bundle) ? DEFAULT_SHARED_FILE_MAPPING_ID : randomUUID()),
				name: existing?.name?.trim() || getSharedFileMappingBundleDisplayName(bundle),
				files: bundle,
				createdAt: existing?.createdAt ?? now,
				updatedAt: existing?.updatedAt ?? now
			};
		}),
		lastUpdated: currentData?.lastUpdated ?? now
	};
}

let migrationPromise: Promise<void> | null = null;

export function resetFileMappingMigrationForTest(): void {
	migrationPromise = null;
}

export async function ensureFileMappingMigrated(): Promise<void> {
	if (!migrationPromise) {
		migrationPromise = (async () => {
			const currentData = await rawReadSharedFileMappingRegistryData();
			if (currentData?.version === SHARED_FILE_MAPPING_VERSION) {
				return;
			}

			const migrated = await buildMigratedRegistryData(currentData);
			await rawSaveSharedFileMappingRegistryData(migrated);
			console.log('[공통 파일 매핑] v2 canonical mapping migration completed.');
		})().catch((error) => {
			migrationPromise = null;
			throw new Error(
				`공통 파일 매핑 마이그레이션 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
			);
		});
	}

	return migrationPromise;
}

export async function loadSharedFileMappingRegistryData(): Promise<SharedFileMappingRegistryData> {
	await ensureFileMappingMigrated();
	const rawData = await rawReadSharedFileMappingRegistryData();
	if (!rawData) {
		const defaultData = createDefaultSharedFileMappingRegistryData();
		return rawSaveSharedFileMappingRegistryData(defaultData);
	}

	return rawData;
}

export async function saveSharedFileMappingRegistryData(
	data: SharedFileMappingRegistryData
): Promise<SharedFileMappingRegistryData> {
	await ensureFileMappingMigrated();
	return rawSaveSharedFileMappingRegistryData(data);
}

export async function resolveSharedFileMappingBundle(
	currentType: DataType,
	currentFilename: string
): Promise<SharedFileMappingBundle | null> {
	const data = await loadSharedFileMappingRegistryData();
	const matches = data.bundles.filter((entry) => entry.files[currentType] === currentFilename);
	const matched =
		currentFilename === DEFAULT_FILENAMES[currentType]
			? (matches.find((entry) => isDefaultBundle(entry.files)) ??
				matches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0])
			: matches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

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
				name: getSharedFileMappingBundleDisplayName(bundle),
				files: bundle,
				updatedAt: now
			}
		: {
				id: randomUUID(),
				name: getSharedFileMappingBundleDisplayName(bundle),
				files: bundle,
				createdAt: now,
				updatedAt: now
			};

	const nextData = await saveSharedFileMappingRegistryData({
		version: SHARED_FILE_MAPPING_VERSION,
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
			name: getSharedFileMappingBundleDisplayName({
				...entry.files,
				[type]: newFilename
			}),
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
		version: SHARED_FILE_MAPPING_VERSION,
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
			name: getSharedFileMappingBundleDisplayName({
				...entry.files,
				[type]: DEFAULT_FILENAMES[type]
			}),
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
		version: SHARED_FILE_MAPPING_VERSION,
		bundles: nextBundles,
		lastUpdated: now
	});

	return updatedCount;
}
