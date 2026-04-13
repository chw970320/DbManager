import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join, resolve } from 'path';
import type { DataType, DataTypeMap } from '$lib/types/base';
import { ALL_DATA_TYPES } from '$lib/types/base';
import type {
	UploadHistoryData,
	UploadHistoryEntry,
	UploadHistorySummaryEntry
} from '$lib/types/upload-history';
import { invalidateAllCaches } from '$lib/registry/cache-registry';
import { invalidateAllGeneratorCaches } from '$lib/registry/generator-cache';
import { loadData, saveData } from '$lib/registry/data-registry';
import { safeReadFile, safeWriteFile } from '$lib/utils/file-lock';

const SETTINGS_DIRNAME = 'settings';
const HISTORY_DIRNAME = 'upload-history';
const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

function getDataDir(): string {
	return process.env.DATA_PATH || 'static/data';
}

function getSettingsDir(): string {
	return join(getDataDir(), SETTINGS_DIRNAME);
}

function getUploadHistoryDir(): string {
	return join(getSettingsDir(), HISTORY_DIRNAME);
}

function getUploadHistoryPath(type: DataType): string {
	return resolve(getUploadHistoryDir(), `${type}.json`);
}

async function ensureUploadHistoryDirectory(): Promise<void> {
	const dataDir = getDataDir();
	const settingsDir = getSettingsDir();
	const historyDir = getUploadHistoryDir();

	if (!existsSync(dataDir)) {
		await mkdir(dataDir, { recursive: true });
	}
	if (!existsSync(settingsDir)) {
		await mkdir(settingsDir, { recursive: true });
	}
	if (!existsSync(historyDir)) {
		await mkdir(historyDir, { recursive: true });
	}
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createEmptyUploadHistoryData(): UploadHistoryData {
	return {
		entries: [],
		lastUpdated: new Date().toISOString(),
		totalCount: 0
	};
}

function createExpiry(createdAt: string): string {
	return new Date(new Date(createdAt).getTime() + RETENTION_MS).toISOString();
}

function sanitizeHistoryContent<T extends DataType>(data: DataTypeMap[T]): DataTypeMap[T] {
	const cloned = JSON.parse(JSON.stringify(data)) as DataTypeMap[T] & {
		mapping?: unknown;
		entries?: unknown[];
		totalCount?: number;
	};

	delete cloned.mapping;
	cloned.totalCount = Array.isArray(cloned.entries) ? cloned.entries.length : 0;
	return cloned;
}

function normalizeEntry<T extends DataType>(
	type: T,
	entry: unknown
): UploadHistoryEntry<T> | null {
	if (!isObject(entry)) {
		return null;
	}

	const id = typeof entry.id === 'string' ? entry.id.trim() : '';
	const filename = typeof entry.filename === 'string' ? entry.filename.trim() : '';
	const reason = entry.reason === 'upload-replace' ? 'upload-replace' : null;
	const createdAt = typeof entry.createdAt === 'string' ? entry.createdAt.trim() : '';
	const expiresAt = typeof entry.expiresAt === 'string' ? entry.expiresAt.trim() : '';
	const content = entry.content;

	if (!id || !filename || !reason || !createdAt || !expiresAt || !isObject(content)) {
		return null;
	}

	return {
		id,
		dataType: type,
		filename,
		reason,
		createdAt,
		expiresAt,
		content: content as unknown as DataTypeMap[T]
	};
}

function normalizeData<T extends DataType>(type: T, value: unknown): UploadHistoryData<T> {
	if (!isObject(value) || !Array.isArray(value.entries)) {
		return createEmptyUploadHistoryData() as UploadHistoryData<T>;
	}

	const entries = value.entries
		.map((entry) => normalizeEntry(type, entry))
		.filter((entry): entry is UploadHistoryEntry<T> => entry !== null)
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

	return {
		entries,
		lastUpdated:
			typeof value.lastUpdated === 'string' && value.lastUpdated.trim()
				? value.lastUpdated
				: new Date().toISOString(),
		totalCount: entries.length
	};
}

function toSummary<T extends DataType>(entry: UploadHistoryEntry<T>): UploadHistorySummaryEntry<T> {
	return {
		id: entry.id,
		dataType: entry.dataType,
		filename: entry.filename,
		reason: entry.reason,
		createdAt: entry.createdAt,
		expiresAt: entry.expiresAt,
		entryCount: Array.isArray((entry.content as { entries?: unknown[] }).entries)
			? ((entry.content as { entries: unknown[] }).entries.length ?? 0)
			: 0
	};
}

export async function loadUploadHistoryData<T extends DataType>(type: T): Promise<UploadHistoryData<T>> {
	await ensureUploadHistoryDirectory();
	const filePath = getUploadHistoryPath(type);
	const raw = await safeReadFile(filePath);

	if (!raw || !raw.trim()) {
		const emptyData = createEmptyUploadHistoryData() as UploadHistoryData<T>;
		await saveUploadHistoryData(type, emptyData);
		return emptyData;
	}

	try {
		const parsed = JSON.parse(raw);
		const normalized = normalizeData(type, parsed);
		if (normalized.totalCount !== ((parsed as { entries?: unknown[] }).entries?.length || 0)) {
			await saveUploadHistoryData(type, normalized);
		}
		return normalized;
	} catch (error) {
		console.error('upload-history 레지스트리 파싱 실패:', error);
		const emptyData = createEmptyUploadHistoryData() as UploadHistoryData<T>;
		await saveUploadHistoryData(type, emptyData);
		return emptyData;
	}
}

export async function saveUploadHistoryData<T extends DataType>(
	type: T,
	data: UploadHistoryData<T>
): Promise<UploadHistoryData<T>> {
	await ensureUploadHistoryDirectory();
	const entries = [...data.entries]
		.map((entry) => normalizeEntry(type, entry))
		.filter((entry): entry is UploadHistoryEntry<T> => entry !== null)
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	const nextData: UploadHistoryData<T> = {
		entries,
		lastUpdated: new Date().toISOString(),
		totalCount: entries.length
	};

	await safeWriteFile(getUploadHistoryPath(type), JSON.stringify(nextData, null, 2));
	return nextData;
}

export async function pruneExpiredUploadHistory<T extends DataType>(
	type: T,
	now = new Date().toISOString()
): Promise<UploadHistoryData<T>> {
	const current = await loadUploadHistoryData(type);
	const threshold = new Date(now).toISOString();
	const entries = current.entries.filter((entry) => entry.expiresAt > threshold);

	if (entries.length === current.entries.length) {
		return current;
	}

	return saveUploadHistoryData(type, {
		...current,
		entries,
		totalCount: entries.length
	});
}

export async function pruneExpiredUploadHistories(
	now = new Date().toISOString()
): Promise<Record<DataType, number>> {
	const results = {} as Record<DataType, number>;

	for (const type of ALL_DATA_TYPES) {
		const pruned = await pruneExpiredUploadHistory(type, now);
		results[type] = pruned.totalCount;
	}

	return results;
}

export async function captureUploadReplaceHistory<T extends DataType>(
	type: T,
	filename: string,
	now = new Date().toISOString()
): Promise<UploadHistorySummaryEntry<T>> {
	await pruneExpiredUploadHistory(type, now);
	const current = await loadData(type, filename);
	const sanitized = sanitizeHistoryContent(current);
	const history = await loadUploadHistoryData(type);
	const entry: UploadHistoryEntry<T> = {
		id: randomUUID(),
		dataType: type,
		filename,
		reason: 'upload-replace',
		createdAt: now,
		expiresAt: createExpiry(now),
		content: sanitized
	};

	await saveUploadHistoryData(type, {
		...history,
		entries: [entry, ...history.entries],
		totalCount: history.totalCount + 1
	});

	return toSummary(entry);
}

export async function listUploadHistoryEntries<T extends DataType>(
	type: T,
	filename: string,
	now?: string
): Promise<UploadHistorySummaryEntry<T>[]> {
	const history = await pruneExpiredUploadHistory(type, now);
	return history.entries
		.filter((entry) => entry.filename === filename)
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
		.map((entry) => toSummary(entry));
}

export async function restoreUploadHistoryEntry<T extends DataType>(
	type: T,
	id: string,
	now?: string
): Promise<UploadHistorySummaryEntry<T>> {
	const history = await pruneExpiredUploadHistory(type, now);
	const entry = history.entries.find((candidate) => candidate.id === id);

	if (!entry) {
		throw new Error('복원할 업로드 이력을 찾을 수 없습니다.');
	}

	await saveData(type, entry.content as DataTypeMap[T], entry.filename);
	invalidateAllCaches();
	invalidateAllGeneratorCaches();

	return toSummary(entry);
}
