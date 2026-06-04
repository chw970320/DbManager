import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runDesignRelationValidation } from './design-relation-service.js';
import { resolveSharedFileMappingBundle } from '$lib/registry/shared-file-mapping-registry.js';
import { getCachedData } from '$lib/registry/cache-registry.js';
import { listFiles, loadData } from '$lib/registry/data-registry.js';

vi.mock('$lib/registry/shared-file-mapping-registry.js', () => ({
	resolveSharedFileMappingBundle: vi.fn()
}));

vi.mock('$lib/registry/data-registry.js', () => ({
	listFiles: vi.fn(),
	loadData: vi.fn()
}));

vi.mock('$lib/registry/cache-registry.js', () => ({
	getCachedData: vi.fn()
}));

const COMPLETE_BUNDLE = {
	vocabulary: 'vocabulary-a.json',
	domain: 'domain-a.json',
	term: 'term-a.json',
	database: 'database-a.json',
	entity: 'entity-a.json',
	attribute: 'attribute-a.json',
	table: 'table-a.json',
	column: 'column-a.json'
} as const;

describe('design-relation-service standard reference loading', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(resolveSharedFileMappingBundle).mockResolvedValue({ ...COMPLETE_BUNDLE });
		vi.mocked(listFiles).mockImplementation(async (type) => [
			COMPLETE_BUNDLE[type as keyof typeof COMPLETE_BUNDLE]
		]);
		vi.mocked(loadData).mockResolvedValue({
			entries: [],
			lastUpdated: '2026-06-04T00:00:00.000Z',
			totalCount: 0
		});
		vi.mocked(getCachedData).mockResolvedValue({
			entries: [],
			lastUpdated: '2026-06-04T00:00:00.000Z',
			totalCount: 0
		});
	});

	it('fails fast when a complete 8-name bundle has an unreadable vocabulary file', async () => {
		vi.mocked(getCachedData).mockRejectedValue(new Error('vocabulary JSON is corrupt'));

		await expect(
			runDesignRelationValidation(
				{ scopeType: 'database', scopeFile: 'database-a.json' },
				{ requireStandardReferences: true }
			)
		).rejects.toMatchObject({
			name: 'DesignRelationContextError',
			status: 400,
			message: expect.stringContaining('vocabulary-a.json')
		});
	});

	it('skips STANDARD_REFERENCES in compatibility mode when standard refs fail to load', async () => {
		vi.mocked(getCachedData).mockRejectedValue(new Error('vocabulary JSON is corrupt'));

		const result = await runDesignRelationValidation(
			{ scopeType: 'database', scopeFile: 'database-a.json' },
			{ requireStandardReferences: false }
		);

		expect(result.validation.specs.map((spec) => spec.id)).not.toContain('STANDARD_REFERENCES');
	});
});
