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

describe('DesignRelationPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should load and render relation validation summary', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				json: async () => createRelationsResponse()
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

		const applyButton = await screen.findByRole('button', { name: '자동 보정 실행' });
		applyButton.click();

		await waitFor(() => {
			expect(screen.getByText('최근 동기화 결과 (실행)')).toBeInTheDocument();
			expect(screen.getByText('실제 반영: 3')).toBeInTheDocument();
			expect(screen.getByText('정합성 변화: 3 -> 1')).toBeInTheDocument();
			expect(onApplied).toHaveBeenCalledTimes(1);
		});
	});
});
