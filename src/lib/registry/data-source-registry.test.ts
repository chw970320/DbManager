import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

describe('data-source-registry', () => {
	let tempDir = '';

	beforeEach(async () => {
		vi.resetModules();
		tempDir = await mkdtemp(join(tmpdir(), 'dbmanager-data-sources-'));
		process.env.DATA_PATH = tempDir;
	});

	afterEach(async () => {
		delete process.env.DATA_PATH;
		if (tempDir) {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	it('should create the default empty registry when the file does not exist', async () => {
		const { loadDataSourceData } = await import('./data-source-registry');

		const data = await loadDataSourceData();

		expect(data.entries).toEqual([]);
		expect(data.totalCount).toBe(0);
		expect(typeof data.lastUpdated).toBe('string');

		const raw = await readFile(join(tempDir, 'settings', 'data-sources.json'), 'utf-8');
		expect(JSON.parse(raw)).toMatchObject({
			entries: [],
			totalCount: 0
		});
	});

	it('should create a PostgreSQL data source and hide the password in summaries', async () => {
		const { createDataSource, getDataSourceEntry, listDataSourceSummaries } = await import(
			'./data-source-registry'
		);

		const created = await createDataSource({
			name: '운영 PostgreSQL',
			type: 'postgresql',
			description: '운영 메타데이터 저장소',
			config: {
				host: 'db.internal',
				port: 5432,
				database: 'metadata',
				schema: 'public',
				username: 'dbadmin',
				password: 'super-secret',
				ssl: false,
				connectionTimeoutSeconds: 5
			}
		});

		const stored = await getDataSourceEntry(created.entry.id);
		const summaries = await listDataSourceSummaries();

		expect(stored?.config.password).toBe('super-secret');
		expect(created.entry.config.hasPassword).toBe(true);
		expect('password' in created.entry.config).toBe(false);
		expect(summaries[0]?.config.hasPassword).toBe(true);
		expect('password' in summaries[0].config).toBe(false);
	});

	it('should preserve the stored password when update payload leaves it blank', async () => {
		const { createDataSource, updateDataSource, getDataSourceEntry } = await import(
			'./data-source-registry'
		);

		const created = await createDataSource({
			name: '운영 PostgreSQL',
			type: 'postgresql',
			description: '운영 메타데이터 저장소',
			config: {
				host: 'db.internal',
				port: 5432,
				database: 'metadata',
				schema: 'public',
				username: 'dbadmin',
				password: 'super-secret',
				ssl: false,
				connectionTimeoutSeconds: 5
			}
		});

		await updateDataSource(created.entry.id, {
			name: '운영 PostgreSQL',
			type: 'postgresql',
			description: '스키마 점검용',
			config: {
				host: 'db.internal',
				port: 5433,
				database: 'metadata',
				schema: 'audit',
				username: 'dbadmin',
				password: '',
				ssl: true,
				connectionTimeoutSeconds: 10
			}
		});

		const stored = await getDataSourceEntry(created.entry.id);

		expect(stored?.description).toBe('스키마 점검용');
		expect(stored?.config.port).toBe(5433);
		expect(stored?.config.schema).toBe('audit');
		expect(stored?.config.ssl).toBe(true);
		expect(stored?.config.password).toBe('super-secret');
	});
});
