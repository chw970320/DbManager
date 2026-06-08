import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ERDViewer from './ERDViewer.svelte';
import type { ERDData } from '../types/erd-mapping.js';
import type { DesignRelationValidationResult } from '../types/design-relation.js';

type ERDViewerTestData = ERDData & {
	relationValidation?: DesignRelationValidationResult;
};

function createRelationValidation(): DesignRelationValidationResult {
	return {
		specs: [],
		rules: [],
		summaries: [
			{
				relationId: 'TABLE_COLUMN_MAPPING',
				relationName: '테이블 -> 컬럼',
				totalChecked: 1,
				matched: 0,
				unmatched: 1,
				severity: 'error',
				mappingKey: '주제영역+schema+테이블영문명+관련엔터티명',
				issues: [
					{
						issueId: 'issue-1',
						relationId: 'TABLE_COLUMN_MAPPING',
						relationName: '테이블 -> 컬럼',
						severity: 'error',
						sourceType: 'table',
						targetType: 'column',
						sourceId: 'table-1',
						sourceLabel: '사용자',
						targetId: 'column-1',
						targetLabel: 'USER_NM',
						expectedKey: '회원.public.TB_USER.사용자',
						actualKey: '회원.public.TB_USER.고객',
						reason: '연관 엔터티명이 테이블 정의서와 다릅니다.',
						message: '컬럼 관계가 테이블 정의서와 일치하지 않습니다.',
						field: 'relatedEntityName',
						affectedRows: [],
						manualTargets: [],
						participants: [
							{
								type: 'table',
								id: 'table-1',
								label: '사용자',
								role: 'source'
							},
							{
								type: 'column',
								id: 'column-1',
								label: 'USER_NM',
								role: 'target'
							}
						],
						involvedTypes: ['table', 'column'],
						resolutionTargets: [
							{
								resolutionTargetId: 'target-column-1',
								targetType: 'column',
								targetId: 'column-1',
								targetLabel: 'USER_NM',
								mode: 'auto_patch',
								candidateId: 'candidate-1',
								patch: {
									targetType: 'column',
									targetId: 'column-1',
									fields: { relatedEntityName: '사용자' }
								},
								autoFixable: true,
								reason: '테이블 정의서 기준',
								previewText: '컬럼 정의서를 사용자로 변경합니다.'
							},
							{
								resolutionTargetId: 'target-table-create',
								targetType: 'table',
								targetLabel: 'TB_USER',
								mode: 'create',
								autoFixable: false,
								reason: '컬럼이 참조하는 테이블을 먼저 추가합니다.',
								previewText: 'TB_USER 항목을 테이블 정의서에 신규 추가합니다.',
								prefill: { tableEnglishName: 'TB_USER' }
							}
						],
						candidates: [
							{
								candidateId: 'candidate-1',
								issueId: 'issue-1',
								targetType: 'column',
								targetId: 'column-1',
								targetLabel: 'USER_NM',
								patch: {
									targetType: 'column',
									targetId: 'column-1',
									fields: { relatedEntityName: '사용자' }
								},
								reason: '테이블 정의서 기준',
								confidence: 'high',
								previewText: '컬럼 정의서를 사용자로 변경합니다.',
								autoFixable: true
							}
						],
						autoFixable: true,
						actionGuide: '후보를 선택해 컬럼 정의서를 자동 수정하거나 수동 수정하세요.'
					}
				]
			}
		],
		issues: [],
		totals: {
			totalChecked: 8,
			matched: 5,
			unmatched: 3,
			errorCount: 2,
			warningCount: 1
		}
	};
}

function createMockERDData(
	metadataOverrides: Partial<ERDData['metadata']> = {},
	relationValidation?: DesignRelationValidationResult
): ERDViewerTestData {
	return {
		nodes: [
			{
				id: 'node-1',
				type: 'table',
				layerType: 'physical',
				label: 'users',
				data: {
					id: 'table-1',
					tableEnglishName: 'users',
					schemaName: 'public',
					businessClassification: 'COMMON',
					tableVolume: 'SMALL',
					nonPublicReason: '',
					openDataList: '',
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z'
				}
			}
		],
		edges: [],
		mappings: [],
		metadata: {
			generatedAt: '2024-01-01T00:00:00.000Z',
			totalNodes: 1,
			totalEdges: 0,
			totalMappings: 0,
			totalRelationships: 0,
			logicalNodes: 0,
			physicalNodes: 1,
			domainNodes: 0,
			...metadataOverrides
		},
		relationValidation
	};
}

