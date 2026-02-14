import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import DomainEditor from './DomainEditor.svelte';
import type { DomainEntry } from '$lib/types/domain';

// Mock fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
	value: {
		randomUUID: vi.fn(() => 'test-uuid-1234')
	}
});

// Mock alert and confirm
global.alert = vi.fn();
global.confirm = vi.fn(() => true);

// 테스트용 Mock 데이터
const createMockEntry = (): Partial<DomainEntry> => ({
	id: 'entry-1',
	domainGroup: '공통표준도메인그룹',
	domainCategory: '사용자분류',
	standardDomainName: '사용자분류_VARCHAR(50)',
	physicalDataType: 'VARCHAR',
	dataLength: '50',
	description: '시스템 사용자 분류 도메인',
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z'
});

describe('DomainEditor', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default fetch mock responses
		mockFetch.mockImplementation((url: string) => {
			if (url.includes('/api/domain/validate')) {
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
		it('should render modal with "새 도메인 추가" title when not in edit mode', async () => {
			render(DomainEditor, { props: {} });

			expect(screen.getByText('새 도메인 추가')).toBeInTheDocument();
		});

		it('should render modal with "도메인 수정" title when in edit mode', async () => {
			render(DomainEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			expect(screen.getByText('도메인 수정')).toBeInTheDocument();
		});

		it('should display required field labels', async () => {
			render(DomainEditor, { props: {} });

			expect(screen.getByLabelText(/도메인그룹/)).toBeInTheDocument();
			expect(screen.getByLabelText(/도메인 분류명/)).toBeInTheDocument();
			expect(screen.getByLabelText(/물리 데이터타입/)).toBeInTheDocument();
		});

		it('should display optional field labels', async () => {
			render(DomainEditor, { props: {} });

			expect(screen.getByLabelText(/설명/)).toBeInTheDocument();
			expect(screen.getByLabelText(/데이터 길이/)).toBeInTheDocument();
			expect(screen.getByLabelText(/소수점자리수/)).toBeInTheDocument();
		});

		it('should populate form with entry data in edit mode', async () => {
			const mockEntry = createMockEntry();
			render(DomainEditor, {
				props: {
					entry: mockEntry,
					isEditMode: true
				}
			});

			await waitFor(() => {
				const domainGroupInput = screen.getByLabelText(/도메인그룹/) as HTMLInputElement;
				expect(domainGroupInput.value).toBe(mockEntry.domainGroup);
			});
		});

		it('should show server error message when provided', async () => {
			const errorMessage = '서버 오류가 발생했습니다.';
			render(DomainEditor, {
				props: {
					serverError: errorMessage
				}
			});

			expect(screen.getByText(errorMessage)).toBeInTheDocument();
		});
	});

	describe('Form Validation', () => {
		it('should disable save button when required fields are empty', async () => {
			render(DomainEditor, { props: {} });

			const saveButton = screen.getByRole('button', { name: /저장/ });
			expect(saveButton).toBeDisabled();
		});

		it('should enable save button when all required fields are filled', async () => {
			render(DomainEditor, { props: {} });

			const domainGroupInput = screen.getByLabelText(/도메인그룹/) as HTMLInputElement;
			const domainCategoryInput = screen.getByLabelText(/도메인 분류명/) as HTMLInputElement;
			const physicalDataTypeInput = screen.getByLabelText(/물리 데이터타입/) as HTMLInputElement;

			await fireEvent.input(domainGroupInput, { target: { value: '공통표준도메인그룹' } });
			await fireEvent.input(domainCategoryInput, { target: { value: '테스트분류' } });
			await fireEvent.input(physicalDataTypeInput, { target: { value: 'VARCHAR' } });

			await waitFor(() => {
				const saveButton = screen.getByRole('button', { name: /저장/ });
				expect(saveButton).not.toBeDisabled();
			});
		});

		it('should show error message for empty required field after input and clear', async () => {
			render(DomainEditor, { props: {} });

			const domainGroupInput = screen.getByLabelText(/도메인그룹/) as HTMLInputElement;

			await fireEvent.input(domainGroupInput, { target: { value: '공통표준도메인그룹' } });
			await fireEvent.input(domainGroupInput, { target: { value: '' } });

			await waitFor(() => {
				expect(screen.getByText(/도메인그룹은 필수 입력 항목입니다/)).toBeInTheDocument();
			});
		});
	});

	describe('Edit Mode Behavior', () => {
		it('should disable domainGroup input in edit mode', async () => {
			render(DomainEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			await waitFor(() => {
				const domainGroupInput = screen.getByLabelText(/도메인그룹/) as HTMLInputElement;
				expect(domainGroupInput).toBeDisabled();
			});
		});

		it('should show delete button in edit mode', async () => {
			render(DomainEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			expect(screen.getByRole('button', { name: /삭제/ })).toBeInTheDocument();
		});

		it('should not show delete button in create mode', async () => {
			render(DomainEditor, { props: {} });

			expect(screen.queryByRole('button', { name: /삭제/ })).not.toBeInTheDocument();
		});

		it('should show "수정" button text in edit mode', async () => {
			render(DomainEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			const submitButton = screen.getByRole('button', { name: /^수정$/ });
			expect(submitButton).toBeInTheDocument();
			expect((submitButton as HTMLButtonElement).type).toBe('submit');
		});
	});

	describe('User Interactions', () => {
		it('should have cancel button that can be clicked', async () => {
			render(DomainEditor, { props: {} });

			const cancelButton = screen.getByRole('button', { name: /취소/ });
			expect(cancelButton).toBeInTheDocument();
			expect(cancelButton).not.toBeDisabled();
		});

		it('should have close icon button that can be clicked', async () => {
			render(DomainEditor, { props: {} });

			// 닫기 버튼 (X 아이콘)을 aria-label로 찾음
			const closeButton = screen.getByRole('button', { name: /닫기/ });
			expect(closeButton).toBeInTheDocument();
			expect(closeButton).not.toBeDisabled();
		});

		it('should show confirm dialog when delete button is clicked', async () => {
			const mockEntry = createMockEntry();
			render(DomainEditor, {
				props: {
					entry: mockEntry,
					isEditMode: true
				}
			});

			const deleteButton = screen.getByRole('button', { name: /삭제/ });
			await fireEvent.click(deleteButton);

			expect(global.confirm).toHaveBeenCalled();
		});
	});
});
