import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import type {
	DomainDataTypeMappingData,
	DomainDataTypeMappingEntry,
	DomainDataTypeMappingSyncResult
} from '$lib/types/domain-data-type-mapping.js';
import type { DataType } from '$lib/types/base.js';
import {
	loadDomainData,
	saveDomainData,
	listDomainFiles,
	loadTermData,
	saveTermData,
	listTermFiles,
	loadColumnData,
	saveColumnData,
	listColumnFiles
} from '$lib/registry/data-registry.js';
import { resolveRelatedFilenames } from '$lib/registry/mapping-registry.js';
import { invalidateCache } from '$lib/registry/cache-registry.js';
import { safeReadFile, safeWriteFile } from '$lib/utils/file-lock.js';
import {
	DEFAULT_DOMAIN_DATA_TYPE_MAPPINGS,
	buildStandardDomainName,
	normalizeDomainDataTypeAbbreviation,
	normalizePhysicalDataTypeKey
} from '$lib/utils/domain-name.js';
import { normalizeKey } from '$lib/utils/mapping-key.js';

const DATA_DIR = process.env.DATA_PATH || 'static/data';
const SETTINGS_DIR = join(DATA_DIR, 'settings');
const MAPPINGS_FILENAME = 'domain-data-type-mappings.json';

const DEFAULT_MAPPING_IDS: Record<string, string> = {
	NUMERIC: 'datatype-numeric',
	VARCHAR: 'datatype-varchar',
	'DOUBLE PRECISION': 'datatype-double-precision',
	INT4: 'datatype-int4',
	CHAR: 'datatype-char',
	TIME: 'datatype-time',
	TIMESTAMP: 'datatype-timestamp',
	TIMESTAMPTZ: 'datatype-timestamptz',
	DATE: 'datatype-date',
	DATETIME: 'datatype-datetime',
	BOOLEAN: 'datatype-boolean',
	TEXT: 'datatype-text',
	SERIAL: 'datatype-serial',
	INT8: 'datatype-int8',
	GEOMETRY: 'datatype-geometry'
};

function getMappingFilePath(): string {
	return resolve(SETTINGS_DIR, MAPPINGS_FILENAME);
}

async function ensureSettingsDirectory(): Promise<void> {
	if (!existsSync(DATA_DIR)) {
		await mkdir(DATA_DIR, { recursive: true });
	}

	if (!existsSync(SETTINGS_DIR)) {
		await mkdir(SETTINGS_DIR, { recursive: true });
	}
}

function createDefaultDomainDataTypeMappingData(): DomainDataTypeMappingData {
	const now = new Date().toISOString();
	const entries: DomainDataTypeMappingEntry[] = DEFAULT_DOMAIN_DATA_TYPE_MAPPINGS.map((mapping) => ({
		id: DEFAULT_MAPPING_IDS[normalizePhysicalDataTypeKey(mapping.dataType)] || crypto.randomUUID(),
		dataType: mapping.dataType,
		abbreviation: mapping.abbreviation,
		createdAt: now,
		updatedAt: now
	}));

	return {
		entries,
		lastUpdated: now,
		totalCount: entries.length
	};
}

