import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dbDesignPages = [
	{ route: 'database', type: 'database' },
	{ route: 'entity', type: 'entity' },
	{ route: 'attribute', type: 'attribute' },
	{ route: 'table', type: 'table' },
	{ route: 'column', type: 'column' }
];

describe('DB design browse validation entry points', () => {
	it.each(dbDesignPages)('$route browse wires relation validation drawer', ({ route, type }) => {
		const source = readFileSync(
			join(process.cwd(), 'src', 'routes', route, 'browse', '+page.svelte'),
			'utf8'
		);

		expect(source).toContain('DesignRelationValidationPanel');
		expect(source).toContain(`RELATION_SCOPE_TYPE = '${type}'`);
		expect(source).toContain('/api/validation/design-relations?');
		expect(source).toContain('scopeType: RELATION_SCOPE_TYPE');
		expect(source).toContain('[`${RELATION_SCOPE_TYPE}File`]: selectedFilename');
		expect(source).toContain('on:edit={handleRelationValidationEdit}');
		expect(source).toContain('on:autofix={handleRelationValidationAutoFix}');
		expect(source).toContain('유효성 검사');
	});
});
