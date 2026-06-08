import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import DesignRelationValidationPanel from './DesignRelationValidationPanel.svelte';
import type { DesignRelationValidationResult, RelationIssue } from '$lib/types/design-relation';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createResponse(data: unknown, ok = true) {
	return {
		ok,
		json: () => Promise.resolve(data)
	};
}

function createIssue(overrides: Partial<RelationIssue> = {}): RelationIssue {
	return {
		issueId: 'issue-1',
		relationId: 'TABLE_COLUMN_MAPPING',
		relationName: '테이블 -> 컬럼',
		severity: 'error',
		sourceType: 'table',
		targetType: 'column',
		sourceId: 'table-1',
		sourceLabel: '사용자',
		targetId: 'column-1',
		targetLabel: 'USER_NM',
		expectedKey: '회원.public.TB_USER.사용자',
		actualKey: '회원.public.TB_USER.고객',
		reason: '연관 엔터티명이 테이블 정의서와 다릅니다.',
		message: '컬럼 관계가 테이블 정의서와 일치하지 않습니다.',
		field: 'relatedEntityName',
		affectedRows: [],
		manualTargets: [
			{
				targetType: 'column',
				targetId: 'column-1',
				targetLabel: 'USER_NM',
				field: 'relatedEntityName'
			}
		],
		candidates: [
			{
				candidateId: 'candidate-a',
				issueId: 'issue-1',
				targetType: 'column',
				targetId: 'column-1',
				targetLabel: 'USER_NM',
				patch: {
					targetType: 'column',
					targetId: 'column-1',
					fields: { relatedEntityName: '사용자' }
				},
				reason: '테이블 정의서 기준',
				confidence: 'high',
				previewText: '컬럼 정의서를 사용자로 변경합니다.',
				autoFixable: true
			},
			{
				candidateId: 'candidate-b',
				issueId: 'issue-1',
				targetType: 'table',
				targetId: 'table-1',
				targetLabel: 'TB_USER',
				patch: {
					targetType: 'table',
					targetId: 'table-1',
					fields: { relatedEntityName: '고객' }
				},
				reason: '컬럼 정의서 기준',
				confidence: 'medium',
				previewText: '테이블 정의서를 고객으로 변경합니다.',
				autoFixable: true
			}
		],
		autoFixable: true,
		actionGuide: '후보 정의서를 선택한 뒤 미리보기 또는 자동 수정을 실행하세요.',
		...overrides
	};
}

function createValidation(
	issues: RelationIssue[] = [createIssue()]
): DesignRelationValidationResult {
	return {
		specs: [],
		rules: [],
		summaries: [
			{
				relationId: 'TABLE_COLUMN_MAPPING',
				relationName: '테이블 -> 컬럼',
				totalChecked: 1,
				matched: 0,
				unmatched: issues.length,
				severity: 'error',
				mappingKey: '주제영역+schema+테이블영문명+관련엔터티명',
				issues
			}
		],
		issues,
		totals: {
			totalChecked: 1,
			matched: 0,
			unmatched: issues.length,
			errorCount: issues.length,
			warningCount: 0,
			failedCount: issues.length,
			passedCount: 0,
			totalIssues: issues.length,
			autoFixableCount: issues.filter((issue) => issue.autoFixable).length
		}
	};
}

function renderPanel(props = {}) {
	return render(DesignRelationValidationPanel, {
		props: {
			open: true,
			definitionType: 'column',
			currentFile: 'column-a.json',
			validation: createValidation(),
			...props
		}
	});
}

