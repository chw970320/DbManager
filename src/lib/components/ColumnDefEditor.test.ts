import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ColumnDefEditor from './ColumnDefEditor.svelte';
import type { ColumnEntry } from '$lib/types/database-design';

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
const createMockEntry = (): Partial<ColumnEntry> => ({
	id: 'entry-1',
	scopeFlag: 'Y',
	subjectArea: '주제영역1',
	schemaName: '스키마1',
	tableEnglishName: 'TABLE1',
	columnEnglishName: 'COLUMN1',
	columnKoreanName: '컬럼1',
	relatedEntityName: '엔터티1',
	domainName: 'USER_NAME_DOM',
	dataType: 'VARCHAR',
	notNullFlag: 'Y',
	personalInfoFlag: 'N',
	encryptionFlag: 'N',
	publicFlag: 'Y',
	columnDescription: '컬럼 설명1',
	dataLength: '100',
	dataDecimalLength: '0',
	dataFormat: '문자',
	pkInfo: '',
	fkInfo: '',
	indexName: '',
	indexOrder: '',
	akInfo: '',
	constraint: '',
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z'
});

describe('ColumnDefEditor', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should render modal with "새 컬럼 정의서" title when not in edit mode', async () => {
			render(ColumnDefEditor, { props: {} });

			expect(screen.getByText('새 컬럼 정의서')).toBeInTheDocument();
		});

		it('should render modal with "컬럼 정의서 수정" title when in edit mode', async () => {
			render(ColumnDefEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			expect(screen.getByText('컬럼 정의서 수정')).toBeInTheDocument();
		});

		it('should display required field labels', async () => {
			render(ColumnDefEditor, { props: {} });

			expect(screen.getByLabelText(/^사업범위여부/)).toBeInTheDocument();
			expect(screen.getByLabelText(/^주제영역/)).toBeInTheDocument();
			expect(screen.getByLabelText(/^스키마명/)).toBeInTheDocument();
			expect(screen.getByLabelText(/^컬럼영문명/)).toBeInTheDocument();
			expect(screen.getByLabelText(/^도메인명/)).toBeInTheDocument();
		});

		it('should populate form with entry data in edit mode', async () => {
			const mockEntry = createMockEntry();
			render(ColumnDefEditor, {
				props: {
					entry: mockEntry,
					isEditMode: true
				}
			});

			await waitFor(() => {
				const columnEnglishNameInput = screen.getByLabelText(/^컬럼영문명/) as HTMLInputElement;
				expect(columnEnglishNameInput.value).toBe(mockEntry.columnEnglishName);
			});
		});

		it('should show server error message when provided', async () => {
			const errorMessage = '서버 오류가 발생했습니다.';
			render(ColumnDefEditor, {
				props: {
					serverError: errorMessage
				}
			});

			expect(screen.getByText(errorMessage)).toBeInTheDocument();
		});
	});

	describe('Form Validation', () => {
		it('should show error message when form is submitted with empty required fields', async () => {
			render(ColumnDefEditor, { props: {} });

			const saveButton = screen.getByRole('button', { name: /저장/ });
			await fireEvent.click(saveButton);

			await waitFor(() => {
				expect(screen.getByText(/사업범위여부는 필수입니다/)).toBeInTheDocument();
			});
		});

		it('should not show error when all required fields are filled', async () => {
			render(ColumnDefEditor, { props: {} });

			const scopeFlagInput = screen.getByLabelText(/^사업범위여부/) as HTMLInputElement;
			const subjectAreaInput = screen.getByLabelText(/^주제영역/) as HTMLInputElement;
			const schemaNameInput = screen.getByLabelText(/^스키마명/) as HTMLInputElement;
			const tableEnglishNameInput = screen.getByLabelText(/^테이블영문명/) as HTMLInputElement;
			const columnEnglishNameInput = screen.getByLabelText(/^컬럼영문명/) as HTMLInputElement;
			const columnKoreanNameInput = screen.getByLabelText(/^컬럼한글명/) as HTMLInputElement;
			const relatedEntityNameInput = screen.getByLabelText(/^연관엔터티명/) as HTMLInputElement;
			const domainNameInput = screen.getByLabelText(/^도메인명/) as HTMLInputElement;
			const dataTypeInput = screen.getByLabelText(/^자료타입/) as HTMLInputElement;
			const notNullFlagInput = screen.getByLabelText(/^NOT NULL/) as HTMLInputElement;
			const personalInfoFlagInput = screen.getByLabelText(/^개인정보여부/) as HTMLInputElement;
			const encryptionFlagInput = screen.getByLabelText(/^암호화여부/) as HTMLInputElement;
			const publicFlagInput = screen.getByLabelText(/^공개\/비공개여부/) as HTMLInputElement;

			await fireEvent.input(scopeFlagInput, { target: { value: 'Y' } });
			await fireEvent.input(subjectAreaInput, { target: { value: '주제영역1' } });
			await fireEvent.input(schemaNameInput, { target: { value: '스키마1' } });
			await fireEvent.input(tableEnglishNameInput, { target: { value: 'TABLE1' } });
			await fireEvent.input(columnEnglishNameInput, { target: { value: 'COLUMN1' } });
			await fireEvent.input(columnKoreanNameInput, { target: { value: '컬럼1' } });
			await fireEvent.input(relatedEntityNameInput, { target: { value: '엔터티1' } });
			await fireEvent.input(domainNameInput, { target: { value: 'USER_NAME_DOM' } });
			await fireEvent.input(dataTypeInput, { target: { value: 'VARCHAR' } });
			await fireEvent.input(notNullFlagInput, { target: { value: 'Y' } });
			await fireEvent.input(personalInfoFlagInput, { target: { value: 'N' } });
			await fireEvent.input(encryptionFlagInput, { target: { value: 'N' } });
			await fireEvent.input(publicFlagInput, { target: { value: 'Y' } });

			// 에러 메시지가 없어야 함
			expect(screen.queryByText(/사업범위여부는 필수입니다/)).not.toBeInTheDocument();
		});
	});

	describe('Edit Mode Behavior', () => {
		it('should show delete button in edit mode', async () => {
			render(ColumnDefEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			expect(screen.getByRole('button', { name: /삭제/ })).toBeInTheDocument();
		});

		it('should not show delete button in create mode', async () => {
			render(ColumnDefEditor, { props: {} });

			expect(screen.queryByRole('button', { name: /삭제/ })).not.toBeInTheDocument();
		});
	});

	describe('User Interactions', () => {
		it('should have cancel button that can be clicked', async () => {
			render(ColumnDefEditor, { props: {} });

			const cancelButton = screen.getByRole('button', { name: /취소/ });
			expect(cancelButton).toBeInTheDocument();
			expect(cancelButton).not.toBeDisabled();
		});

		it('should have close icon button that can be clicked', async () => {
			render(ColumnDefEditor, { props: {} });

			const closeButton = screen.getByRole('button', { name: /닫기/ });
			expect(closeButton).toBeInTheDocument();
			expect(closeButton).not.toBeDisabled();
		});
	});
});
