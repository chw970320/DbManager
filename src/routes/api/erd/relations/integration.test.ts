import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const NOW = '2026-02-14T00:00:00.000Z';

async function writeDataFile(
	rootDir: string,
	type: 'database' | 'entity' | 'attribute' | 'table' | 'column',
	filename: string,
	data: unknown
) {
	const dir = join(rootDir, type);
	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, filename), JSON.stringify(data, null, 2), 'utf-8');
}

function createGetEvent(url: string): RequestEvent {
	return {
		url: new URL(url),
		request: {} as Request
	} as RequestEvent;
}

function createPostEvent(url: string, body: unknown): RequestEvent {
	return {
		url: new URL(url),
		request: {
			json: async () => body
		} as Request
	} as RequestEvent;
}

describe('API: /api/erd/relations integration (fixture-based)', () => {
	let tempDataDir = '';

	beforeEach(async () => {
		vi.resetModules();
		tempDataDir = await mkdtemp(join(tmpdir(), 'dbmanager-erd-rel-'));
		process.env.DATA_PATH = tempDataDir;

		await writeDataFile(tempDataDir, 'database', 'database.json', {
			entries: [
				{
					id: '11111111-1111-4111-8111-111111111111',
					organizationName: '기관',
					departmentName: '부서',
					appliedTask: '업무',
					relatedLaw: '법령',
					buildDate: '2026-01-01',
					osInfo: 'Linux',
					exclusionReason: '-',
					logicalDbName: 'LDB_MAIN',
					physicalDbName: 'PDB_MAIN',
					createdAt: NOW,
					updatedAt: NOW
				}
			],
			lastUpdated: NOW,
			totalCount: 1
		});

		await writeDataFile(tempDataDir, 'entity', 'entity.json', {
			entries: [
				{
					id: '22222222-2222-4222-8222-222222222222',
					logicalDbName: 'LDB_MAIN',
					schemaName: 'MAIN',
					entityName: '사용자',
					tableKoreanName: '사용자테이블',
					createdAt: NOW,
					updatedAt: NOW
				}
			],
			lastUpdated: NOW,
			totalCount: 1
		});

		await writeDataFile(tempDataDir, 'attribute', 'attribute.json', {
			entries: [
				{
					id: '33333333-3333-4333-8333-333333333333',
					schemaName: 'MAIN',
					entityName: '사용자',
					attributeName: '사용자아이디',
					requiredInput: 'Y',
					refEntityName: '-',
					createdAt: NOW,
					updatedAt: NOW
				}
			],
			lastUpdated: NOW,
			totalCount: 1
		});

		await writeDataFile(tempDataDir, 'table', 'table.json', {
			entries: [
				{
					id: '44444444-4444-4444-8444-444444444444',
					physicalDbName: 'PDB_MAIN',
					schemaName: 'MAIN',
					tableEnglishName: 'TB_USER',
					tableKoreanName: '사용자테이블',
					relatedEntityName: '사용자테이블',
					businessClassification: '업무분류',
					tableVolume: '100',
					nonPublicReason: '-',
					openDataList: '-',
					createdAt: NOW,
					updatedAt: NOW
				}
			],
			lastUpdated: NOW,
			totalCount: 1
		});

		await writeDataFile(tempDataDir, 'column', 'column.json', {
			entries: [
				{
					id: '55555555-5555-4555-8555-555555555555',
					schemaName: 'MAIN',
					tableEnglishName: '사용자테이블',
					columnEnglishName: 'USER_ID',
					columnKoreanName: '사용자아이디',
					relatedEntityName: '',
					dataLength: '20',
					dataDecimalLength: '0',
					dataFormat: '-',
					pkInfo: '-',
					indexName: '-',
					indexOrder: '-',
					akInfo: '-',
					constraint: '-',
					createdAt: NOW,
					updatedAt: NOW
				},
				{
					id: '66666666-6666-4666-8666-666666666666',
					schemaName: 'MAIN',
					tableEnglishName: 'TB_UNKNOWN',
					columnEnglishName: 'USER_NM',
					columnKoreanName: '사용자명',
					relatedEntityName: '사용자',
					dataLength: '50',
					dataDecimalLength: '0',
					dataFormat: '-',
					pkInfo: '-',
					indexName: '-',
					indexOrder: '-',
					akInfo: '-',
					constraint: '-',
					createdAt: NOW,
					updatedAt: NOW
				}
			],
			lastUpdated: NOW,
			totalCount: 2
		});
	});

	afterEach(async () => {
		delete process.env.DATA_PATH;
		vi.resetModules();
		if (tempDataDir) {
			await rm(tempDataDir, { recursive: true, force: true });
		}
	});

	it('should reduce relation unmatched count after sync apply with fixture data', async () => {
		const relationsModule = await import('./+server');
		const syncModule = await import('./sync/+server');

		const beforeResponse = await relationsModule.GET(createGetEvent('http://localhost/api/erd/relations'));
		const beforePayload = await beforeResponse.json();

		expect(beforeResponse.status).toBe(200);
		expect(beforePayload.success).toBe(true);
		expect(beforePayload.data.files.database).toBe('database.json');
		expect(beforePayload.data.files.column).toBe('column.json');
		expect(beforePayload.data.validation.totals.unmatched).toBeGreaterThan(0);

		const syncResponse = await syncModule.POST(
			createPostEvent('http://localhost/api/erd/relations/sync', { apply: true })
		);
		const syncPayload = await syncResponse.json();

		expect(syncResponse.status).toBe(200);
		expect(syncPayload.success).toBe(true);
		expect(syncPayload.data.mode).toBe('apply');
		expect(syncPayload.data.counts.appliedTotalUpdates).toBeGreaterThan(0);
		expect(syncPayload.data.validationAfter.totals.unmatched).toBeLessThan(
			syncPayload.data.validationBefore.totals.unmatched
		);

		const afterResponse = await relationsModule.GET(createGetEvent('http://localhost/api/erd/relations'));
		const afterPayload = await afterResponse.json();

		expect(afterResponse.status).toBe(200);
		expect(afterPayload.success).toBe(true);
		expect(afterPayload.data.validation.totals.unmatched).toBeLessThan(
			beforePayload.data.validation.totals.unmatched
		);

		const tableRaw = await readFile(join(tempDataDir, 'table', 'table.json'), 'utf-8');
		const columnRaw = await readFile(join(tempDataDir, 'column', 'column.json'), 'utf-8');
		const tableData = JSON.parse(tableRaw) as { entries: Array<{ relatedEntityName?: string }> };
		const columnData = JSON.parse(columnRaw) as {
			entries: Array<{ tableEnglishName?: string; relatedEntityName?: string }>;
		};

		expect(tableData.entries[0].relatedEntityName).toBe('사용자');
		expect(columnData.entries[0].tableEnglishName).toBe('TB_USER');
		expect(columnData.entries[0].relatedEntityName).toBe('사용자');
		expect(columnData.entries[1].tableEnglishName).toBe('TB_USER');
	});
});
