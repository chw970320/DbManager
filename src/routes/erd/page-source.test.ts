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

	it('keeps query, table selection, and download card in the main content', () => {
		expect(source).toContain('aria-label="ERD 메인 제어 영역"');
		expect(source).toContain('aria-label="ERD 조회 조건"');
		expect(source).toContain('aria-label="ERD 테이블 다중 선택"');
		expect(source).toContain('aria-label="ERD 이미지 다운로드"');
		expect(source).toContain('onDownloadActionsReady={handleErdDownloadActionsReady}');
		expect(source).toContain('onclick={downloadCurrentErdSvg}');
		expect(source).toContain('onclick={downloadCurrentErdPng}');
		expect(source).not.toContain("href={getErdRenderUrl('svg', true)}");
		expect(source).not.toContain("href={getErdRenderUrl('png', true)}");
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

	it('removes ERD relation summary and legacy sync entry points', () => {
		const relationSummaryLabel = ['연관관계', '요약'].join(' ');
		const relationSummaryTitle = ['데이터', '연관관계', '요약'].join(' ');
		const legacySyncLabel = ['레거시', '동기화', '미리보기'].join(' ');
		const legacySyncPath = ['/api/erd/relations', 'sync'].join('/');

		expect(source).not.toContain(relationSummaryLabel);
		expect(source).not.toContain(relationSummaryTitle);
		expect(source).not.toContain(legacySyncLabel);
		expect(source).not.toContain(legacySyncPath);
		expect(source).not.toMatch(/handleRelation\w+Preview/);
		expect(source).not.toContain('showMappingSummary');
		expect(source).not.toContain('mappingStats');
		expect(source).not.toContain('통합 정합성 요약');
		expect(source).not.toContain('ERD 정의서 관계 미매칭 상세');
		expect(source).not.toContain('미매칭·참여 정의서·수정 대상·조치 정보');
		expect(source).not.toContain('relationParticipantSummary(issue)');
		expect(source).not.toContain('relationActionStateSummary(issue)');
		expect(source).not.toContain('relationResolutionTargets(issue)');
		expect(source).not.toContain('relationResolutionTargetSummary');
		expect(source).not.toContain('조치 가이드: {issue.actionGuide}');
		expect(source).toContain('bind:checked={includeExternalReferences}');
		expect(source).toContain(
			"params.set('includeExternalReferences', includeExternalReferences.toString())"
		);
		expect(source).not.toContain('candidateSummary');
	});
});
