import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import type {
	DataSourceData,
	DataSourceEntry,
	DataSourceInput,
	DataSourceSummaryEntry,
	PostgreSqlConnectionConfig
} from '$lib/types/data-source.js';
import { safeReadFile, safeWriteFile } from '$lib/utils/file-lock.js';

export const DEFAULT_POSTGRESQL_PORT = 5432;
export const DEFAULT_CONNECTION_TIMEOUT_SECONDS = 5;

function getDataDir(): string {
	return process.env.DATA_PATH || 'static/data';
}

function getSettingsDir(): string {
	return join(getDataDir(), 'settings');
}

function getDataSourceFilePath(): string {
	return resolve(getSettingsDir(), 'data-sources.json');
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

function createEmptyDataSourceData(): DataSourceData {
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

function normalizePort(value: unknown): number {
	const port =
		typeof value === 'number'
			? value
			: typeof value === 'string' && value.trim()
				? Number(value)
				: DEFAULT_POSTGRESQL_PORT;

	return Number.isInteger(port) && port > 0 ? port : NaN;
}

function normalizeTimeout(value: unknown): number {
	const timeout =
		typeof value === 'number'
			? value
			: typeof value === 'string' && value.trim()
				? Number(value)
				: DEFAULT_CONNECTION_TIMEOUT_SECONDS;

	return Number.isInteger(timeout) && timeout > 0 ? timeout : DEFAULT_CONNECTION_TIMEOUT_SECONDS;
}

function normalizeSsl(value: unknown): boolean {
	return value === true || value === 'true';
}

function validateInput(
	input: Partial<DataSourceInput>,
	options: { allowBlankPassword: boolean; excludeId?: string; existingEntries: DataSourceEntry[] }
): string | null {
	const name = trimString(input.name);
	if (!name) {
		return '연결 이름은 필수입니다.';
	}

	if (input.type !== 'postgresql') {
		return '지원하지 않는 데이터 소스 유형입니다.';
	}

	const config = input.config;
	if (!config) {
		return 'PostgreSQL 연결 정보는 필수입니다.';
	}

	if (!trimString(config.host)) {
		return '호스트는 필수입니다.';
	}

	const port = normalizePort(config.port);
	if (!Number.isInteger(port) || port <= 0) {
		return '포트는 1 이상의 정수여야 합니다.';
	}

	if (!trimString(config.database)) {
		return '데이터베이스는 필수입니다.';
	}

	if (!trimString(config.username)) {
		return '사용자명은 필수입니다.';
	}

	if (!options.allowBlankPassword && !trimString(config.password)) {
		return '비밀번호는 필수입니다.';
	}

	const duplicatedName = options.existingEntries.find(
		(entry) =>
			entry.id !== options.excludeId && entry.name.trim().toLowerCase() === name.toLowerCase()
	);
	if (duplicatedName) {
		return '이미 존재하는 연결 이름입니다.';
	}

	return null;
}

function normalizeStoredEntry(entry: Partial<DataSourceEntry>): DataSourceEntry | null {
	if (!entry || entry.type !== 'postgresql') {
		return null;
	}

	const name = trimString(entry.name);
	const config = entry.config;
	if (!entry.id || !name || !config) {
		return null;
	}

	const port = normalizePort(config.port);
	if (!Number.isInteger(port) || port <= 0) {
		return null;
	}

	const host = trimString(config.host);
	const database = trimString(config.database);
	const username = trimString(config.username);
	const password = trimString(config.password);
	if (!host || !database || !username || !password) {
		return null;
	}

	return {
		id: entry.id,
		name,
		type: 'postgresql',
		description: normalizeOptionalString(entry.description),
		config: {
			host,
			port,
			database,
			schema: normalizeOptionalString(config.schema),
			username,
			password,
			ssl: normalizeSsl(config.ssl),
			connectionTimeoutSeconds: normalizeTimeout(config.connectionTimeoutSeconds)
		},
		createdAt:
			typeof entry.createdAt === 'string' && entry.createdAt.trim()
				? entry.createdAt
				: new Date().toISOString(),
		updatedAt:
			typeof entry.updatedAt === 'string' && entry.updatedAt.trim()
				? entry.updatedAt
				: new Date().toISOString()
	};
}

function sortEntries(entries: DataSourceEntry[]): DataSourceEntry[] {
	return [...entries].sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
}

function buildConfig(
	config: PostgreSqlConnectionConfig,
	options: { existingPassword?: string }
): PostgreSqlConnectionConfig {
	const password = trimString(config.password);

	return {
		host: trimString(config.host),
		port: normalizePort(config.port),
		database: trimString(config.database),
		schema: normalizeOptionalString(config.schema),
		username: trimString(config.username),
		password: password || options.existingPassword || '',
		ssl: normalizeSsl(config.ssl),
		connectionTimeoutSeconds: normalizeTimeout(config.connectionTimeoutSeconds)
	};
}

export function sanitizeDataSourceEntry(entry: DataSourceEntry): DataSourceSummaryEntry {
	const { password, ...restConfig } = entry.config;

	return {
		...entry,
		config: {
			...restConfig,
			hasPassword: Boolean(password)
		}
	};
}

export async function loadDataSourceData(): Promise<DataSourceData> {
	await ensureSettingsDirectory();
	const filePath = getDataSourceFilePath();
	const raw = await safeReadFile(filePath);

	if (!raw || !raw.trim()) {
		const emptyData = createEmptyDataSourceData();
		await saveDataSourceData(emptyData);
		return emptyData;
	}

	try {
		const parsed = JSON.parse(raw) as Partial<DataSourceData>;
		const entries = Array.isArray(parsed.entries)
			? parsed.entries
					.map((entry) => normalizeStoredEntry(entry))
					.filter((entry): entry is DataSourceEntry => entry !== null)
			: [];

		const normalized: DataSourceData = {
			entries: sortEntries(entries),
			lastUpdated:
				typeof parsed.lastUpdated === 'string' && parsed.lastUpdated.trim()
					? parsed.lastUpdated
					: new Date().toISOString(),
			totalCount: entries.length
		};

		if (entries.length !== (parsed.entries?.length || 0)) {
			await saveDataSourceData(normalized);
		}

		return normalized;
	} catch (error) {
		console.error('데이터 소스 설정 파싱 중 오류:', error);
		const emptyData = createEmptyDataSourceData();
		await saveDataSourceData(emptyData);
		return emptyData;
	}
}

export async function saveDataSourceData(data: DataSourceData): Promise<DataSourceData> {
	await ensureSettingsDirectory();

	const entries = sortEntries(
		data.entries
			.map((entry) => normalizeStoredEntry(entry))
			.filter((entry): entry is DataSourceEntry => entry !== null)
	);
	const nextData: DataSourceData = {
		entries,
		lastUpdated: new Date().toISOString(),
		totalCount: entries.length
	};

	await safeWriteFile(getDataSourceFilePath(), JSON.stringify(nextData, null, 2));
	return nextData;
}

export async function listDataSourceSummaries(): Promise<DataSourceSummaryEntry[]> {
	const data = await loadDataSourceData();
	return data.entries.map((entry) => sanitizeDataSourceEntry(entry));
}

export async function getDataSourceEntry(id: string): Promise<DataSourceEntry | null> {
	const data = await loadDataSourceData();
	return data.entries.find((entry) => entry.id === id) || null;
}

export async function createDataSource(input: DataSourceInput): Promise<{
	entry: DataSourceSummaryEntry;
	data: DataSourceData;
}> {
	const currentData = await loadDataSourceData();
	const validationError = validateInput(input, {
		allowBlankPassword: false,
		existingEntries: currentData.entries
	});
	if (validationError) {
		throw new Error(validationError);
	}

	const now = new Date().toISOString();
	const entry: DataSourceEntry = {
		id: randomUUID(),
		name: trimString(input.name),
		type: 'postgresql',
		description: normalizeOptionalString(input.description),
		config: buildConfig(input.config, {}),
		createdAt: now,
		updatedAt: now
	};

	const data = await saveDataSourceData({
		...currentData,
		entries: [...currentData.entries, entry]
	});

	return {
		entry: sanitizeDataSourceEntry(entry),
		data
	};
}

export async function updateDataSource(
	id: string,
	input: DataSourceInput
): Promise<{
	entry: DataSourceSummaryEntry;
	data: DataSourceData;
}> {
	const currentData = await loadDataSourceData();
	const index = currentData.entries.findIndex((entry) => entry.id === id);
	if (index === -1) {
		throw new Error('수정할 데이터 소스를 찾을 수 없습니다.');
	}

	const existingEntry = currentData.entries[index];
	const validationError = validateInput(input, {
		allowBlankPassword: true,
		excludeId: id,
		existingEntries: currentData.entries
	});
	if (validationError) {
		throw new Error(validationError);
	}

	const updatedEntry: DataSourceEntry = {
		...existingEntry,
		name: trimString(input.name),
		type: 'postgresql',
		description: normalizeOptionalString(input.description),
		config: buildConfig(input.config, {
			existingPassword: existingEntry.config.password
		}),
		updatedAt: new Date().toISOString()
	};

	const entries = [...currentData.entries];
	entries[index] = updatedEntry;
	const data = await saveDataSourceData({
		...currentData,
		entries
	});

	return {
		entry: sanitizeDataSourceEntry(updatedEntry),
		data
	};
}

export async function deleteDataSource(id: string): Promise<{ data: DataSourceData }> {
	const currentData = await loadDataSourceData();
	const filteredEntries = currentData.entries.filter((entry) => entry.id !== id);

	if (filteredEntries.length === currentData.entries.length) {
		throw new Error('삭제할 데이터 소스를 찾을 수 없습니다.');
	}

	const data = await saveDataSourceData({
		...currentData,
		entries: filteredEntries
	});

	return { data };
}
