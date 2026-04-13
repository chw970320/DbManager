import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

describe('upload-history-registry', () => {
	let tempDir = '';

	beforeEach(async () => {
		vi.resetModules();
		tempDir = await mkdtemp(join(tmpdir(), 'dbmanager-upload-history-'));
		process.env.DATA_PATH = tempDir;
	});

	afterEach(async () => {
		delete process.env.DATA_PATH;
		if (tempDir) {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	it('업로드 교체 직전 JSON 본문을 타입별 저장소에 저장한다', async () => {
		const timestamp = '2026-04-09T00:00:00.000Z';
		const { saveData } = await import('./data-registry');
		const { captureUploadReplaceHistory, listUploadHistoryEntries } = await import(
			'./upload-history-registry'
		);

		await saveData(
			'vocabulary',
			{
				entries: [
					{
						id: 'vocab-1',
						standardName: '사용자',
						abbreviation: 'USER',
						englishName: 'User',
						description: '사용자',
						createdAt: timestamp,
						updatedAt: timestamp
					}
				],
				lastUpdated: timestamp,
				totalCount: 1
			},
			'custom-vocabulary.json'
		);

		const entry = await captureUploadReplaceHistory('vocabulary', 'custom-vocabulary.json', timestamp);
		const list = await listUploadHistoryEntries('vocabulary', 'custom-vocabulary.json', timestamp);
		const storedRaw = JSON.parse(
			await readFile(join(tempDir, 'settings', 'upload-history', 'vocabulary.json'), 'utf-8')
		) as { entries: Array<{ filename: string; content: { mapping?: unknown; entries: unknown[] } }> };

		expect(entry.filename).toBe('custom-vocabulary.json');
		expect(list).toHaveLength(1);
		expect(storedRaw.entries[0]?.filename).toBe('custom-vocabulary.json');
		expect(storedRaw.entries[0]?.content.mapping).toBeUndefined();
		expect(storedRaw.entries[0]?.content.entries).toHaveLength(1);
	});

	it('30일이 지난 이력을 prune하고 최신 순으로 반환한다', async () => {
		const { saveUploadHistoryData, listUploadHistoryEntries } = await import('./upload-history-registry');

		await saveUploadHistoryData('term', {
			entries: [
				{
					id: 'expired',
					dataType: 'term',
					filename: 'term.json',
					reason: 'upload-replace',
					createdAt: '2026-02-01T00:00:00.000Z',
					expiresAt: '2026-03-03T00:00:00.000Z',
					content: {
						entries: [],
						lastUpdated: '2026-02-01T00:00:00.000Z',
						totalCount: 0
					}
				},
				{
					id: 'latest',
					dataType: 'term',
					filename: 'term.json',
					reason: 'upload-replace',
					createdAt: '2026-04-05T00:00:00.000Z',
					expiresAt: '2026-05-05T00:00:00.000Z',
					content: {
						entries: [
							{
								id: 'term-1',
								termName: '기존_용어',
								columnName: 'EXISTING_TERM',
								domainName: 'TERM_DOM',
								isMappedTerm: true,
								isMappedColumn: true,
								isMappedDomain: true,
								createdAt: '2026-04-05T00:00:00.000Z',
								updatedAt: '2026-04-05T00:00:00.000Z'
							}
						],
						lastUpdated: '2026-04-05T00:00:00.000Z',
						totalCount: 1
					}
				}
			],
			lastUpdated: '2026-04-05T00:00:00.000Z',
			totalCount: 2
		});

		const list = await listUploadHistoryEntries(
			'term',
			'term.json',
			'2026-04-09T00:00:00.000Z'
		);

		expect(list.map((entry) => entry.id)).toEqual(['latest']);
	});

	it('복원은 현재 파일 JSON 본문만 되돌리고 새 이력을 만들지 않는다', async () => {
		const timestamp = '2026-04-09T00:00:00.000Z';
		const { saveData, loadData } = await import('./data-registry');
		const {
			saveUploadHistoryData,
			restoreUploadHistoryEntry,
			listUploadHistoryEntries
		} = await import('./upload-history-registry');

		await saveData(
			'database',
			{
				entries: [
					{
						id: 'db-1',
						organizationName: '신규 기관',
						departmentName: '부서',
						appliedTask: '업무',
						relatedLaw: '',
						logicalDbName: 'NEW_DB',
						physicalDbName: 'NEW_DB',
						buildDate: '2026-04-09',
						dbDescription: '',
						dbmsInfo: 'postgres',
						osInfo: 'linux',
						exclusionReason: '',
						createdAt: timestamp,
						updatedAt: timestamp
					}
				],
				lastUpdated: timestamp,
				totalCount: 1
			},
			'database.json'
		);

		await saveUploadHistoryData('database', {
			entries: [
				{
					id: 'history-1',
					dataType: 'database',
					filename: 'database.json',
					reason: 'upload-replace',
					createdAt: timestamp,
					expiresAt: '2026-05-09T00:00:00.000Z',
					content: {
						entries: [
							{
								id: 'db-old',
								organizationName: '기존 기관',
								departmentName: '기존 부서',
								appliedTask: '기존 업무',
								relatedLaw: '',
								logicalDbName: 'OLD_DB',
								physicalDbName: 'OLD_DB',
								buildDate: '2026-03-01',
								dbDescription: '',
								dbmsInfo: 'postgres',
								osInfo: 'linux',
								exclusionReason: '',
								createdAt: timestamp,
								updatedAt: timestamp
							}
						],
						lastUpdated: timestamp,
						totalCount: 1
					}
				}
			],
			lastUpdated: timestamp,
			totalCount: 1
		});

		await restoreUploadHistoryEntry('database', 'history-1', timestamp);

		const restored = await loadData('database', 'database.json');
		const list = await listUploadHistoryEntries('database', 'database.json', timestamp);

		expect(restored.entries[0]?.organizationName).toBe('기존 기관');
		expect(list).toHaveLength(1);
		expect(list[0]?.id).toBe('history-1');
	});
});
