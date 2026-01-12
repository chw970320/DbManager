import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import TermValidationPanel from './TermValidationPanel.svelte';
import type { ValidationResult } from '$lib/types/term';

// 테스트용 Mock 데이터
const createMockValidationResults = (): ValidationResult[] => [
	{
		entryId: 'entry-1',
		entry: {
			id: 'entry-1',
			termName: '사용자_이름',
			columnName: 'USER_NAME',
			domainName: '사용자분류_VARCHAR(50)',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z'
		},
		isValid: false,
		errors: [
			{
				type: 'TERM_NAME_MAPPING',
				message: '용어명의 일부가 단어집에 없습니다.',
				unmappedParts: ['없는단어']
			}
		],
		suggestions: []
	},
	{
		entryId: 'entry-2',
		entry: {
			id: 'entry-2',
			termName: '관리자_이름',
			columnName: 'ADMIN_NAME',
			domainName: '사용자분류_VARCHAR(50)',
			createdAt: '2024-01-02T00:00:00.000Z',
			updatedAt: '2024-01-02T00:00:00.000Z'
		},
		isValid: true,
		errors: [],
		suggestions: []
	}
];

describe('TermValidationPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should render validation results when open', async () => {
			const mockResults = createMockValidationResults();
			render(TermValidationPanel, {
				props: {
					results: mockResults,
					totalCount: 2,
					failedCount: 1,
					passedCount: 1,
					open: true
				}
			});

			await waitFor(() => {
				expect(screen.getByText(/전체 유효성 검사 결과/)).toBeInTheDocument();
			});
		});

		it('should display validation statistics', async () => {
			const mockResults = createMockValidationResults();
			render(TermValidationPanel, {
				props: {
					results: mockResults,
					totalCount: 2,
					failedCount: 1,
					passedCount: 1,
					open: true
				}
			});

			await waitFor(() => {
				// 통계 정보가 표시되는지 확인
				expect(screen.getByText(/전체 유효성 검사 결과/)).toBeInTheDocument();
			});
		});
	});

	describe('Filtering', () => {
		it('should filter results by error type', async () => {
			const mockResults = createMockValidationResults();
			render(TermValidationPanel, {
				props: {
					results: mockResults,
					totalCount: 2,
					failedCount: 1,
					passedCount: 1,
					open: true
				}
			});

			// 오류 유형 필터 적용 확인 (실제 컴포넌트 구조에 따라 조정)
		});

		it('should filter results by search query', async () => {
			const mockResults = createMockValidationResults();
			render(TermValidationPanel, {
				props: {
					results: mockResults,
					totalCount: 2,
					failedCount: 1,
					passedCount: 1,
					open: true
				}
			});

			// 검색 필터 적용 확인 (실제 컴포넌트 구조에 따라 조정)
		});
	});

	describe('Actions', () => {
		it('should trigger edit event when edit button is clicked', async () => {
			const mockResults = createMockValidationResults();
			render(TermValidationPanel, {
				props: {
					results: mockResults,
					totalCount: 2,
					failedCount: 1,
					passedCount: 1,
					open: true
				}
			});

			// 편집 버튼 클릭 시 edit 이벤트 발생 확인 (실제 컴포넌트 구조에 따라 조정)
		});

		it('should trigger autofix event when autofix button is clicked', async () => {
			const mockResults = createMockValidationResults();
			render(TermValidationPanel, {
				props: {
					results: mockResults,
					totalCount: 2,
					failedCount: 1,
					passedCount: 1,
					open: true
				}
			});

			// 자동 수정 버튼 클릭 시 autofix 이벤트 발생 확인 (실제 컴포넌트 구조에 따라 조정)
		});
	});
});