function normalizeMappingEntry(
	entry: Partial<DomainDataTypeMappingEntry>
): DomainDataTypeMappingEntry | null {
	const dataType = typeof entry.dataType === 'string' ? entry.dataType.trim() : '';
	const abbreviation = typeof entry.abbreviation === 'string' ? entry.abbreviation.trim() : '';

	if (!entry.id || !dataType || !abbreviation) {
		return null;
	}

	return {
		id: entry.id,
		dataType,
		abbreviation,
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

function sortEntries(entries: DomainDataTypeMappingEntry[]): DomainDataTypeMappingEntry[] {
	return [...entries].sort((a, b) => a.dataType.localeCompare(b.dataType, 'en'));
}

function buildFileMappingOverride(
	mapping: Record<string, string> | undefined
): Partial<Record<DataType, string>> {
	const override: Partial<Record<DataType, string>> = {};

	if (!mapping) {
		return override;
	}

	for (const [key, value] of Object.entries(mapping)) {
		if (value && value.trim()) {
			override[key as DataType] = value;
		}
	}

	return override;
}

function validateMappingFields(
	dataType: string,
	abbreviation: string,
	existingEntries: DomainDataTypeMappingEntry[],
	excludeId?: string
): string | null {
	const normalizedType = normalizePhysicalDataTypeKey(dataType);
	if (!normalizedType) {
		return '데이터타입은 필수입니다.';
	}

	const normalizedAbbreviation = normalizeDomainDataTypeAbbreviation(abbreviation);
	if (!normalizedAbbreviation) {
		return '매핑약어는 필수입니다.';
	}

	const duplicatedType = existingEntries.find(
		(entry) =>
			entry.id !== excludeId &&
			normalizePhysicalDataTypeKey(entry.dataType) === normalizedType
	);
	if (duplicatedType) {
		return `'${dataType}' 데이터타입 매핑이 이미 존재합니다.`;
	}

	const duplicatedAbbreviation = existingEntries.find(
		(entry) =>
			entry.id !== excludeId &&
			normalizeDomainDataTypeAbbreviation(entry.abbreviation) === normalizedAbbreviation
	);
	if (duplicatedAbbreviation) {
		return `'${normalizedAbbreviation}' 매핑약어가 이미 존재합니다.`;
	}

	return null;
}

export async function loadDomainDataTypeMappingData(): Promise<DomainDataTypeMappingData> {
	await ensureSettingsDirectory();
	const filePath = getMappingFilePath();
	const raw = await safeReadFile(filePath);

	if (!raw || !raw.trim()) {
		const defaultData = createDefaultDomainDataTypeMappingData();
		await saveDomainDataTypeMappingData(defaultData);
		return defaultData;
	}

	const parsed = JSON.parse(raw) as Partial<DomainDataTypeMappingData>;
	const entries = Array.isArray(parsed.entries)
		? parsed.entries
				.map((entry) => normalizeMappingEntry(entry))
				.filter((entry): entry is DomainDataTypeMappingEntry => entry !== null)
		: [];

	if (entries.length === 0) {
		const defaultData = createDefaultDomainDataTypeMappingData();
		await saveDomainDataTypeMappingData(defaultData);
		return defaultData;
	}

	return {
		entries: sortEntries(entries),
		lastUpdated:
			typeof parsed.lastUpdated === 'string' && parsed.lastUpdated.trim()
				? parsed.lastUpdated
				: new Date().toISOString(),
		totalCount: entries.length
	};
}

export async function saveDomainDataTypeMappingData(
	data: DomainDataTypeMappingData
): Promise<DomainDataTypeMappingData> {
	await ensureSettingsDirectory();
	const filePath = getMappingFilePath();
	const entries = sortEntries(
		data.entries
			.map((entry) => normalizeMappingEntry(entry))
			.filter((entry): entry is DomainDataTypeMappingEntry => entry !== null)
	);

	const finalData: DomainDataTypeMappingData = {
		entries,
		lastUpdated: new Date().toISOString(),
		totalCount: entries.length
	};

	await safeWriteFile(filePath, JSON.stringify(finalData, null, 2));
	return finalData;
}

export async function synchronizeDomainNameReferences(
	mappings?: DomainDataTypeMappingEntry[]
): Promise<DomainDataTypeMappingSyncResult> {
	const activeMappings = mappings || (await loadDomainDataTypeMappingData()).entries;
	const result: DomainDataTypeMappingSyncResult = {
		domainFilesUpdated: 0,
		domainsUpdated: 0,
		termFilesUpdated: 0,
		termsUpdated: 0,
		columnFilesUpdated: 0,
		columnsUpdated: 0
	};

	const renamedDomainNamesByFile = new Map<string, Map<string, string>>();
	const domainFiles = await listDomainFiles();

	for (const filename of domainFiles) {
		const domainData = await loadDomainData(filename);
		const now = new Date().toISOString();
		let hasChanges = false;
		const renameMap = new Map<string, string>();

		const updatedEntries = domainData.entries.map((entry) => {
			const generatedDomainName = buildStandardDomainName(
				entry.domainCategory,
				entry.physicalDataType,
				entry.dataLength,
				entry.decimalPlaces,
				activeMappings
			);

			if (!generatedDomainName || generatedDomainName === entry.standardDomainName) {
				return entry;
			}

			hasChanges = true;
			result.domainsUpdated += 1;
			renameMap.set(normalizeKey(entry.standardDomainName), generatedDomainName);

			return {
				...entry,
				standardDomainName: generatedDomainName,
				updatedAt: now
			};
		});

		if (!hasChanges) {
			continue;
		}

		renamedDomainNamesByFile.set(filename, renameMap);
		result.domainFilesUpdated += 1;
		await saveDomainData(
			{
				...domainData,
				entries: updatedEntries
			},
			filename
		);
		invalidateCache('domain', filename);
	}

	if (renamedDomainNamesByFile.size === 0) {
		return result;
	}

	const termFiles = await listTermFiles();
	for (const filename of termFiles) {
		const termData = await loadTermData(filename);
		const relatedFiles = await resolveRelatedFilenames(
			'term',
			filename,
			buildFileMappingOverride(termData.mapping)
		);
		const domainFilename = relatedFiles.get('domain') || 'domain.json';
		const renameMap = renamedDomainNamesByFile.get(domainFilename);

		if (!renameMap || renameMap.size === 0) {
			continue;
		}

		const now = new Date().toISOString();
		let hasChanges = false;
		const updatedEntries = termData.entries.map((entry) => {
			const nextDomainName = renameMap.get(normalizeKey(entry.domainName));
			if (!nextDomainName || nextDomainName === entry.domainName) {
				return entry;
			}

			hasChanges = true;
			result.termsUpdated += 1;
			return {
				...entry,
				domainName: nextDomainName,
				isMappedDomain: true,
				updatedAt: now
			};
		});

		if (!hasChanges) {
			continue;
		}

		result.termFilesUpdated += 1;
		await saveTermData(
			{
				...termData,
				entries: updatedEntries
			},
			filename
		);
		invalidateCache('term', filename);
	}

	const columnFiles = await listColumnFiles();
	for (const filename of columnFiles) {
		const columnData = await loadColumnData(filename);
		const relatedFiles = await resolveRelatedFilenames(
			'column',
			filename,
			buildFileMappingOverride(columnData.mapping)
		);
		const domainFilename = relatedFiles.get('domain') || 'domain.json';
		const renameMap = renamedDomainNamesByFile.get(domainFilename);

		if (!renameMap || renameMap.size === 0) {
			continue;
		}

		const now = new Date().toISOString();
		let hasChanges = false;
		const updatedEntries = columnData.entries.map((entry) => {
			const nextDomainName = renameMap.get(normalizeKey(entry.domainName));
			if (!nextDomainName || nextDomainName === entry.domainName) {
				return entry;
			}

			hasChanges = true;
			result.columnsUpdated += 1;
			return {
				...entry,
				domainName: nextDomainName,
				updatedAt: now
			};
		});

		if (!hasChanges) {
			continue;
		}

		result.columnFilesUpdated += 1;
		await saveColumnData(
			{
				...columnData,
				entries: updatedEntries
			},
			filename
		);
		invalidateCache('column', filename);
	}

	return result;
}

export async function createDomainDataTypeMapping(
	dataType: string,
	abbreviation: string
): Promise<{ entry: DomainDataTypeMappingEntry; data: DomainDataTypeMappingData; sync: DomainDataTypeMappingSyncResult }> {
	const currentData = await loadDomainDataTypeMappingData();
	const validationError = validateMappingFields(dataType, abbreviation, currentData.entries);
	if (validationError) {
		throw new Error(validationError);
	}

	const now = new Date().toISOString();
	const entry: DomainDataTypeMappingEntry = {
		id: crypto.randomUUID(),
		dataType: dataType.trim(),
		abbreviation: normalizeDomainDataTypeAbbreviation(abbreviation),
		createdAt: now,
		updatedAt: now
	};

	const savedData = await saveDomainDataTypeMappingData({
		...currentData,
		entries: [...currentData.entries, entry]
	});
	const sync = await synchronizeDomainNameReferences(savedData.entries);
	return { entry, data: savedData, sync };
}

export async function updateDomainDataTypeMapping(
	id: string,
	dataType: string,
	abbreviation: string
): Promise<{ entry: DomainDataTypeMappingEntry; data: DomainDataTypeMappingData; sync: DomainDataTypeMappingSyncResult }> {
	const currentData = await loadDomainDataTypeMappingData();
	const targetIndex = currentData.entries.findIndex((entry) => entry.id === id);

	if (targetIndex === -1) {
		throw new Error('수정할 데이터타입 매핑을 찾을 수 없습니다.');
	}

	const validationError = validateMappingFields(
		dataType,
		abbreviation,
		currentData.entries,
		id
	);
	if (validationError) {
		throw new Error(validationError);
	}

	const now = new Date().toISOString();
	const updatedEntry: DomainDataTypeMappingEntry = {
		...currentData.entries[targetIndex],
		dataType: dataType.trim(),
		abbreviation: normalizeDomainDataTypeAbbreviation(abbreviation),
		updatedAt: now
	};

	const nextEntries = [...currentData.entries];
	nextEntries[targetIndex] = updatedEntry;

	const savedData = await saveDomainDataTypeMappingData({
		...currentData,
		entries: nextEntries
	});
	const sync = await synchronizeDomainNameReferences(savedData.entries);
	return { entry: updatedEntry, data: savedData, sync };
}

export async function deleteDomainDataTypeMapping(
	id: string
): Promise<{ data: DomainDataTypeMappingData; sync: DomainDataTypeMappingSyncResult }> {
	const currentData = await loadDomainDataTypeMappingData();
	const nextEntries = currentData.entries.filter((entry) => entry.id !== id);

	if (nextEntries.length === currentData.entries.length) {
		throw new Error('삭제할 데이터타입 매핑을 찾을 수 없습니다.');
	}

	const savedData = await saveDomainDataTypeMappingData({
		...currentData,
		entries: nextEntries
	});
	const sync = await synchronizeDomainNameReferences(savedData.entries);
	return { data: savedData, sync };
}
