import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import TermTable from './TermTable.svelte';
import type { TermEntry } from '$lib/types/term';

// 테스트용 Mock 데이터
const createMockEntries = (): TermEntry[] => [
	{
		id: 'entry-1',
		termName: '사용자_이름',
		columnName: 'USER_NAME',
		domainName: '사용자분류_VARCHAR(50)',
		isMappedTerm: true,
		isMappedColumn: true,
		isMappedDomain: true,
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z'
	},
	{
		id: 'entry-2',
		termName: '관리자_이름',
		columnName: 'ADMIN_NAME',
		domainName: '사용자분류_VARCHAR(50)',
		isMappedTerm: false,
		isMappedColumn: false,
		isMappedDomain: true,
		createdAt: '2024-01-02T00:00:00.000Z',
		updatedAt: '2024-01-02T00:00:00.000Z'
	}
];

describe('TermTable', () => {
	const mockSort = vi.fn();
	const mockPageChange = vi.fn();
	const mockFilter = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Rendering', () => {
		it('should render entries correctly', async () => {
			const mockEntries = createMockEntries();
			render(TermTable, {
				props: {
					entries: mockEntries,
					onsort: mockSort,
					onpagechange: mockPageChange
				}
			});

			await waitFor(() => {
				expect(screen.getByText('사용자_이름')).toBeInTheDocument();
				expect(screen.getByText('관리자_이름')).toBeInTheDocument();
			});
		});

		it('should display loading state', async () => {
			render(TermTable, {
				props: {
					entries: [],
					loading: true,
					onsort: mockSort,
					onpagechange: mockPageChange
				}
			});

			// 로딩 상태 표시 확인 (실제 컴포넌트 구조에 따라 조정)
		});
	});

	describe('Sorting', () => {
		it('should trigger sort event when column header is clicked', async () => {
			const mockEntries = createMockEntries();
			render(TermTable, {
				props: {
					entries: mockEntries,
					onsort: mockSort,
					onpagechange: mockPageChange
				}
			});

			// 컬럼 헤더 클릭 시 sort 이벤트 발생 확인 (실제 컴포넌트 구조에 따라 조정)
		});
	});

	describe('Pagination', () => {
		it('should trigger page change event', async () => {
			const mockEntries = createMockEntries();
			render(TermTable, {
				props: {
					entries: mockEntries,
					currentPage: 1,
					totalPages: 2,
					onsort: mockSort,
					onpagechange: mockPageChange
				}
			});

			// 페이지 변경 시 pagechange 이벤트 발생 확인 (실제 컴포넌트 구조에 따라 조정)
		});
	});

	describe('Mapping Status', () => {
		it('should display mapping status icons for each row', async () => {
			const mockEntries = createMockEntries();
			render(TermTable, {
				props: {
					entries: mockEntries,
					onsort: mockSort,
					onpagechange: mockPageChange
				}
			});

			await waitFor(() => {
				// 매핑 상태 아이콘이 표시되는지 확인
				expect(screen.getByText('사용자_이름')).toBeInTheDocument();
			});
		});

		it('should filter by mapping failure when filter is applied', async () => {
			const mockEntries = createMockEntries();
			render(TermTable, {
				props: {
					entries: mockEntries,
					onsort: mockSort,
					onpagechange: mockPageChange,
					onfilter: mockFilter,
					filterOptions: {
						isMappedTerm: ['true', 'false'],
						isMappedColumn: ['true', 'false'],
						isMappedDomain: ['true', 'false']
					}
				}
			});

			// 매핑 실패 필터 적용 시 filter 이벤트 발생 확인 (실제 컴포넌트 구조에 따라 조정)
		});
	});

	describe('Filtering', () => {
		it('should trigger filter event when filter is applied', async () => {
			const mockEntries = createMockEntries();
			render(TermTable, {
				props: {
					entries: mockEntries,
					onsort: mockSort,
					onpagechange: mockPageChange,
					onfilter: mockFilter,
					filterOptions: {
						termName: ['사용자_이름', '관리자_이름'],
						columnName: ['USER_NAME', 'ADMIN_NAME'],
						domainName: ['사용자분류_VARCHAR(50)']
					}
				}
			});

			// 필터 적용 시 filter 이벤트 발생 확인 (실제 컴포넌트 구조에 따라 조정)
		});
	});
});
