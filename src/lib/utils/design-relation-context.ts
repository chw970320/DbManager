import { getCachedData } from '$lib/registry/cache-registry.js';
import { listFiles, loadData } from '$lib/registry/data-registry.js';
import type { MappingContext } from '$lib/types/erd-mapping.js';

type DefinitionType = 'database' | 'entity' | 'attribute' | 'table' | 'column';
type RelationContextFileType = DefinitionType | 'domain' | 'term' | 'vocabulary';

export type DefinitionFileSelection = {
	database: string | null;
	entity: string | null;
	attribute: string | null;
	table: string | null;
	column: string | null;
	domain: string | null;
	vocabulary: string | null;
	term: string | null;
};

export type StandardReferenceLoadStatus = {
	vocabulary: boolean;
	domain: boolean;
	term: boolean;
	complete: boolean;
};

export type LoadDesignRelationContextOptions = {
	databaseFile?: string | null;
	entityFile?: string | null;
	attributeFile?: string | null;
	tableFile?: string | null;
	columnFile?: string | null;
	domainFile?: string | null;
	vocabularyFile?: string | null;
	termFile?: string | null;
	includeDomain?: boolean;
	includeTerm?: boolean;
	includeVocabularyMap?: boolean;
	fallbackToFirstWhenMissing?: boolean;
	strictStandardReferences?: boolean;
};

export class DesignRelationContextError extends Error {
	status = 400;

	constructor(message: string) {
		super(message);
		this.name = 'DesignRelationContextError';
	}
}

async function assertExistingFile(type: RelationContextFileType, filename: string): Promise<void> {
	const files = await listFiles(type);
	if (!files.includes(filename)) {
		throw new DesignRelationContextError(
			`정의서 관계 검증에 필요한 ${type} 파일을 찾을 수 없습니다: ${filename}. 완전한 8종 shared mapping bundle 또는 실제 파일명을 지정하세요.`
		);
	}
}

function extractEntries(type: RelationContextFileType, filename: string, data: unknown): unknown[] {
	const entries = (data as { entries?: unknown }).entries;
	if (!Array.isArray(entries)) {
		throw new DesignRelationContextError(
			`정의서 관계 검증에 필요한 ${type} 파일 형식이 올바르지 않습니다: ${filename}. entries 배열을 확인하세요.`
		);
	}
	return entries;
}

function standardLoadError(
	type: RelationContextFileType,
	filename: string,
	error: unknown
): DesignRelationContextError {
	return new DesignRelationContextError(
		`정의서 관계 검증에 필요한 ${type} 파일을 로드하지 못했습니다: ${filename}. ${
			error instanceof Error ? error.message : '알 수 없는 오류'
		}`
	);
}

async function loadEntriesWithSelection(
	type: RelationContextFileType,
	explicitFilename: string | null | undefined,
	fallbackToFirstWhenMissing: boolean,
	requireExistingFile = false,
	allowLoadFailure = false
): Promise<{ entries: unknown[]; selectedFilename: string | null; loaded: boolean }> {
	if (explicitFilename) {
		try {
			if (requireExistingFile) await assertExistingFile(type, explicitFilename);
			const data = await loadData(type, explicitFilename);
			return {
				entries: extractEntries(type, explicitFilename, data),
				selectedFilename: explicitFilename,
				loaded: true
			};
		} catch (error) {
			if (requireExistingFile) throw standardLoadError(type, explicitFilename, error);
			if (allowLoadFailure) {
				console.warn(`${type} 데이터 로드 실패 (관계 컨텍스트):`, error);
				return { entries: [], selectedFilename: explicitFilename, loaded: false };
			}
			throw error;
		}
	}

	if (!fallbackToFirstWhenMissing) {
		return { entries: [], selectedFilename: null, loaded: false };
	}

	const files = await listFiles(type);
	if (files.length === 0) {
		return { entries: [], selectedFilename: null, loaded: false };
	}

	const selectedFilename = files[0];
	try {
		const data = await loadData(type, selectedFilename);
		return {
			entries: extractEntries(type, selectedFilename, data),
			selectedFilename,
			loaded: true
		};
	} catch (error) {
		if (allowLoadFailure) {
			console.warn(`${type} 데이터 로드 실패 (관계 컨텍스트):`, error);
			return { entries: [], selectedFilename, loaded: false };
		}
		throw error;
	}
}

