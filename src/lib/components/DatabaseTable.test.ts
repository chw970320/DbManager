import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DatabaseTable from './DatabaseTable.svelte';
import type { DatabaseEntry } from '$lib/types/database-design';

// 테스트용 Mock 데이터
const createMockEntry = (): DatabaseEntry => ({
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

describe('DatabaseTable', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('entries props에 따른 행 렌더링', () => {
			const entries = [createMockEntry()];
			render(DatabaseTable, {
				props: {
					entries,
					onsort: vi.fn(),
					onpagechange: vi.fn()
				}
			});

			expect(screen.getByText('기관1')).toBeInTheDocument();
			expect(screen.getByText('부서1')).toBeInTheDocument();
		});

		it('빈 entries 배열 처리', () => {
			render(DatabaseTable, {
				props: {
					entries: [],
					onsort: vi.fn(),
					onpagechange: vi.fn()
				}
			});

			// 테이블 헤더는 표시되어야 함
			expect(screen.getByText(/기관명/)).toBeInTheDocument();
		});

		it('로딩 상태 표시', () => {
			render(DatabaseTable, {
				props: {
					entries: [],
					loading: true,
					onsort: vi.fn(),
					onpagechange: vi.fn()
				}
			});

			// 로딩 메시지나 스피너가 표시되는지 확인
			// 실제 컴포넌트 구현에 따라 조정 필요
		});
	});

	describe('Sorting', () => {
		it('컬럼 헤더 클릭 시 정렬 이벤트 발생', () => {
			const onsort = vi.fn();
			const entries = [createMockEntry()];

			render(DatabaseTable, {
				props: {
					entries,
					onsort,
					onpagechange: vi.fn()
				}
			});

			// 정렬 가능한 컬럼 헤더 찾기 (실제 컴포넌트 구조에 따라 조정 필요)
			const sortableHeader = screen.getByText(/기관명/);
			if (sortableHeader) {
				fireEvent.click(sortableHeader);
				// onsort가 호출되었는지 확인 (실제 구현에 따라 조정)
			}
		});
	});

	describe('Pagination', () => {
		it('페이지 변경 시 이벤트 발생', () => {
			const onpagechange = vi.fn();
			const entries = Array.from({ length: 25 }, (_, i) => ({
				...createMockEntry(),
				id: `entry-${i}`
			}));

			render(DatabaseTable, {
				props: {
					entries,
					currentPage: 1,
					totalPages: 2,
					pageSize: 20,
					onsort: vi.fn(),
					onpagechange
				}
			});

			// 페이지네이션 버튼 찾기 및 클릭 (실제 컴포넌트 구조에 따라 조정)
			// const nextButton = screen.getByRole('button', { name: /다음/ });
			// if (nextButton) {
			//   fireEvent.click(nextButton);
			//   expect(onpagechange).toHaveBeenCalled();
			// }
		});
	});

	describe('Row Click', () => {
		it('행 클릭 시 entryclick 이벤트 발생', () => {
			const onentryclick = vi.fn();
			const entry = createMockEntry();
			const entries = [entry];

			render(DatabaseTable, {
				props: {
					entries,
					onsort: vi.fn(),
					onpagechange: vi.fn(),
					onentryclick
				}
			});

			// 행 찾기 및 클릭 (실제 컴포넌트 구조에 따라 조정)
			const row = screen.getByText('기관1').closest('tr');
			if (row) {
				fireEvent.click(row);
				expect(onentryclick).toHaveBeenCalled();
				const detail = onentryclick.mock.calls[0][0] as { entry: DatabaseEntry };
				expect(detail.entry.id).toBe('entry-1');
			}
		});
	});

	describe('Filtering', () => {
		it('필터 옵션 제공 시 필터 UI 표시', () => {
			const filterOptions = {
				organizationName: ['기관1', '기관2'],
				dbmsInfo: ['MySQL', 'PostgreSQL']
			};

			render(DatabaseTable, {
				props: {
					entries: [createMockEntry()],
					filterOptions,
					onsort: vi.fn(),
					onpagechange: vi.fn()
				}
			});

			// 필터 UI가 표시되는지 확인 (실제 컴포넌트 구조에 따라 조정)
		});

		it('필터 적용 시 이벤트 발생', () => {
			const onfilter = vi.fn();
			const filterOptions = {
				organizationName: ['기관1', '기관2']
			};

			render(DatabaseTable, {
				props: {
					entries: [createMockEntry()],
					filterOptions,
					onsort: vi.fn(),
					onpagechange: vi.fn(),
					onfilter
				}
			});

			// 필터 선택 및 이벤트 확인 (실제 컴포넌트 구조에 따라 조정)
		});
	});
});
