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

type DownloadActions = {
	downloadCurrentSvg: () => Promise<void>;
	downloadCurrentPng: () => Promise<void>;
};

const safeSvg =
	'<svg width="400pt" height="200pt" viewBox="0 0 400 200"><g><text>ERD</text></g></svg>';
const layoutSvg = `
<svg width="500" height="260" viewBox="0 0 500 260">
	<g class="graph">
		<g class="edge">
			<title>table_a->table_b</title>
			<path d="M140 70 L280 70" stroke="#475569" fill="none" />
		</g>
		<g class="node">
			<title>table_a</title>
			<polygon points="20,20 140,20 140,120 20,120" />
			<text x="35" y="55">TABLE_A</text>
		</g>
		<g class="node">
			<title>table_b</title>
			<polygon points="280,40 430,40 430,140 280,140" />
			<text x="300" y="75">TABLE_B</text>
		</g>
	</g>
</svg>`;

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

async function enableLayoutAndDragFirstNode(
	container: HTMLElement,
	deltaX: number,
	deltaY: number,
	pointerId = 2
) {
	await fireEvent.click(screen.getByRole('button', { name: '테이블 배치 수정 모드' }));
	const firstNode = container.querySelector('g.node') as SVGGElement;
	expect(firstNode).toBeTruthy();
	await fireEvent.pointerDown(firstNode, {
		button: 0,
		pointerId,
		clientX: 100,
		clientY: 100
	});
	await fireEvent.pointerMove(screen.getByTestId('erd-viewer-viewport'), {
		pointerId,
		clientX: 100 + deltaX,
		clientY: 100 + deltaY
	});
	await fireEvent.pointerUp(screen.getByTestId('erd-viewer-viewport'), {
		pointerId,
		clientX: 100 + deltaX,
		clientY: 100 + deltaY
	});
	return firstNode;
}

function getBlobArgument(mock: { mock: { calls: unknown[][] } }, callIndex = 0): Blob {
	return mock.mock.calls[callIndex]?.[0] as Blob;
}

function readBlobText(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result ?? ''));
		reader.onerror = () => reject(reader.error ?? new Error('Blob 텍스트를 읽지 못했습니다.'));
		reader.readAsText(blob);
	});
}

function renderWithDownloadActions(props: typeof defaultProps = defaultProps) {
	let actions: DownloadActions | null = null;
	return {
		...render(ERDViewer, {
			props: {
				...props,
				onDownloadActionsReady: (nextActions: DownloadActions | null) => {
					actions = nextActions;
				}
			}
		}),
		getActions: () => actions
	};
}

