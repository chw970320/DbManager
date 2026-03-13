import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { ALL_DATA_TYPES, type DataType, type DataTypeMap } from '$lib/types/base.js';
import type {
	DesignSnapshotData,
	DesignSnapshotEntry,
	DesignSnapshotPayload,
	DesignSnapshotPayloadMap,
	DesignSnapshotSummaryEntry
} from '$lib/types/design-snapshot.js';
import type { SharedFileMappingBundle } from '$lib/types/shared-file-mapping.js';
import { invalidateAllCaches } from '$lib/registry/cache-registry';
import { saveDbDesignFileMappingBundle } from '$lib/registry/db-design-file-mapping';
import { loadData, saveData } from '$lib/registry/data-registry';
import { safeReadFile, safeWriteFile } from '$lib/utils/file-lock.js';

function getDataDir(): string {
	return process.env.DATA_PATH || 'static/data';
}

function getSettingsDir(): string {
	return join(getDataDir(), 'settings');
}

function getDesignSnapshotPath(): string {
	return resolve(getSettingsDir(), 'design-snapshots.json');
}

async function ensureSettingsDirectory(): Promise<void> {
	const dataDir = getDataDir();
	const settingsDir = getSettingsDir();

	if (!existsSync(dataDir)) {
		await mkdir(dataDir, { recursive: true });
	}

	if (!existsSync(settingsDir)) {
		await mkdir(settingsDir, { recursive: true });
	}
}

function createEmptyDesignSnapshotData(): DesignSnapshotData {
	return {
		entries: [],
		lastUpdated: new Date().toISOString(),
		totalCount: 0
	};
}

