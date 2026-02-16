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
			mode: 'apply',
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
				appliedTableUpdates: 1,
				appliedColumnUpdates: 2,
				appliedTotalUpdates: 3
			},
			changes: [],
			suggestions: [],
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
			expect(screen.getByText('5개 정의서 연관 상태')).toBeInTheDocument();
			expect(screen.getByText('table.json')).toBeInTheDocument();
			expect(screen.getByText('테이블 -> 컬럼')).toBeInTheDocument();
			expect(screen.getByText('통합 정합성 요약')).toBeInTheDocument();
			expect(screen.getByText('용어계 실패')).toBeInTheDocument();
		});
	});

	it('should execute apply sync and call onApplied callback', async () => {
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
				.mockResolvedValueOnce({
					json: async () => createUnifiedResponse()
				})
		);

		render(DesignRelationPanel, {
			props: {
				currentType: 'table',
				currentFilename: 'table.json',
				onApplied
			}
		});

		const applyButton = await screen.findByRole('button', { name: '자동 보정 실행' });
		applyButton.click();

		await waitFor(() => {
			expect(screen.getByText('최근 동기화 결과 (실행)')).toBeInTheDocument();
			expect(screen.getByText('실제 반영: 3')).toBeInTheDocument();
			expect(screen.getByText('정합성 변화: 3 -> 1')).toBeInTheDocument();
			expect(onApplied).toHaveBeenCalledTimes(1);
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
});
