import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyCascadePlan } from './cascade-update-transaction';

const mocks = vi.hoisted(() => ({
	saveVocabularyData: vi.fn(),
	saveDomainData: vi.fn(),
	saveTermData: vi.fn(),
	invalidateCache: vi.fn(),
	invalidateAllGeneratorCaches: vi.fn()
}));

vi.mock('$lib/registry/data-registry.js', () => ({
	saveVocabularyData: mocks.saveVocabularyData,
	saveDomainData: mocks.saveDomainData,
	saveTermData: mocks.saveTermData
}));

vi.mock('$lib/registry/cache-registry.js', () => ({
	invalidateCache: mocks.invalidateCache
}));

vi.mock('$lib/registry/generator-cache.js', () => ({
	invalidateAllGeneratorCaches: mocks.invalidateAllGeneratorCaches
}));

describe('applyCascadePlan', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rolls back already-written files when a later save fails', async () => {
		mocks.saveVocabularyData.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);
		mocks.saveTermData.mockRejectedValue(new Error('write failed'));

		await expect(
			applyCascadePlan({
				preview: {
					sourceType: 'vocabulary',
					sourceFilename: 'vocabulary.json',
					sourceEntryId: 'v1',
					sourceEntryName: '명칭',
					mode: 'update',
					summary: {
						sourceChangeCount: 1,
						relatedChangeCount: 1,
						totalChangedFiles: 2,
						conflictCount: 0
					},
					fileSummaries: [],
					guidance: [],
					conflicts: [],
					blocked: false
				},
				sourceType: 'vocabulary',
				mode: 'update',
				files: { vocabulary: 'vocabulary.json' },
				datasets: [
					{
						type: 'vocabulary',
						filename: 'vocabulary.json',
						currentData: { entries: [], totalCount: 0, lastUpdated: '' },
						nextData: {
							entries: [
								{
									id: 'v1',
									standardName: '명칭',
									abbreviation: 'NAME',
									englishName: 'Name',
									createdAt: '',
									updatedAt: ''
								}
							],
							totalCount: 1,
							lastUpdated: ''
						},
						changedEntries: [{ type: 'vocabulary', id: 'v1', name: '명칭', fieldChanges: [] }]
					},
					{
						type: 'term',
						filename: 'term.json',
						currentData: { entries: [], totalCount: 0, lastUpdated: '' },
						nextData: {
							entries: [
								{
									id: 't1',
									termName: '사용자_명칭',
									columnName: 'USER_NAME',
									domainName: '이름_VARCHAR(100)',
									isMappedTerm: true,
									isMappedColumn: true,
									isMappedDomain: true,
									createdAt: '',
									updatedAt: ''
								}
							],
							totalCount: 1,
							lastUpdated: ''
						},
						changedEntries: [{ type: 'term', id: 't1', name: '사용자_명칭', fieldChanges: [] }]
					}
				],
				conflicts: [],
				canApply: true,
				summary: {
					vocabularyChangeCount: 1,
					domainChangeCount: 0,
					termChangeCount: 1,
					totalChangeCount: 2
				}
			})
		).rejects.toThrow('write failed');

		expect(mocks.saveVocabularyData).toHaveBeenCalledTimes(2);
		expect(mocks.saveTermData).toHaveBeenCalledTimes(1);
		expect(mocks.invalidateCache).toHaveBeenCalledWith('vocabulary', 'vocabulary.json');
	});
});
