import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import DatabaseEditor from './DatabaseEditor.svelte';
import type { DatabaseEntry } from '$lib/types/database-design';

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
const createMockEntry = (): Partial<DatabaseEntry> => ({
	id: 'entry-1',
	organizationName: '기관1',
	departmentName: '부서1',
	appliedTask: '업무1',
	relatedLaw: '법령1',
	logicalDbName: '논리DB1',
	physicalDbName: '물리DB1',
	buildDate: '2024-01-01',
	dbDescription: '설명1',
	dbmsInfo: 'MySQL',
	osInfo: 'Linux',
	exclusionReason: '',
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z'
});

describe('DatabaseEditor', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('생성 모드에서 "새 데이터베이스 추가" 제목 표시', async () => {
			render(DatabaseEditor, { props: {} });

			await waitFor(() => {
				expect(screen.getByText(/새 데이터베이스/)).toBeInTheDocument();
			});
		});

		it('수정 모드에서 "데이터베이스 정의서 수정" 제목 표시', async () => {
			render(DatabaseEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			await waitFor(() => {
				expect(screen.getByText(/데이터베이스 정의서 수정/)).toBeInTheDocument();
			});
		});

		it('필수 필드 라벨 표시', async () => {
			render(DatabaseEditor, { props: {} });

			await waitFor(() => {
				const orgLabels = screen.getAllByText(/기관명/);
				expect(orgLabels.length).toBeGreaterThan(0);
				const deptLabels = screen.getAllByText(/부서명/);
				expect(deptLabels.length).toBeGreaterThan(0);
				const taskLabels = screen.getAllByText(/적용업무/);
				expect(taskLabels.length).toBeGreaterThan(0);
			});
		});

		it('수정 모드에서 엔트리 데이터로 폼 채우기', async () => {
			const mockEntry = createMockEntry();
			render(DatabaseEditor, {
				props: {
					entry: mockEntry,
					isEditMode: true
				}
			});

			await waitFor(() => {
				const orgInput = screen.getByDisplayValue(mockEntry.organizationName || '');
				expect(orgInput).toBeInTheDocument();
			});
		});

		it('서버 에러 메시지 표시', async () => {
			const errorMessage = '서버 오류가 발생했습니다.';
			render(DatabaseEditor, {
				props: {
					serverError: errorMessage
				}
			});

			await waitFor(() => {
				expect(screen.getByText(errorMessage)).toBeInTheDocument();
			});
		});
	});

	describe('Form Validation', () => {
		it('필수 필드가 비어있을 때 저장 시 에러 표시', async () => {
			render(DatabaseEditor, { props: {} });

			await waitFor(() => {
				const saveButton = screen.getByRole('button', { name: /저장/ });
				expect(saveButton).toBeInTheDocument();
			});

			const saveButton = screen.getByRole('button', { name: /저장/ });
			await fireEvent.click(saveButton);

			await waitFor(() => {
				expect(screen.getByText(/기관명은 필수입니다/)).toBeInTheDocument();
			});
		});

		it('모든 필수 필드 입력 시 저장 버튼 활성화', async () => {
			render(DatabaseEditor, { props: {} });

			// 필수 필드 입력
			const orgInput = screen.getByPlaceholderText(/기관명/);
			const deptInput = screen.getByPlaceholderText(/부서명/);
			const taskInput = screen.getByPlaceholderText(/적용업무/);
			const logicalInput = screen.getByPlaceholderText(/논리DB명/);
			const physicalInput = screen.getByPlaceholderText(/물리DB명/);
			const dbmsSelect = screen.getByLabelText(/DBMS정보/);

			await fireEvent.input(orgInput, { target: { value: '기관1' } });
			await fireEvent.input(deptInput, { target: { value: '부서1' } });
			await fireEvent.input(taskInput, { target: { value: '업무1' } });
			await fireEvent.input(logicalInput, { target: { value: '논리DB1' } });
			await fireEvent.input(physicalInput, { target: { value: '물리DB1' } });
			await fireEvent.change(dbmsSelect, { target: { value: 'MySQL' } });

			await waitFor(() => {
				const saveButton = screen.getByRole('button', { name: /저장/ });
				expect(saveButton).not.toBeDisabled();
			});
		});

	});

	describe('Edit Mode', () => {
		it('수정 모드에서 삭제 버튼 표시', async () => {
			render(DatabaseEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			await waitFor(() => {
				const deleteButton = screen.getByRole('button', { name: /삭제/ });
				expect(deleteButton).toBeInTheDocument();
			});
		});

		it('생성 모드에서 삭제 버튼 미표시', async () => {
			render(DatabaseEditor, { props: {} });

			await waitFor(() => {
				const deleteButton = screen.queryByRole('button', { name: /삭제/ });
				expect(deleteButton).not.toBeInTheDocument();
			});
		});
	});
});
