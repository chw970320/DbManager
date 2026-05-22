import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(currentDir, '+page.svelte'), 'utf8');
const sidebarSource = source.match(/\{#snippet sidebar\(\)\}([\s\S]*?)\{\/snippet\}/)?.[1] ?? '';

describe('ERD page sidebar and main controls contract', () => {
	it('uses browse sidebar layout and column definition file manager', () => {
		expect(source).toContain('BrowsePageLayout');
		expect(source).toContain('sidebarSurface="plain"');
		expect(source).toContain('ColumnDefFileManager');
		expect(sidebarSource).toContain('aria-label="ERD 컬럼 정의서 파일 선택"');
		expect(sidebarSource).toContain('aria-label="ERD 매핑 기준"');
	});

	it('keeps query, table selection, and download controls in the main content', () => {
		expect(source).toContain('aria-label="ERD 메인 제어 영역"');
		expect(source).toContain('aria-label="ERD 조회 조건"');
		expect(source).toContain('aria-label="ERD 테이블 다중 선택"');
		expect(source).toContain('aria-label="ERD 이미지 다운로드"');
		expect(sidebarSource).not.toContain('aria-label="ERD 조회 조건"');
		expect(sidebarSource).not.toContain('aria-label="ERD 테이블 다중 선택"');
		expect(sidebarSource).not.toContain('aria-label="ERD 이미지 다운로드"');
	});

	it('keeps subject area and schema as Korean-labeled select boxes in the main query controls', () => {
		expect(source).toMatch(/for="subjectAreaFilter"[\s\S]*?<select/);
		expect(source).toMatch(/for="schemaFilter"[\s\S]*?>스키마<\/label[\s\S]*?<select/);
		expect(source).toContain('<option value="">전체</option>');
		expect(source).toContain('placeholder="영문/한글/스키마"');
	});

	it('removes old top filter and manual generation controls', () => {
		expect(source).not.toContain('Graphviz ERD 필터 패널');
		expect(source).not.toContain('showTableSelector');
		expect(source).not.toContain('selectionMode');
		expect(source).not.toContain('ERD 생성');
		expect(source).not.toContain('데이터베이스 정의서 파일 선택');
		expect(source).not.toContain('테이블 정의서 파일 선택');
	});
});
