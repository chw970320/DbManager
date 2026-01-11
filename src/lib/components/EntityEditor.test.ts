import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import EntityEditor from './EntityEditor.svelte';
import type { EntityEntry } from '$lib/types/database-design';

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
const createMockEntry = (): Partial<EntityEntry> => ({
	id: 'entry-1',
	logicalDbName: '논리DB1',
	schemaName: '스키마1',
	entityName: '엔터티1',
	primaryIdentifier: 'ID1',
	tableKoreanName: '테이블한글명1',
	entityDescription: '엔터티 설명1',
	superTypeEntityName: '수퍼타입1',
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z'
});

describe('EntityEditor', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should render modal with "새 엔터티 정의서" title when not in edit mode', async () => {
			render(EntityEditor, { props: {} });

			expect(screen.getByText('새 엔터티 정의서')).toBeInTheDocument();
		});

		it('should render modal with "엔터티 정의서 수정" title when in edit mode', async () => {
			render(EntityEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			expect(screen.getByText('엔터티 정의서 수정')).toBeInTheDocument();
		});

		it('should display required field labels', async () => {
			render(EntityEditor, { props: {} });

			expect(screen.getByLabelText(/^논리DB명/)).toBeInTheDocument();
			expect(screen.getByLabelText(/^스키마명/)).toBeInTheDocument();
			expect(document.getElementById('entityName')).toBeInTheDocument();
			expect(screen.getByLabelText(/^주식별자/)).toBeInTheDocument();
			expect(screen.getByLabelText(/^테이블한글명/)).toBeInTheDocument();
		});

		it('should display optional field labels', async () => {
			render(EntityEditor, { props: {} });

			expect(screen.getByLabelText(/엔터티설명/)).toBeInTheDocument();
			expect(screen.getByLabelText(/수퍼타입엔터티명/)).toBeInTheDocument();
		});

		it('should populate form with entry data in edit mode', async () => {
			const mockEntry = createMockEntry();
			render(EntityEditor, {
				props: {
					entry: mockEntry,
					isEditMode: true
				}
			});

			await waitFor(() => {
				const logicalDbNameInput = screen.getByLabelText(/^논리DB명/) as HTMLInputElement;
				expect(logicalDbNameInput.value).toBe(mockEntry.logicalDbName);
			});
		});

		it('should show server error message when provided', async () => {
			const errorMessage = '서버 오류가 발생했습니다.';
			render(EntityEditor, {
				props: {
					serverError: errorMessage
				}
			});

			expect(screen.getByText(errorMessage)).toBeInTheDocument();
		});
	});

	describe('Form Validation', () => {
		it('should show error message when form is submitted with empty required fields', async () => {
			render(EntityEditor, { props: {} });

			const saveButton = screen.getByRole('button', { name: /저장/ });
			await fireEvent.click(saveButton);

			await waitFor(() => {
				expect(screen.getByText(/논리DB명은 필수입니다/)).toBeInTheDocument();
			});
		});

		it('should not show error when all required fields are filled', async () => {
			render(EntityEditor, { props: {} });

			const logicalDbNameInput = screen.getByLabelText(/^논리DB명/) as HTMLInputElement;
			const schemaNameInput = screen.getByLabelText(/^스키마명/) as HTMLInputElement;
			const entityNameInput = document.getElementById('entityName') as HTMLInputElement;
			const primaryIdentifierInput = screen.getByLabelText(/^주식별자/) as HTMLInputElement;
			const tableKoreanNameInput = screen.getByLabelText(/^테이블한글명/) as HTMLInputElement;

			await fireEvent.input(logicalDbNameInput, { target: { value: '논리DB1' } });
			await fireEvent.input(schemaNameInput, { target: { value: '스키마1' } });
			await fireEvent.input(entityNameInput, { target: { value: '엔터티1' } });
			await fireEvent.input(primaryIdentifierInput, { target: { value: 'ID1' } });
			await fireEvent.input(tableKoreanNameInput, { target: { value: '테이블한글명1' } });

			// 에러 메시지가 없어야 함
			expect(screen.queryByText(/논리DB명은 필수입니다/)).not.toBeInTheDocument();
		});
	});

	describe('Edit Mode Behavior', () => {
		it('should show delete button in edit mode', async () => {
			render(EntityEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			expect(screen.getByRole('button', { name: /삭제/ })).toBeInTheDocument();
		});

		it('should not show delete button in create mode', async () => {
			render(EntityEditor, { props: {} });

			expect(screen.queryByRole('button', { name: /삭제/ })).not.toBeInTheDocument();
		});

		it('should show "수정" button text in edit mode', async () => {
			render(EntityEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			const submitButton = screen.getByRole('button', { name: /^수정$/ });
			expect(submitButton).toBeInTheDocument();
			expect(submitButton.type).toBe('submit');
		});
	});

	describe('User Interactions', () => {
		it('should have cancel button that can be clicked', async () => {
			render(EntityEditor, { props: {} });

			const cancelButton = screen.getByRole('button', { name: /취소/ });
			expect(cancelButton).toBeInTheDocument();
			expect(cancelButton).not.toBeDisabled();
		});

		it('should have close icon button that can be clicked', async () => {
			render(EntityEditor, { props: {} });

			// 닫기 버튼 (X 아이콘)을 aria-label로 찾음
			const closeButton = screen.getByRole('button', { name: /닫기/ });
			expect(closeButton).toBeInTheDocument();
			expect(closeButton).not.toBeDisabled();
		});

		it('should show confirm dialog when delete button is clicked', async () => {
			const mockEntry = createMockEntry();
			render(EntityEditor, {
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
