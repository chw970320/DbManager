import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import AttributeEditor from './AttributeEditor.svelte';
import type { AttributeEntry } from '$lib/types/database-design';

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
const createMockEntry = (): Partial<AttributeEntry> => ({
	id: 'entry-1',
	schemaName: '스키마1',
	entityName: '엔터티1',
	attributeName: '속성1',
	attributeType: 'VARCHAR',
	requiredInput: 'Y',
	identifierFlag: 'Y',
	refEntityName: '엔터티2',
	refAttributeName: '속성2',
	attributeDescription: '속성 설명1',
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z'
});

describe('AttributeEditor', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should render modal with "새 속성 정의서" title when not in edit mode', async () => {
			render(AttributeEditor, { props: {} });

			expect(screen.getByText('새 속성 정의서')).toBeInTheDocument();
		});

		it('should render modal with "속성 정의서 수정" title when in edit mode', async () => {
			render(AttributeEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			expect(screen.getByText('속성 정의서 수정')).toBeInTheDocument();
		});

		it('should display required field labels', async () => {
			render(AttributeEditor, { props: {} });

			expect(screen.getByLabelText(/^스키마명/)).toBeInTheDocument();
			expect(screen.getByLabelText(/^엔터티명/)).toBeInTheDocument();
			expect(screen.getByLabelText(/^속성명/)).toBeInTheDocument();
			expect(screen.getByLabelText(/^속성유형/)).toBeInTheDocument();
		});

		it('should populate form with entry data in edit mode', async () => {
			const mockEntry = createMockEntry();
			render(AttributeEditor, {
				props: {
					entry: mockEntry,
					isEditMode: true
				}
			});

			await waitFor(() => {
				const schemaNameInput = screen.getByLabelText(/^스키마명/) as HTMLInputElement;
				expect(schemaNameInput.value).toBe(mockEntry.schemaName);
			});
		});

		it('should show server error message when provided', async () => {
			const errorMessage = '서버 오류가 발생했습니다.';
			render(AttributeEditor, {
				props: {
					serverError: errorMessage
				}
			});

			expect(screen.getByText(errorMessage)).toBeInTheDocument();
		});
	});

	describe('Form Validation', () => {
		it('should show error message when form is submitted with empty required fields', async () => {
			render(AttributeEditor, { props: {} });

			const saveButton = screen.getByRole('button', { name: /저장/ });
			await fireEvent.click(saveButton);

			await waitFor(() => {
				expect(screen.getByText(/스키마명은 필수입니다/)).toBeInTheDocument();
			});
		});

		it('should not show error when all required fields are filled', async () => {
			render(AttributeEditor, { props: {} });

			const schemaNameInput = screen.getByLabelText(/^스키마명/) as HTMLInputElement;
			const entityNameInput = screen.getByLabelText(/^엔터티명/) as HTMLInputElement;
			const attributeNameInput = screen.getByLabelText(/^속성명/) as HTMLInputElement;
			const attributeTypeInput = screen.getByLabelText(/^속성유형/) as HTMLInputElement;

			await fireEvent.input(schemaNameInput, { target: { value: '스키마1' } });
			await fireEvent.input(entityNameInput, { target: { value: '엔터티1' } });
			await fireEvent.input(attributeNameInput, { target: { value: '속성1' } });
			await fireEvent.input(attributeTypeInput, { target: { value: 'VARCHAR' } });

			// 에러 메시지가 없어야 함
			expect(screen.queryByText(/스키마명은 필수입니다/)).not.toBeInTheDocument();
		});
	});

	describe('Edit Mode Behavior', () => {
		it('should show delete button in edit mode', async () => {
			render(AttributeEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			expect(screen.getByRole('button', { name: /삭제/ })).toBeInTheDocument();
		});

		it('should not show delete button in create mode', async () => {
			render(AttributeEditor, { props: {} });

			expect(screen.queryByRole('button', { name: /삭제/ })).not.toBeInTheDocument();
		});
	});

	describe('User Interactions', () => {
		it('should have cancel button that can be clicked', async () => {
			render(AttributeEditor, { props: {} });

			const cancelButton = screen.getByRole('button', { name: /취소/ });
			expect(cancelButton).toBeInTheDocument();
			expect(cancelButton).not.toBeDisabled();
		});

		it('should have close icon button that can be clicked', async () => {
			render(AttributeEditor, { props: {} });

			const closeButton = screen.getByRole('button', { name: /닫기/ });
			expect(closeButton).toBeInTheDocument();
			expect(closeButton).not.toBeDisabled();
		});
	});
});
