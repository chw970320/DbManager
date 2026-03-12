import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { randomUUID } from 'crypto';
import { join, resolve } from 'path';
import type {
	QualityRuleData,
	QualityRuleEntry,
	QualityRuleInput,
	QualityRuleMetric,
	QualityRuleOperator,
	QualityRuleScope,
	QualityRuleSeverity
} from '$lib/types/data-quality-rule.js';
import {
	QUALITY_RULE_METRICS,
	QUALITY_RULE_METRICS_BY_SCOPE,
	QUALITY_RULE_OPERATORS,
	QUALITY_RULE_SCOPES,
	QUALITY_RULE_SEVERITIES
} from '$lib/types/data-quality-rule.js';
import { safeReadFile, safeWriteFile } from '$lib/utils/file-lock.js';

function getDataDir(): string {
	return process.env.DATA_PATH || 'static/data';
}

function getSettingsDir(): string {
	return join(getDataDir(), 'settings');
}

function getQualityRuleFilePath(): string {
	return resolve(getSettingsDir(), 'quality-rules.json');
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

function createEmptyQualityRuleData(): QualityRuleData {
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
	return normalized || undefined;
}

function normalizeBoolean(value: unknown, fallback = true): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

function normalizeThreshold(value: unknown): number {
	const parsed =
		typeof value === 'number'
			? value
			: typeof value === 'string' && value.trim()
				? Number(value)
				: NaN;

	return Number.isFinite(parsed) ? Number(parsed) : NaN;
}

function isSeverity(value: unknown): value is QualityRuleSeverity {
	return (
		typeof value === 'string' && QUALITY_RULE_SEVERITIES.includes(value as QualityRuleSeverity)
	);
}

function isScope(value: unknown): value is QualityRuleScope {
	return typeof value === 'string' && QUALITY_RULE_SCOPES.includes(value as QualityRuleScope);
}

function isMetric(value: unknown): value is QualityRuleMetric {
	return typeof value === 'string' && QUALITY_RULE_METRICS.includes(value as QualityRuleMetric);
}

function isOperator(value: unknown): value is QualityRuleOperator {
	return typeof value === 'string' && QUALITY_RULE_OPERATORS.includes(value as QualityRuleOperator);
}

function normalizeStoredEntry(entry: Partial<QualityRuleEntry>): QualityRuleEntry | null {
	const name = trimString(entry.name);
	const threshold = normalizeThreshold(entry.threshold);
	const target =
		entry.target && typeof entry.target === 'object'
			? {
					schemaPattern: normalizeOptionalString(entry.target.schemaPattern),
					tablePattern: normalizeOptionalString(entry.target.tablePattern),
					columnPattern: normalizeOptionalString(entry.target.columnPattern)
				}
			: {};

	if (
		!entry.id ||
		!name ||
		!isSeverity(entry.severity) ||
		!isScope(entry.scope) ||
		!isMetric(entry.metric) ||
		!isOperator(entry.operator) ||
		!Number.isFinite(threshold)
	) {
		return null;
	}

	if (!QUALITY_RULE_METRICS_BY_SCOPE[entry.scope].includes(entry.metric)) {
		return null;
	}

	return {
		id: entry.id,
		name,
		description: normalizeOptionalString(entry.description),
		enabled: normalizeBoolean(entry.enabled, true),
		severity: entry.severity,
		scope: entry.scope,
		metric: entry.metric,
		operator: entry.operator,
		threshold,
		target,
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

function sortEntries(entries: QualityRuleEntry[]): QualityRuleEntry[] {
	return [...entries].sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
}

function validateInput(
	input: Partial<QualityRuleInput>,
	options: { excludeId?: string; existingEntries: QualityRuleEntry[] }
): string | null {
	const name = trimString(input.name);
	if (!name) {
		return '규칙 이름은 필수입니다.';
	}

	if (!isSeverity(input.severity)) {
		return '심각도는 필수입니다.';
	}

	if (!isScope(input.scope)) {
		return '범위는 필수입니다.';
	}

	if (!isMetric(input.metric)) {
		return '메트릭은 필수입니다.';
	}

	if (!isOperator(input.operator)) {
		return '연산자는 필수입니다.';
	}

	if (!QUALITY_RULE_METRICS_BY_SCOPE[input.scope].includes(input.metric)) {
		return '선택한 범위에서 사용할 수 없는 메트릭입니다.';
	}

	const threshold = normalizeThreshold(input.threshold);
	if (!Number.isFinite(threshold)) {
		return '기준값은 숫자여야 합니다.';
	}

	const duplicatedName = options.existingEntries.find(
		(entry) =>
			entry.id !== options.excludeId && entry.name.trim().toLowerCase() === name.toLowerCase()
	);
	if (duplicatedName) {
		return '이미 존재하는 품질 규칙 이름입니다.';
	}

	return null;
}

function buildEntry(
	input: QualityRuleInput,
	options: { id?: string; createdAt?: string }
): QualityRuleEntry {
	const now = new Date().toISOString();

	return {
		id: options.id || randomUUID(),
		name: trimString(input.name),
		description: normalizeOptionalString(input.description),
		enabled: normalizeBoolean(input.enabled, true),
		severity: input.severity,
		scope: input.scope,
		metric: input.metric,
		operator: input.operator,
		threshold: normalizeThreshold(input.threshold),
		target: {
			schemaPattern: normalizeOptionalString(input.target?.schemaPattern),
			tablePattern: normalizeOptionalString(input.target?.tablePattern),
			columnPattern:
				input.scope === 'column' ? normalizeOptionalString(input.target?.columnPattern) : undefined
		},
		createdAt: options.createdAt || now,
		updatedAt: now
	};
}

export async function loadQualityRuleData(): Promise<QualityRuleData> {
	await ensureSettingsDirectory();
	const filePath = getQualityRuleFilePath();
	const raw = await safeReadFile(filePath);

	if (!raw || !raw.trim()) {
		const emptyData = createEmptyQualityRuleData();
		await saveQualityRuleData(emptyData);
		return emptyData;
	}

	try {
		const parsed = JSON.parse(raw) as Partial<QualityRuleData>;
		const entries = Array.isArray(parsed.entries)
			? parsed.entries
					.map((entry) => normalizeStoredEntry(entry))
					.filter((entry): entry is QualityRuleEntry => entry !== null)
			: [];

		const normalized: QualityRuleData = {
			entries: sortEntries(entries),
			lastUpdated:
				typeof parsed.lastUpdated === 'string' && parsed.lastUpdated.trim()
					? parsed.lastUpdated
					: new Date().toISOString(),
			totalCount: entries.length
		};

		if (entries.length !== (parsed.entries?.length || 0)) {
			await saveQualityRuleData(normalized);
		}

		return normalized;
	} catch (error) {
		console.error('품질 규칙 설정 파싱 중 오류:', error);
		const emptyData = createEmptyQualityRuleData();
		await saveQualityRuleData(emptyData);
		return emptyData;
	}
}

export async function saveQualityRuleData(data: QualityRuleData): Promise<QualityRuleData> {
	await ensureSettingsDirectory();

	const entries = sortEntries(
		data.entries
			.map((entry) => normalizeStoredEntry(entry))
			.filter((entry): entry is QualityRuleEntry => entry !== null)
	);
	const nextData: QualityRuleData = {
		entries,
		lastUpdated: new Date().toISOString(),
		totalCount: entries.length
	};

	await safeWriteFile(getQualityRuleFilePath(), JSON.stringify(nextData, null, 2));
	return nextData;
}

export async function createQualityRule(input: QualityRuleInput): Promise<{
	entry: QualityRuleEntry;
	data: QualityRuleData;
}> {
	const currentData = await loadQualityRuleData();
	const validationError = validateInput(input, { existingEntries: currentData.entries });
	if (validationError) {
		throw new Error(validationError);
	}

	const entry = buildEntry(input, {});
	const data = await saveQualityRuleData({
		...currentData,
		entries: [...currentData.entries, entry]
	});

	return { entry, data };
}

export async function updateQualityRule(
	id: string,
	input: QualityRuleInput
): Promise<{
	entry: QualityRuleEntry;
	data: QualityRuleData;
}> {
	const currentData = await loadQualityRuleData();
	const index = currentData.entries.findIndex((entry) => entry.id === id);
	if (index === -1) {
		throw new Error('수정할 품질 규칙을 찾을 수 없습니다.');
	}

	const validationError = validateInput(input, {
		excludeId: id,
		existingEntries: currentData.entries
	});
	if (validationError) {
		throw new Error(validationError);
	}

	const existingEntry = currentData.entries[index];
	const updatedEntry = buildEntry(input, {
		id,
		createdAt: existingEntry.createdAt
	});
	const entries = [...currentData.entries];
	entries[index] = updatedEntry;

	const data = await saveQualityRuleData({
		...currentData,
		entries
	});

	return { entry: updatedEntry, data };
}

export async function deleteQualityRule(id: string): Promise<{ data: QualityRuleData }> {
	const currentData = await loadQualityRuleData();
	const filteredEntries = currentData.entries.filter((entry) => entry.id !== id);

	if (filteredEntries.length === currentData.entries.length) {
		throw new Error('삭제할 품질 규칙을 찾을 수 없습니다.');
	}

	const data = await saveQualityRuleData({
		...currentData,
		entries: filteredEntries
	});

	return { data };
}
