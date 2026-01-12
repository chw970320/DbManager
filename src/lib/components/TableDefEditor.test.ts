import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import TableDefEditor from './TableDefEditor.svelte';
import type { TableEntry } from '$lib/types/database-design';

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
const createMockEntry = (): Partial<TableEntry> => ({
	id: 'entry-1',
	physicalDbName: '물리DB1',
	tableOwner: '소유자1',
	subjectArea: '주제영역1',
	schemaName: '스키마1',
	tableEnglishName: 'TABLE1',
	tableKoreanName: '테이블1',
	tableType: '일반',
	relatedEntityName: '엔터티1',
	publicFlag: 'Y',
	tableDescription: '테이블 설명1',
	businessClassification: '업무분류1',
	retentionPeriod: '5년',
	tableVolume: '1000',
	occurrenceCycle: '일별',
	nonPublicReason: '비공개사유1',
	openDataList: '개방데이터1',
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z'
});

describe('TableDefEditor', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should render modal with "새 테이블 정의서" title when not in edit mode', async () => {
			render(TableDefEditor, { props: {} });

			expect(screen.getByText('새 테이블 정의서')).toBeInTheDocument();
		});

		it('should render modal with "테이블 정의서 수정" title when in edit mode', async () => {
			render(TableDefEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			expect(screen.getByText('테이블 정의서 수정')).toBeInTheDocument();
		});

		it('should display required field labels', async () => {
			render(TableDefEditor, { props: {} });

			expect(screen.getByLabelText(/^물리DB명/)).toBeInTheDocument();
			expect(screen.getByLabelText(/^테이블소유자/)).toBeInTheDocument();
			expect(screen.getByLabelText(/^주제영역/)).toBeInTheDocument();
			expect(screen.getByLabelText(/^스키마명/)).toBeInTheDocument();
		});

		it('should populate form with entry data in edit mode', async () => {
			const mockEntry = createMockEntry();
			render(TableDefEditor, {
				props: {
					entry: mockEntry,
					isEditMode: true
				}
			});

			await waitFor(() => {
				const physicalDbNameInput = screen.getByLabelText(/^물리DB명/) as HTMLInputElement;
				expect(physicalDbNameInput.value).toBe(mockEntry.physicalDbName);
			});
		});

		it('should show server error message when provided', async () => {
			const errorMessage = '서버 오류가 발생했습니다.';
			render(TableDefEditor, {
				props: {
					serverError: errorMessage
				}
			});

			expect(screen.getByText(errorMessage)).toBeInTheDocument();
		});
	});

	describe('Form Validation', () => {
		it('should show error message when form is submitted with empty required fields', async () => {
			render(TableDefEditor, { props: {} });

			const saveButton = screen.getByRole('button', { name: /저장/ });
			await fireEvent.click(saveButton);

			await waitFor(() => {
				expect(screen.getByText(/물리DB명은 필수입니다/)).toBeInTheDocument();
			});
		});

		it('should not show error when all required fields are filled', async () => {
			render(TableDefEditor, { props: {} });

			const physicalDbNameInput = screen.getByLabelText(/^물리DB명/) as HTMLInputElement;
			const tableOwnerInput = screen.getByLabelText(/^테이블소유자/) as HTMLInputElement;
			const subjectAreaInput = screen.getByLabelText(/^주제영역/) as HTMLInputElement;
			const schemaNameInput = screen.getByLabelText(/^스키마명/) as HTMLInputElement;
			const tableEnglishNameInput = screen.getByLabelText(/^테이블영문명/) as HTMLInputElement;
			const tableKoreanNameInput = screen.getByLabelText(/^테이블한글명/) as HTMLInputElement;
			const tableTypeInput = screen.getByLabelText(/^테이블유형/) as HTMLInputElement;
			const relatedEntityNameInput = screen.getByLabelText(/^관련엔터티명/) as HTMLInputElement;
			const publicFlagInput = screen.getByLabelText(/^공개\/비공개여부/) as HTMLInputElement;

			await fireEvent.input(physicalDbNameInput, { target: { value: '물리DB1' } });
			await fireEvent.input(tableOwnerInput, { target: { value: '소유자1' } });
			await fireEvent.input(subjectAreaInput, { target: { value: '주제영역1' } });
			await fireEvent.input(schemaNameInput, { target: { value: '스키마1' } });
			await fireEvent.input(tableEnglishNameInput, { target: { value: 'TABLE1' } });
			await fireEvent.input(tableKoreanNameInput, { target: { value: '테이블1' } });
			await fireEvent.input(tableTypeInput, { target: { value: '일반' } });
			await fireEvent.input(relatedEntityNameInput, { target: { value: '엔터티1' } });
			await fireEvent.input(publicFlagInput, { target: { value: 'Y' } });

			// 에러 메시지가 없어야 함
			expect(screen.queryByText(/물리DB명은 필수입니다/)).not.toBeInTheDocument();
		});
	});

	describe('Edit Mode Behavior', () => {
		it('should show delete button in edit mode', async () => {
			render(TableDefEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			expect(screen.getByRole('button', { name: /삭제/ })).toBeInTheDocument();
		});

		it('should not show delete button in create mode', async () => {
			render(TableDefEditor, { props: {} });

			expect(screen.queryByRole('button', { name: /삭제/ })).not.toBeInTheDocument();
		});
	});

	describe('User Interactions', () => {
		it('should have cancel button that can be clicked', async () => {
			render(TableDefEditor, { props: {} });

			const cancelButton = screen.getByRole('button', { name: /취소/ });
			expect(cancelButton).toBeInTheDocument();
			expect(cancelButton).not.toBeDisabled();
		});

		it('should have close icon button that can be clicked', async () => {
			render(TableDefEditor, { props: {} });

			const closeButton = screen.getByRole('button', { name: /닫기/ });
			expect(closeButton).toBeInTheDocument();
			expect(closeButton).not.toBeDisabled();
		});
	});
});