const defaultProps = {
	erdData: createMockERDData(),
	renderUrl: '/api/erd/render?format=svg&mode=logical'
};

const safeSvg =
	'<svg width="400pt" height="200pt" viewBox="0 0 400 200"><g><text>ERD</text></g></svg>';

class MockResizeObserver {
	observe = vi.fn();
	disconnect = vi.fn();
}

function mockSvgResponse(svg = safeSvg, contentType = 'image/svg+xml; charset=utf-8') {
	return Promise.resolve(
		new Response(svg, {
			status: 200,
			headers: { 'Content-Type': contentType }
		})
	);
}

describe('ERDViewer', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		fetchMock = vi.fn(() => mockSvgResponse());
		vi.stubGlobal('fetch', fetchMock);
		vi.stubGlobal('ResizeObserver', MockResizeObserver);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('SVG 미리보기를 안전하게 fetch해서 렌더링한다', async () => {
		render(ERDViewer, { props: defaultProps });

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/erd/render?format=svg&mode=logical',
			expect.objectContaining({ signal: expect.any(AbortSignal) })
		);
		expect(await screen.findByTestId('erd-svg-preview')).toBeInTheDocument();
		expect(screen.queryByText('ERD 이미지를 불러오는 중...')).not.toBeInTheDocument();
	});

	it('보기 도구와 확대 상태를 한국어로 표시한다', async () => {
		render(ERDViewer, { props: defaultProps });

		expect(await screen.findByRole('button', { name: '다이어그램 맞춤' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '다이어그램 100% 보기' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '다이어그램 축소' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '다이어그램 확대' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '다이어그램 초기화' })).toBeInTheDocument();
		expect(screen.getByTestId('erd-zoom-percent')).toHaveTextContent(/%/);
	});

	it('희박한 ERD 그래프 상태와 안전 렌더링 안내를 표시한다', async () => {
		render(ERDViewer, {
			props: {
				...defaultProps,
				erdData: createMockERDData({}, createRelationValidation())
			}
		});

		await screen.findByTestId('erd-svg-preview');

		expect(screen.getByLabelText('ERD 그래프 상태 안내')).toBeInTheDocument();
		expect(screen.getByText(/그래프 상태: 희박\/빈 관계/)).toBeInTheDocument();
		expect(screen.getByText(/관계가 없거나 매우 적습니다/)).toBeInTheDocument();
		expect(screen.getByText(/탐색: 맞춤\/100%\/확대\/축소\/드래그\/휠로 이동/)).toBeInTheDocument();
		expect(screen.getByText(/안전 렌더링: 허용된 ERD 이미지 URL만 표시합니다/)).toBeInTheDocument();
		expect(screen.getByText(/관계 검증: 미매칭 3건 · 오류\s*2건 · 경고\s*1건/)).toBeInTheDocument();
		expect(screen.queryByLabelText('ERD 관계 검증 이슈')).not.toBeInTheDocument();
		expect(screen.queryByText(/테이블 -> 컬럼 · USER_NM/)).not.toBeInTheDocument();
		expect(screen.queryByText(/참여: table:사용자 \/ column:USER_NM/)).not.toBeInTheDocument();
		expect(screen.queryByText(/조치 상태: 자동 1건 · 수동 0건 · 신규 1건/)).not.toBeInTheDocument();
		expect(screen.queryByText(/수정 대상:/)).not.toBeInTheDocument();
		expect(screen.queryByText(/조치: 후보를 선택해 컬럼 정의서를 자동 수정/)).not.toBeInTheDocument();
	});

	it('큰 ERD 그래프에는 확대/이동 탐색 힌트를 우선 표시한다', async () => {
		render(ERDViewer, {
			props: {
				...defaultProps,
				erdData: createMockERDData({
					totalNodes: 60,
					totalRelationships: 90
				})
			}
		});

		await screen.findByTestId('erd-svg-preview');

		expect(screen.getByText(/그래프 상태: 큰 그래프/)).toBeInTheDocument();
		expect(screen.getByText(/맞춤, 축소\/확대, 드래그 이동으로 탐색하세요/)).toBeInTheDocument();
	});

	it('렌더러 기술명을 화면에 노출하지 않는다', async () => {
		const { container } = render(ERDViewer, { props: defaultProps });

		await screen.findByTestId('erd-svg-preview');

		expect(container).not.toHaveTextContent('Graphviz');
		expect(container).not.toHaveTextContent('Mermaid');
		expect(screen.queryByText('Mermaid 코드 복사')).not.toBeInTheDocument();
		expect(screen.queryByText('Mermaid 파일 다운로드')).not.toBeInTheDocument();
	});

	it('미리보기 헤더에 중복 다운로드 링크를 노출하지 않는다', async () => {
		render(ERDViewer, { props: defaultProps });

		await screen.findByTestId('erd-svg-preview');

		expect(screen.queryByText('SVG 다운로드')).not.toBeInTheDocument();
		expect(screen.queryByText('PNG 다운로드')).not.toBeInTheDocument();
	});

	it('이미지 관계 수와 혼동되는 구조적 엣지 수를 노출하지 않는다', async () => {
		render(ERDViewer, { props: defaultProps });

		await screen.findByTestId('erd-svg-preview');

		expect(screen.getByText(/노드: 1개/)).toBeInTheDocument();
		expect(screen.getByText(/관계: 0개/)).toBeInTheDocument();
		expect(screen.queryByText(/엣지:/)).not.toBeInTheDocument();
	});

	it('잘못된 응답은 한국어 오류 메시지로 표시한다', async () => {
		fetchMock.mockResolvedValueOnce(
			new Response('not svg', {
				status: 200,
				headers: { 'Content-Type': 'text/plain' }
			})
		);

		render(ERDViewer, { props: defaultProps });

		expect(await screen.findByText('이미지 생성 오류')).toBeInTheDocument();
		expect(screen.getByText(/ERD 이미지를 불러오지 못했습니다/)).toBeInTheDocument();
	});

	it('동일 출처 ERD 렌더 API 외 URL은 거부한다', async () => {
		render(ERDViewer, { props: { ...defaultProps, renderUrl: 'https://example.com/erd.svg' } });

		expect(await screen.findByText('이미지 생성 오류')).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('SVG 주입 전 위험한 태그와 속성을 제거한다', async () => {
		fetchMock.mockResolvedValueOnce(
			mockSvgResponse(
				'<svg width="100" height="80"><script>alert(1)</script><foreignObject></foreignObject><g onclick="evil()"><a href="javascript:evil()">ERD</a></g></svg>'
			)
		);

		const { container } = render(ERDViewer, { props: defaultProps });

		await screen.findByTestId('erd-svg-preview');

		expect(container.querySelector('script')).toBeNull();
		expect(container.querySelector('foreignObject')).toBeNull();
		expect(container.innerHTML).not.toContain('onclick=');
		expect(container.innerHTML).not.toContain('javascript:');
	});

	it('맞춤/100%/확대/축소/초기화 버튼이 확대 상태를 변경한다', async () => {
		render(ERDViewer, { props: defaultProps });

		await screen.findByTestId('erd-svg-preview');
		const zoomLabel = () => screen.getByTestId('erd-zoom-percent').textContent;
		const initialZoom = zoomLabel();

		await fireEvent.click(screen.getByRole('button', { name: '다이어그램 100% 보기' }));
		expect(zoomLabel()).toBe('100%');

		await fireEvent.click(screen.getByRole('button', { name: '다이어그램 확대' }));
		expect(zoomLabel()).toBe('120%');

		await fireEvent.click(screen.getByRole('button', { name: '다이어그램 축소' }));
		expect(zoomLabel()).toBe('100%');

		await fireEvent.click(screen.getByRole('button', { name: '다이어그램 초기화' }));
		await waitFor(() => expect(zoomLabel()).toBe(initialZoom));
	});

	it('포인터 드래그로 다이어그램 위치를 이동한다', async () => {
		render(ERDViewer, { props: defaultProps });

		const preview = await screen.findByTestId('erd-svg-preview');
		const viewport = screen.getByTestId('erd-viewer-viewport');
		const initialTransform = preview.getAttribute('style');

		await fireEvent.pointerDown(viewport, { button: 0, pointerId: 1, clientX: 100, clientY: 100 });
		await fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 150, clientY: 130 });
		await fireEvent.pointerUp(viewport, { pointerId: 1, clientX: 150, clientY: 130 });

		expect(preview.getAttribute('style')).not.toBe(initialTransform);
	});
});
