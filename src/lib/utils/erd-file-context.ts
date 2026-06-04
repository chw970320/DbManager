import { resolveDbDesignFileMappingBundle } from '$lib/registry/db-design-file-mapping';
import type { DbDesignMappingBundle } from '$lib/utils/db-design-file-mapping';
import { getAnyExplicitDefinitionFile } from './design-relation-context';

export type ErdFileContextInput = {
	databaseFile?: string | null;
	entityFile?: string | null;
	attributeFile?: string | null;
	tableFile?: string | null;
	columnFile?: string | null;
	domainFile?: string | null;
	termFile?: string | null;
	vocabularyFile?: string | null;
};

export type ResolvedErdFileContext = {
	files: {
		databaseFile?: string;
		entityFile?: string;
		attributeFile?: string;
		tableFile?: string;
		columnFile?: string;
		domainFile?: string;
		termFile?: string;
		vocabularyFile?: string;
	};
	mappingBundle?: DbDesignMappingBundle;
	mappedTableFile?: string;
	hasExplicitFile: boolean;
};

function normalizeFilename(value: string | null | undefined): string | undefined {
	const filename = value?.trim();
	return filename ? filename : undefined;
}

function pickExplicitOrMapped(
	explicitValue: string | null | undefined,
	mappedValue: string | undefined
): string | undefined {
	return normalizeFilename(explicitValue) ?? normalizeFilename(mappedValue);
}

export function getErdFileContextInputFromUrl(
	url: URL,
	options: { legacyFilenameAsTableFile?: boolean } = {}
): ErdFileContextInput {
	return {
		databaseFile: url.searchParams.get('databaseFile'),
		entityFile: url.searchParams.get('entityFile'),
		attributeFile: url.searchParams.get('attributeFile'),
		tableFile:
			url.searchParams.get('tableFile') ||
			(options.legacyFilenameAsTableFile ? url.searchParams.get('filename') : null),
		columnFile: url.searchParams.get('columnFile'),
		domainFile: url.searchParams.get('domainFile'),
		termFile: url.searchParams.get('termFile'),
		vocabularyFile: url.searchParams.get('vocabularyFile')
	};
}

export async function resolveErdFileContext(
	input: ErdFileContextInput
): Promise<ResolvedErdFileContext> {
	const columnFile = normalizeFilename(input.columnFile);
	const explicitFiles = {
		databaseFile: normalizeFilename(input.databaseFile),
		entityFile: normalizeFilename(input.entityFile),
		attributeFile: normalizeFilename(input.attributeFile),
		tableFile: normalizeFilename(input.tableFile),
		columnFile,
		domainFile: normalizeFilename(input.domainFile),
		termFile: normalizeFilename(input.termFile),
		vocabularyFile: normalizeFilename(input.vocabularyFile)
	};

	if (!columnFile) {
		return {
			files: explicitFiles,
			hasExplicitFile: Boolean(getAnyExplicitDefinitionFile(explicitFiles))
		};
	}

	const mappingBundle = await resolveDbDesignFileMappingBundle('column', columnFile);
	const files = {
		databaseFile: pickExplicitOrMapped(input.databaseFile, mappingBundle.database),
		entityFile: pickExplicitOrMapped(input.entityFile, mappingBundle.entity),
		attributeFile: pickExplicitOrMapped(input.attributeFile, mappingBundle.attribute),
		tableFile: pickExplicitOrMapped(input.tableFile, mappingBundle.table),
		columnFile,
		domainFile: pickExplicitOrMapped(input.domainFile, mappingBundle.domain),
		termFile: pickExplicitOrMapped(input.termFile, mappingBundle.term),
		vocabularyFile: pickExplicitOrMapped(input.vocabularyFile, mappingBundle.vocabulary)
	};

	return {
		files,
		mappingBundle,
		mappedTableFile: normalizeFilename(mappingBundle.table),
		hasExplicitFile: Boolean(getAnyExplicitDefinitionFile(files))
	};
}
