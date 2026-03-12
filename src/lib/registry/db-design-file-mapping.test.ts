import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataType } from '$lib/types/base';
import {
	resolveDbDesignFileMappingBundle,
	saveDbDesignFileMappingBundle
} from './db-design-file-mapping';

vi.mock('$lib/registry/data-registry', () => ({
	loadData: vi.fn()
}));

vi.mock('$lib/registry/mapping-registry', () => ({
	getMappingBetween: vi.fn(),
	updateMapping: vi.fn(),
	addMapping: vi.fn(),
	removeMapping: vi.fn(),
	resolveRelatedFilenames: vi.fn()
}));

vi.mock('$lib/registry/shared-file-mapping-registry', () => ({
	resolveSharedFileMappingBundle: vi.fn(),
	saveSharedFileMappingBundle: vi.fn()
}));

import { loadData } from '$lib/registry/data-registry';
import {
	getMappingBetween,
	updateMapping,
	addMapping,
	removeMapping,
	resolveRelatedFilenames
} from '$lib/registry/mapping-registry';
import {
	resolveSharedFileMappingBundle,
	saveSharedFileMappingBundle
} from '$lib/registry/shared-file-mapping-registry';

const FULL_BUNDLE = {
	vocabulary: 'vocabulary-a.json',
	domain: 'domain-a.json',
	term: 'term-a.json',
	database: 'database.json',
	entity: 'entity-a.json',
	attribute: 'attribute-a.json',
	table: 'table-a.json',
	column: 'column-a.json'
} as const;

function createMockData(mapping: Record<string, string> = {}) {
	return {
		entries: [],
		lastUpdated: '2024-01-01T00:00:00.000Z',
		totalCount: 0,
		mapping
	};
}

describe('db-design-file-mapping', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getMappingBetween).mockResolvedValue([]);
		vi.mocked(resolveSharedFileMappingBundle).mockResolvedValue(null);
		vi.mocked(saveSharedFileMappingBundle).mockResolvedValue({ ...FULL_BUNDLE });
	});

	it('should resolve a full 8-type bundle from legacy partial mappings', async () => {
		vi.mocked(loadData).mockImplementation(async (type: string, filename?: string) => {
			if (type === 'database' && filename === 'database.json') {
				return createMockData({ entity: 'entity-a.json', table: 'table-a.json' });
			}
			if (type === 'entity' && filename === 'entity-a.json') {
				return createMockData({ attribute: 'attribute-a.json' });
			}
			if (type === 'attribute' && filename === 'attribute-a.json') {
				return createMockData({ column: 'column-a.json' });
			}
			if (type === 'table' && filename === 'table-a.json') {
				return createMockData({ column: 'column-a.json' });
			}
			if (type === 'column' && filename === 'column-a.json') {
				return createMockData({ term: 'term-a.json', domain: 'domain-a.json' });
			}
			if (type === 'term' && filename === 'term-a.json') {
				return createMockData({ vocabulary: 'vocabulary-a.json', domain: 'domain-a.json' });
			}
			if (type === 'vocabulary' && filename === 'vocabulary-a.json') {
				return createMockData({ domain: 'domain-a.json' });
			}
			if (type === 'domain' && filename === 'domain-a.json') {
				return createMockData();
			}

			throw new Error(`unexpected load: ${type}:${filename}`);
		});

		vi.mocked(resolveRelatedFilenames).mockImplementation(async (type: DataType, filename: string) => {
			const relations = new Map<DataType, string>();

			if (type === 'database' && filename === 'database.json') {
				relations.set('entity', 'entity-a.json');
				relations.set('table', 'table-a.json');
			}
			if (type === 'entity' && filename === 'entity-a.json') {
				relations.set('database', 'database.json');
				relations.set('attribute', 'attribute-a.json');
				relations.set('table', 'table-a.json');
			}
			if (type === 'attribute' && filename === 'attribute-a.json') {
				relations.set('entity', 'entity-a.json');
				relations.set('column', 'column-a.json');
			}
			if (type === 'table' && filename === 'table-a.json') {
				relations.set('database', 'database.json');
				relations.set('entity', 'entity-a.json');
				relations.set('column', 'column-a.json');
			}
			if (type === 'column' && filename === 'column-a.json') {
				relations.set('attribute', 'attribute-a.json');
				relations.set('table', 'table-a.json');
				relations.set('term', 'term-a.json');
				relations.set('domain', 'domain-a.json');
			}
			if (type === 'term' && filename === 'term-a.json') {
				relations.set('vocabulary', 'vocabulary-a.json');
				relations.set('domain', 'domain-a.json');
				relations.set('column', 'column-a.json');
			}
			if (type === 'vocabulary' && filename === 'vocabulary-a.json') {
				relations.set('domain', 'domain-a.json');
				relations.set('term', 'term-a.json');
			}
			if (type === 'domain' && filename === 'domain-a.json') {
				relations.set('vocabulary', 'vocabulary-a.json');
				relations.set('term', 'term-a.json');
				relations.set('column', 'column-a.json');
			}

			return relations;
		});

		const bundle = await resolveDbDesignFileMappingBundle('database', 'database.json');

		expect(bundle).toEqual(FULL_BUNDLE);
	});

	it('should prefer the shared mapping file bundle when present', async () => {
		vi.mocked(resolveSharedFileMappingBundle).mockResolvedValue({ ...FULL_BUNDLE });

		const bundle = await resolveDbDesignFileMappingBundle('database', 'database.json');

		expect(bundle).toEqual(FULL_BUNDLE);
		expect(loadData).not.toHaveBeenCalled();
	});

	it('should sync shared mappings through the shared mapping file', async () => {
		vi.mocked(loadData).mockImplementation(async () => createMockData());

		const result = await saveDbDesignFileMappingBundle({
			currentType: 'database',
			currentFilename: 'database-b.json',
			mapping: {
				vocabulary: 'vocabulary-b.json',
				domain: 'domain-b.json',
				term: 'term-b.json',
				entity: 'entity-b.json',
				attribute: 'attribute-b.json',
				table: 'table-b.json',
				column: 'column-b.json'
			}
		});

		expect(result.bundle).toEqual({
			vocabulary: 'vocabulary-b.json',
			domain: 'domain-b.json',
			term: 'term-b.json',
			database: 'database-b.json',
			entity: 'entity-b.json',
			attribute: 'attribute-b.json',
			table: 'table-b.json',
			column: 'column-b.json'
		});

		expect(saveSharedFileMappingBundle).toHaveBeenCalledWith({
			vocabulary: 'vocabulary-b.json',
			domain: 'domain-b.json',
			term: 'term-b.json',
			database: 'database-b.json',
			entity: 'entity-b.json',
			attribute: 'attribute-b.json',
			table: 'table-b.json',
			column: 'column-b.json'
		});
		expect(addMapping).toHaveBeenCalledTimes(11);
		expect(updateMapping).not.toHaveBeenCalled();
		expect(removeMapping).not.toHaveBeenCalled();
		expect(result.currentMapping).toEqual({
			vocabulary: 'vocabulary-b.json',
			domain: 'domain-b.json',
			term: 'term-b.json',
			entity: 'entity-b.json',
			attribute: 'attribute-b.json',
			table: 'table-b.json',
			column: 'column-b.json'
		});
	});
});
