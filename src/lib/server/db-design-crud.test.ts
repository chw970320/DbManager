import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkEntryReferences } from '$lib/registry/mapping-registry';

import { collectDeleteWarnings, getMissingRequiredFields } from './db-design-crud';

vi.mock('$lib/registry/mapping-registry', () => ({
	checkEntryReferences: vi.fn()
}));

describe('db-design-crud helpers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getMissingRequiredFields', () => {
		it('treats missing, empty, and whitespace-only fields as missing', () => {
			const missingFields = getMissingRequiredFields(
				{
					present: 'value',
					empty: '',
					blank: '   '
				},
				['present', 'empty', 'blank', 'absent']
			);

			expect(missingFields).toEqual(['empty', 'blank', 'absent']);
		});
	});

	describe('collectDeleteWarnings', () => {
		it('returns reference warnings without blocking deletion when references exist', async () => {
			const references = [
				{
					type: 'entity' as const,
					filename: 'entity.json',
					count: 1,
					entries: [{ id: 'entity-1', name: '엔터티1' }]
				}
			];
			vi.mocked(checkEntryReferences).mockResolvedValue({
				canDelete: false,
				references
			});

			await expect(
				collectDeleteWarnings('database', { id: 'db-1' }, 'database.json', false)
			).resolves.toEqual(references);
			expect(checkEntryReferences).toHaveBeenCalledWith(
				'database',
				{ id: 'db-1' },
				'database.json'
			);
		});

		it('skips reference checks when force=true', async () => {
			await expect(
				collectDeleteWarnings('column', { id: 'column-1' }, 'column.json', true)
			).resolves.toEqual([]);
			expect(checkEntryReferences).not.toHaveBeenCalled();
		});
	});
});