async function loadVocabularyMap(
	explicitFilename?: string | null,
	requireExistingFile = false
): Promise<{
	vocabularyMap:
		| Map<string, { standardName: string; abbreviation: string; domainCategory?: string }>
		| undefined;
	entries: MappingContext['vocabularies'];
	selectedFilename: string | null;
	loaded: boolean;
}> {
	const selectedFilename =
		explicitFilename || (requireExistingFile ? null : (await listFiles('vocabulary'))[0] || null);
	if (!selectedFilename) {
		return { vocabularyMap: undefined, entries: [], selectedFilename: null, loaded: false };
	}

	try {
		if (requireExistingFile) await assertExistingFile('vocabulary', selectedFilename);
		const vocabData = await getCachedData('vocabulary', selectedFilename);
		if (!vocabData) {
			if (requireExistingFile) {
				throw new DesignRelationContextError(
					`정의서 관계 검증에 필요한 vocabulary 파일을 로드하지 못했습니다: ${selectedFilename}.`
				);
			}
			return { vocabularyMap: undefined, entries: [], selectedFilename, loaded: false };
		}
		const entries = extractEntries('vocabulary', selectedFilename, vocabData);

		const vocabularyMap = new Map<
			string,
			{ standardName: string; abbreviation: string; domainCategory?: string }
		>();

		for (const entry of entries as NonNullable<MappingContext['vocabularies']>) {
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

		return {
			vocabularyMap,
			entries: entries as MappingContext['vocabularies'],
			selectedFilename,
			loaded: true
		};
	} catch (error) {
		if (requireExistingFile) throw standardLoadError('vocabulary', selectedFilename, error);
		console.warn('단어집 데이터 로드 실패 (관계 컨텍스트):', error);
		return { vocabularyMap: undefined, entries: [], selectedFilename, loaded: false };
	}
}

export async function loadDesignRelationContext(
	options: LoadDesignRelationContextOptions = {}
): Promise<{
	context: MappingContext;
	files: DefinitionFileSelection;
	standardReferences: StandardReferenceLoadStatus;
}> {
	const fallbackToFirstWhenMissing = options.fallbackToFirstWhenMissing ?? true;
	const strictStandardReferences = options.strictStandardReferences ?? false;

	const [
		databaseResult,
		entityResult,
		attributeResult,
		tableResult,
		columnResult,
		domainResult,
		termResult
	] = await Promise.all([
		loadEntriesWithSelection('database', options.databaseFile, fallbackToFirstWhenMissing),
		loadEntriesWithSelection('entity', options.entityFile, fallbackToFirstWhenMissing),
		loadEntriesWithSelection('attribute', options.attributeFile, fallbackToFirstWhenMissing),
		loadEntriesWithSelection('table', options.tableFile, fallbackToFirstWhenMissing),
		loadEntriesWithSelection('column', options.columnFile, fallbackToFirstWhenMissing),
		options.includeDomain
			? loadEntriesWithSelection(
					'domain',
					options.domainFile,
					fallbackToFirstWhenMissing,
					strictStandardReferences,
					!strictStandardReferences
				)
			: Promise.resolve({ entries: [], selectedFilename: null, loaded: false }),
		options.includeTerm
			? loadEntriesWithSelection(
					'term',
					options.termFile,
					fallbackToFirstWhenMissing,
					strictStandardReferences,
					!strictStandardReferences
				)
			: Promise.resolve({ entries: [], selectedFilename: null, loaded: false })
	]);

	const vocabularyLoad = options.includeVocabularyMap
		? await loadVocabularyMap(options.vocabularyFile, strictStandardReferences)
		: { vocabularyMap: undefined, entries: [], selectedFilename: null, loaded: false };

	const context: MappingContext = {
		databases: databaseResult.entries as MappingContext['databases'],
		entities: entityResult.entries as MappingContext['entities'],
		attributes: attributeResult.entries as MappingContext['attributes'],
		tables: tableResult.entries as MappingContext['tables'],
		columns: columnResult.entries as MappingContext['columns'],
		domains: domainResult.entries as MappingContext['domains'],
		terms: termResult.entries as MappingContext['terms'],
		vocabularies: vocabularyLoad.entries,
		vocabularyMap: vocabularyLoad.vocabularyMap
	};

	const standardReferences = {
		vocabulary: vocabularyLoad.loaded,
		domain: domainResult.loaded,
		term: termResult.loaded,
		complete: Boolean(vocabularyLoad.loaded && domainResult.loaded && termResult.loaded)
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
			vocabulary: vocabularyLoad.selectedFilename,
			term: termResult.selectedFilename
		},
		standardReferences
	};
}

export function getAnyExplicitDefinitionFile(options: {
	databaseFile?: string | null;
	entityFile?: string | null;
	attributeFile?: string | null;
	tableFile?: string | null;
	columnFile?: string | null;
	domainFile?: string | null;
	termFile?: string | null;
	vocabularyFile?: string | null;
}): boolean {
	const keys: Array<keyof typeof options> = [
		'databaseFile',
		'entityFile',
		'attributeFile',
		'tableFile',
		'columnFile',
		'domainFile',
		'termFile',
		'vocabularyFile'
	];
	return keys.some((key) => {
		const value = options[key];
		return typeof value === 'string' && value.trim() !== '';
	});
}

export function pickDefinitionFileFromUrl(
	url: URL,
	key: `${DefinitionType}File` | 'domainFile' | 'vocabularyFile' | 'termFile'
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
