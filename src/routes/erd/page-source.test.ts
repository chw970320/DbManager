import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(currentDir, '+page.svelte'), 'utf8');
const sidebarSource = source.match(/\{#snippet sidebar\(\)\}([\s\S]*?)\{\/snippet\}/)?.[1] ?? '';

function getSelectSource(id: string): string {
	return source.match(new RegExp(`id="${id}"[\\s\\S]*?<\\/select>`))?.[0] ?? '';
}

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
		const subjectAreaSelect = getSelectSource('subjectAreaFilter');
		const schemaSelect = getSelectSource('schemaFilter');

		expect(source).toMatch(/for="subjectAreaFilter"[\s\S]*?<select/);
		expect(source).toMatch(/for="schemaFilter"[\s\S]*?>스키마<\/label[\s\S]*?<select/);
		expect(subjectAreaSelect).not.toContain('<option value="">전체</option>');
		expect(schemaSelect).not.toContain('<option value="">전체</option>');
		expect(source).toContain('pickFirstOption');
		expect(source).toContain('normalizeFiltersAfterTableLoad({ selectAll: true })');
	});

	it('keeps table selection collapsed by default with searchable edit controls', () => {
		expect(source).toContain('let isTableSelectionExpanded = $state(false)');
		expect(source).toContain('aria-expanded={isTableSelectionExpanded}');
		expect(source).toContain('기본으로 조건 결과 전체가 선택됩니다');
		expect(source).toContain('placeholder="영문/한글/스키마/주제영역"');
		expect(source).toContain('selectedFilteredTableIds().length');
	});

	it('removes old top filter and manual generation controls', () => {
		expect(source).not.toContain('Graphviz ERD 필터 패널');
		expect(source).not.toContain('showTableSelector');
		expect(source).not.toContain('selectionMode');
		expect(source).not.toContain('ERD 생성');
		expect(source).not.toContain('데이터베이스 정의서 파일 선택');
		expect(source).not.toContain('테이블 정의서 파일 선택');
	});

	it('does not expose legacy related logical definition controls', () => {
		expect(source).not.toContain('관련 논리 정의 포함');
		expect(source).not.toContain('includeRelated');
	});

	it('surfaces canonical relation issue targets and marks legacy sync preview', () => {
		expect(source).toContain('ERD 정의서 관계 미매칭 상세');
		expect(source).toContain('relationParticipantSummary(issue)');
		expect(source).toContain('relationActionStateSummary(issue)');
		expect(source).toContain('relationResolutionTargets(issue)');
		expect(source).toContain('relationResolutionTargetSummary');
		expect(source).toContain('조치 가이드: {issue.actionGuide}');
		expect(source).toContain('레거시 동기화 미리보기');
		expect(source).toContain('자동 수정은 DB/엔터티/속성/테이블/컬럼 정의서의 유효성 검사 패널');
		expect(source).not.toContain('candidateSummary');
	});
});
