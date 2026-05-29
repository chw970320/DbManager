import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import TermValidationPanel from './TermValidationPanel.svelte';
import type { AutoFixSuggestion, ValidationResult } from '$lib/types/term';

const autoFixSuggestion: AutoFixSuggestion = {
	termName: '사용자명',
	columnName: 'USER_NM',
	reason: '용어명과 컬럼명 표준화를 적용합니다.',
	actionType: 'FIX_TERM_NAME'
};

const createMockValidationResults = (): ValidationResult[] => [
	{
		entry: {
			id: 'entry-1',
			termName: '사용자_이름',
			columnName: 'USER_NAME',
			domainName: '사용자분류_VARCHAR(50)',
			isMappedTerm: true,
			isMappedColumn: true,
			isMappedDomain: true,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		errors: [
			{
				type: 'TERM_NAME_MAPPING',
				message: '용어명의 일부가 단어집에 없습니다.'
			}
		],
		suggestions: autoFixSuggestion
	},
	{
		entry: {
			id: 'entry-2',
			termName: '관리자_이름',
			columnName: 'ADMIN_NAME',
			domainName: '관리자분류_VARCHAR(50)',
			isMappedTerm: true,
			isMappedColumn: true,
			isMappedDomain: true,
			createdAt: '2024-01-02T00:00:00.000Z',
			updatedAt: '2024-01-02T00:00:00.000Z'
		},
		errors: []
	}
];

function renderOpenPanel(props = {}) {
	return render(TermValidationPanel, {
		props: {
			results: createMockValidationResults(),
			totalCount: 2,
			failedCount: 1,
			passedCount: 1,
			open: true,
			...props
		}
	});
}

describe('TermValidationPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders validation statistics, progress, and result context when open', () => {
		renderOpenPanel();

		const dialog = screen.getByRole('dialog', { name: '유효성 검사 결과' });
		expect(dialog).toHaveTextContent('전체 2개 중 1개 통과, 1개 실패');
		expect(dialog).toHaveTextContent('진행률');
		expect(dialog).toHaveTextContent('50%');
		expect(dialog).toHaveTextContent('표시 중: 2개 / 전체: 2개');
		expect(dialog).toHaveTextContent('사용자_이름');
		expect(dialog).toHaveTextContent('관리자_이름');
		expect(dialog).toHaveTextContent('용어명 매핑');
		expect(dialog).toHaveTextContent('수정 가이드');
	});

	it('filters results by validation error type', async () => {
		renderOpenPanel();

		await fireEvent.change(screen.getByLabelText('오류 유형'), {
			target: { value: 'TERM_NAME_MAPPING' }
		});

		await waitFor(() => {
			expect(screen.getByText('사용자_이름')).toBeInTheDocument();
			expect(screen.queryByText('관리자_이름')).not.toBeInTheDocument();
		});
		expect(screen.getByText('표시 중: 1개 / 전체: 2개')).toBeInTheDocument();
	});

	it('filters results by search query across term, column, domain, and error text', async () => {
		renderOpenPanel();

		await fireEvent.input(screen.getByLabelText('검색'), { target: { value: 'ADMIN_NAME' } });

		await waitFor(() => {
			expect(screen.getByText('관리자_이름')).toBeInTheDocument();
			expect(screen.queryByText('사용자_이름')).not.toBeInTheDocument();
		});
		expect(screen.getByText('표시 중: 1개 / 전체: 2개')).toBeInTheDocument();
	});

	it('emits edit details with the selected entry and available suggestions', async () => {
		const onedit = vi.fn();
		renderOpenPanel({ onedit });

		await fireEvent.click(screen.getAllByRole('button', { name: '용어 수정' })[0]);

		expect(onedit).toHaveBeenCalledWith({
			entryId: 'entry-1',
			suggestions: autoFixSuggestion
		});
	});

	it('emits autofix details only when a result has a safe suggestion action', async () => {
		const onautofix = vi.fn();
		renderOpenPanel({ onautofix });

		const firstResultCard = screen.getByText('사용자_이름').closest('.rounded-lg');
		expect(firstResultCard).not.toBeNull();

		await fireEvent.click(
			within(firstResultCard as HTMLElement).getByRole('button', { name: '자동 수정' })
		);

		expect(onautofix).toHaveBeenCalledWith(
			expect.objectContaining({
				entryId: 'entry-1',
				suggestions: autoFixSuggestion,
				result: expect.objectContaining({
					entry: expect.objectContaining({ id: 'entry-1' })
				})
			})
		);
		expect(screen.getAllByRole('button', { name: '자동 수정' })).toHaveLength(1);
	});

	it('emits close when the dismiss control is clicked', async () => {
		const onclose = vi.fn();
		renderOpenPanel({ onclose });

		await fireEvent.click(screen.getByRole('button', { name: '닫기' }));

		expect(onclose).toHaveBeenCalledTimes(1);
	});
});
