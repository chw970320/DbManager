import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import DomainEditor from './DomainEditor.svelte';
import type { DomainEntry } from '$lib/types/domain';

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
		mockShowConfirm.mockResolvedValue(true);

		// Default fetch mock responses
		mockFetch.mockImplementation((url: string, init?: RequestInit) => {
			if (url.includes('/api/domain/validate')) {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ success: true })
				});
			}
			if (url.includes('/api/domain/impact-preview')) {
				const requestBody = init?.body ? JSON.parse(String(init.body)) : {};
				if (requestBody.mode === 'delete') {
					return Promise.resolve({
						ok: true,
						json: () =>
							Promise.resolve({
								success: true,
								data: {
									files: {
										domain: 'domain.json',
										vocabulary: 'vocabulary.json',
										term: 'term.json',
										column: 'column.json'
									},
									mode: 'delete',
									current: {
										id: 'entry-1',
										domainCategory: '사용자분류',
										standardDomainName: '사용자분류_VARCHAR(50)',
										physicalDataType: 'VARCHAR',
										dataLength: '50',
										decimalPlaces: ''
									},
									proposed: null,
									changes: {
										referenceKeyChanged: false,
										syncSpecChanged: false
									},
									summary: {
										vocabularyReferenceCount: 1,
										termReferenceCount: 2,
										columnReferenceCount: 0,
										totalReferenceCount: 3,
										downstreamBreakCount: 3,
										affectedColumnSyncCount: 0
									},
									references: [],
									guidance: []
								}
							})
					});
				}

				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							success: true,
							data: {
								sourceType: 'domain',
								sourceFilename: 'domain.json',
								sourceEntryId: 'entry-1',
								sourceEntryName: '사용자분류_VARCHAR(50)',
								mode: 'update',
								summary: {
									sourceChangeCount: 1,
									relatedChangeCount: 2,
									totalChangedFiles: 3,
									conflictCount: 0
								},
								fileSummaries: [
									{
										type: 'domain',
										filename: 'domain.json',
										role: 'source',
										changedCount: 1,
										samples: [
											{
												id: 'entry-1',
												name: '사용자분류_VARCHAR(50)',
												reason: '도메인 변경사항을 저장합니다.'
											}
										]
									},
									{
										type: 'vocabulary',
										filename: 'vocabulary.json',
										role: 'related',
										changedCount: 1,
										samples: [{ id: 'v1', name: '사용자', reason: '도메인 분류명 변경 반영' }]
									},
									{
										type: 'term',
										filename: 'term.json',
										role: 'related',
										changedCount: 2,
										samples: [{ id: 't1', name: '사용자_이름', reason: '도메인명 변경 반영' }]
									}
								],
								guidance: ['도메인명 변경에 따라 용어집 2건이 함께 조정됩니다.'],
								conflicts: [],
								blocked: false
							}
						})
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
		it('should allow editing previously locked inputs in edit mode', async () => {
			render(DomainEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			await waitFor(() => {
				const domainGroupInput = screen.getByLabelText(/도메인그룹/) as HTMLInputElement;
				const domainCategoryInput = screen.getByLabelText(/도메인 분류명/) as HTMLInputElement;
				const physicalDataTypeInput = screen.getByLabelText(/물리 데이터타입/) as HTMLInputElement;
				expect(domainGroupInput).not.toBeDisabled();
				expect(domainCategoryInput).not.toBeDisabled();
				expect(physicalDataTypeInput).not.toBeDisabled();
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

			expect(mockShowConfirm).toHaveBeenCalledWith(
				expect.objectContaining({
					title: '삭제 확인',
					message: expect.stringContaining('참조 현황: 단어 1건, 용어 2건'),
					confirmText: '삭제',
					variant: 'danger'
				})
			);
		});

		it('should render change impact preview section in edit mode', async () => {
			render(DomainEditor, {
				props: {
					entry: createMockEntry(),
					isEditMode: true
				}
			});

			await waitFor(() => {
				expect(screen.getByRole('region', { name: '도메인 변경 영향도' })).toBeInTheDocument();
				expect(screen.getByText('원본 저장')).toBeInTheDocument();
				expect(screen.getByText('연쇄 반영')).toBeInTheDocument();
				expect(
					screen.getByText('도메인명 변경에 따라 용어집 2건이 함께 조정됩니다.')
				).toBeInTheDocument();
			});
		});
	});
});
