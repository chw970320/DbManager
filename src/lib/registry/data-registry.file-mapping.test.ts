import { existsSync } from 'fs';
import { mkdtemp, mkdir, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterEach, describe, expect, it, vi } from 'vitest';

const tempDirs: string[] = [];

async function createTempDataPath(): Promise<string> {
	const dataPath = await mkdtemp(join(tmpdir(), 'dbmanager-data-registry-'));
	tempDirs.push(dataPath);
	await mkdir(join(dataPath, 'settings'), { recursive: true });
	return dataPath;
}

async function importDataRegistry(dataPath: string) {
	vi.resetModules();
	vi.stubEnv('DATA_PATH', dataPath);
	return import('./data-registry');
}

async function readSharedMapping(dataPath: string) {
	return JSON.parse(
		await readFile(join(dataPath, 'settings', 'shared-file-mappings.json'), 'utf-8')
	) as {
		version: string;
		bundles: Array<{ files: Record<string, string> }>;
	};
}

describe('data-registry canonical file mapping sync', () => {
	afterEach(async () => {
		vi.unstubAllEnvs();
		vi.resetModules();
		await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
	});

	it('seeds a v2 shared mapping bundle when creating a non-default file', async () => {
		const dataPath = await createTempDataPath();
		const { createFile } = await importDataRegistry(dataPath);

		await createFile('term', 'term-a.json');

		const createdFile = JSON.parse(await readFile(join(dataPath, 'term', 'term-a.json'), 'utf-8'));
		const shared = await readSharedMapping(dataPath);
		expect(createdFile.mapping).toBeUndefined();
		expect(shared.version).toBe('2.0');
		expect(shared.bundles).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					files: expect.objectContaining({ term: 'term-a.json', vocabulary: 'vocabulary.json' })
				})
			])
		);
	});

	it('renames and deletes files through the canonical shared mapping only', async () => {
		const dataPath = await createTempDataPath();
		const { createFile, renameFile, deleteFile } = await importDataRegistry(dataPath);

		await createFile('term', 'term-a.json');
		await renameFile('term', 'term-a.json', 'term-b.json');

		expect(existsSync(join(dataPath, 'term', 'term-a.json'))).toBe(false);
		expect(existsSync(join(dataPath, 'term', 'term-b.json'))).toBe(true);
		let shared = await readSharedMapping(dataPath);
		expect(shared.bundles).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					files: expect.objectContaining({ term: 'term-b.json' })
				})
			])
		);

		await deleteFile('term', 'term-b.json');

		expect(existsSync(join(dataPath, 'term', 'term-b.json'))).toBe(false);
		shared = await readSharedMapping(dataPath);
		expect(shared.bundles.some((entry) => entry.files.term === 'term-b.json')).toBe(false);
		expect(shared.bundles).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					files: expect.objectContaining({ term: 'term.json' })
				})
			])
		);
	});

	it('fails fast when loading a non-default file without a canonical bundle', async () => {
		const dataPath = await createTempDataPath();
		await mkdir(join(dataPath, 'term'), { recursive: true });
		await mkdir(join(dataPath, 'settings'), { recursive: true });
		await import('fs/promises').then(({ writeFile }) =>
			writeFile(
				join(dataPath, 'settings', 'shared-file-mappings.json'),
				JSON.stringify({
					version: '2.0',
					bundles: [
						{
							id: 'default-shared-file-mapping',
							name: '기본 공통 번들',
							files: {
								vocabulary: 'vocabulary.json',
								domain: 'domain.json',
								term: 'term.json',
								database: 'database.json',
								entity: 'entity.json',
								attribute: 'attribute.json',
								table: 'table.json',
								column: 'column.json'
							},
							createdAt: '2026-01-01T00:00:00.000Z',
							updatedAt: '2026-01-01T00:00:00.000Z'
						}
					],
					lastUpdated: '2026-01-01T00:00:00.000Z'
				})
			)
		);
		await import('fs/promises').then(({ writeFile }) =>
			writeFile(
				join(dataPath, 'term', 'term-a.json'),
				JSON.stringify({ entries: [], lastUpdated: '2026-01-01T00:00:00.000Z', totalCount: 0 })
			)
		);
		const { loadData } = await importDataRegistry(dataPath);

		await expect(loadData('term', 'term-a.json')).rejects.toThrow(
			'공통 파일 매핑을 찾을 수 없습니다'
		);
	});
});
