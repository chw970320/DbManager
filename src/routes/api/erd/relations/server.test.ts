import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/registry/data-registry', () => ({
	listFiles: vi.fn(),
	loadData: vi.fn()
}));

vi.mock('$lib/utils/design-relation-validator.js', () => ({
	validateDesignRelations: vi.fn()
}));

import { listFiles, loadData } from '$lib/registry/data-registry';
import { validateDesignRelations } from '$lib/utils/design-relation-validator.js';

function createMockRequestEvent(options: { searchParams?: Record<string, string> }): RequestEvent {
	const url = new URL('http://localhost/api/erd/relations');
	if (options.searchParams) {
		for (const [k, v] of Object.entries(options.searchParams)) {
			url.searchParams.set(k, v);
		}
	}
	return { url, request: {} as Request } as RequestEvent;
}

describe('API: /api/erd/relations', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(listFiles).mockImplementation(async (type: string) => {
			if (type === 'database') return ['database.json'];
			if (type === 'entity') return ['entity.json'];
			if (type === 'attribute') return ['attribute.json'];
			if (type === 'table') return ['table.json'];
			if (type === 'column') return ['column.json'];
			return [];
		});

		vi.mocked(loadData).mockResolvedValue({
			entries: [],
			lastUpdated: '2026-02-14T00:00:00.000Z',
			totalCount: 0
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
	});

	it('should return relation validation result', async () => {
		const response = await GET(createMockRequestEvent({}));
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.files.database).toBe('database.json');
		expect(validateDesignRelations).toHaveBeenCalledTimes(1);
	});

	it('should use explicit file parameters when provided', async () => {
		await GET(
			createMockRequestEvent({
				searchParams: {
					databaseFile: 'db-x.json',
					entityFile: 'entity-x.json',
					attributeFile: 'attribute-x.json',
					tableFile: 'table-x.json',
					columnFile: 'column-x.json'
				}
			})
		);

		expect(loadData).toHaveBeenCalledWith('database', 'db-x.json');
		expect(loadData).toHaveBeenCalledWith('entity', 'entity-x.json');
		expect(loadData).toHaveBeenCalledWith('attribute', 'attribute-x.json');
		expect(loadData).toHaveBeenCalledWith('table', 'table-x.json');
		expect(loadData).toHaveBeenCalledWith('column', 'column-x.json');
	});

	it('should return 500 on load error', async () => {
		vi.mocked(loadData).mockRejectedValue(new Error('failed'));

		const response = await GET(createMockRequestEvent({}));
		const result = await response.json();

		expect(response.status).toBe(500);
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});

