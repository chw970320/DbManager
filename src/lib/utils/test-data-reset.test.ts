import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	DEFAULT_FILENAMES,
	DEFAULT_MAPPING_RELATIONS,
	RESET_DATA_TYPES,
	resetTestData
} from './test-data-reset.js';

const FIXED_TIMESTAMP = '2026-03-12T05:00:00.000Z';

async function readJson<T>(filePath: string): Promise<T> {
	return JSON.parse(await readFile(filePath, 'utf-8')) as T;
}

describe('resetTestData', () => {
	let tempDir: string | null = null;

	afterEach(async () => {
		if (tempDir) {
			await rm(tempDir, { recursive: true, force: true });
			tempDir = null;
		}
	});

	it('should remove user json files and recreate the default empty files', async () => {
		tempDir = await mkdtemp(join(tmpdir(), 'dbmanager-reset-'));

		for (const type of RESET_DATA_TYPES) {
			const typeDir = join(tempDir, type);
			await mkdir(typeDir, { recursive: true });
			await writeFile(
				join(typeDir, DEFAULT_FILENAMES[type]),
				'{"entries":[{"id":"old"}]}',
				'utf-8'
			);
			await writeFile(
				join(typeDir, `${type}-custom.json`),
				'{"entries":[{"id":"custom"}]}',
				'utf-8'
			);
			await writeFile(join(typeDir, 'notes.txt'), 'keep-me', 'utf-8');
		}

		await writeFile(
			join(tempDir, 'table', 'history.json'),
			'{"entries":[{"id":"history"}]}',
			'utf-8'
		);

		const settingsDir = join(tempDir, 'settings');
		await mkdir(settingsDir, { recursive: true });
		await writeFile(
			join(tempDir, 'registry.json'),
			JSON.stringify(
				{
					version: '1.0',
					relations: [
						{
							id: 'custom-relation',
							sourceType: 'term',
							sourceFilename: 'term-custom.json',
							targetType: 'vocabulary',
							targetFilename: 'vocabulary-custom.json',
							mappingKey: 'termName_parts→standardName',
							cardinality: 'N:N',
							createdAt: '2026-03-11T00:00:00.000Z'
						}
					],
					lastUpdated: '2026-03-11T00:00:00.000Z'
				},
				null,
				2
			),
			'utf-8'
		);
		await writeFile(
			join(settingsDir, 'shared-file-mappings.json'),
			JSON.stringify(
				{
					version: '1.0',
					bundles: [
						{
							id: 'custom-bundle',
							files: {
								vocabulary: 'vocabulary-custom.json',
								domain: 'domain-custom.json',
								term: 'term-custom.json',
								database: 'database-custom.json',
								entity: 'entity-custom.json',
								attribute: 'attribute-custom.json',
								table: 'table-custom.json',
								column: 'column-custom.json'
							},
							createdAt: '2026-03-11T00:00:00.000Z',
							updatedAt: '2026-03-11T00:00:00.000Z'
						}
					],
					lastUpdated: '2026-03-11T00:00:00.000Z'
				},
				null,
				2
			),
			'utf-8'
		);
		await writeFile(
			join(settingsDir, 'domain-data-type-mappings.json'),
			JSON.stringify({ preserved: true }, null, 2),
			'utf-8'
		);
		await writeFile(
			join(settingsDir, 'design-snapshots.json'),
			JSON.stringify(
				{
					entries: [
						{
							id: 'snapshot-1',
							name: '기존 스냅샷'
						}
					],
					lastUpdated: '2026-03-11T00:00:00.000Z',
					totalCount: 1
				},
				null,
				2
			),
			'utf-8'
		);

		const result = await resetTestData({
			dataDir: tempDir,
			timestamp: FIXED_TIMESTAMP
		});

		expect(result.removedFiles).toContain(join(tempDir, 'vocabulary', 'vocabulary-custom.json'));
		expect(result.removedFiles).toContain(join(tempDir, 'table', 'history.json'));

		for (const type of RESET_DATA_TYPES) {
			const typeDir = join(tempDir, type);
			const files = await readdir(typeDir);
			expect(files.sort()).toEqual([DEFAULT_FILENAMES[type], 'notes.txt'].sort());

			const data = await readJson<{
				entries: unknown[];
				lastUpdated: string;
				totalCount: number;
			}>(join(typeDir, DEFAULT_FILENAMES[type]));

			expect(data).toEqual({
				entries: [],
				lastUpdated: FIXED_TIMESTAMP,
				totalCount: 0
			});
		}

		const registry = await readJson<{
			version: string;
			lastUpdated: string;
			relations: Array<{
				id: string;
				sourceType: keyof typeof DEFAULT_FILENAMES;
				sourceFilename: string;
				targetType: keyof typeof DEFAULT_FILENAMES;
				targetFilename: string;
				createdAt: string;
			}>;
		}>(join(tempDir, 'registry.json'));

		expect(registry.version).toBe('1.0');
		expect(registry.lastUpdated).toBe(FIXED_TIMESTAMP);
		expect(registry.relations).toHaveLength(DEFAULT_MAPPING_RELATIONS.length);
		for (const relation of registry.relations) {
			expect(relation.id).toBeTruthy();
			expect(relation.createdAt).toBe(FIXED_TIMESTAMP);
			expect(relation.sourceFilename).toBe(DEFAULT_FILENAMES[relation.sourceType]);
			expect(relation.targetFilename).toBe(DEFAULT_FILENAMES[relation.targetType]);
		}

		const sharedMappings = await readJson<{
			version: string;
			lastUpdated: string;
			bundles: Array<{
				id: string;
				name: string;
				files: typeof DEFAULT_FILENAMES;
				createdAt: string;
				updatedAt: string;
			}>;
		}>(join(settingsDir, 'shared-file-mappings.json'));

		expect(sharedMappings).toEqual({
			version: '1.0',
			bundles: [
				{
					id: 'default-shared-file-mapping',
					name: '기본 공통 번들',
					files: { ...DEFAULT_FILENAMES },
					createdAt: FIXED_TIMESTAMP,
					updatedAt: FIXED_TIMESTAMP
				}
			],
			lastUpdated: FIXED_TIMESTAMP
		});

		const domainTypeMappings = await readJson<{ preserved: boolean }>(
			join(settingsDir, 'domain-data-type-mappings.json')
		);
		expect(domainTypeMappings).toEqual({ preserved: true });
		await expect(readJson(join(settingsDir, 'design-snapshots.json'))).resolves.toEqual({
			entries: [],
			lastUpdated: FIXED_TIMESTAMP,
			totalCount: 0
		});
	});

	it('should create the reset baseline even when the data directory starts empty', async () => {
		tempDir = await mkdtemp(join(tmpdir(), 'dbmanager-reset-empty-'));

		const result = await resetTestData({
			dataDir: tempDir,
			timestamp: FIXED_TIMESTAMP
		});

		expect(result.removedFiles).toEqual([]);
		expect(result.rewrittenFiles).toHaveLength(RESET_DATA_TYPES.length);

		for (const type of RESET_DATA_TYPES) {
			const filePath = join(tempDir, type, DEFAULT_FILENAMES[type]);
			const data = await readJson<{
				entries: unknown[];
				lastUpdated: string;
				totalCount: number;
			}>(filePath);

			expect(data).toEqual({
				entries: [],
				lastUpdated: FIXED_TIMESTAMP,
				totalCount: 0
			});
		}

		await expect(readJson(join(tempDir, 'registry.json'))).resolves.toMatchObject({
			version: '1.0',
			lastUpdated: FIXED_TIMESTAMP
		});
		await expect(
			readJson(join(tempDir, 'settings', 'shared-file-mappings.json'))
		).resolves.toMatchObject({
			version: '1.0',
			lastUpdated: FIXED_TIMESTAMP
		});
		await expect(readJson(join(tempDir, 'settings', 'design-snapshots.json'))).resolves.toEqual({
			entries: [],
			lastUpdated: FIXED_TIMESTAMP,
			totalCount: 0
		});
	});
});
