import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveErdFileContext } from './erd-file-context';

vi.mock('$lib/registry/db-design-file-mapping', () => ({
	resolveDbDesignFileMappingBundle: vi.fn()
}));

import { resolveDbDesignFileMappingBundle } from '$lib/registry/db-design-file-mapping';

describe('resolveErdFileContext', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(resolveDbDesignFileMappingBundle).mockResolvedValue({
			vocabulary: 'mapped-vocabulary.json',
			domain: 'mapped-domain.json',
			term: 'mapped-term.json',
			database: 'mapped-database.json',
			entity: 'mapped-entity.json',
			attribute: 'mapped-attribute.json',
			table: 'mapped-table.json',
			column: 'custom-column.json'
		});
	});

	it('columnFile 기준으로 매핑된 테이블 정의서와 관련 정의서를 해석한다', async () => {
		const result = await resolveErdFileContext({ columnFile: 'custom-column.json' });

		expect(resolveDbDesignFileMappingBundle).toHaveBeenCalledWith('column', 'custom-column.json');
		expect(result.files).toEqual(
			expect.objectContaining({
				columnFile: 'custom-column.json',
				tableFile: 'mapped-table.json',
				databaseFile: 'mapped-database.json',
				entityFile: 'mapped-entity.json',
				attributeFile: 'mapped-attribute.json',
				domainFile: 'mapped-domain.json',
				vocabularyFile: 'mapped-vocabulary.json'
			})
		);
		expect(result.mappedTableFile).toBe('mapped-table.json');
		expect(result.hasExplicitFile).toBe(true);
	});

	it('명시 tableFile은 column mapping보다 우선한다', async () => {
		const result = await resolveErdFileContext({
			columnFile: 'custom-column.json',
			tableFile: 'explicit-table.json'
		});

		expect(result.files.tableFile).toBe('explicit-table.json');
		expect(result.mappedTableFile).toBe('mapped-table.json');
	});

	it('columnFile이 없으면 기존 명시 파일만 정규화한다', async () => {
		const result = await resolveErdFileContext({ tableFile: 'table.json' });

		expect(resolveDbDesignFileMappingBundle).not.toHaveBeenCalled();
		expect(result.files.tableFile).toBe('table.json');
		expect(result.hasExplicitFile).toBe(true);
	});
});
