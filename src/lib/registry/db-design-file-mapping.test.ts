import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	resolveDbDesignFileMappingBundle,
	saveDbDesignFileMappingBundle
} from './db-design-file-mapping';

vi.mock('$lib/registry/shared-file-mapping-registry', () => ({
	resolveSharedFileMappingBundle: vi.fn(),
	saveSharedFileMappingBundle: vi.fn()
}));

import {
	resolveSharedFileMappingBundle,
	saveSharedFileMappingBundle
} from '$lib/registry/shared-file-mapping-registry';

const DEFAULT_BUNDLE = {
	vocabulary: 'vocabulary.json',
	domain: 'domain.json',
	term: 'term.json',
	database: 'database.json',
	entity: 'entity.json',
	attribute: 'attribute.json',
	table: 'table.json',
	column: 'column.json'
} as const;

const FULL_BUNDLE = {
	vocabulary: 'vocabulary-a.json',
	domain: 'domain-a.json',
	term: 'term-a.json',
	database: 'database-a.json',
	entity: 'entity-a.json',
	attribute: 'attribute-a.json',
	table: 'table-a.json',
	column: 'column-a.json'
} as const;

describe('db-design-file-mapping', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(resolveSharedFileMappingBundle).mockResolvedValue(null);
		vi.mocked(saveSharedFileMappingBundle).mockResolvedValue({ ...FULL_BUNDLE });
	});

	it('should resolve the default bundle without legacy registry fallback', async () => {
		const bundle = await resolveDbDesignFileMappingBundle('database', 'database.json');

		expect(bundle).toEqual(DEFAULT_BUNDLE);
		expect(resolveSharedFileMappingBundle).toHaveBeenCalledWith('database', 'database.json');
	});

	it('should fail fast for a non-default file without a canonical shared bundle', async () => {
		await expect(resolveDbDesignFileMappingBundle('database', 'database-a.json')).rejects.toThrow(
			'공통 파일 매핑을 찾을 수 없습니다'
		);
	});

	it('should prefer the shared mapping file bundle when present', async () => {
		vi.mocked(resolveSharedFileMappingBundle).mockResolvedValue({ ...FULL_BUNDLE });

		const bundle = await resolveDbDesignFileMappingBundle('database', 'database-a.json');

		expect(bundle).toEqual(FULL_BUNDLE);
	});

	it('should apply explicit overrides on top of the canonical shared bundle', async () => {
		vi.mocked(resolveSharedFileMappingBundle).mockResolvedValue({ ...FULL_BUNDLE });

		const bundle = await resolveDbDesignFileMappingBundle('database', 'database-a.json', {
			entity: 'entity-b.json',
			table: 'table-b.json'
		});

		expect(bundle).toEqual({
			...FULL_BUNDLE,
			database: 'database-a.json',
			entity: 'entity-b.json',
			table: 'table-b.json'
		});
	});

	it('should save only the canonical shared mapping bundle', async () => {
		const result = await saveDbDesignFileMappingBundle({
			currentType: 'database',
			currentFilename: 'database-b.json',
			mapping: {
				vocabulary: 'vocabulary-b.json',
				domain: 'domain-b.json',
				term: 'term-b.json',
				entity: 'entity-b.json',
				attribute: 'attribute-b.json',
				table: 'table-b.json',
				column: 'column-b.json'
			}
		});

		const savedBundle = {
			vocabulary: 'vocabulary-b.json',
			domain: 'domain-b.json',
			term: 'term-b.json',
			database: 'database-b.json',
			entity: 'entity-b.json',
			attribute: 'attribute-b.json',
			table: 'table-b.json',
			column: 'column-b.json'
		};

		expect(saveSharedFileMappingBundle).toHaveBeenCalledWith(savedBundle);
		expect(result.bundle).toEqual(savedBundle);
		expect(result.currentMapping).toEqual({
			vocabulary: 'vocabulary-b.json',
			domain: 'domain-b.json',
			term: 'term-b.json',
			entity: 'entity-b.json',
			attribute: 'attribute-b.json',
			table: 'table-b.json',
			column: 'column-b.json'
		});
	});
});
