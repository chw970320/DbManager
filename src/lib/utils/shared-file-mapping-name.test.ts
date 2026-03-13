import { describe, expect, it } from 'vitest';
import { getSharedFileMappingBundleDisplayName } from './shared-file-mapping-name';

describe('shared-file-mapping-name', () => {
	it('should return a single bundle name when all file stems match', () => {
		expect(
			getSharedFileMappingBundleDisplayName({
				vocabulary: 'bksp.json',
				domain: 'bksp.json',
				term: 'bksp.json',
				database: 'bksp.json',
				entity: 'bksp.json',
				attribute: 'bksp.json',
				table: 'bksp.json',
				column: 'bksp.json'
			})
		).toBe('bksp 번들');
	});

	it('should summarize standard files separately from default design files', () => {
		expect(
			getSharedFileMappingBundleDisplayName({
				vocabulary: 'ecobank.json',
				domain: 'ecobank.json',
				term: 'ecobank.json',
				database: 'database.json',
				entity: 'entity.json',
				attribute: 'attribute.json',
				table: 'table.json',
				column: 'column.json'
			})
		).toBe('ecobank + 기본 DB설계');
	});

	it('should return the default shared bundle label for the built-in mapping', () => {
		expect(
			getSharedFileMappingBundleDisplayName({
				vocabulary: 'vocabulary.json',
				domain: 'domain.json',
				term: 'term.json',
				database: 'database.json',
				entity: 'entity.json',
				attribute: 'attribute.json',
				table: 'table.json',
				column: 'column.json'
			})
		).toBe('기본 공통 번들');
	});
});
