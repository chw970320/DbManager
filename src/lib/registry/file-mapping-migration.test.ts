import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterEach, describe, expect, it, vi } from 'vitest';

const tempDirs: string[] = [];

async function createTempDataPath(): Promise<string> {
	const dataPath = await mkdtemp(join(tmpdir(), 'dbmanager-file-mapping-'));
	tempDirs.push(dataPath);
	await mkdir(join(dataPath, 'settings'), { recursive: true });
	return dataPath;
}

async function importRegistry(dataPath: string) {
	vi.resetModules();
	vi.stubEnv('DATA_PATH', dataPath);
	return import('./shared-file-mapping-registry');
}

async function readSharedMapping(dataPath: string) {
	return JSON.parse(
		await readFile(join(dataPath, 'settings', 'shared-file-mappings.json'), 'utf-8')
	) as {
		version: string;
		bundles: Array<{ files: Record<string, string> }>;
	};
}

describe('file mapping v2 migration', () => {
	afterEach(async () => {
		vi.unstubAllEnvs();
		vi.resetModules();
		await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
	});

	it('migrates legacy registry relations into shared-file-mappings v2', async () => {
		const dataPath = await createTempDataPath();
		await writeFile(
			join(dataPath, 'registry.json'),
			JSON.stringify(
				{
					relations: [
						{
							sourceType: 'term',
							sourceFilename: 'term-a.json',
							targetType: 'vocabulary',
							targetFilename: 'vocabulary-a.json'
						},
						{
							sourceType: 'term',
							sourceFilename: 'term-a.json',
							targetType: 'domain',
							targetFilename: 'domain-a.json'
						}
					]
				},
				null,
				2
			)
		);
		const { ensureFileMappingMigrated } = await importRegistry(dataPath);

		await ensureFileMappingMigrated();

		const migrated = await readSharedMapping(dataPath);
		expect(migrated.version).toBe('2.0');
		expect(migrated.bundles).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					files: expect.objectContaining({
						term: 'term-a.json',
						vocabulary: 'vocabulary-a.json',
						domain: 'domain-a.json',
						database: 'database.json'
					})
				})
			])
		);
	});

	it('migrates legacy per-file mapping fields into shared-file-mappings v2', async () => {
		const dataPath = await createTempDataPath();
		await mkdir(join(dataPath, 'term'), { recursive: true });
		await writeFile(
			join(dataPath, 'term', 'term-a.json'),
			JSON.stringify(
				{
					entries: [],
					lastUpdated: '2026-01-01T00:00:00.000Z',
					totalCount: 0,
					mapping: {
						vocabulary: 'vocabulary-a.json',
						domain: 'domain-a.json'
					}
				},
				null,
				2
			)
		);
		const { ensureFileMappingMigrated } = await importRegistry(dataPath);

		await ensureFileMappingMigrated();

		const migrated = await readSharedMapping(dataPath);
		expect(migrated.bundles).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					files: expect.objectContaining({
						term: 'term-a.json',
						vocabulary: 'vocabulary-a.json',
						domain: 'domain-a.json'
					})
				})
			])
		);
	});

	it('merges registry and legacy mapping inputs even when a v1 shared mapping file already exists', async () => {
		const dataPath = await createTempDataPath();
		await writeFile(
			join(dataPath, 'settings', 'shared-file-mappings.json'),
			JSON.stringify({
				version: '1.0',
				bundles: [
					{
						id: 'default-shared-file-mapping',
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
		);
		await writeFile(
			join(dataPath, 'registry.json'),
			JSON.stringify({
				relations: [
					{
						sourceType: 'term',
						sourceFilename: 'term-a.json',
						targetType: 'vocabulary',
						targetFilename: 'vocabulary-a.json'
					},
					{
						sourceType: 'term',
						sourceFilename: 'term-a.json',
						targetType: 'domain',
						targetFilename: 'domain-a.json'
					}
				]
			})
		);
		const { ensureFileMappingMigrated } = await importRegistry(dataPath);

		await ensureFileMappingMigrated();

		const migrated = await readSharedMapping(dataPath);
		expect(migrated.version).toBe('2.0');
		expect(migrated.bundles).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					files: expect.objectContaining({
						term: 'term-a.json',
						vocabulary: 'vocabulary-a.json',
						domain: 'domain-a.json'
					})
				})
			])
		);
	});

	it('seeds existing non-default legacy files with default related filenames when mapping is missing', async () => {
		const dataPath = await createTempDataPath();
		await mkdir(join(dataPath, 'vocabulary'), { recursive: true });
		await writeFile(
			join(dataPath, 'vocabulary', 'custom-vocabulary.json'),
			JSON.stringify(
				{
					entries: [],
					lastUpdated: '2026-01-01T00:00:00.000Z',
					totalCount: 0
				},
				null,
				2
			)
		);
		const { ensureFileMappingMigrated } = await importRegistry(dataPath);

		await ensureFileMappingMigrated();

		const migrated = await readSharedMapping(dataPath);
		expect(migrated.bundles).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					files: expect.objectContaining({
						vocabulary: 'custom-vocabulary.json',
						domain: 'domain.json',
						term: 'term.json'
					})
				})
			])
		);
	});

	it('is idempotent after v2 migration completes', async () => {
		const dataPath = await createTempDataPath();
		await writeFile(
			join(dataPath, 'registry.json'),
			JSON.stringify({
				relations: [
					{
						sourceType: 'database',
						sourceFilename: 'database-a.json',
						targetType: 'entity',
						targetFilename: 'entity-a.json'
					}
				]
			})
		);
		const { ensureFileMappingMigrated } = await importRegistry(dataPath);

		await ensureFileMappingMigrated();
		const first = await readFile(join(dataPath, 'settings', 'shared-file-mappings.json'), 'utf-8');
		await ensureFileMappingMigrated();
		const second = await readFile(join(dataPath, 'settings', 'shared-file-mappings.json'), 'utf-8');

		expect(second).toBe(first);
	});

	it('fails fast on contradictory legacy registry mappings', async () => {
		const dataPath = await createTempDataPath();
		await writeFile(
			join(dataPath, 'registry.json'),
			JSON.stringify({
				relations: [
					{
						sourceType: 'term',
						sourceFilename: 'term-a.json',
						targetType: 'domain',
						targetFilename: 'domain-a.json'
					},
					{
						sourceType: 'term',
						sourceFilename: 'term-a.json',
						targetType: 'domain',
						targetFilename: 'domain-b.json'
					}
				]
			})
		);
		const { ensureFileMappingMigrated } = await importRegistry(dataPath);

		await expect(ensureFileMappingMigrated()).rejects.toThrow('공통 파일 매핑 마이그레이션 실패');
	});

	it('fails fast when an existing data type path cannot be scanned as a directory', async () => {
		const dataPath = await createTempDataPath();
		await writeFile(join(dataPath, 'vocabulary'), 'not a directory');
		const { ensureFileMappingMigrated } = await importRegistry(dataPath);

		await expect(ensureFileMappingMigrated()).rejects.toThrow('데이터 디렉터리 조회 실패');
	});

	it('fails fast on malformed v2 shared mapping data', async () => {
		const dataPath = await createTempDataPath();
		await writeFile(
			join(dataPath, 'settings', 'shared-file-mappings.json'),
			JSON.stringify({
				version: '2.0',
				bundles: [{ id: 'broken', files: { term: 'term-a.json' } }],
				lastUpdated: '2026-01-01T00:00:00.000Z'
			})
		);
		const { ensureFileMappingMigrated } = await importRegistry(dataPath);

		await expect(ensureFileMappingMigrated()).rejects.toThrow('공통 파일 매핑 마이그레이션 실패');
	});
});