async function findDownloadActions(
	getActions: () => DownloadActions | null
): Promise<DownloadActions> {
	await waitFor(() => expect(getActions()).not.toBeNull());
	const actions = getActions();
	if (!actions) throw new Error('다운로드 액션이 준비되지 않았습니다.');
	return actions;
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
		vi.restoreAllMocks();
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
		expect(screen.getByRole('button', { name: '테이블 배치 수정 모드' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '테이블 배치 초기화' })).toBeDisabled();
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
		expect(
			screen.queryByText(/조치: 후보를 선택해 컬럼 정의서를 자동 수정/)
		).not.toBeInTheDocument();
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

	it('현재 배치 기준 SVG/PNG 다운로드 액션을 부모에 제공하고 버튼은 직접 표시하지 않는다', async () => {
		const { getActions } = renderWithDownloadActions();

		await screen.findByTestId('erd-svg-preview');

		const actions = await findDownloadActions(getActions);
		expect(actions.downloadCurrentSvg).toEqual(expect.any(Function));
		expect(actions.downloadCurrentPng).toEqual(expect.any(Function));
		expect(
			screen.queryByRole('button', { name: '현재 배치 SVG 다운로드' })
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: '현재 배치 PNG 다운로드' })
		).not.toBeInTheDocument();
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

	it('최초 렌더부터 Graphviz 관계선을 숨기고 브라우저 오버레이 관계선을 표시한다', async () => {
		fetchMock.mockResolvedValueOnce(mockSvgResponse(layoutSvg));
		const { container } = render(ERDViewer, { props: defaultProps });

		await screen.findByTestId('erd-svg-preview');

		const graphvizEdge = container.querySelector('g.edge') as SVGGElement;
		expect(graphvizEdge.style.display).toBe('none');
		expect(container.querySelector('.erd-manual-edge line')).toBeInTheDocument();
		expect(container.querySelectorAll('.erd-manual-edge line')).toHaveLength(5);
		expect(screen.getByRole('button', { name: '테이블 배치 초기화' })).toBeDisabled();
	});

	it('배치 수정 모드에서 테이블 노드를 드래그하고 수동 관계선을 다시 그린다', async () => {
		fetchMock.mockResolvedValueOnce(mockSvgResponse(layoutSvg));
		const { container } = render(ERDViewer, { props: defaultProps });

		await screen.findByTestId('erd-svg-preview');
		const firstNode = await enableLayoutAndDragFirstNode(container, 40, 25);

		expect(firstNode.getAttribute('transform')).toContain('translate(40 25)');
		expect(firstNode).not.toHaveAttribute('role');
		expect(firstNode).not.toHaveAttribute('tabindex');
		const manualLine = container.querySelector('.erd-manual-edge line') as SVGLineElement;
		expect(manualLine).toBeInTheDocument();
		expect(manualLine.getAttribute('marker-start')).toBeNull();
		expect(manualLine.getAttribute('marker-end')).toBeNull();
		expect(Number(manualLine.getAttribute('x1'))).toBeGreaterThan(180);
		expect(Number(manualLine.getAttribute('x2'))).toBeLessThan(280);
		expect(container.querySelectorAll('.erd-manual-edge line')).toHaveLength(5);
		expect(screen.getByRole('button', { name: '테이블 배치 초기화' })).toBeEnabled();
	});

	it('renderUrl이 바뀌면 수동 배치를 초기화한다', async () => {
		fetchMock.mockResolvedValueOnce(mockSvgResponse(layoutSvg));
		const { container, rerender } = render(ERDViewer, { props: defaultProps });

		await screen.findByTestId('erd-svg-preview');
		await fireEvent.click(screen.getByRole('button', { name: '테이블 배치 수정 모드' }));
		const firstNode = container.querySelector('g.node') as SVGGElement;
		await fireEvent.pointerDown(firstNode, { button: 0, pointerId: 3, clientX: 100, clientY: 100 });
		await fireEvent.pointerMove(screen.getByTestId('erd-viewer-viewport'), {
			pointerId: 3,
			clientX: 130,
			clientY: 120
		});
		expect(firstNode.getAttribute('transform')).toContain('translate(30 20)');

		fetchMock.mockResolvedValueOnce(mockSvgResponse(layoutSvg));
		await rerender({
			...defaultProps,
			renderUrl: '/api/erd/render?format=svg&mode=logical&q=next'
		});

		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		const nextNode = container.querySelector('g.node') as SVGGElement;
		expect(nextNode.getAttribute('transform')).toBeNull();
		expect(screen.getByRole('button', { name: '테이블 배치 수정 모드' })).toHaveAttribute(
			'aria-pressed',
			'false'
		);
	});

	it('현재 수정된 SVG를 client-side로 다운로드한다', async () => {
		fetchMock.mockResolvedValueOnce(mockSvgResponse(layoutSvg));
		const createObjectUrl = vi.fn(() => 'blob:erd-svg');
		const revokeObjectUrl = vi.fn();
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl });
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrl });
		const clickSpy = vi
			.spyOn(HTMLAnchorElement.prototype, 'click')
			.mockImplementation(() => undefined);

		const { container, getActions } = renderWithDownloadActions();
		await screen.findByTestId('erd-svg-preview');
		await enableLayoutAndDragFirstNode(container, 600, 0, 4);

		await (await findDownloadActions(getActions)).downloadCurrentSvg();

		expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
		const svgBlob = getBlobArgument(createObjectUrl);
		const svgText = await readBlobText(svgBlob);
		expect(svgText).toContain('translate(600 0)');
		expect(svgText).toContain('class="erd-manual-edges"');
		expect(svgText).toContain('class="erd-manual-edge"');
		expect(svgText).not.toContain('marker-start');
		expect(svgText).toContain('viewBox="-24 -24 788 308"');
		expect(clickSpy).toHaveBeenCalled();
		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:erd-svg');
	});

	it('수동 배치가 없어도 PNG는 현재 미리보기 SVG를 client-side로 변환한다', async () => {
		fetchMock.mockResolvedValueOnce(mockSvgResponse(layoutSvg));
		const createObjectUrl = vi
			.fn()
			.mockReturnValueOnce('blob:source-svg')
			.mockReturnValueOnce('blob:download-png');
		const revokeObjectUrl = vi.fn();
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl });
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrl });
		const clickSpy = vi
			.spyOn(HTMLAnchorElement.prototype, 'click')
			.mockImplementation(() => undefined);
		const drawImage = vi.fn();
		const fillRect = vi.fn();
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
			drawImage,
			fillRect,
			fillStyle: ''
		} as unknown as CanvasRenderingContext2D);
		vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
			callback(new Blob(['png'], { type: 'image/png' }));
		});
		class MockImage {
			onload: (() => void) | null = null;
			onerror: (() => void) | null = null;
			set src(_value: string) {
				queueMicrotask(() => this.onload?.());
			}
		}
		vi.stubGlobal('Image', MockImage);

		const { getActions } = renderWithDownloadActions();
		await screen.findByTestId('erd-svg-preview');

		await (await findDownloadActions(getActions)).downloadCurrentPng();

		await waitFor(() => expect(drawImage).toHaveBeenCalled());
		const svgBlob = getBlobArgument(createObjectUrl);
		const svgText = await readBlobText(svgBlob);
		expect(svgText).toContain('class="erd-manual-edges"');
		expect(svgText).toContain('class="erd-manual-edge"');
		expect(svgText).not.toContain('marker-start');
		expect(drawImage.mock.calls[0][3]).toBe(500);
		expect(drawImage.mock.calls[0][4]).toBe(260);
		expect(fillRect).toHaveBeenCalled();
		expect(clickSpy).toHaveBeenCalled();
		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:source-svg');
		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:download-png');
	});

	it('현재 수정된 SVG를 PNG로 변환해 client-side로 다운로드한다', async () => {
		fetchMock.mockResolvedValueOnce(mockSvgResponse(layoutSvg));
		const createObjectUrl = vi
			.fn()
			.mockReturnValueOnce('blob:source-svg')
			.mockReturnValueOnce('blob:download-png');
		const revokeObjectUrl = vi.fn();
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl });
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrl });
		const clickSpy = vi
			.spyOn(HTMLAnchorElement.prototype, 'click')
			.mockImplementation(() => undefined);
		const drawImage = vi.fn();
		const fillRect = vi.fn();
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
			drawImage,
			fillRect,
			fillStyle: ''
		} as unknown as CanvasRenderingContext2D);
		vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
			callback(new Blob(['png'], { type: 'image/png' }));
		});
		class MockImage {
			onload: (() => void) | null = null;
			onerror: (() => void) | null = null;
			set src(_value: string) {
				queueMicrotask(() => this.onload?.());
			}
		}
		vi.stubGlobal('Image', MockImage);

		const { container, getActions } = renderWithDownloadActions();
		await screen.findByTestId('erd-svg-preview');
		await enableLayoutAndDragFirstNode(container, 600, 0, 5);

		await (await findDownloadActions(getActions)).downloadCurrentPng();

		await waitFor(() => expect(drawImage).toHaveBeenCalled());
		const svgBlob = getBlobArgument(createObjectUrl);
		const svgText = await readBlobText(svgBlob);
		expect(svgText).toContain('translate(600 0)');
		expect(svgText).toContain('viewBox="-24 -24 788 308"');
		expect(drawImage.mock.calls[0][3]).toBe(788);
		expect(drawImage.mock.calls[0][4]).toBe(308);
		expect(fillRect).toHaveBeenCalled();
		expect(clickSpy).toHaveBeenCalled();
		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:source-svg');
		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:download-png');
	});

	it('수동 배치 PNG가 브라우저 변환 한도를 넘으면 화면에 오류를 표시한다', async () => {
		fetchMock.mockResolvedValueOnce(mockSvgResponse(layoutSvg));
		const createObjectUrl = vi.fn();
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl });
		const { container, getActions } = renderWithDownloadActions();

		await screen.findByTestId('erd-svg-preview');
		await enableLayoutAndDragFirstNode(container, 20000, 0, 6);

		await (await findDownloadActions(getActions)).downloadCurrentPng();

		expect(await screen.findByText(/PNG 크기가 브라우저 변환 한도를 초과/)).toBeInTheDocument();
		expect(createObjectUrl).not.toHaveBeenCalled();
	});
});