function trimString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionalString(value: unknown): string | undefined {
	const normalized = trimString(value);
	return normalized ? normalized : undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeBundle(bundle: unknown): SharedFileMappingBundle | null {
	if (!isObject(bundle)) {
		return null;
	}

	const normalized = {} as SharedFileMappingBundle;
	for (const type of ALL_DATA_TYPES) {
		const filename = trimString(bundle[type]);
		if (!filename) {
			return null;
		}
		normalized[type] = filename;
	}

	return normalized;
}

function sanitizeSnapshotData<T extends DataType>(data: DataTypeMap[T]): DataTypeMap[T] {
	const cloned = JSON.parse(JSON.stringify(data)) as DataTypeMap[T] & {
		mapping?: unknown;
		entries?: unknown[];
		totalCount?: number;
	};
	delete cloned.mapping;
	cloned.totalCount = Array.isArray(cloned.entries) ? cloned.entries.length : 0;
	return cloned;
}

function createPayload<T extends DataType>(
	type: T,
	filename: string,
	data: DataTypeMap[T]
): DesignSnapshotPayload {
	const sanitized = sanitizeSnapshotData(data);
	const entries = Array.isArray((sanitized as { entries?: unknown[] }).entries)
		? ((sanitized as { entries: unknown[] }).entries.length ?? 0)
		: 0;

	return {
		filename,
		entryCount: entries,
		data: sanitized
	};
}

function normalizePayload(type: DataType, payload: unknown): DesignSnapshotPayload | null {
	if (!isObject(payload)) {
		return null;
	}

	const filename = trimString(payload.filename);
	const data = payload.data;
	if (!filename || !isObject(data) || !Array.isArray(data.entries)) {
		return null;
	}

	return {
		filename,
		entryCount:
			typeof payload.entryCount === 'number' && payload.entryCount >= 0
				? payload.entryCount
				: data.entries.length,
		data
	};
}

function buildCounts(payloads: DesignSnapshotPayloadMap): Record<DataType, number> {
	const counts = {} as Record<DataType, number>;
	for (const type of ALL_DATA_TYPES) {
		counts[type] = payloads[type].entryCount;
	}
	return counts;
}

function toSummary(entry: DesignSnapshotEntry): DesignSnapshotSummaryEntry {
	return {
		id: entry.id,
		name: entry.name,
		description: entry.description,
		bundle: entry.bundle,
		counts: buildCounts(entry.payloads),
		createdAt: entry.createdAt,
		updatedAt: entry.updatedAt,
		restoredAt: entry.restoredAt
	};
}

function sortEntries(entries: DesignSnapshotEntry[]): DesignSnapshotEntry[] {
	return [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function normalizeEntry(entry: unknown): DesignSnapshotEntry | null {
	if (!isObject(entry)) {
		return null;
	}

	const id = trimString(entry.id);
	const name = trimString(entry.name);
	const bundle = normalizeBundle(entry.bundle);
	if (!id || !name || !bundle || !isObject(entry.payloads)) {
		return null;
	}

	const payloads = {} as DesignSnapshotPayloadMap;
	for (const type of ALL_DATA_TYPES) {
		const payload = normalizePayload(type, entry.payloads[type]);
		if (!payload) {
			return null;
		}
		payloads[type] = payload;
	}

	const createdAt = trimString(entry.createdAt) || new Date().toISOString();
	const updatedAt = trimString(entry.updatedAt) || createdAt;

	return {
		id,
		name,
		description: normalizeOptionalString(entry.description),
		bundle,
		payloads,
		createdAt,
		updatedAt,
		restoredAt: normalizeOptionalString(entry.restoredAt)
	};
}

function normalizeData(data: unknown): DesignSnapshotData {
	if (!isObject(data) || !Array.isArray(data.entries)) {
		return createEmptyDesignSnapshotData();
	}

	const entries = sortEntries(
		data.entries
			.map((entry) => normalizeEntry(entry))
			.filter((entry): entry is DesignSnapshotEntry => entry !== null)
	);

	return {
		entries,
		lastUpdated: trimString(data.lastUpdated) || new Date().toISOString(),
		totalCount: entries.length
	};
}

export async function loadDesignSnapshotData(): Promise<DesignSnapshotData> {
	await ensureSettingsDirectory();
	const filePath = getDesignSnapshotPath();
	const raw = await safeReadFile(filePath);

	if (!raw || !raw.trim()) {
		const emptyData = createEmptyDesignSnapshotData();
		await saveDesignSnapshotData(emptyData);
		return emptyData;
	}

	try {
		const normalized = normalizeData(JSON.parse(raw));
		if (normalized.totalCount !== ((JSON.parse(raw) as { entries?: unknown[] }).entries?.length || 0)) {
			await saveDesignSnapshotData(normalized);
		}
		return normalized;
	} catch (error) {
		console.error('스냅샷 레지스트리 파싱 중 오류:', error);
		const emptyData = createEmptyDesignSnapshotData();
		await saveDesignSnapshotData(emptyData);
		return emptyData;
	}
}

export async function saveDesignSnapshotData(data: DesignSnapshotData): Promise<DesignSnapshotData> {
	await ensureSettingsDirectory();
	const entries = sortEntries(
		data.entries
			.map((entry) => normalizeEntry(entry))
			.filter((entry): entry is DesignSnapshotEntry => entry !== null)
	);
	const nextData: DesignSnapshotData = {
		entries,
		lastUpdated: new Date().toISOString(),
		totalCount: entries.length
	};

	await safeWriteFile(getDesignSnapshotPath(), JSON.stringify(nextData, null, 2));
	return nextData;
}

export async function listDesignSnapshotSummaries(): Promise<DesignSnapshotSummaryEntry[]> {
	const data = await loadDesignSnapshotData();
	return data.entries.map((entry) => toSummary(entry));
}

export async function createDesignSnapshot(input: {
	name?: string;
	description?: string;
	bundle?: SharedFileMappingBundle;
}): Promise<{ entry: DesignSnapshotSummaryEntry; data: DesignSnapshotData }> {
	const bundle = normalizeBundle(input.bundle);
	if (!bundle) {
		throw new Error('스냅샷 생성에 필요한 8종 파일 번들이 올바르지 않습니다.');
	}

	const payloads = {} as DesignSnapshotPayloadMap;
	for (const type of ALL_DATA_TYPES) {
		const data = await loadData(type, bundle[type]);
		payloads[type] = createPayload(type, bundle[type], data);
	}

	const currentData = await loadDesignSnapshotData();
	const now = new Date().toISOString();
	const entry: DesignSnapshotEntry = {
		id: randomUUID(),
		name: trimString(input.name) || `${bundle.column} 스냅샷`,
		description: normalizeOptionalString(input.description),
		bundle,
		payloads,
		createdAt: now,
		updatedAt: now
	};

	const data = await saveDesignSnapshotData({
		...currentData,
		entries: [entry, ...currentData.entries]
	});

	return {
		entry: toSummary(entry),
		data
	};
}

export async function restoreDesignSnapshot(
	id: string
): Promise<{ entry: DesignSnapshotSummaryEntry; data: DesignSnapshotData }> {
	const currentData = await loadDesignSnapshotData();
	const snapshot = currentData.entries.find((entry) => entry.id === id);
	if (!snapshot) {
		throw new Error('복원할 스냅샷을 찾을 수 없습니다.');
	}

	for (const type of ALL_DATA_TYPES) {
		await saveData(type, snapshot.payloads[type].data as DataTypeMap[typeof type], snapshot.bundle[type]);
	}

	await saveDbDesignFileMappingBundle({
		currentType: 'column',
		currentFilename: snapshot.bundle.column,
		mapping: {
			vocabulary: snapshot.bundle.vocabulary,
			domain: snapshot.bundle.domain,
			term: snapshot.bundle.term,
			database: snapshot.bundle.database,
			entity: snapshot.bundle.entity,
			attribute: snapshot.bundle.attribute,
			table: snapshot.bundle.table
		}
	});

	invalidateAllCaches();

	const restoredAt = new Date().toISOString();
	const updatedEntries = currentData.entries.map((entry) =>
		entry.id === id
			? {
					...entry,
					restoredAt,
					updatedAt: restoredAt
				}
			: entry
	);
	const data = await saveDesignSnapshotData({
		...currentData,
		entries: updatedEntries
	});
	const restoredEntry = data.entries.find((entry) => entry.id === id) ?? {
		...snapshot,
		restoredAt,
		updatedAt: restoredAt
	};

	return {
		entry: toSummary(restoredEntry),
		data
	};
}

export async function deleteDesignSnapshot(
	id: string
): Promise<{ entry: DesignSnapshotSummaryEntry; data: DesignSnapshotData }> {
	const currentData = await loadDesignSnapshotData();
	const snapshot = currentData.entries.find((entry) => entry.id === id);
	if (!snapshot) {
		throw new Error('삭제할 스냅샷을 찾을 수 없습니다.');
	}

	const data = await saveDesignSnapshotData({
		...currentData,
		entries: currentData.entries.filter((entry) => entry.id !== id)
	});

	return {
		entry: toSummary(snapshot),
		data
	};
}
