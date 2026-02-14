import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/registry/data-registry.js', () => ({
	loadData: vi.fn(),
	saveData: vi.fn()
}));

vi.mock('$lib/utils/design-relation-context.js', () => ({
	loadDesignRelationContext: vi.fn(),
	pickDefinitionFileFromUrl: vi.fn((url: URL, key: string) => {
		const value = url.searchParams.get(key);
		return value && value.trim() !== '' ? value : undefined;
	}),
	toDefinitionFileSelection: vi.fn((files: Record<string, string | null>) => ({
		database: files.database,
		entity: files.entity,
		attribute: files.attribute,
		table: files.table,
		column: files.column
	}))
}));

vi.mock('$lib/utils/design-relation-sync.js', () => ({
	buildDesignRelationSyncPlan: vi.fn()
}));

vi.mock('$lib/utils/design-relation-validator.js', () => ({
	validateDesignRelations: vi.fn()
}));

import { loadData, saveData } from '$lib/registry/data-registry.js';
import { loadDesignRelationContext } from '$lib/utils/design-relation-context.js';
import { buildDesignRelationSyncPlan } from '$lib/utils/design-relation-sync.js';
import { validateDesignRelations } from '$lib/utils/design-relation-validator.js';

function createGetEvent(searchParams?: Record<string, string>): RequestEvent {
	const url = new URL('http://localhost/api/erd/relations/sync');
	if (searchParams) {
		for (const [k, v] of Object.entries(searchParams)) {
			url.searchParams.set(k, v);
		}
	}
	return { url, request: {} as Request } as RequestEvent;
}

function createPostEvent(body: unknown): RequestEvent {
	return {
		url: new URL('http://localhost/api/erd/relations/sync'),
		request: {
			json: async () => body
		} as Request
	} as RequestEvent;
}

describe('API: /api/erd/relations/sync', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(loadDesignRelationContext).mockResolvedValue({
			context: {
				databases: [],
				entities: [],
				attributes: [],
				tables: [],
				columns: [],
				domains: []
			},
			files: {
				database: 'database.json',
				entity: 'entity.json',
				attribute: 'attribute.json',
				table: 'table.json',
				column: 'column.json',
				domain: null,
				vocabulary: null
			}
		});

		vi.mocked(buildDesignRelationSyncPlan).mockReturnValue({
			tableUpdates: [],
			columnUpdates: [],
			preview: {
				counts: {
					tableCandidates: 0,
					columnCandidates: 0,
					totalCandidates: 0,
					fieldChanges: 0,
					attributeColumnSuggestions: 0
				},
				changes: [],
				suggestions: []
			}
		});

		vi.mocked(validateDesignRelations).mockReturnValue({
			specs: [],
			summaries: [],
			totals: {
				totalChecked: 0,
				matched: 0,
				unmatched: 0,
				errorCount: 0,
				warningCount: 0
			}
		});

		vi.mocked(loadData).mockResolvedValue({
			entries: [],
			lastUpdated: '2026-02-14T00:00:00.000Z',
			totalCount: 0
		});
		vi.mocked(saveData).mockResolvedValue();
	});

	it('should return preview result on GET', async () => {
		const response = await GET(createGetEvent());
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.mode).toBe('preview');
		expect(saveData).not.toHaveBeenCalled();
	});

	it('should apply updates on POST when apply=true', async () => {
		vi.mocked(buildDesignRelationSyncPlan).mockReturnValue({
			tableUpdates: [
				{
					id: 'table-1',
					patch: { relatedEntityName: '사용자' },
					targetLabel: 'TB_USER',
					reason: 'test'
				}
			],
			columnUpdates: [
				{
					id: 'column-1',
					patch: { schemaName: 'MAIN', tableEnglishName: 'TB_USER', relatedEntityName: '사용자' },
					targetLabel: 'USER_ID',
					reason: 'test'
				}
			],
			preview: {
				counts: {
					tableCandidates: 1,
					columnCandidates: 1,
					totalCandidates: 2,
					fieldChanges: 4,
					attributeColumnSuggestions: 0
				},
				changes: [],
				suggestions: []
			}
		});

		vi.mocked(loadData).mockImplementation(async (type: string) => {
			if (type === 'table') {
				return {
					entries: [
						{
							id: 'table-1',
							tableEnglishName: 'TB_USER',
							relatedEntityName: '사용자테이블',
							businessClassification: '업무',
							tableVolume: '10',
							nonPublicReason: '-',
							openDataList: '-',
							createdAt: '2026-02-14T00:00:00.000Z',
							updatedAt: '2026-02-14T00:00:00.000Z'
						}
					],
					lastUpdated: '2026-02-14T00:00:00.000Z',
					totalCount: 1
				};
			}
			if (type === 'column') {
				return {
					entries: [
						{
							id: 'column-1',
							columnEnglishName: 'USER_ID',
							dataLength: '20',
							dataDecimalLength: '0',
							dataFormat: '-',
							pkInfo: '-',
							indexName: '-',
							indexOrder: '-',
							akInfo: '-',
							constraint: '-',
							createdAt: '2026-02-14T00:00:00.000Z',
							updatedAt: '2026-02-14T00:00:00.000Z'
						}
					],
					lastUpdated: '2026-02-14T00:00:00.000Z',
					totalCount: 1
				};
			}
			return { entries: [], lastUpdated: '2026-02-14T00:00:00.000Z', totalCount: 0 };
		});

		const response = await POST(createPostEvent({ apply: true }));
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.mode).toBe('apply');
		expect(result.data.counts.appliedTotalUpdates).toBe(2);
		expect(loadData).toHaveBeenCalledWith('table', 'table.json');
		expect(loadData).toHaveBeenCalledWith('column', 'column.json');
		expect(saveData).toHaveBeenCalledTimes(2);
	});

	it('should return 500 on sync failure', async () => {
		vi.mocked(loadDesignRelationContext).mockRejectedValue(new Error('failed'));

		const response = await GET(createGetEvent());
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});
