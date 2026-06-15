import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import DesignRelationValidationPanel from './DesignRelationValidationPanel.svelte';
import type { DesignRelationValidationResult, RelationIssue } from '$lib/types/design-relation';

const { mockShowConfirm } = vi.hoisted(() => ({
	mockShowConfirm: vi.fn()
}));

vi.mock('$lib/stores/confirm-store.js', () => ({
	showConfirm: mockShowConfirm
}));

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
		mockShowConfirm.mockResolvedValue(true);
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
		expect(dialog).toHaveTextContent('검증 진행률');
		expect(dialog).toHaveTextContent('0%');
		expect(dialog).toHaveTextContent('표시 중: 2개 / 전체: 2개');
		expect(dialog).not.toHaveTextContent('현재 검증 기준');
		expect(dialog).not.toHaveTextContent('column-a.json');
		expect(dialog).not.toHaveTextContent('자동 수정 가능');
		expect(dialog).toHaveTextContent('조치 대상 선택');
		expect(dialog).toHaveTextContent('회원.public.TB_USER.사용자');
		expect(dialog).toHaveTextContent('회원.public.TB_USER.고객');
		const keyComparisonGrid = screen.getAllByText('회원.public.TB_USER.사용자')[0].closest('.grid');
		expect(keyComparisonGrid).not.toBeNull();
		expect(keyComparisonGrid as HTMLElement).toHaveClass('grid-cols-1');
		expect(keyComparisonGrid as HTMLElement).not.toHaveClass('sm:grid-cols-2');

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
			expect(mockShowConfirm).toHaveBeenCalledWith({
				title: '정의서 관계 자동 수정',
				message: '선택한 조치 대상에 자동 수정 내용을 적용하시겠습니까?',
				confirmText: '자동 수정'
			});
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/validation/design-relations/apply',
				expect.objectContaining({
					method: 'POST',
					body: expect.stringContaining('"resolutionTargetId":"candidate-a"')
				})
			);
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

	it('does not apply autofix when confirmation is cancelled', async () => {
		mockShowConfirm.mockResolvedValueOnce(false);
		const onautofix = vi.fn();
		renderPanel({ onautofix });

		await fireEvent.click(screen.getByRole('button', { name: /자동 수정/ }));

		await waitFor(() => {
			expect(mockShowConfirm).toHaveBeenCalledWith({
				title: '정의서 관계 자동 수정',
				message: '선택한 조치 대상에 자동 수정 내용을 적용하시겠습니까?',
				confirmText: '자동 수정'
			});
		});
		expect(mockFetch).not.toHaveBeenCalled();
		expect(onautofix).not.toHaveBeenCalled();
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

	it('renders user-recognizable problem location identity without exposing row ids', () => {
		const attributeKeyIssue = createIssue({
			issueId: 'issue-attribute-key',
			relationId: 'ATTRIBUTE_COLUMN_KEY',
			relationName: '속성 -> 컬럼 키',
			severity: 'warning',
			sourceType: 'attribute',
			targetType: 'attribute',
			targetId: 'attr-eol-39',
			targetLabel: 'EOL_아이디',
			expectedKey: 'requiredInput=Y; pkInfo=Y',
			actualKey: '',
			reason: '필수입력 속성에 대응하는 컬럼 PK정보를 확인해야 합니다.',
			message: '필수입력 속성에 대응하는 컬럼 PK정보를 확인해야 합니다.',
			field: 'pkInfo',
			involvedTypes: ['attribute', 'column'],
			participants: [
				{
					type: 'attribute',
					id: 'attr-eol-39',
					label: 'EOL_아이디',
					role: 'source',
					identityFields: [
						{ key: 'schemaName', label: 'schema', value: 'BIOMIMICRY' },
						{ key: 'entityName', label: '엔터티명', value: '생태문헌' },
						{ key: 'attributeName', label: '속성명', value: 'EOL_아이디' }
					]
				},
				{
					type: 'column',
					id: 'column-eol-39',
					label: 'EOL_ID',
					role: 'target',
					identityFields: [
						{ key: 'schemaName', label: 'schema', value: 'BIOMIMICRY' },
						{ key: 'tableEnglishName', label: '테이블영문명', value: 'TBL_ECLGY_DOC' },
						{ key: 'columnEnglishName', label: '컬럼영문명', value: 'EOL_ID' }
					]
				}
			]
		});
		renderPanel({
			definitionType: 'attribute',
			validation: createValidation([attributeKeyIssue])
		});

		const card = screen.getAllByText('EOL_아이디')[0].closest('.rounded-lg');
		expect(card).not.toBeNull();
		expect(
			within(card as HTMLElement).getByRole('region', { name: '문제 위치' })
		).toBeInTheDocument();
		expect(within(card as HTMLElement).getByText('정의서 최소 식별 키')).toBeInTheDocument();
		expect(within(card as HTMLElement).getByText('속성 정의서')).toBeInTheDocument();
		expect(within(card as HTMLElement).getByText('컬럼 정의서')).toBeInTheDocument();
		expect(within(card as HTMLElement).getByText('생태문헌')).toBeInTheDocument();
		expect(within(card as HTMLElement).getByText('TBL_ECLGY_DOC')).toBeInTheDocument();
		expect(card as HTMLElement).not.toHaveTextContent('attr-eol-39');
		expect(card as HTMLElement).not.toHaveTextContent('column-eol-39');
	});

	it('emits manual edit target details', async () => {
		const onedit = vi.fn();
		const onclose = vi.fn();
		renderPanel({ onedit, onclose });

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
		expect(onclose).not.toHaveBeenCalled();
	});

	it('emits close when the dismiss control is clicked', async () => {
		const onclose = vi.fn();
		renderPanel({ onclose });

		await fireEvent.click(screen.getByRole('button', { name: '닫기' }));

		expect(onclose).toHaveBeenCalledTimes(1);
	});
});
