import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	loadSharedFileMappingRegistryData,
	resolveSharedFileMappingBundle,
	saveSharedFileMappingBundle,
	syncSharedFileMappingsOnDelete,
	syncSharedFileMappingsOnRename
} from './shared-file-mapping-registry';

let storedJson = '';

vi.mock('fs', () => ({
	default: {
		existsSync: vi.fn(() => true)
	},
	existsSync: vi.fn(() => true)
}));

vi.mock('fs/promises', () => ({
	default: {
		mkdir: vi.fn()
	},
	mkdir: vi.fn()
}));

vi.mock('$lib/utils/file-lock', () => ({
	safeReadFile: vi.fn(async () => storedJson),
	safeWriteFile: vi.fn(async (_path: string, data: string) => {
		storedJson = data;
	})
}));

describe('shared-file-mapping-registry', () => {
	beforeEach(() => {
		storedJson = '';
		vi.clearAllMocks();
	});

	it('should create and resolve the default shared mapping bundle', async () => {
		const data = await loadSharedFileMappingRegistryData();
		const bundle = await resolveSharedFileMappingBundle('database', 'database.json');

		expect(data.bundles).toHaveLength(1);
		expect(bundle).toEqual({
			vocabulary: 'vocabulary.json',
			domain: 'domain.json',
			term: 'term.json',
			database: 'database.json',
			entity: 'entity.json',
			attribute: 'attribute.json',
			table: 'table.json',
			column: 'column.json'
		});
	});

	it('should save a shared mapping bundle as the canonical source', async () => {
		const bundle = await saveSharedFileMappingBundle({
			vocabulary: 'vocabulary-a.json',
			domain: 'domain-a.json',
			term: 'term-a.json',
			database: 'database-a.json',
			entity: 'entity-a.json',
			attribute: 'attribute-a.json',
			table: 'table-a.json',
			column: 'column-a.json'
		});

		expect(bundle).toEqual({
			vocabulary: 'vocabulary-a.json',
			domain: 'domain-a.json',
			term: 'term-a.json',
			database: 'database-a.json',
			entity: 'entity-a.json',
			attribute: 'attribute-a.json',
			table: 'table-a.json',
			column: 'column-a.json'
		});
		expect(await resolveSharedFileMappingBundle('column', 'column-a.json')).toEqual(bundle);
	});

	it('should update the shared mapping bundle on file rename', async () => {
		await saveSharedFileMappingBundle({
			vocabulary: 'vocabulary-a.json',
			domain: 'domain-a.json',
			term: 'term-a.json',
			database: 'database-a.json',
			entity: 'entity-a.json',
			attribute: 'attribute-a.json',
			table: 'table-a.json',
			column: 'column-a.json'
		});

		const updatedCount = await syncSharedFileMappingsOnRename(
			'database',
			'database-a.json',
			'database-renamed.json'
		);

		expect(updatedCount).toBe(1);
		expect(await resolveSharedFileMappingBundle('database', 'database-renamed.json')).toEqual({
			vocabulary: 'vocabulary-a.json',
			domain: 'domain-a.json',
			term: 'term-a.json',
			database: 'database-renamed.json',
			entity: 'entity-a.json',
			attribute: 'attribute-a.json',
			table: 'table-a.json',
			column: 'column-a.json'
		});
	});

	it('should replace deleted files with the default filename in the shared mapping bundle', async () => {
		await saveSharedFileMappingBundle({
			vocabulary: 'vocabulary-a.json',
			domain: 'domain-a.json',
			term: 'term-a.json',
			database: 'database-a.json',
			entity: 'entity-a.json',
			attribute: 'attribute-a.json',
			table: 'table-a.json',
			column: 'column-a.json'
		});

		const updatedCount = await syncSharedFileMappingsOnDelete('domain', 'domain-a.json');

		expect(updatedCount).toBe(1);
		expect(await resolveSharedFileMappingBundle('database', 'database-a.json')).toEqual({
			vocabulary: 'vocabulary-a.json',
			domain: 'domain.json',
			term: 'term-a.json',
			database: 'database-a.json',
			entity: 'entity-a.json',
			attribute: 'attribute-a.json',
			table: 'table-a.json',
			column: 'column-a.json'
		});
	});
});
