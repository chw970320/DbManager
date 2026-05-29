import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import EditorSaveImpactSummary from './EditorSaveImpactSummary.svelte';
import type { EditorSaveImpactPreview } from '$lib/types/change-impact.js';

const preview: EditorSaveImpactPreview = {
	sourceType: 'domain',
	sourceFilename: 'domain.json',
	sourceEntryId: 'd1',
	sourceEntryName: '회원상태',
	mode: 'update',
	summary: {
		sourceChangeCount: 1,
		relatedChangeCount: 3,
		totalChangedFiles: 2,
		conflictCount: 0
	},
	fileSummaries: [
		{
			type: 'domain',
			filename: 'domain.json',
			role: 'source',
			changedCount: 1,
			samples: [
				{
					id: 'd1',
					name: '회원상태',
					reason: '자료타입 변경',
					changedFields: ['physicalDataType']
				}
			]
		},
		{
			type: 'term',
			filename: 'term.json',
			role: 'related',
			changedCount: 3,
			samples: [
				{
					id: 't1',
					name: '회원_상태',
					reason: '도메인명 자동 반영'
				}
			]
		}
	],
	guidance: ['연관 용어 3건이 함께 갱신됩니다.'],
	conflicts: [],
	blocked: false
};

describe('EditorSaveImpactSummary', () => {
	it('renders related-change warning with affected file context', () => {
		render(EditorSaveImpactSummary, {
			props: {
				preview
			}
		});

		expect(screen.getByRole('region', { name: '저장 영향도' })).toBeInTheDocument();
		expect(screen.getByText('검토 필요')).toBeInTheDocument();
		expect(screen.getByText('연관 자동 반영 예정')).toBeInTheDocument();
		expect(screen.getByText(/도메인 · domain\.json/)).toBeInTheDocument();
		expect(screen.getByText('원본')).toBeInTheDocument();
		expect(screen.getByText('연관')).toBeInTheDocument();
		expect(screen.getByText('연관 용어 3건이 함께 갱신됩니다.')).toBeInTheDocument();
	});

	it('renders blocked status and conflict details', () => {
		render(EditorSaveImpactSummary, {
			props: {
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
							name: '회원_상태',
							reason: '도메인 후보가 2개입니다.',
							candidates: ['상태코드', '회원상태']
						}
					]
				}
			}
		});

		expect(screen.getByText('저장 차단')).toBeInTheDocument();
		expect(screen.getByText('충돌 해결 필요')).toBeInTheDocument();
		expect(screen.getByText('도메인 후보가 2개입니다.')).toBeInTheDocument();
		expect(screen.getByText('상태코드')).toBeInTheDocument();
	});

	it('renders neutral status when there is no source or related change', () => {
		render(EditorSaveImpactSummary, {
			props: {
				preview: {
					...preview,
					summary: {
						sourceChangeCount: 0,
						relatedChangeCount: 0,
						totalChangedFiles: 0,
						conflictCount: 0
					},
					fileSummaries: [],
					guidance: []
				}
			}
		});

		expect(screen.getByText('영향 없음')).toBeInTheDocument();
		expect(screen.getByText('추가 영향 없음')).toBeInTheDocument();
	});
});
