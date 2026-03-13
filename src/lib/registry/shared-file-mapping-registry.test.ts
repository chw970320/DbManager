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
		expect(data.bundles[0]?.name).toBe('기본 공통 번들');
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
			vocabulary: 'project-a.json',
			domain: 'project-a.json',
			term: 'project-a.json',
			database: 'project-a.json',
			entity: 'project-a.json',
			attribute: 'project-a.json',
			table: 'project-a.json',
			column: 'project-a.json'
		});

		const data = await loadSharedFileMappingRegistryData();
		expect(bundle).toEqual({
			vocabulary: 'project-a.json',
			domain: 'project-a.json',
			term: 'project-a.json',
			database: 'project-a.json',
			entity: 'project-a.json',
			attribute: 'project-a.json',
			table: 'project-a.json',
			column: 'project-a.json'
		});
		expect(data.bundles.at(-1)?.name).toBe('project-a 번들');
		expect(await resolveSharedFileMappingBundle('column', 'project-a.json')).toEqual(bundle);
	});

	it('should normalize legacy bundles without a stored name', async () => {
		storedJson = JSON.stringify({
			version: '1.0',
			bundles: [
				{
					id: 'legacy-bundle',
					files: {
						vocabulary: 'bksp.json',
						domain: 'bksp.json',
						term: 'bksp.json',
						database: 'bksp.json',
						entity: 'bksp.json',
						attribute: 'bksp.json',
						table: 'bksp.json',
						column: 'bksp.json'
					},
					createdAt: '2026-03-13T00:00:00.000Z',
					updatedAt: '2026-03-13T00:00:00.000Z'
				}
			],
			lastUpdated: '2026-03-13T00:00:00.000Z'
		});

		const data = await loadSharedFileMappingRegistryData();

		expect(data.bundles[0]?.name).toBe('bksp 번들');
		expect(storedJson).toContain('"name": "bksp 번들"');
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
