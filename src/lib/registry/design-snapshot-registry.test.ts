import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { SharedFileMappingBundle } from '$lib/types/shared-file-mapping.js';

const FIXED_TIMESTAMP = '2026-03-13T01:00:00.000Z';

function createBundle(): SharedFileMappingBundle {
	return {
		vocabulary: 'snapshot-vocabulary.json',
		domain: 'snapshot-domain.json',
		term: 'snapshot-term.json',
		database: 'snapshot-database.json',
		entity: 'snapshot-entity.json',
		attribute: 'snapshot-attribute.json',
		table: 'snapshot-table.json',
		column: 'snapshot-column.json'
	};
}

describe('design-snapshot-registry', () => {
	let tempDir = '';

	beforeEach(async () => {
		vi.resetModules();
		tempDir = await mkdtemp(join(tmpdir(), 'dbmanager-design-snapshot-'));
		process.env.DATA_PATH = tempDir;
	});

	afterEach(async () => {
		delete process.env.DATA_PATH;
		if (tempDir) {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	async function seedBundle(bundle: SharedFileMappingBundle) {
		const { saveData } = await import('./data-registry');
		const { saveDbDesignFileMappingBundle } = await import('./db-design-file-mapping');

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
						createdAt: FIXED_TIMESTAMP,
						updatedAt: FIXED_TIMESTAMP
					}
				],
				lastUpdated: FIXED_TIMESTAMP,
				totalCount: 1
			},
			bundle.vocabulary
		);
		await saveData(
			'domain',
			{
				entries: [
					{
						id: 'domain-1',
						domainGroup: '공통',
						domainCategory: '사용자',
						standardDomainName: 'USER_NAME_DOM',
						physicalDataType: 'VARCHAR',
						dataLength: '100',
						decimalPlaces: '0',
						createdAt: FIXED_TIMESTAMP,
						updatedAt: FIXED_TIMESTAMP
					}
				],
				lastUpdated: FIXED_TIMESTAMP,
				totalCount: 1
			},
			bundle.domain
		);
		await saveData(
			'term',
			{
				entries: [
					{
						id: 'term-1',
						termName: '사용자명',
						columnName: 'USER_NAME',
						domainName: 'USER_NAME_DOM',
						isMappedTerm: true,
						isMappedColumn: true,
						isMappedDomain: true,
						createdAt: FIXED_TIMESTAMP,
						updatedAt: FIXED_TIMESTAMP
					}
				],
				lastUpdated: FIXED_TIMESTAMP,
				totalCount: 1
			},
			bundle.term
		);
		await saveData(
			'database',
			{
				entries: [
					{
						id: 'db-1',
						organizationName: '기관',
						departmentName: '부서',
						appliedTask: '업무',
						relatedLaw: '법령',
						buildDate: '2026-03-13',
						osInfo: 'linux',
						exclusionReason: '-',
						createdAt: FIXED_TIMESTAMP,
						updatedAt: FIXED_TIMESTAMP
					}
				],
				lastUpdated: FIXED_TIMESTAMP,
				totalCount: 1
			},
			bundle.database
		);
		await saveData(
			'entity',
			{
				entries: [
					{
						id: 'entity-1',
						schemaName: 'public',
						entityName: '사용자',
						createdAt: FIXED_TIMESTAMP,
						updatedAt: FIXED_TIMESTAMP
					}
				],
				lastUpdated: FIXED_TIMESTAMP,
				totalCount: 1
			},
			bundle.entity
		);
		await saveData(
			'attribute',
			{
				entries: [
					{
						id: 'attribute-1',
						requiredInput: 'Y',
						refEntityName: '사용자',
						schemaName: 'public',
						entityName: '사용자',
						attributeName: '사용자명',
						createdAt: FIXED_TIMESTAMP,
						updatedAt: FIXED_TIMESTAMP
					}
				],
				lastUpdated: FIXED_TIMESTAMP,
				totalCount: 1
			},
			bundle.attribute
		);
		await saveData(
			'table',
			{
				entries: [
					{
						id: 'table-1',
						businessClassification: '업무',
						tableVolume: '10',
						nonPublicReason: '-',
						openDataList: '-',
						schemaName: 'public',
						tableEnglishName: 'TB_USER',
						relatedEntityName: '사용자',
						createdAt: FIXED_TIMESTAMP,
						updatedAt: FIXED_TIMESTAMP
					}
				],
				lastUpdated: FIXED_TIMESTAMP,
				totalCount: 1
			},
			bundle.table
		);
		await saveData(
			'column',
			{
				entries: [
					{
						id: 'column-1',
						dataLength: '100',
						dataDecimalLength: '0',
						dataFormat: '-',
						pkInfo: 'N',
						indexName: '-',
						indexOrder: '0',
						akInfo: '-',
						constraint: '-',
						schemaName: 'public',
						tableEnglishName: 'TB_USER',
						columnEnglishName: 'USER_NAME',
						columnKoreanName: '사용자명',
						relatedEntityName: '사용자',
						domainName: 'USER_NAME_DOM',
						dataType: 'VARCHAR',
						createdAt: FIXED_TIMESTAMP,
						updatedAt: FIXED_TIMESTAMP
					}
				],
				lastUpdated: FIXED_TIMESTAMP,
				totalCount: 1
			},
			bundle.column
		);

		await saveDbDesignFileMappingBundle({
			currentType: 'column',
			currentFilename: bundle.column,
			mapping: {
				vocabulary: bundle.vocabulary,
				domain: bundle.domain,
				term: bundle.term,
				database: bundle.database,
				entity: bundle.entity,
				attribute: bundle.attribute,
				table: bundle.table
			}
		});
	}

	it('스냅샷을 생성하고 요약 목록을 반환한다', async () => {
		const bundle = createBundle();
		await seedBundle(bundle);

		const { createDesignSnapshot, listDesignSnapshotSummaries } = await import(
			'./design-snapshot-registry'
		);

		const created = await createDesignSnapshot({
			name: '기준 스냅샷',
			description: '복원 테스트용',
			bundle
		});
		const summaries = await listDesignSnapshotSummaries();

		expect(created.entry.name).toBe('기준 스냅샷');
		expect(created.entry.bundle).toEqual(bundle);
		expect(created.entry.counts.column).toBe(1);
		expect(created.entry.counts.term).toBe(1);
		expect(summaries).toHaveLength(1);
		expect(summaries[0]?.description).toBe('복원 테스트용');
	});

	it('스냅샷 복원 시 변경된 번들 데이터를 되돌린다', async () => {
		const bundle = createBundle();
		await seedBundle(bundle);

		const { createDesignSnapshot, restoreDesignSnapshot } = await import(
			'./design-snapshot-registry'
		);
		const { loadData, saveData } = await import('./data-registry');

		const snapshot = await createDesignSnapshot({
			name: '복원 기준',
			bundle
		});

		await saveData(
			'column',
			{
				entries: [
					{
						id: 'column-1',
						dataLength: '20',
						dataDecimalLength: '0',
						dataFormat: '-',
						pkInfo: 'N',
						indexName: '-',
						indexOrder: '0',
						akInfo: '-',
						constraint: '-',
						schemaName: 'public',
						tableEnglishName: 'TB_USER',
						columnEnglishName: 'USER_NICKNAME',
						columnKoreanName: '닉네임',
						relatedEntityName: '사용자',
						domainName: 'USER_NAME_DOM',
						dataType: 'VARCHAR',
						createdAt: FIXED_TIMESTAMP,
						updatedAt: FIXED_TIMESTAMP
					}
				],
				lastUpdated: FIXED_TIMESTAMP,
				totalCount: 1
			},
			bundle.column
		);

		const restored = await restoreDesignSnapshot(snapshot.entry.id);
		const restoredColumnData = await loadData('column', bundle.column);

		expect(restored.entry.restoredAt).toBeTruthy();
		expect(restoredColumnData.entries[0]?.columnEnglishName).toBe('USER_NAME');
		expect(restoredColumnData.entries[0]?.columnKoreanName).toBe('사용자명');
		expect(restoredColumnData.entries[0]?.dataLength).toBe('100');
	});

	it('스냅샷 삭제 시 목록에서 제거된다', async () => {
		const bundle = createBundle();
		await seedBundle(bundle);

		const { createDesignSnapshot, deleteDesignSnapshot, listDesignSnapshotSummaries } =
			await import('./design-snapshot-registry');

		const snapshot = await createDesignSnapshot({
			name: '삭제 대상',
			bundle
		});

		await deleteDesignSnapshot(snapshot.entry.id);

		await expect(listDesignSnapshotSummaries()).resolves.toEqual([]);
	});
});
