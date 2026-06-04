import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import DesignRelationPanel from './DesignRelationPanel.svelte';

function createRelationsResponse() {
	return {
		success: true,
		data: {
			files: {
				database: 'database.json',
				entity: 'entity.json',
				attribute: 'attribute.json',
				table: 'table.json',
				column: 'column.json'
			},
			validation: {
				specs: [],
				summaries: [
					{
						relationId: 'TABLE_COLUMN',
						relationName: '테이블 -> 컬럼',
						totalChecked: 2,
						matched: 1,
						unmatched: 1,
						severity: 'error',
						mappingKey: 'schemaName + tableEnglishName',
						issues: []
					}
				],
				totals: {
					totalChecked: 2,
					matched: 1,
					unmatched: 1,
					errorCount: 1,
					warningCount: 0
				}
			}
		}
	};
}

function createSyncResponse() {
	return {
		success: true,
		data: {
			mode: 'preview',
			files: {
				database: 'database.json',
				entity: 'entity.json',
				attribute: 'attribute.json',
				table: 'table.json',
				column: 'column.json'
			},
			counts: {
				tableCandidates: 1,
				columnCandidates: 2,
				totalCandidates: 3,
				fieldChanges: 4,
				attributeColumnSuggestions: 1,
				appliedTableUpdates: 0,
				appliedColumnUpdates: 0,
				appliedTotalUpdates: 0
			},
			changes: [
				{
					targetType: 'table',
					targetId: 'table-1',
					targetLabel: 'public.customers',
					field: 'relatedEntityName',
					before: '',
					after: '고객',
					reason: '테이블명 기준 관계 보정',
					owner: 'erd/relations/sync'
				}
			],
			suggestions: [
				{
					attributeId: 'attribute-1',
					attributeName: '고객번호',
					schemaName: 'public',
					entityName: '고객',
					candidates: [
						{
							columnId: 'column-1',
							columnLabel: 'public.customers.CUSTOMER_ID',
							schemaName: 'public',
							tableEnglishName: 'customers',
							relatedEntityName: '고객'
						}
					]
				}
			],
			validationBefore: {
				specs: [],
				summaries: [],
				totals: {
					totalChecked: 10,
					matched: 7,
					unmatched: 3,
					errorCount: 3,
					warningCount: 0
				}
			},
			validationAfter: {
				specs: [],
				summaries: [],
				totals: {
					totalChecked: 10,
					matched: 9,
					unmatched: 1,
					errorCount: 1,
					warningCount: 0
				}
			}
		}
	};
}

function createUnifiedResponse() {
	return {
		success: true,
		data: {
			files: {
				term: 'term.json',
				database: 'database.json',
				entity: 'entity.json',
				attribute: 'attribute.json',
				table: 'table.json',
				column: 'column.json'
			},
			summary: {
				totalIssues: 3,
				errorCount: 1,
				autoFixableCount: 1,
				warningCount: 1,
				infoCount: 0,
				termFailedCount: 1,
				relationUnmatchedCount: 1
			},
			sections: {
				term: {
					totalCount: 10,
					passedCount: 9,
					failedCount: 1
				}
			}
		}
	};
}