describe('DesignRelationValidationPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
			const body = JSON.parse(String(init?.body || '{}'));
			return createResponse({
				success: true,
				data: {
					issueId: body.issueId,
					candidateId: body.candidateId,
					patch: {
						targetType: 'column',
						targetId: 'column-1',
						fields: { relatedEntityName: '사용자' }
					},
					previewText: `서버 미리보기: ${body.candidateId}`,
					actionGuide: '서버 조치 가이드',
					apply: {
						issueId: body.issueId,
						candidateId: body.candidateId,
						applied: true,
						updatedEntryId: 'column-1',
						patch: {
							targetType: 'column',
							targetId: 'column-1',
							fields: { relatedEntityName: '사용자' }
						}
					}
				}
			});
		});
	});

	it('renders relation statistics, targets, and manual-only guidance', async () => {
		const manualIssue = createIssue({
			issueId: 'issue-2',
			targetId: 'column-2',
			targetLabel: 'ORDER_ID',
			candidates: [
				{
					candidateId: 'manual-candidate',
					issueId: 'issue-2',
					targetType: 'column',
					targetId: 'column-2',
					targetLabel: 'ORDER_ID',
					patch: {
						targetType: 'column',
						targetId: 'column-2',
						fields: {}
					},
					reason: '수동 확인 후보',
					confidence: 'low',
					previewText: 'PK/FK 값을 수동 확인하세요.',
					autoFixable: false
				}
			],
			autoFixable: false
		});
		renderPanel({
			validation: createValidation([createIssue(), manualIssue])
		});

		const dialog = screen.getByRole('dialog', { name: '정의서 관계 유효성 검사 결과' });
		expect(dialog).toHaveTextContent('전체 1개 중 0개 통과, 2개 실패');
		expect(dialog).toHaveTextContent('컬럼 정의서 · column-a.json');
		expect(dialog).toHaveTextContent('조치 대상 선택');
		expect(dialog).toHaveTextContent('회원.public.TB_USER.사용자');
		expect(dialog).toHaveTextContent('회원.public.TB_USER.고객');

		const manualCard = screen.getByText('ORDER_ID').closest('.rounded-lg');
		expect(manualCard).not.toBeNull();
		await fireEvent.change(within(manualCard as HTMLElement).getByLabelText('조치 대상 선택'), {
			target: { value: 'manual-candidate' }
		});
		expect(manualCard as HTMLElement).toHaveTextContent('PK/FK 값을 수동 확인하세요.');
		expect(
			within(manualCard as HTMLElement).queryByRole('button', { name: /수정 미리보기/ })
		).not.toBeInTheDocument();
		expect(
			within(manualCard as HTMLElement).queryByRole('button', { name: /자동 수정/ })
		).not.toBeInTheDocument();
		expect(
			within(manualCard as HTMLElement).getByRole('button', { name: '수동 수정' })
		).toBeInTheDocument();
	});

	it('updates action guide by selected target without calling preview endpoint', async () => {
		renderPanel();

		expect(screen.queryByRole('button', { name: /수정 미리보기/ })).not.toBeInTheDocument();
		expect(screen.getByText('컬럼 정의서를 사용자로 변경합니다.')).toBeInTheDocument();

		await fireEvent.change(screen.getByLabelText('조치 대상 선택'), {
			target: { value: 'candidate-b' }
		});

		expect(screen.getByText('테이블 정의서를 고객으로 변경합니다.')).toBeInTheDocument();
		expect(screen.getByText('선택 근거: 컬럼 정의서 기준')).toBeInTheDocument();
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('defaults to the most direct create target before auto patch targets', () => {
		const baseIssue = createIssue();
		const createFirstIssue = createIssue({
			resolutionTargets: [
				{
					resolutionTargetId: 'create-table-target',
					targetType: 'table',
					targetLabel: 'TB_USER',
					mode: 'create',
					autoFixable: false,
					reason: '컬럼이 참조하는 테이블을 먼저 추가해야 합니다.',
					previewText: 'TB_USER 항목을 테이블 정의서에 신규 추가합니다.',
					prefill: { tableEnglishName: 'TB_USER' }
				},
				{
					resolutionTargetId: 'auto-column-target',
					targetType: 'column',
					targetId: 'column-1',
					targetLabel: 'USER_NM',
					mode: 'auto_patch',
					candidateId: 'candidate-a',
					patch: baseIssue.candidates[0].patch,
					autoFixable: true,
					reason: '테이블 정의서 기준',
					previewText: '컬럼 정의서를 사용자로 변경합니다.'
				}
			]
		});
		renderPanel({ validation: createValidation([createFirstIssue]) });

		const select = screen.getByLabelText('조치 대상 선택') as HTMLSelectElement;
		expect(select.value).toBe('create-table-target');
		expect(screen.getByText('TB_USER 항목을 테이블 정의서에 신규 추가합니다.')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /자동 수정/ })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: '신규 추가' })).toBeInTheDocument();
	});

	it('emits autofix after selected candidate apply succeeds', async () => {
		const onautofix = vi.fn();
		renderPanel({ onautofix });

		await fireEvent.change(screen.getByLabelText('조치 대상 선택'), {
			target: { value: 'candidate-a' }
		});
		await fireEvent.click(screen.getByRole('button', { name: /자동 수정/ }));

		await waitFor(() => {
			expect(onautofix).toHaveBeenCalledWith(
				expect.objectContaining({
					issueId: 'issue-1',
					candidateId: 'candidate-a',
					resolutionTargetId: 'candidate-a',
					result: expect.objectContaining({ applied: true })
				})
			);
		});
	});

	it('filters issues by involved definition type instead of targetType only', () => {
		const relatedIssue = createIssue({
			issueId: 'issue-related',
			targetType: 'entity',
			targetId: 'entity-1',
			targetLabel: '회원',
			involvedTypes: ['database', 'entity'],
			participants: [
				{ type: 'database', label: 'LDB_MAIN', role: 'source' },
				{ type: 'entity', id: 'entity-1', label: '회원', role: 'target' }
			],
			resolutionTargets: [
				{
					resolutionTargetId: 'rt-database-create',
					targetType: 'database',
					targetLabel: 'LDB_MAIN',
					mode: 'create',
					autoFixable: false,
					reason: 'DB 생성',
					previewText: '데이터베이스 정의서를 신규 추가합니다.',
					prefill: { logicalDbName: 'LDB_MAIN' }
				}
			]
		});
		const unrelatedIssue = createIssue({
			issueId: 'issue-unrelated',
			targetType: 'column',
			targetLabel: 'USER_NM',
			involvedTypes: ['table', 'column']
		});

		renderPanel({
			definitionType: 'database',
			validation: createValidation([relatedIssue, unrelatedIssue])
		});

		expect(screen.getByText('회원')).toBeInTheDocument();
		expect(screen.queryByText('USER_NM')).not.toBeInTheDocument();
		expect(screen.getByText(/데이터베이스 정의서를 신규 추가합니다/)).toBeInTheDocument();
	});

	it('emits manual edit target details', async () => {
		const onedit = vi.fn();
		renderPanel({ onedit });

		const issueCard = screen.getByText('USER_NM').closest('.rounded-lg');
		expect(issueCard).not.toBeNull();
		await fireEvent.click(
			within(issueCard as HTMLElement).getByRole('button', { name: '수동 수정' })
		);

		expect(onedit).toHaveBeenCalledWith(
			expect.objectContaining({
				issueId: 'issue-1',
				targetType: 'column',
				targetId: 'column-1'
			})
		);
	});

	it('emits close when the dismiss control is clicked', async () => {
		const onclose = vi.fn();
		renderPanel({ onclose });

		await fireEvent.click(screen.getByRole('button', { name: '닫기' }));

		expect(onclose).toHaveBeenCalledTimes(1);
	});
});
