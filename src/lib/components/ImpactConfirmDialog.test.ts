import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import ImpactConfirmDialog from './ImpactConfirmDialog.svelte';
import type { EditorSaveImpactPreview } from '$lib/types/change-impact.js';

const preview: EditorSaveImpactPreview = {
	sourceType: 'vocabulary',
	sourceFilename: 'vocabulary.json',
	sourceEntryId: 'v1',
	sourceEntryName: '사용자',
	mode: 'update',
	summary: {
		sourceChangeCount: 1,
		relatedChangeCount: 2,
		totalChangedFiles: 2,
		conflictCount: 0
	},
	fileSummaries: [
		{
			type: 'vocabulary',
			filename: 'vocabulary.json',
			role: 'source',
			changedCount: 1,
			samples: [
				{
					id: 'v1',
					name: '사용자',
					reason: '변경 필드: standardName',
					changedFields: ['standardName']
				}
			]
		}
	],
	guidance: ['연관 용어 2건이 함께 갱신됩니다.'],
	conflicts: [],
	blocked: false
};

describe('ImpactConfirmDialog', () => {
	it('renders impact summary and allows confirm click', async () => {
		render(ImpactConfirmDialog, {
			props: {
				isOpen: true,
				preview
			}
		});

		expect(screen.getByText('저장 전 영향도 확인')).toBeInTheDocument();
		expect(screen.getByText('연관 변경')).toBeInTheDocument();
		expect(screen.getByText('사용자')).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: '저장' }));
		expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
	});

	it('hides confirm button when preview is blocked', () => {
		render(ImpactConfirmDialog, {
			props: {
				isOpen: true,
				preview: {
					...preview,
					blocked: true,
					summary: {
						...preview.summary,
						conflictCount: 1
					},
					conflicts: [
						{
							type: 'term',
							filename: 'term.json',
							entryId: 't1',
							name: '사용자_상태',
							reason: '도메인 후보가 2개입니다.',
							candidates: ['A', 'B']
						}
					]
				}
			}
		});

		expect(screen.getByText('자동 반영 충돌 확인')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument();
		expect(screen.getByText('도메인 후보가 2개입니다.')).toBeInTheDocument();
	});
});
