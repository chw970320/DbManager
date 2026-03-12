import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import Page from './+page.svelte';
import { resetAllStores } from '$lib/stores/unified-store';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createJsonResponse(data: unknown, ok = true) {
	return {
		ok,
		json: () => Promise.resolve(data)
	};
}

describe('Domain browse page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetAllStores();

		mockFetch.mockImplementation((input: RequestInfo | URL) => {
			const url = String(input);

			if (url.includes('/api/domain/type-mappings')) {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: {
							entries: [
								{
									id: 'map-1',
									dataType: 'VARCHAR',
									abbreviation: 'V',
									createdAt: '2026-03-12T00:00:00.000Z',
									updatedAt: '2026-03-12T00:00:00.000Z'
								}
							],
							lastUpdated: '2026-03-12T00:00:00.000Z',
							totalCount: 1
						}
					})
				);
			}

			if (url.includes('/api/domain/files')) {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: ['domain.json', 'domain-extra.json']
					})
				);
			}

			if (url.includes('/api/domain/filter-options')) {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: {}
					})
				);
			}

			if (url.includes('/api/domain?')) {
				return Promise.resolve(
					createJsonResponse({
						success: true,
						data: {
							entries: [],
							pagination: {
								totalCount: 0,
								totalPages: 1
							},
							lastUpdated: '2026-03-12T00:00:00.000Z'
						}
					})
				);
			}

			return Promise.resolve(
				createJsonResponse(
					{
						success: false,
						error: `unexpected request: ${url}`
					},
					false
				)
			);
		});
	});

	it('should separate global data type mapping controls from current file actions', async () => {
		render(Page);

		await waitFor(() => {
			expect(
				mockFetch.mock.calls.some(([input]) => String(input).includes('/api/domain/type-mappings'))
			).toBe(true);
		});

		const currentFileActions = screen.getByRole('group', { name: '현재 파일 작업' });
		expect(
			within(currentFileActions).getByRole('button', { name: '새 도메인 추가' })
		).toBeInTheDocument();
		expect(
			within(currentFileActions).getByRole('button', { name: '유효성 검사' })
		).toBeInTheDocument();
		expect(
			within(currentFileActions).getByRole('button', { name: 'XLSX 다운로드' })
		).toBeInTheDocument();
		expect(
			within(currentFileActions).queryByRole('button', { name: /데이터타입 매핑/ })
		).not.toBeInTheDocument();

		const globalRuleSection = screen.getByRole('region', { name: '전역 도메인명 규칙' });
		expect(within(globalRuleSection).getByText('전체 파일 공통 규칙')).toBeInTheDocument();
		expect(
			within(globalRuleSection).getByText(
				'현재 선택 파일과 관계없이 모든 도메인 파일의 표준명 생성 규칙에 적용됩니다.'
			)
		).toBeInTheDocument();
		expect(
			within(globalRuleSection).getByRole('button', { name: '데이터타입 매핑 관리' })
		).toBeInTheDocument();
	});
});