describe('DesignRelationPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should load and render relation validation summary', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValueOnce({
					json: async () => createRelationsResponse()
				})
				.mockResolvedValueOnce({
					json: async () => createUnifiedResponse()
				})
		);

		render(DesignRelationPanel, {
			props: {
				currentType: 'table',
				currentFilename: 'table.json'
			}
		});

		await waitFor(() => {
			expect(screen.getByText('8종 공통 연관 상태')).toBeInTheDocument();
			expect(screen.getByText('요약')).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: '정합성 조회' })).not.toBeInTheDocument();
		});

		screen.getByRole('button', { name: '펼치기' }).click();
		await waitFor(() => {
			expect(screen.getByText('table.json')).toBeInTheDocument();
			expect(screen.getByText('테이블 -> 컬럼')).toBeInTheDocument();
			expect(screen.getByText('오류 1건')).toBeInTheDocument();
			expect(screen.getByText('출처: schemaName + tableEnglishName')).toBeInTheDocument();
			expect(screen.getByText('통합 정합성 요약')).toBeInTheDocument();
			expect(screen.getByText('용어계 실패')).toBeInTheDocument();
		});
	});

	it('should load sync preview results without apply execution callback', async () => {
		const onApplied = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValueOnce({
					json: async () => createRelationsResponse()
				})
				.mockResolvedValueOnce({
					json: async () => createUnifiedResponse()
				})
				.mockResolvedValueOnce({
					json: async () => createSyncResponse()
				})
		);

		render(DesignRelationPanel, {
			props: {
				currentType: 'table',
				currentFilename: 'table.json',
				onApplied
			}
		});

		const expandButton = await screen.findByRole('button', { name: '펼치기' });
		expandButton.click();
		const previewButton = await screen.findByRole('button', { name: '보정 미리보기' });
		previewButton.click();

		await waitFor(() => {
			expect(screen.getByText('보정 미리보기 결과')).toBeInTheDocument();
			expect(
				screen.getByText('요청: 미리보기(저장 없음) · 응답 모드: 미리보기')
			).toBeInTheDocument();
			expect(screen.getByText('실행 모드: 저장 없음')).toBeInTheDocument();
			expect(screen.getByText('실제 반영: 0건')).toBeInTheDocument();
			expect(screen.getByText('정합성 변화: 3 -> 1')).toBeInTheDocument();
			expect(screen.getByText('남은 검증 이슈: 1건')).toBeInTheDocument();
			expect(onApplied).not.toHaveBeenCalled();
		});

		screen.getByRole('button', { name: '상세 보기' }).click();

		await waitFor(() => {
			expect(screen.getByText('TABLE · public.customers')).toBeInTheDocument();
			expect(screen.getByText('근거: 테이블명 기준 관계 보정')).toBeInTheDocument();
			expect(screen.getByText('실행 소유자: erd/relations/sync')).toBeInTheDocument();
			expect(
				screen.getByText('후보 맥락: 스키마 public · 테이블 customers · 연관엔터티 고객')
			).toBeInTheDocument();
		});
	});

	it('should include fileMapping params in validation and sync requests', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				json: async () => createRelationsResponse()
			})
			.mockResolvedValueOnce({
				json: async () => createUnifiedResponse()
			})
			.mockResolvedValueOnce({
				json: async () => createSyncResponse()
			});
		vi.stubGlobal('fetch', fetchMock);

		render(DesignRelationPanel, {
			props: {
				currentType: 'database',
				currentFilename: 'database-custom.json',
				fileMapping: {
					entity: 'entity-custom.json',
					attribute: 'attribute-custom.json',
					table: 'table-custom.json',
					column: 'column-custom.json'
				}
			}
		});

		await waitFor(() => {
			const calls = fetchMock.mock.calls.map((call) => String(call[0]));
			expect(calls.some((url) => url.startsWith('/api/erd/relations?'))).toBe(true);
			expect(calls.some((url) => url.startsWith('/api/validation/report?'))).toBe(true);
		});

		const relationUrl = fetchMock.mock.calls
			.map((call) => String(call[0]))
			.find((url) => url.startsWith('/api/erd/relations?'));
		expect(relationUrl).toContain('databaseFile=database-custom.json');
		expect(relationUrl).toContain('entityFile=entity-custom.json');
		expect(relationUrl).toContain('attributeFile=attribute-custom.json');
		expect(relationUrl).toContain('tableFile=table-custom.json');
		expect(relationUrl).toContain('columnFile=column-custom.json');

		const expandButton = await screen.findByRole('button', { name: '펼치기' });
		expandButton.click();
		const previewButton = await screen.findByRole('button', { name: '보정 미리보기' });
		previewButton.click();

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/erd/relations/sync',
				expect.objectContaining({
					method: 'POST',
					body: expect.any(String)
				})
			);
		});

		const syncCall = fetchMock.mock.calls.find((call) => call[0] === '/api/erd/relations/sync');
		const body = JSON.parse((syncCall?.[1] as RequestInit).body as string);
		expect(body).toMatchObject({
			apply: false,
			databaseFile: 'database-custom.json',
			entityFile: 'entity-custom.json',
			attributeFile: 'attribute-custom.json',
			tableFile: 'table-custom.json',
			columnFile: 'column-custom.json'
		});
	});

	it('should toggle collapse and expand state', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValueOnce({
					json: async () => createRelationsResponse()
				})
				.mockResolvedValueOnce({
					json: async () => createUnifiedResponse()
				})
		);

		render(DesignRelationPanel, {
			props: {
				currentType: 'table',
				currentFilename: 'table.json'
			}
		});

		await screen.findByRole('button', { name: '펼치기' });
		expect(screen.queryByRole('button', { name: '정합성 조회' })).not.toBeInTheDocument();
		screen.getByRole('button', { name: '펼치기' }).click();

		await waitFor(() => {
			expect(screen.getByRole('button', { name: '정합성 조회' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: '접기' })).toBeInTheDocument();
		});

		screen.getByRole('button', { name: '접기' }).click();

		await waitFor(() => {
			expect(screen.queryByRole('button', { name: '정합성 조회' })).not.toBeInTheDocument();
			expect(screen.getByRole('button', { name: '펼치기' })).toBeInTheDocument();
		});
	});
});
