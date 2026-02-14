import { getCachedData } from '$lib/registry/cache-registry.js';
import { listFiles, loadData } from '$lib/registry/data-registry.js';
import type { MappingContext } from '$lib/types/erd-mapping.js';

type DefinitionType = 'database' | 'entity' | 'attribute' | 'table' | 'column';

export type DefinitionFileSelection = {
	database: string | null;
	entity: string | null;
	attribute: string | null;
	table: string | null;
	column: string | null;
	domain: string | null;
	vocabulary: string | null;
};

export type LoadDesignRelationContextOptions = {
	databaseFile?: string | null;
	entityFile?: string | null;
	attributeFile?: string | null;
	tableFile?: string | null;
	columnFile?: string | null;
	domainFile?: string | null;
	vocabularyFile?: string | null;
	includeDomain?: boolean;
	includeVocabularyMap?: boolean;
	fallbackToFirstWhenMissing?: boolean;
};

async function loadEntriesWithSelection(
	type: DefinitionType | 'domain',
	explicitFilename: string | null | undefined,
	fallbackToFirstWhenMissing: boolean
): Promise<{ entries: unknown[]; selectedFilename: string | null }> {
	if (explicitFilename) {
		const data = await loadData(type, explicitFilename);
		return { entries: data.entries as unknown[], selectedFilename: explicitFilename };
	}

	if (!fallbackToFirstWhenMissing) {
		return { entries: [], selectedFilename: null };
	}

	const files = await listFiles(type);
	if (files.length === 0) {
		return { entries: [], selectedFilename: null };
	}

	const selectedFilename = files[0];
	const data = await loadData(type, selectedFilename);
	return { entries: data.entries as unknown[], selectedFilename };
}

async function loadVocabularyMap(
	explicitFilename?: string | null
): Promise<{
	vocabularyMap:
		| Map<string, { standardName: string; abbreviation: string; domainCategory?: string }>
		| undefined;
	selectedFilename: string | null;
}> {
	const selectedFilename = explicitFilename || (await listFiles('vocabulary'))[0] || null;
	if (!selectedFilename) {
		return { vocabularyMap: undefined, selectedFilename: null };
	}

	try {
		const vocabData = await getCachedData('vocabulary', selectedFilename);
		if (!vocabData) {
			return { vocabularyMap: undefined, selectedFilename };
		}

		const vocabularyMap = new Map<
			string,
			{ standardName: string; abbreviation: string; domainCategory?: string }
		>();

		for (const entry of vocabData.entries) {
			const standardName = entry.standardName?.trim();
			const abbreviation = entry.abbreviation?.trim();
			if (!standardName || !abbreviation) continue;

			const standardKey = standardName.toLowerCase();
			const abbreviationKey = abbreviation.toLowerCase();

			const value = {
				standardName,
				abbreviation,
				domainCategory: entry.domainCategory
			};

			vocabularyMap.set(standardKey, value);
			vocabularyMap.set(abbreviationKey, value);
		}

		return { vocabularyMap, selectedFilename };
	} catch (error) {
		console.warn('단어집 데이터 로드 실패 (관계 컨텍스트):', error);
		return { vocabularyMap: undefined, selectedFilename };
	}
}

export async function loadDesignRelationContext(
	options: LoadDesignRelationContextOptions = {}
): Promise<{
	context: MappingContext;
	files: DefinitionFileSelection;
}> {
	const fallbackToFirstWhenMissing = options.fallbackToFirstWhenMissing ?? true;

	const [databaseResult, entityResult, attributeResult, tableResult, columnResult, domainResult] =
		await Promise.all([
			loadEntriesWithSelection('database', options.databaseFile, fallbackToFirstWhenMissing),
			loadEntriesWithSelection('entity', options.entityFile, fallbackToFirstWhenMissing),
			loadEntriesWithSelection('attribute', options.attributeFile, fallbackToFirstWhenMissing),
			loadEntriesWithSelection('table', options.tableFile, fallbackToFirstWhenMissing),
			loadEntriesWithSelection('column', options.columnFile, fallbackToFirstWhenMissing),
			options.includeDomain
				? loadEntriesWithSelection('domain', options.domainFile, fallbackToFirstWhenMissing)
				: Promise.resolve({ entries: [], selectedFilename: null })
		]);

	const vocabularyLoad = options.includeVocabularyMap
		? await loadVocabularyMap(options.vocabularyFile)
		: { vocabularyMap: undefined, selectedFilename: null };

	const context: MappingContext = {
		databases: databaseResult.entries as MappingContext['databases'],
		entities: entityResult.entries as MappingContext['entities'],
		attributes: attributeResult.entries as MappingContext['attributes'],
		tables: tableResult.entries as MappingContext['tables'],
		columns: columnResult.entries as MappingContext['columns'],
		domains: domainResult.entries as MappingContext['domains'],
		vocabularyMap: vocabularyLoad.vocabularyMap
	};

	return {
		context,
		files: {
			database: databaseResult.selectedFilename,
			entity: entityResult.selectedFilename,
			attribute: attributeResult.selectedFilename,
			table: tableResult.selectedFilename,
			column: columnResult.selectedFilename,
			domain: domainResult.selectedFilename,
			vocabulary: vocabularyLoad.selectedFilename
		}
	};
}

export function getAnyExplicitDefinitionFile(options: {
	databaseFile?: string | null;
	entityFile?: string | null;
	attributeFile?: string | null;
	tableFile?: string | null;
	columnFile?: string | null;
	domainFile?: string | null;
}): boolean {
	const keys: Array<keyof typeof options> = [
		'databaseFile',
		'entityFile',
		'attributeFile',
		'tableFile',
		'columnFile',
		'domainFile'
	];
	return keys.some((key) => {
		const value = options[key];
		return typeof value === 'string' && value.trim() !== '';
	});
}

export function pickDefinitionFileFromUrl(
	url: URL,
	key: `${DefinitionType}File` | 'domainFile' | 'vocabularyFile'
): string | undefined {
	const value = url.searchParams.get(key);
	return value && value.trim() !== '' ? value : undefined;
}

export const DEFINITION_TYPES: DefinitionType[] = [
	'database',
	'entity',
	'attribute',
	'table',
	'column'
];

export function toDefinitionFileSelection(
	files: DefinitionFileSelection
): Record<DefinitionType, string | null> {
	return {
		database: files.database,
		entity: files.entity,
		attribute: files.attribute,
		table: files.table,
		column: files.column
	};
}
