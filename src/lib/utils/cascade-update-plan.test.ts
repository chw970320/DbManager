import { beforeEach, describe, expect, it, vi } from 'vitest';
import { planCascadeUpdate } from './cascade-update-plan';

const mocks = vi.hoisted(() => ({
	loadVocabularyData: vi.fn(),
	loadTermData: vi.fn(),
	loadDomainData: vi.fn(),
	loadDomainDataTypeMappingData: vi.fn(),
	resolveRelatedFilenames: vi.fn()
}));

vi.mock('$lib/registry/data-registry.js', () => ({
	loadVocabularyData: mocks.loadVocabularyData,
	loadTermData: mocks.loadTermData,
	loadDomainData: mocks.loadDomainData
}));

vi.mock('$lib/registry/domain-data-type-mapping-registry.js', () => ({
	loadDomainDataTypeMappingData: mocks.loadDomainDataTypeMappingData
}));

vi.mock('$lib/registry/mapping-registry.js', () => ({
	resolveRelatedFilenames: mocks.resolveRelatedFilenames
}));

describe('planCascadeUpdate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.resolveRelatedFilenames.mockResolvedValue(
			new Map([
				['term', 'term.json'],
				['domain', 'domain.json'],
				['vocabulary', 'vocabulary.json']
			])
		);
	});

	it('plans vocabulary token replacement into related terms', async () => {
		mocks.loadVocabularyData.mockResolvedValue({
			entries: [
				{
					id: 'v1',
					standardName: '이름',
					abbreviation: 'NAME',
					englishName: 'Name',
					isFormalWord: true,
					domainCategory: '이름',
					domainGroup: '공통',
					isDomainCategoryMapped: true,
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:00.000Z'
				}
			],
			totalCount: 1,
			lastUpdated: '2026-01-01T00:00:00.000Z'
		});
		mocks.loadTermData.mockResolvedValue({
			entries: [
				{
					id: 't1',
					termName: '사용자_이름',
					columnName: 'USER_NAME',
					domainName: '이름_VARCHAR(100)',
					isMappedTerm: true,
					isMappedColumn: true,
					isMappedDomain: true,
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:00.000Z'
				}
			],
			totalCount: 1,
			lastUpdated: '2026-01-01T00:00:00.000Z'
		});
		mocks.loadDomainData.mockResolvedValue({
			entries: [
				{
					id: 'd1',
					domainGroup: '공통',
					domainCategory: '이름',
					standardDomainName: '이름_VARCHAR(100)',
					physicalDataType: 'VARCHAR',
					dataLength: '100',
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:00.000Z'
				}
			],
			totalCount: 1,
			lastUpdated: '2026-01-01T00:00:00.000Z'
		});

		const plan = await planCascadeUpdate({
			type: 'vocabulary',
			filename: 'vocabulary.json',
			mode: 'update',
			currentEntry: {
				id: 'v1',
				standardName: '이름',
				abbreviation: 'NAME',
				englishName: 'Name',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z'
			},
			proposedEntry: {
				id: 'v1',
				standardName: '명칭',
				abbreviation: 'NAME',
				englishName: 'Name',
				isFormalWord: true,
				domainCategory: '이름',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z'
			} as never
		});

		expect(plan.blocked).toBe(false);
		expect(plan.preview.summary.relatedChangeCount).toBe(1);
		expect(plan.datasets).toHaveLength(2);
		const termDataset = plan.datasets.find((dataset) => dataset.type === 'term');
		expect(termDataset?.nextData.entries[0].termName).toBe('사용자_명칭');
	});

	it('blocks domain category propagation when old category is still referenced by another domain', async () => {
		mocks.loadDomainData.mockResolvedValue({
			entries: [
				{
					id: 'd1',
					domainGroup: '공통',
					domainCategory: '이름',
					standardDomainName: '이름_VARCHAR(100)',
					physicalDataType: 'VARCHAR',
					dataLength: '100',
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:00.000Z'
				},
				{
					id: 'd2',
					domainGroup: '공통',
					domainCategory: '이름',
					standardDomainName: '이름_VARCHAR(200)',
					physicalDataType: 'VARCHAR',
					dataLength: '200',
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:00.000Z'
				}
			],
			totalCount: 2,
			lastUpdated: '2026-01-01T00:00:00.000Z'
		});
		mocks.loadVocabularyData.mockResolvedValue({
			entries: [
				{
					id: 'v1',
					standardName: '이름',
					abbreviation: 'NAME',
					englishName: 'Name',
					isFormalWord: true,
					domainCategory: '이름',
					domainGroup: '공통',
					isDomainCategoryMapped: true,
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:00.000Z'
				}
			],
			totalCount: 1,
			lastUpdated: '2026-01-01T00:00:00.000Z'
		});
		mocks.loadTermData.mockResolvedValue({
			entries: [],
			totalCount: 0,
			lastUpdated: '2026-01-01T00:00:00.000Z'
		});
		mocks.loadDomainDataTypeMappingData.mockResolvedValue({
			entries: [],
			totalCount: 0,
			lastUpdated: '2026-01-01T00:00:00.000Z'
		});

		const plan = await planCascadeUpdate({
			type: 'domain',
			filename: 'domain.json',
			mode: 'update',
			currentEntry: {
				id: 'd1',
				domainGroup: '공통',
				domainCategory: '이름',
				standardDomainName: '이름_VARCHAR(100)',
				physicalDataType: 'VARCHAR',
				dataLength: '100',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z'
			},
			proposedEntry: {
				id: 'd1',
				domainGroup: '공통',
				domainCategory: '성명',
				standardDomainName: '성명_VARCHAR(100)',
				physicalDataType: 'VARCHAR',
				dataLength: '100',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z'
			} as never
		});

		expect(plan.blocked).toBe(true);
		expect(plan.preview.conflicts).toHaveLength(1);
		expect(plan.canApply).toBe(false);
	});
});
