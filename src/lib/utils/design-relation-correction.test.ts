import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DesignRelationValidationResult, RelationIssue } from '$lib/types/design-relation.js';
import {
	applyDesignRelationCorrection,
	applyDesignRelationPatchToData,
	previewDesignRelationCorrection,
	selectDesignRelationCandidate
} from './design-relation-correction.js';
import { loadData, saveData } from '$lib/registry/data-registry.js';

vi.mock('$lib/registry/data-registry.js', () => ({
	loadData: vi.fn(),
	saveData: vi.fn()
}));

function issue(overrides: Partial<RelationIssue>): RelationIssue {
	return {
		issueId: 'issue-single',
		relationId: 'TABLE_COLUMN_MAPPING',
		relationName: '테이블-컬럼',
		severity: 'error',
		sourceType: 'table',
		targetType: 'column',
		targetId: 'col-1',
		targetLabel: 'USER_ID',
		expectedKey: '공통|BKSP|USER|사용자',
		actualKey: '공통|BKSP|WRONG|사용자',
		reason: '불일치',
		message: '불일치',
		manualTargets: [],
		affectedRows: [],
		candidates: [],
		autoFixable: false,
		actionGuide: 'guide',
		...overrides
	};
}

function validation(): DesignRelationValidationResult {
	const single = issue({
		issueId: 'issue-single',
		candidates: [
			{
				candidateId: 'candidate-single',
				issueId: 'issue-single',
				targetType: 'column',
				targetId: 'col-1',
				targetLabel: 'USER_ID',
				patch: {
					targetType: 'column',
					targetId: 'col-1',
					fields: { tableEnglishName: 'USER', relatedEntityName: '사용자' }
				},
				reason: '단일 후보',
				confidence: 'high',
				previewText: 'USER로 수정',
				autoFixable: true
			}
		],
		autoFixable: true
	});
	const multi = issue({
		issueId: 'issue-multi',
		candidates: [
			{
				...single.candidates[0],
				issueId: 'issue-multi',
				candidateId: 'candidate-a',
				targetId: 'col-1'
			},
			{
				...single.candidates[0],
				issueId: 'issue-multi',
				candidateId: 'candidate-b',
				targetId: 'col-1'
			}
		],
		autoFixable: true
	});
	const manualOnly = issue({
		issueId: 'issue-manual',
		relationId: 'ATTRIBUTE_COLUMN_KEY',
		candidates: [
			{
				...single.candidates[0],
				issueId: 'issue-manual',
				candidateId: 'candidate-manual',
				autoFixable: false
			}
		],
		autoFixable: false
	});
	const noCandidate = issue({ issueId: 'issue-none', candidates: [], autoFixable: false });
	return {
		specs: [],
		rules: [],
		summaries: [
			{
				relationId: 'TABLE_COLUMN_MAPPING',
				relationName: '테이블-컬럼',
				totalChecked: 4,
				matched: 0,
				unmatched: 4,
				severity: 'error',
				mappingKey: 'key',
				issues: [single, multi, manualOnly, noCandidate]
			}
		],
		issues: [single, multi, manualOnly, noCandidate],
		totals: { totalChecked: 4, matched: 0, unmatched: 4, errorCount: 4, warningCount: 0 }
	};
}

describe('design-relation-correction', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('previews a single selected candidate without mutating data', () => {
		const preview = previewDesignRelationCorrection(validation(), { issueId: 'issue-single' });

		expect(preview).toMatchObject({
			issueId: 'issue-single',
			candidateId: 'candidate-single',
			previewText: 'USER로 수정',
			patch: { targetType: 'column', targetId: 'col-1' }
		});
	});

	it('requires explicit candidateId for multiple candidates and rejects manual-only/no-candidate issues', () => {
		expect(() => selectDesignRelationCandidate(validation(), 'issue-multi')).toThrow('candidateId');
		expect(() => selectDesignRelationCandidate(validation(), 'issue-none')).toThrow('수동 수정만');
		expect(() =>
			selectDesignRelationCandidate(validation(), 'issue-manual', 'candidate-manual')
		).toThrow('자동 수정 대상이 아닙니다');
	});

	it('applies only selected candidate patch fields and updates timestamps/counts', () => {
		const data = {
			entries: [
				{
					id: 'col-1',
					tableEnglishName: 'WRONG',
					relatedEntityName: '사용자',
					untouched: 'keep',
					updatedAt: 'old'
				},
				{ id: 'col-2', tableEnglishName: 'OTHER', updatedAt: 'old' }
			],
			lastUpdated: 'old',
			totalCount: 2
		};

		const patched = applyDesignRelationPatchToData(
			data,
			validation().issues[0].candidates[0].patch,
			'2026-06-04T00:00:00.000Z'
		);

		expect(patched.updatedEntry).toMatchObject({
			id: 'col-1',
			tableEnglishName: 'USER',
			relatedEntityName: '사용자',
			untouched: 'keep',
			updatedAt: '2026-06-04T00:00:00.000Z'
		});
		expect(patched.data.entries[1]).toMatchObject({ id: 'col-2', tableEnglishName: 'OTHER' });
		expect(patched.data).toMatchObject({ lastUpdated: '2026-06-04T00:00:00.000Z', totalCount: 2 });
	});

	it('loads and saves the selected target file only for apply service', async () => {
		vi.mocked(loadData).mockResolvedValue({
			entries: [
				{
					id: 'col-1',
					tableEnglishName: 'WRONG',
					relatedEntityName: '틀림',
					dataLength: '20',
					dataDecimalLength: '0',
					dataFormat: '-',
					pkInfo: '-',
					indexName: '-',
					indexOrder: '-',
					akInfo: '-',
					constraint: '-',
					createdAt: 'old',
					updatedAt: 'old'
				}
			],
			lastUpdated: 'old',
			totalCount: 1
		});

		const result = await applyDesignRelationCorrection({
			validation: validation(),
			issueId: 'issue-single',
			candidateId: 'candidate-single',
			files: { column: 'column-a.json' },
			now: '2026-06-04T00:00:00.000Z'
		});

		expect(loadData).toHaveBeenCalledWith('column', 'column-a.json');
		expect(saveData).toHaveBeenCalledTimes(1);
		expect(saveData).toHaveBeenCalledWith(
			'column',
			expect.objectContaining({
				entries: [
					expect.objectContaining({
						id: 'col-1',
						tableEnglishName: 'USER',
						relatedEntityName: '사용자'
					})
				]
			}),
			'column-a.json'
		);
		expect(result).toMatchObject({
			applied: true,
			targetType: 'column',
			targetFile: 'column-a.json'
		});
	});
});
