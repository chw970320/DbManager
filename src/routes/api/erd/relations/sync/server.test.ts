import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

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

vi.mock('$lib/utils/erd-file-context.js', () => ({
	resolveErdFileContext: vi.fn(async (params: Record<string, string | boolean | undefined>) => ({
		files: params,
		hasExplicitFile: Boolean(
			params.databaseFile ||
				params.entityFile ||
				params.attributeFile ||
				params.tableFile ||
				params.columnFile
		)
	}))
}));

vi.mock('$lib/utils/design-relation-sync.js', () => ({
	buildDesignRelationSyncPlan: vi.fn()
}));

vi.mock('$lib/utils/design-relation-validator.js', () => ({
	validateDesignRelations: vi.fn()
}));

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
				vocabulary: null,
				term: null
			},
			standardReferences: { vocabulary: false, domain: false, term: false, complete: false }
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
			rules: [],
			summaries: [],
			issues: [],
			totals: {
				totalChecked: 0,
				matched: 0,
				unmatched: 0,
				errorCount: 0,
				warningCount: 0
			}
		});
	});

	it('should return preview result on GET', async () => {
		const response = await GET(createGetEvent());
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.mode).toBe('preview');
	});

	it('should keep owner trace on preview changes', async () => {
		vi.mocked(buildDesignRelationSyncPlan).mockReturnValue({
			tableUpdates: [],
			columnUpdates: [],
			preview: {
				counts: {
					tableCandidates: 1,
					columnCandidates: 0,
					totalCandidates: 1,
					fieldChanges: 1,
					attributeColumnSuggestions: 0
				},
				changes: [
					{
						targetType: 'table',
						targetId: 'table-1',
						targetLabel: 'TB_USER',
						field: 'relatedEntityName',
						before: '',
						after: '사용자',
						reason: '테이블명 기준 관계 보정'
					}
				],
				suggestions: []
			}
		});

		const response = await GET(createGetEvent());
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.changes[0]).toMatchObject({
			owner: 'erd/relations/sync',
			reason: '테이블명 기준 관계 보정'
		});
	});

	it('should reject legacy apply mode and point to selected-candidate API', async () => {
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

		const response = await POST(createPostEvent({ apply: true }));
		const result = await response.json();

		expect(response.status).toBe(410);
		expect(result.success).toBe(false);
		expect(result.error).toContain('/api/validation/design-relations/apply');
		expect(buildDesignRelationSyncPlan).not.toHaveBeenCalled();
	});

	it('should reject legacy GET apply mode', async () => {
		const response = await GET(createGetEvent({ apply: 'true' }));
		const result = await response.json();

		expect(response.status).toBe(410);
		expect(result.success).toBe(false);
		expect(result.data.replacement).toBe('/api/validation/design-relations/apply');
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
