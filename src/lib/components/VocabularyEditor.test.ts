import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import VocabularyEditor from './VocabularyEditor.svelte';
import type { VocabularyEntry } from '$lib/types/vocabulary';

const { mockShowConfirm } = vi.hoisted(() => ({
	mockShowConfirm: vi.fn()
}));
vi.mock('$lib/stores/confirm-store', () => ({
	showConfirm: mockShowConfirm
}));

// Mock fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
	value: {
		randomUUID: vi.fn(() => 'test-uuid-1234')
	}
});

// 테스트용 Mock 데이터
const createMockEntry = (): Partial<VocabularyEntry> => ({
	id: 'entry-1',
	standardName: '사용자',
	abbreviation: 'USER',
	englishName: 'User',
	description: '시스템 사용자',
	domainCategory: '',
	isFormalWord: false,
	synonyms: ['고객'],
	forbiddenWords: ['테스트'],
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z'
});

describe('VocabularyEditor', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockShowConfirm.mockResolvedValue(true);

		// Default fetch mock responses
		mockFetch.mockImplementation((url: string) => {
			if (url.includes('/api/vocabulary/files/mapping')) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							success: true,
							data: { mapping: { domain: 'domain.json' } }
						})
				});
			}
			if (url.includes('/api/domain/filter-options')) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							success: true,
							data: { domainCategory: ['금융', '의료', '교육'] }
						})
				});
			}
			if (url.includes('/api/vocabulary/validate')) {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ success: true })
				});
			}
			return Promise.resolve({
				ok: false,
				json: () => Promise.resolve({ success: false })
			});
		});
	});

	describe('Rendering', () => {
		it('should render modal with "새 단어 추가" title when not in edit mode', async () => {
			render(VocabularyEditor, { props: {} });

			expect(screen.getByText('새 단어 추가')).toBeInTheDocument();
		});

		it('should render modal with "단어 수정" title when in edit mode', async () => {
			render(VocabularyEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			expect(screen.getByText('단어 수정')).toBeInTheDocument();
		});

		it('should display required field labels', async () => {
			render(VocabularyEditor, { props: {} });

			expect(screen.getByLabelText(/표준단어명/)).toBeInTheDocument();
			expect(screen.getByLabelText(/영문약어/)).toBeInTheDocument();
			expect(screen.getByLabelText(/영문명/)).toBeInTheDocument();
		});

		it('should display optional field labels', async () => {
			render(VocabularyEditor, { props: {} });

			expect(screen.getByLabelText(/설명/)).toBeInTheDocument();
			expect(screen.getByLabelText(/이음동의어/)).toBeInTheDocument();
			expect(screen.getByLabelText(/금칙어/)).toBeInTheDocument();
		});

		it('should populate form with entry data in edit mode', async () => {
			const mockEntry = createMockEntry();
			render(VocabularyEditor, {
				props: {
					entry: mockEntry,
					isEditMode: true
				}
			});

			await waitFor(() => {
				const standardNameInput = screen.getByLabelText(/표준단어명/) as HTMLInputElement;
				expect(standardNameInput.value).toBe(mockEntry.standardName);
			});
		});

		it('should show server error message when provided', async () => {
			const errorMessage = '서버 오류가 발생했습니다.';
			render(VocabularyEditor, {
				props: {
					serverError: errorMessage
				}
			});

			expect(screen.getByText(errorMessage)).toBeInTheDocument();
		});
	});

	describe('Form Validation', () => {
		it('should disable save button when required fields are empty', async () => {
			render(VocabularyEditor, { props: {} });

			const saveButton = screen.getByRole('button', { name: /저장/ });
			expect(saveButton).toBeDisabled();
		});

		it('should enable save button when all required fields are filled', async () => {
			render(VocabularyEditor, { props: {} });

			const standardNameInput = screen.getByLabelText(/표준단어명/) as HTMLInputElement;
			const abbreviationInput = screen.getByLabelText(/영문약어/) as HTMLInputElement;
			const englishNameInput = screen.getByLabelText(/영문명/) as HTMLInputElement;

			await fireEvent.input(standardNameInput, { target: { value: '테스트' } });
			await fireEvent.input(abbreviationInput, { target: { value: 'TEST' } });
			await fireEvent.input(englishNameInput, { target: { value: 'Test' } });

			await waitFor(() => {
				const saveButton = screen.getByRole('button', { name: /저장/ });
				expect(saveButton).not.toBeDisabled();
			});
		});

		it('should show error message for empty required field after input and clear', async () => {
			render(VocabularyEditor, { props: {} });

			const standardNameInput = screen.getByLabelText(/표준단어명/) as HTMLInputElement;

			await fireEvent.input(standardNameInput, { target: { value: '테스트' } });
			await fireEvent.input(standardNameInput, { target: { value: '' } });

			await waitFor(() => {
				expect(screen.getByText(/표준단어명은 필수 입력 항목입니다/)).toBeInTheDocument();
			});
		});
	});

	describe('Edit Mode Behavior', () => {
		it('should disable standardName, abbreviation, englishName inputs in edit mode', async () => {
			render(VocabularyEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			await waitFor(() => {
				const standardNameInput = screen.getByLabelText(/표준단어명/) as HTMLInputElement;
				const abbreviationInput = screen.getByLabelText(/영문약어/) as HTMLInputElement;
				const englishNameInput = screen.getByLabelText(/영문명/) as HTMLInputElement;

				expect(standardNameInput).toBeDisabled();
				expect(abbreviationInput).toBeDisabled();
				expect(englishNameInput).toBeDisabled();
			});
		});

		it('should show delete button in edit mode', async () => {
			render(VocabularyEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			expect(screen.getByRole('button', { name: /삭제/ })).toBeInTheDocument();
		});

		it('should not show delete button in create mode', async () => {
			render(VocabularyEditor, { props: {} });

			expect(screen.queryByRole('button', { name: /삭제/ })).not.toBeInTheDocument();
		});

		it('should show "수정" button text in edit mode', async () => {
			render(VocabularyEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			expect(screen.getByRole('button', { name: /수정/ })).toBeInTheDocument();
		});
	});

	describe('User Interactions', () => {
		it('should have cancel button that can be clicked', async () => {
			render(VocabularyEditor, { props: {} });

			const cancelButton = screen.getByRole('button', { name: /취소/ });
			expect(cancelButton).toBeInTheDocument();
			expect(cancelButton).not.toBeDisabled();
		});

		it('should have close icon button that can be clicked', async () => {
			render(VocabularyEditor, { props: {} });

			// 닫기 버튼 (X 아이콘)을 aria-label로 정확히 찾음
			const closeButton = screen.getByRole('button', { name: '닫기' });
			expect(closeButton).toBeInTheDocument();
			expect(closeButton).not.toBeDisabled();
		});

		it('should show confirm dialog when delete button is clicked', async () => {
			const mockEntry = createMockEntry();
			render(VocabularyEditor, {
				props: {
					entry: mockEntry,
					isEditMode: true
				}
			});

			const deleteButton = screen.getByRole('button', { name: /삭제/ });
			await fireEvent.click(deleteButton);

			expect(mockShowConfirm).toHaveBeenCalledWith(
				expect.objectContaining({
					title: '삭제 확인',
					message: '정말로 이 항목을 삭제하시겠습니까?',
					confirmText: '삭제',
					variant: 'danger'
				})
			);
		});
	});

	describe('Domain Category', () => {
		it('should load domain category options on mount', async () => {
			render(VocabularyEditor, { props: {} });

			await waitFor(() => {
				expect(mockFetch).toHaveBeenCalledWith(
					expect.stringContaining('/api/vocabulary/files/mapping')
				);
				expect(mockFetch).toHaveBeenCalledWith(
					expect.stringContaining('/api/domain/filter-options')
				);
			});
		});

		it('should disable domain category select when isFormalWord is false', async () => {
			render(VocabularyEditor, { props: {} });

			await waitFor(() => {
				const domainCategorySelect = screen.getByLabelText(/도메인분류명/) as HTMLSelectElement;
				expect(domainCategorySelect).toBeDisabled();
			});
		});
	});
});
