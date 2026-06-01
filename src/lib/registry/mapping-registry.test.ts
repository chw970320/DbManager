import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataType } from '$lib/types/base';
import { DEFAULT_FILENAMES } from '$lib/types/base';
import { resolveRelatedFilenames } from './mapping-registry';

vi.mock('$lib/utils/file-lock', () => ({
	safeReadFile: vi.fn(async () => {
		throw new Error('legacy registry should not be read');
	}),
	safeWriteFile: vi.fn()
}));

vi.mock('$lib/registry/shared-file-mapping-registry', () => ({
	resolveSharedFileMappingBundle: vi.fn()
}));

import { resolveSharedFileMappingBundle } from '$lib/registry/shared-file-mapping-registry';

const FULL_BUNDLE: Record<DataType, string> = {
	vocabulary: 'vocabulary-a.json',
	domain: 'domain-a.json',
	term: 'term-a.json',
	database: 'database-a.json',
	entity: 'entity-a.json',
	attribute: 'attribute-a.json',
	table: 'table-a.json',
	column: 'column-a.json'
};

describe('resolveRelatedFilenames', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(resolveSharedFileMappingBundle).mockResolvedValue({ ...FULL_BUNDLE });
	});

	it('projects known related filenames from the canonical shared bundle', async () => {
		const related = await resolveRelatedFilenames('term', 'term-a.json', {
			vocabulary: 'legacy-vocabulary.json'
		});

		expect(Object.fromEntries(related)).toEqual({
			vocabulary: 'vocabulary-a.json',
			domain: 'domain-a.json',
			column: 'column-a.json'
		});
		expect(resolveSharedFileMappingBundle).toHaveBeenCalledWith('term', 'term-a.json');
	});

	it('uses default filenames only for the default bundle path', async () => {
		vi.mocked(resolveSharedFileMappingBundle).mockResolvedValue(null);

		const related = await resolveRelatedFilenames('term', DEFAULT_FILENAMES.term);

		expect(Object.fromEntries(related)).toEqual({
			vocabulary: DEFAULT_FILENAMES.vocabulary,
			domain: DEFAULT_FILENAMES.domain,
			column: DEFAULT_FILENAMES.column
		});
	});

	it('fails fast for non-default files without a canonical shared bundle', async () => {
		vi.mocked(resolveSharedFileMappingBundle).mockResolvedValue(null);

		await expect(resolveRelatedFilenames('term', 'term-a.json')).rejects.toThrow(
			'공통 파일 매핑을 찾을 수 없습니다'
		);
	});
});
