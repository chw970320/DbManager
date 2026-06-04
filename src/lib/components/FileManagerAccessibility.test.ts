import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const fileManagers = [
	'AttributeFileManager.svelte',
	'ColumnDefFileManager.svelte',
	'DatabaseFileManager.svelte',
	'DomainFileManager.svelte',
	'EntityFileManager.svelte',
	'TableDefFileManager.svelte',
	'TermFileManager.svelte',
	'VocabularyFileManager.svelte'
];

function titleId(filename: string): string {
	return `${filename
		.replace('.svelte', '')
		.replace(/(?<!^)([A-Z])/g, '-$1')
		.toLowerCase()}-title`;
}

describe('File manager accessibility and file context', () => {
	it.each(fileManagers)('%s dialog 이름과 파일 context를 노출한다', (filename) => {
		const source = readFileSync(join('src', 'lib', 'components', filename), 'utf8');
		const id = titleId(filename);

		expect(source).toContain(`aria-labelledby="${id}"`);
		expect(source).toContain(`<h2 id="${id}"`);
		expect(source).toContain('현재 선택 파일:');
		expect(source).toContain('업로드/복원 대상:');
		expect(source).not.toContain('aria-label="Close"');
	});
});
