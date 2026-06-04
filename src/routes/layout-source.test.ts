import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(currentDir, '+layout.svelte'), 'utf8');

describe('Global layout navigation source contract', () => {
	it('keeps desktop navigation discoverable by label and keyboard focus', () => {
		expect(source).toContain('aria-label="주요 메뉴"');
		expect(source).toContain('aria-haspopup="true"');
		expect(source).toContain('group-focus-within:visible');
		expect(source).toContain('aria-label={`${group.label} 메뉴`}');
	});

	it('keeps mobile menu expansion state explicit in Korean labels', () => {
		expect(source).toContain("{mobileMenuOpen ? '메인 메뉴 닫기' : '메인 메뉴 열기'}");
		expect(source).toContain('aria-expanded={openMobileGroupId === group.id}');
		expect(source).toContain('aria-controls={`mobile-menu-${group.id}`}');
		expect(source).toContain('id={`mobile-menu-${group.id}`}');
	});
});
