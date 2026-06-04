import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	resolveDesignRelationFileBundle,
	DesignRelationBundleError
} from './design-relation-bundle.js';
import { resolveSharedFileMappingBundle } from '$lib/registry/shared-file-mapping-registry.js';

vi.mock('$lib/registry/shared-file-mapping-registry.js', () => ({
	resolveSharedFileMappingBundle: vi.fn()
}));

const SHARED_BUNDLE = {
	vocabulary: 'vocabulary-a.json',
	domain: 'domain-a.json',
	term: 'term-a.json',
	database: 'database-a.json',
	entity: 'entity-a.json',
	attribute: 'attribute-a.json',
	table: 'table-a.json',
	column: 'column-a.json'
} as const;

describe('design-relation-bundle', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(resolveSharedFileMappingBundle).mockResolvedValue(null);
	});

	it('resolves a complete 8종 shared mapping bundle from scope file', async () => {
		vi.mocked(resolveSharedFileMappingBundle).mockResolvedValue({ ...SHARED_BUNDLE });

		const resolved = await resolveDesignRelationFileBundle({
			scopeType: 'database',
			scopeFile: 'database-a.json',
			requireStandardReferences: true
		});

		expect(resolveSharedFileMappingBundle).toHaveBeenCalledWith('database', 'database-a.json');
		expect(resolved.toCompleteBundle()).toEqual(SHARED_BUNDLE);
		expect(resolved.sources.term).toBe('shared-bundle');
	});

	it('lets explicit files override shared bundle values deterministically', async () => {
		vi.mocked(resolveSharedFileMappingBundle).mockResolvedValue({ ...SHARED_BUNDLE });

		const resolved = await resolveDesignRelationFileBundle({
			databaseFile: 'database-a.json',
			termFile: 'term-override.json',
			requireStandardReferences: true
		});

		expect(resolved.toCompleteBundle()).toEqual({ ...SHARED_BUNDLE, term: 'term-override.json' });
		expect(resolved.sources.term).toBe('explicit');
	});

	it('accepts a complete explicit 8종 bundle without a shared mapping', async () => {
		const resolved = await resolveDesignRelationFileBundle({
			vocabularyFile: SHARED_BUNDLE.vocabulary,
			domainFile: SHARED_BUNDLE.domain,
			termFile: SHARED_BUNDLE.term,
			databaseFile: SHARED_BUNDLE.database,
			entityFile: SHARED_BUNDLE.entity,
			attributeFile: SHARED_BUNDLE.attribute,
			tableFile: SHARED_BUNDLE.table,
			columnFile: SHARED_BUNDLE.column,
			requireStandardReferences: true
		});

		expect(resolved.toCompleteBundle()).toEqual(SHARED_BUNDLE);
		expect(Object.values(resolved.sources)).toEqual(Array(8).fill('explicit'));
	});

	it('returns canonical 400-style error when STANDARD_REFERENCES files cannot resolve', async () => {
		await expect(
			resolveDesignRelationFileBundle({
				databaseFile: 'database.json',
				requireStandardReferences: true
			})
		).rejects.toMatchObject({
			name: 'DesignRelationBundleError',
			status: 400,
			missingStandardFiles: ['vocabulary', 'domain', 'term'],
			missingFiles: ['vocabulary', 'domain', 'term', 'entity', 'attribute', 'table', 'column']
		} satisfies Partial<DesignRelationBundleError>);
	});

	it('does not fall back to arbitrary standard files when no bundle is selected', async () => {
		const resolved = await resolveDesignRelationFileBundle({ databaseFile: 'database.json' });

		expect(resolved.bundle.database).toBe('database.json');
		expect(resolved.bundle.term).toBeUndefined();
		expect(resolved.sources.term).toBe('missing');
	});

	it('rejects mixed default and non-default explicit files without shared mapping', async () => {
		await expect(
			resolveDesignRelationFileBundle({
				vocabularyFile: 'vocabulary.json',
				databaseFile: SHARED_BUNDLE.database
			})
		).rejects.toMatchObject({
			name: 'DesignRelationBundleError',
			status: 400
		} satisfies Partial<DesignRelationBundleError>);

		expect(resolveSharedFileMappingBundle).toHaveBeenCalledWith('database', SHARED_BUNDLE.database);
	});

	it('keeps incomplete non-default explicit requests rejected when no shared mapping exists', async () => {
		await expect(
			resolveDesignRelationFileBundle({
				databaseFile: SHARED_BUNDLE.database,
				requireStandardReferences: true
			})
		).rejects.toMatchObject({
			name: 'DesignRelationBundleError',
			status: 400
		} satisfies Partial<DesignRelationBundleError>);
	});
});
