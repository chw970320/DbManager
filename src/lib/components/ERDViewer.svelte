<script lang="ts">
	import { tick } from 'svelte';
	import type { ERDData } from '../types/erd-mapping.js';
	import type { TableEntry } from '../types/database-design.js';
	import type { DesignRelationValidationResult } from '../types/design-relation.js';
	import { isAllowedErdSvgRenderUrl, sanitizeErdSvgText } from '../utils/erd-svg-preview.js';
	import { parseErdTableNodeId } from '../utils/erd-node-id.js';
	import {
		buildErdDefinitionLinks,
		getErdTableDisplayDetail,
		getErdTableDisplayName,
		type ErdDefinitionFiles,
		type ErdDefinitionLink
	} from '../utils/erd-definition-links.js';

	type ERDViewerData = ERDData & {
		relationValidation?: DesignRelationValidationResult;
	};

	type ErdContextMenuState = {
		x: number;
		y: number;
		title: string;
		detail: string;
		links: ErdDefinitionLink[];
	};

	type ERDViewerDownloadActions = {
		downloadCurrentSvg: () => Promise<void>;
		downloadCurrentPng: () => Promise<void>;
	};
	type SvgBox = { x: number; y: number; width: number; height: number };
	type SvgPoint = { x: number; y: number };
	type SvgExportPayload = { text: string; width: number; height: number };

	let {
		erdData,
		renderUrl,
		definitionFiles,
		onDownloadActionsReady
	}: {
		erdData: ERDViewerData;
		renderUrl: string;
		definitionFiles?: ErdDefinitionFiles;
		onDownloadActionsReady?: (actions: ERDViewerDownloadActions | null) => void;
	} = $props();

	const MIN_SCALE = 0.25;
	const MAX_SCALE = 4;
	const ZOOM_STEP = 1.2;
	const FALLBACK_VIEWPORT_WIDTH = 960;
	const FALLBACK_VIEWPORT_HEIGHT = 640;
	const FALLBACK_SVG_SIZE = 800;
	const PREVIEW_ERROR_MESSAGE = 'ERD 이미지를 불러오지 못했습니다. 필터 조건을 확인해 주세요.';
	const VIEWER_BUTTON_CLASS =
		'rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';
	const ACTIVE_VIEWER_BUTTON_CLASS =
		'rounded-md border border-blue-500 bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50';
	const SVG_NS = 'http://www.w3.org/2000/svg';
	const EXPORT_PADDING = 24;
	const MAX_PNG_EXPORT_DIMENSION = 16_384;
	const MAX_PNG_EXPORT_PIXELS = 48_000_000;
	const RELATION_ENDPOINT_GAP = 10;
	const CROW_DEPTH = 13;
	const CROW_HALF_WIDTH = 7;
	const TEE_HALF_LENGTH = 7;
	const CONTEXT_MENU_WIDTH = 248;
	const CONTEXT_MENU_HEADER_HEIGHT = 52;
	const CONTEXT_MENU_ITEM_HEIGHT = 46;
	const CONTEXT_MENU_EDGE_GAP = 8;
	const WHEEL_LINE_HEIGHT = 16;

	let previewLoading = $state(true);
	let previewError = $state<string | null>(null);
	let svgMarkup = $state('');
	let svgNaturalWidth = $state(FALLBACK_SVG_SIZE);
	let svgNaturalHeight = $state(FALLBACK_SVG_SIZE);
	let scale = $state(1);
	let translateX = $state(0);
	let translateY = $state(0);
	let isPanning = $state(false);
	let viewportElement = $state<HTMLDivElement | null>(null);
	let canvasElement = $state<HTMLDivElement | null>(null);
	let layoutEditMode = $state(false);
	let manualLayoutActive = $state(false);
	let downloadError = $state<string | null>(null);
	let contextMenu = $state<ErdContextMenuState | null>(null);

	let requestSequence = 0;
	let activeAbortController: AbortController | null = null;
	let panStartX = 0;
	let panStartY = 0;
	let panStartTranslateX = 0;
	let panStartTranslateY = 0;
	let manualEdgeRebuildFrame: number | null = null;
	let activeNodeDrag = $state<{
		node: SVGGElement;
		pointerId: number;
		startClientX: number;
		startClientY: number;
		startTranslateX: number;
		startTranslateY: number;
	} | null>(null);

	let relationshipCount = $derived(
		erdData.metadata.totalRelationships ?? erdData.metadata.totalEdges
	);
	let relationValidationSummary = $derived(erdData.relationValidation?.totals ?? null);
	let tableEntryById = $derived(
		new Map<string, TableEntry>(
			erdData.nodes
				.filter((node) => node.type === 'table')
				.map((node) => [node.id, node.data as TableEntry])
		)
	);
	let zoomPercent = $derived(Math.round(scale * 100));
	let canvasTransform = $derived(`translate(${translateX}px, ${translateY}px) scale(${scale})`);

	function clamp(value: number, min: number, max: number): number {
		return Math.min(Math.max(value, min), max);
	}

	function getViewportSize(): { width: number; height: number } {
		return {
			width: viewportElement?.clientWidth || FALLBACK_VIEWPORT_WIDTH,
			height: viewportElement?.clientHeight || FALLBACK_VIEWPORT_HEIGHT
		};
	}

	function calculateFitScale(): number {
		const { width, height } = getViewportSize();
		const availableWidth = Math.max(width - 48, 120);
		const availableHeight = Math.max(height - 48, 120);
		const nextScale = Math.min(
			availableWidth / Math.max(svgNaturalWidth, 1),
			availableHeight / Math.max(svgNaturalHeight, 1)
		);
		return clamp(nextScale, MIN_SCALE, 1);
	}

	function centerForScale(nextScale: number): { x: number; y: number } {
		const { width, height } = getViewportSize();
		return {
			x: Math.max((width - svgNaturalWidth * nextScale) / 2, 24),
			y: Math.max((height - svgNaturalHeight * nextScale) / 2, 24)
		};
	}

	function fitToViewport() {
		const nextScale = calculateFitScale();
		const nextCenter = centerForScale(nextScale);
		scale = nextScale;
		translateX = nextCenter.x;
		translateY = nextCenter.y;
	}

	function setNaturalScale() {
		const nextScale = 1;
		const nextCenter = centerForScale(nextScale);
		scale = nextScale;
		translateX = nextCenter.x;
		translateY = nextCenter.y;
	}

	function zoomAt(nextScale: number, originX?: number, originY?: number) {
		const boundedScale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
		const { width, height } = getViewportSize();
		const viewportOriginX = originX ?? width / 2;
		const viewportOriginY = originY ?? height / 2;
		const diagramX = (viewportOriginX - translateX) / scale;
		const diagramY = (viewportOriginY - translateY) / scale;

		scale = boundedScale;
		translateX = viewportOriginX - diagramX * boundedScale;
		translateY = viewportOriginY - diagramY * boundedScale;
	}

	function zoomIn() {
		zoomAt(scale * ZOOM_STEP);
	}

	function zoomOut() {
		zoomAt(scale / ZOOM_STEP);
	}

	function resetView() {
		fitToViewport();
	}

	function getSvgElement(): SVGSVGElement | null {
		return canvasElement?.querySelector('svg') ?? null;
	}

	function getGraphElement(svgElement: SVGSVGElement): SVGElement {
		return svgElement.querySelector('g.graph') ?? svgElement;
	}

	function getNodeTitle(node: SVGGElement): string {
		return node.querySelector('title')?.textContent?.trim() ?? '';
	}

	function getNodeElements(svgElement = getSvgElement()): SVGGElement[] {
		return Array.from(svgElement?.querySelectorAll('g.node') ?? []) as SVGGElement[];
	}

	function getEdgeElements(svgElement = getSvgElement()): SVGGElement[] {
		return Array.from(svgElement?.querySelectorAll('g.edge') ?? []) as SVGGElement[];
	}

	function getNodeTranslate(node: SVGGElement): { x: number; y: number } {
		return {
			x: Number(node.dataset.erdManualX ?? 0) || 0,
			y: Number(node.dataset.erdManualY ?? 0) || 0
		};
	}

	function setNodeTranslate(node: SVGGElement, x: number, y: number) {
		node.dataset.erdManualBaseTransform ??= node.getAttribute('transform') ?? '';
		node.dataset.erdManualX = String(x);
		node.dataset.erdManualY = String(y);
		const baseTransform = node.dataset.erdManualBaseTransform;
		node.setAttribute(
			'transform',
			[baseTransform, `translate(${x} ${y})`].filter(Boolean).join(' ')
		);
		node.classList.add('erd-manual-node-moved');
	}

	function setNodeHandleState() {
		for (const node of getNodeElements()) {
			if (layoutEditMode) {
				node.classList.add('erd-manual-node');
			} else {
				node.classList.remove('erd-manual-node');
			}
		}
	}

	function cancelScheduledManualEdgeRebuild() {
		if (manualEdgeRebuildFrame === null) return;
		if (typeof cancelAnimationFrame !== 'undefined') {
			cancelAnimationFrame(manualEdgeRebuildFrame);
		}
		manualEdgeRebuildFrame = null;
	}

	function resetManualLayout() {
		activeNodeDrag = null;
		manualLayoutActive = false;
		cancelScheduledManualEdgeRebuild();
		for (const node of getNodeElements()) {
			const baseTransform = node.dataset.erdManualBaseTransform;
			if (baseTransform === undefined) {
				node.removeAttribute('transform');
			} else if (baseTransform) {
				node.setAttribute('transform', baseTransform);
			} else {
				node.removeAttribute('transform');
			}
			delete node.dataset.erdManualBaseTransform;
			delete node.dataset.erdManualX;
			delete node.dataset.erdManualY;
			node.classList.remove('erd-manual-node-moved');
		}
		rebuildManualEdges();
	}

	function parsePolygonPoints(value: string | null): Array<{ x: number; y: number }> {
		if (!value) return [];
		return value
			.trim()
			.split(/\s+/)
			.map((pair) => pair.split(',').map(Number))
			.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
			.map(([x, y]) => ({ x, y }));
	}

	function getNodeBox(
		node: SVGGElement
	): { x: number; y: number; width: number; height: number } | null {
		const svgNode = node as SVGGElement & { getBBox?: () => DOMRect };
		if (typeof svgNode.getBBox === 'function') {
			try {
				const box = svgNode.getBBox();
				if (box.width > 0 && box.height > 0) {
					const offset = getNodeTranslate(node);
					return {
						x: box.x + offset.x,
						y: box.y + offset.y,
						width: box.width,
						height: box.height
					};
				}
			} catch {
				// Graphviz polygons below provide a deterministic fallback for test and browser edge cases.
			}
		}

		const points = Array.from(node.querySelectorAll('polygon')).flatMap((polygon) =>
			parsePolygonPoints(polygon.getAttribute('points'))
		);
		if (points.length === 0) return null;
		const xs = points.map((point) => point.x);
		const ys = points.map((point) => point.y);
		const offset = getNodeTranslate(node);
		const minX = Math.min(...xs);
		const minY = Math.min(...ys);
		return {
			x: minX + offset.x,
			y: minY + offset.y,
			width: Math.max(Math.max(...xs) - minX, 1),
			height: Math.max(Math.max(...ys) - minY, 1)
		};
	}

	function getConnectionPoint(
		box: { x: number; y: number; width: number; height: number },
		target: { x: number; y: number }
	): { x: number; y: number } {
		const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
		const dx = target.x - center.x;
		const dy = target.y - center.y;
		if (Math.abs(dx / Math.max(box.width, 1)) > Math.abs(dy / Math.max(box.height, 1))) {
			const x = dx >= 0 ? box.x + box.width : box.x;
			const ratio = Math.abs(dx) > 0 ? (x - center.x) / dx : 0;
			return { x, y: center.y + dy * ratio };
		}
		const y = dy >= 0 ? box.y + box.height : box.y;
		const ratio = Math.abs(dy) > 0 ? (y - center.y) / dy : 0;
		return { x: center.x + dx * ratio, y };
	}

	function parseEdgeTitle(edge: SVGGElement): { source: string; target: string } | null {
		const title = edge.querySelector('title')?.textContent?.trim();
		const parts = title?.split('->').map((part) => part.trim()) ?? [];
		if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
		return { source: parts[0], target: parts[1] };
	}

	function removeLegacyManualEdgeMarkers(svgElement: SVGSVGElement) {
		svgElement.querySelector('#erd-manual-edge-markers')?.remove();
	}

	function removeManualEdges(svgElement = getSvgElement()) {
		svgElement?.querySelectorAll('.erd-manual-edges, #erd-manual-edge-markers').forEach((node) => {
			node.remove();
		});
	}

	function normalizeVector(from: SvgPoint, to: SvgPoint): SvgPoint | null {
		const dx = to.x - from.x;
		const dy = to.y - from.y;
		const distance = Math.hypot(dx, dy);
		if (distance <= 0.1) return null;
		return { x: dx / distance, y: dy / distance };
	}

	function offsetPoint(point: SvgPoint, vector: SvgPoint, distance: number): SvgPoint {
		return {
			x: point.x + vector.x * distance,
			y: point.y + vector.y * distance
		};
	}

	function perpendicularVector(vector: SvgPoint): SvgPoint {
		return { x: -vector.y, y: vector.x };
	}

	function createRelationLine(
		start: SvgPoint,
		end: SvgPoint,
		color: string,
		isDashed = false
	): SVGLineElement {
		const line = document.createElementNS(SVG_NS, 'line');
		line.setAttribute('x1', start.x.toFixed(1));
		line.setAttribute('y1', start.y.toFixed(1));
		line.setAttribute('x2', end.x.toFixed(1));
		line.setAttribute('y2', end.y.toFixed(1));
		line.setAttribute('stroke', color);
		line.setAttribute('stroke-width', '1.6');
		line.setAttribute('fill', 'none');
		line.setAttribute('stroke-linecap', 'square');
		if (isDashed) line.setAttribute('stroke-dasharray', '6 4');
		return line;
	}

	function appendCrowSymbol(group: SVGGElement, point: SvgPoint, vector: SvgPoint, color: string) {
		const perpendicular = perpendicularVector(vector);
		const tip = point;
		const center = offsetPoint(tip, vector, CROW_DEPTH);
		const upper = {
			x: center.x + perpendicular.x * CROW_HALF_WIDTH,
			y: center.y + perpendicular.y * CROW_HALF_WIDTH
		};
		const lower = {
			x: center.x - perpendicular.x * CROW_HALF_WIDTH,
			y: center.y - perpendicular.y * CROW_HALF_WIDTH
		};
		group.append(
			createRelationLine(tip, upper, color),
			createRelationLine(tip, center, color),
			createRelationLine(tip, lower, color)
		);
	}

	function appendTeeSymbol(group: SVGGElement, point: SvgPoint, vector: SvgPoint, color: string) {
		const perpendicular = perpendicularVector(vector);
		const start = {
			x: point.x + perpendicular.x * TEE_HALF_LENGTH,
			y: point.y + perpendicular.y * TEE_HALF_LENGTH
		};
		const end = {
			x: point.x - perpendicular.x * TEE_HALF_LENGTH,
			y: point.y - perpendicular.y * TEE_HALF_LENGTH
		};
		group.append(createRelationLine(start, end, color));
	}

	function rebuildManualEdges() {
		cancelScheduledManualEdgeRebuild();
		const svgElement = getSvgElement();
		if (!svgElement) return;
		removeManualEdges(svgElement);

		const edgeElements = getEdgeElements(svgElement);
		if (edgeElements.length === 0) {
			return;
		}

		for (const edge of edgeElements) edge.style.display = 'none';
		removeLegacyManualEdgeMarkers(svgElement);

		const nodesByTitle = new Map(
			getNodeElements(svgElement).map((node) => [getNodeTitle(node), node])
		);
		const graphElement = getGraphElement(svgElement);
		const overlay = document.createElementNS(SVG_NS, 'g');
		overlay.setAttribute('class', 'erd-manual-edges');
		overlay.setAttribute('aria-label', '수동 배치 관계선');

		for (const edge of edgeElements) {
			const edgeTitle = parseEdgeTitle(edge);
			if (!edgeTitle) continue;
			const sourceNode = nodesByTitle.get(edgeTitle.source);
			const targetNode = nodesByTitle.get(edgeTitle.target);
			if (!sourceNode || !targetNode) continue;
			const sourceBox = getNodeBox(sourceNode);
			const targetBox = getNodeBox(targetNode);
			if (!sourceBox || !targetBox) continue;

			const sourceCenter = {
				x: sourceBox.x + sourceBox.width / 2,
				y: sourceBox.y + sourceBox.height / 2
			};
			const targetCenter = {
				x: targetBox.x + targetBox.width / 2,
				y: targetBox.y + targetBox.height / 2
			};
			const start = getConnectionPoint(sourceBox, targetCenter);
			const end = getConnectionPoint(targetBox, sourceCenter);
			const isDashed = /stroke-dasharray|dashed/i.test(edge.outerHTML);
			const vector = normalizeVector(start, end);
			if (!vector) continue;
			const distance = Math.hypot(end.x - start.x, end.y - start.y);
			const endpointGap = Math.min(RELATION_ENDPOINT_GAP, Math.max(distance / 4, 0));
			const safeStart = offsetPoint(start, vector, endpointGap);
			const safeEnd = offsetPoint(end, vector, -endpointGap);
			const color = isDashed ? '#64748B' : '#334155';

			const relationGroup = document.createElementNS(SVG_NS, 'g');
			relationGroup.setAttribute('class', 'erd-manual-edge');
			relationGroup.append(createRelationLine(safeStart, safeEnd, color, isDashed));
			appendCrowSymbol(relationGroup, safeStart, vector, color);
			appendTeeSymbol(relationGroup, safeEnd, vector, color);
			overlay.append(relationGroup);
		}

		const firstNode = graphElement.querySelector('g.node');
		graphElement.insertBefore(overlay, firstNode);
	}

	function scheduleManualEdgesRebuild() {
		if (manualEdgeRebuildFrame !== null) return;
		if (typeof requestAnimationFrame === 'undefined') {
			rebuildManualEdges();
			return;
		}
		manualEdgeRebuildFrame = requestAnimationFrame(() => {
			manualEdgeRebuildFrame = null;
			rebuildManualEdges();
		});
	}

	function parseViewBox(value: string | null): SvgBox | null {
		const [x, y, width, height] = (value ?? '').split(/\s+/).map(Number);
		if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
		return { x, y, width, height };
	}

	function unionBoxes(boxes: SvgBox[]): SvgBox | null {
		if (boxes.length === 0) return null;
		const minX = Math.min(...boxes.map((box) => box.x));
		const minY = Math.min(...boxes.map((box) => box.y));
		const maxX = Math.max(...boxes.map((box) => box.x + box.width));
		const maxY = Math.max(...boxes.map((box) => box.y + box.height));
		return {
			x: minX,
			y: minY,
			width: Math.max(maxX - minX, 1),
			height: Math.max(maxY - minY, 1)
		};
	}

	function paddedBox(box: SvgBox, padding = EXPORT_PADDING): SvgBox {
		return {
			x: box.x - padding,
			y: box.y - padding,
			width: box.width + padding * 2,
			height: box.height + padding * 2
		};
	}

	function transformBox(element: SVGGraphicsElement): SvgBox | null {
		if (
			typeof element.getBBox !== 'function' ||
			typeof element.getCTM !== 'function' ||
			typeof DOMPoint === 'undefined'
		) {
			return null;
		}
		try {
			const box = element.getBBox();
			const matrix = element.getCTM();
			if (!matrix || box.width <= 0 || box.height <= 0) return null;
			const points = [
				new DOMPoint(box.x, box.y).matrixTransform(matrix),
				new DOMPoint(box.x + box.width, box.y).matrixTransform(matrix),
				new DOMPoint(box.x, box.y + box.height).matrixTransform(matrix),
				new DOMPoint(box.x + box.width, box.y + box.height).matrixTransform(matrix)
			];
			const xs = points.map((point) => point.x);
			const ys = points.map((point) => point.y);
			const minX = Math.min(...xs);
			const minY = Math.min(...ys);
			return {
				x: minX,
				y: minY,
				width: Math.max(Math.max(...xs) - minX, 1),
				height: Math.max(Math.max(...ys) - minY, 1)
			};
		} catch {
			return null;
		}
	}

	function getExportNodeBox(node: SVGGElement): SvgBox | null {
		return transformBox(node) ?? getNodeBox(node);
	}

	function getManualExportBounds(svgElement: SVGSVGElement): SvgBox | null {
		const originalBounds = parseViewBox(svgElement.getAttribute('viewBox')) ?? {
			x: 0,
			y: 0,
			width: svgNaturalWidth,
			height: svgNaturalHeight
		};
		const movedNodeBounds = getNodeElements(svgElement)
			.filter((node) => node.classList.contains('erd-manual-node-moved'))
			.map(getExportNodeBox)
			.filter((box): box is SvgBox => Boolean(box));
		return paddedBox(unionBoxes([originalBounds, ...movedNodeBounds]) ?? originalBounds);
	}

	function formatSvgNumber(value: number): string {
		return Number.isInteger(value) ? String(value) : value.toFixed(1);
	}

	function applyExportBounds(svgElement: SVGSVGElement, bounds: SvgBox) {
		const width = Math.ceil(bounds.width);
		const height = Math.ceil(bounds.height);
		svgElement.setAttribute(
			'viewBox',
			[
				formatSvgNumber(bounds.x),
				formatSvgNumber(bounds.y),
				formatSvgNumber(width),
				formatSvgNumber(height)
			].join(' ')
		);
		svgElement.setAttribute('width', String(width));
		svgElement.setAttribute('height', String(height));
	}

	function findGraphNode(target: EventTarget | null): SVGGElement | null {
		if (!(target instanceof Element)) return null;
		const node = target.closest('g.node') as SVGGElement | null;
		if (!node || node.namespaceURI !== SVG_NS || !canvasElement?.contains(node)) return null;
		return node;
	}

	function getCurrentSvgExport(): SvgExportPayload | null {
		const svgElement = getSvgElement();
		if (!svgElement) return null;
		const exportBounds = manualLayoutActive ? getManualExportBounds(svgElement) : null;
		const clone = svgElement.cloneNode(true) as SVGSVGElement;
		clone.querySelectorAll('[tabindex], [role]').forEach((element) => {
			element.removeAttribute('tabindex');
			element.removeAttribute('role');
		});
		if (exportBounds) applyExportBounds(clone, exportBounds);
		return {
			text: new XMLSerializer().serializeToString(clone),
			width: Math.max(Math.ceil(exportBounds?.width ?? svgNaturalWidth), 1),
			height: Math.max(Math.ceil(exportBounds?.height ?? svgNaturalHeight), 1)
		};
	}

	function getDownloadFilename(extension: 'svg' | 'png'): string {
		const url = new URL(renderUrl, window.location.href);
		const mode = url.searchParams.get('mode') || 'logical';
		return `erd-${mode}.${extension}`;
	}

	function downloadBlob(blob: Blob, filename: string) {
		const objectUrl = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = objectUrl;
		anchor.download = filename;
		document.body.append(anchor);
		anchor.click();
		anchor.remove();
		URL.revokeObjectURL(objectUrl);
	}

	function setDownloadError(error: unknown) {
		downloadError =
			error instanceof Error ? error.message : '현재 ERD 이미지를 다운로드하지 못했습니다.';
	}

	async function downloadCurrentSvg() {
		const svgExport = getCurrentSvgExport();
		if (!svgExport) return;
		downloadError = null;
		try {
			downloadBlob(
				new Blob([svgExport.text], { type: 'image/svg+xml;charset=utf-8' }),
				getDownloadFilename('svg')
			);
		} catch (error) {
			setDownloadError(error);
		}
	}

	function imageFromObjectUrl(objectUrl: string): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const image = new Image();
			image.onload = () => resolve(image);
			image.onerror = () => reject(new Error('PNG 변환을 위한 SVG 로딩에 실패했습니다.'));
			image.src = objectUrl;
		});
	}

	function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
		return new Promise((resolve, reject) => {
			canvas.toBlob((blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error('PNG 변환에 실패했습니다.'));
				}
			}, 'image/png');
		});
	}

	function assertPngExportSize(width: number, height: number) {
		if (
			width > MAX_PNG_EXPORT_DIMENSION ||
			height > MAX_PNG_EXPORT_DIMENSION ||
			width * height > MAX_PNG_EXPORT_PIXELS
		) {
			throw new Error(
				'현재 배치 PNG 크기가 브라우저 변환 한도를 초과했습니다. SVG로 다운로드하거나 배치를 줄여 주세요.'
			);
		}
	}

	async function downloadCurrentPng() {
		downloadError = null;
		const svgExport = getCurrentSvgExport();
		if (!svgExport) return;
		let objectUrl: string | null = null;
		try {
			assertPngExportSize(svgExport.width, svgExport.height);
			const svgBlob = new Blob([svgExport.text], { type: 'image/svg+xml;charset=utf-8' });
			objectUrl = URL.createObjectURL(svgBlob);
			const image = await imageFromObjectUrl(objectUrl);
			const canvas = document.createElement('canvas');
			canvas.width = svgExport.width;
			canvas.height = svgExport.height;
			const context = canvas.getContext('2d');
			if (!context) throw new Error('PNG 변환 컨텍스트를 생성하지 못했습니다.');
			context.fillStyle = '#F8FAFC';
			context.fillRect(0, 0, canvas.width, canvas.height);
			context.drawImage(image, 0, 0, canvas.width, canvas.height);
			downloadBlob(await canvasToBlob(canvas), getDownloadFilename('png'));
		} catch (error) {
			setDownloadError(error);
		} finally {
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		}
	}

	async function loadSvgPreview(value: string) {
		const sequence = ++requestSequence;
		activeAbortController?.abort();
		const abortController = new AbortController();
		activeAbortController = abortController;

		previewLoading = true;
		previewError = null;
		svgMarkup = '';
		layoutEditMode = false;
		manualLayoutActive = false;
		activeNodeDrag = null;
		downloadError = null;
		closeContextMenu();
		cancelScheduledManualEdgeRebuild();

		try {
			if (!isAllowedErdSvgRenderUrl(value, window.location.href, window.location.origin)) {
				throw new Error('Disallowed render URL');
			}

			const response = await fetch(value, { signal: abortController.signal });
			if (sequence !== requestSequence) return;
			if (!response.ok) {
				throw new Error('SVG response failed');
			}

			const contentType = response.headers.get('content-type') || '';
			if (!contentType.toLowerCase().includes('image/svg+xml')) {
				throw new Error('SVG response content type mismatch');
			}

			const sanitized = sanitizeErdSvgText(await response.text());
			if (sequence !== requestSequence) return;

			svgNaturalWidth = sanitized.width;
			svgNaturalHeight = sanitized.height;
			svgMarkup = sanitized.markup;
			previewLoading = false;
			previewError = null;

			await tick();
			if (sequence === requestSequence) {
				fitToViewport();
				setNodeHandleState();
				rebuildManualEdges();
			}
		} catch (error) {
			if (abortController.signal.aborted || sequence !== requestSequence) return;
			previewLoading = false;
			previewError = PREVIEW_ERROR_MESSAGE;
		}
	}

	function closeContextMenu() {
		contextMenu = null;
	}

	function findTableEntry(target: EventTarget | null): TableEntry | null {
		const node = findGraphNode(target);
		const tableId = node ? parseErdTableNodeId(node.id) : null;
		return tableId ? (tableEntryById.get(tableId) ?? null) : null;
	}

	function clampContextMenuPosition(x: number, y: number, linkCount: number) {
		const { width, height } = getViewportSize();
		const menuHeight = CONTEXT_MENU_HEADER_HEIGHT + linkCount * CONTEXT_MENU_ITEM_HEIGHT;
		return {
			x: clamp(
				x,
				CONTEXT_MENU_EDGE_GAP,
				Math.max(width - CONTEXT_MENU_WIDTH, CONTEXT_MENU_EDGE_GAP)
			),
			y: clamp(y, CONTEXT_MENU_EDGE_GAP, Math.max(height - menuHeight, CONTEXT_MENU_EDGE_GAP))
		};
	}

	function handleContextMenu(event: MouseEvent) {
		// 배치 수정 모드에서는 기본 브라우저 메뉴를 그대로 둔다.
		if (layoutEditMode || !svgMarkup) {
			closeContextMenu();
			return;
		}

		const table = findTableEntry(event.target);
		if (!table) {
			closeContextMenu();
			return;
		}

		const links = buildErdDefinitionLinks(table, definitionFiles);
		if (links.length === 0) {
			closeContextMenu();
			return;
		}

		event.preventDefault();
		const viewportRect = viewportElement?.getBoundingClientRect();
		const position = clampContextMenuPosition(
			event.clientX - (viewportRect?.left ?? 0),
			event.clientY - (viewportRect?.top ?? 0),
			links.length
		);
		contextMenu = {
			...position,
			title: getErdTableDisplayName(table),
			detail: getErdTableDisplayDetail(table),
			links
		};
	}

	function handleWindowKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') closeContextMenu();
	}

	function handlePointerDown(event: PointerEvent) {
		closeContextMenu();
		if (event.button !== 0 || !svgMarkup) return;
		if (layoutEditMode) {
			const node = findGraphNode(event.target);
			if (!node) return;
			const currentTranslate = getNodeTranslate(node);
			activeNodeDrag = {
				node,
				pointerId: event.pointerId,
				startClientX: event.clientX,
				startClientY: event.clientY,
				startTranslateX: currentTranslate.x,
				startTranslateY: currentTranslate.y
			};
			event.preventDefault();
			if (
				event.currentTarget instanceof HTMLElement &&
				'setPointerCapture' in event.currentTarget
			) {
				event.currentTarget.setPointerCapture(event.pointerId);
			}
			return;
		}
		isPanning = true;
		panStartX = event.clientX;
		panStartY = event.clientY;
		panStartTranslateX = translateX;
		panStartTranslateY = translateY;
		event.preventDefault();
		if (event.currentTarget instanceof HTMLElement && 'setPointerCapture' in event.currentTarget) {
			event.currentTarget.setPointerCapture(event.pointerId);
		}
	}

	function handlePointerMove(event: PointerEvent) {
		if (activeNodeDrag) {
			const nextX =
				activeNodeDrag.startTranslateX + (event.clientX - activeNodeDrag.startClientX) / scale;
			const nextY =
				activeNodeDrag.startTranslateY + (event.clientY - activeNodeDrag.startClientY) / scale;
			setNodeTranslate(activeNodeDrag.node, nextX, nextY);
			manualLayoutActive = true;
			scheduleManualEdgesRebuild();
			return;
		}
		if (!isPanning) return;
		translateX = panStartTranslateX + event.clientX - panStartX;
		translateY = panStartTranslateY + event.clientY - panStartY;
	}

	function finishPanning(event: PointerEvent) {
		if (activeNodeDrag) {
			if (
				event.currentTarget instanceof HTMLElement &&
				'releasePointerCapture' in event.currentTarget
			) {
				event.currentTarget.releasePointerCapture(activeNodeDrag.pointerId);
			}
			rebuildManualEdges();
			activeNodeDrag = null;
			return;
		}
		if (!isPanning) return;
		isPanning = false;
		if (
			event.currentTarget instanceof HTMLElement &&
			'releasePointerCapture' in event.currentTarget
		) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	}

	/** 휠 delta를 픽셀 단위로 정규화한다. (line/page 스크롤 모드 대응) */
	function toPixelDelta(delta: number, deltaMode: number): number {
		if (deltaMode === 1) return delta * WHEEL_LINE_HEIGHT;
		if (deltaMode === 2) return delta * getViewportSize().height;
		return delta;
	}

	function zoomByWheel(event: WheelEvent) {
		const viewportRect = viewportElement?.getBoundingClientRect();
		const originX = event.clientX - (viewportRect?.left ?? 0);
		const originY = event.clientY - (viewportRect?.top ?? 0);
		const direction = event.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
		zoomAt(scale * direction, originX, originY);
	}

	function handleWheel(event: WheelEvent) {
		closeContextMenu();
		if (!svgMarkup || !viewportElement) return;
		event.preventDefault();

		// Ctrl(⌘) + 휠: 확대/축소
		if (event.ctrlKey || event.metaKey) {
			zoomByWheel(event);
			return;
		}

		const deltaX = toPixelDelta(event.deltaX, event.deltaMode);
		const deltaY = toPixelDelta(event.deltaY, event.deltaMode);

		// Shift + 휠: 좌/우 이동 (브라우저가 축을 바꿔 보내는 경우까지 흡수)
		if (event.shiftKey) {
			translateX -= deltaX || deltaY;
			return;
		}

		// 기본 휠: 위/아래 이동 (트랙패드의 가로 스크롤도 함께 반영)
		translateX -= deltaX;
		translateY -= deltaY;
	}

	$effect(() => {
		void loadSvgPreview(renderUrl);
		return () => {
			activeAbortController?.abort();
		};
	});

	$effect(() => {
		if (!svgMarkup) {
			onDownloadActionsReady?.(null);
			return;
		}
		onDownloadActionsReady?.({ downloadCurrentSvg, downloadCurrentPng });
		return () => onDownloadActionsReady?.(null);
	});

	$effect(() => {
		const currentLayoutEditMode = layoutEditMode;
		const currentSvgMarkup = svgMarkup;
		void tick().then(() => {
			if (currentLayoutEditMode === layoutEditMode && currentSvgMarkup === svgMarkup) {
				setNodeHandleState();
			}
		});
	});

	$effect(() => {
		if (!viewportElement) return;
		const resizeObserver =
			typeof ResizeObserver === 'undefined'
				? null
				: new ResizeObserver(() => {
						if (svgMarkup && !isPanning) {
							fitToViewport();
						}
					});
		resizeObserver?.observe(viewportElement);
		return () => resizeObserver?.disconnect();
	});
</script>

<svelte:window onkeydown={handleWindowKeyDown} onpointerdown={closeContextMenu} />

<div class="flex h-full flex-col bg-white">
	<div
		class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2"
		aria-label="ERD 보기 도구"
	>
		<div class="flex flex-wrap items-center gap-1">
			<button
				type="button"
				class={VIEWER_BUTTON_CLASS}
				onclick={fitToViewport}
				disabled={!svgMarkup}
				aria-label="다이어그램 맞춤"
			>
				맞춤
			</button>
			<button
				type="button"
				class={VIEWER_BUTTON_CLASS}
				onclick={setNaturalScale}
				disabled={!svgMarkup}
				aria-label="다이어그램 100% 보기"
			>
				100%
			</button>
			<button
				type="button"
				class={VIEWER_BUTTON_CLASS}
				onclick={zoomOut}
				disabled={!svgMarkup || scale <= MIN_SCALE}
				aria-label="다이어그램 축소"
			>
				축소
			</button>
			<button
				type="button"
				class={VIEWER_BUTTON_CLASS}
				onclick={zoomIn}
				disabled={!svgMarkup || scale >= MAX_SCALE}
				aria-label="다이어그램 확대"
			>
				확대
			</button>
			<button
				type="button"
				class={VIEWER_BUTTON_CLASS}
				onclick={resetView}
				disabled={!svgMarkup}
				aria-label="다이어그램 초기화"
			>
				초기화
			</button>
			<button
				type="button"
				class={layoutEditMode ? ACTIVE_VIEWER_BUTTON_CLASS : VIEWER_BUTTON_CLASS}
				onclick={() => {
					layoutEditMode = !layoutEditMode;
					closeContextMenu();
				}}
				disabled={!svgMarkup}
				aria-pressed={layoutEditMode}
				aria-label="테이블 배치 수정 모드"
			>
				배치 수정
			</button>
			<button
				type="button"
				class={VIEWER_BUTTON_CLASS}
				onclick={resetManualLayout}
				disabled={!svgMarkup || !manualLayoutActive}
				aria-label="테이블 배치 초기화"
			>
				배치 초기화
			</button>
		</div>
		<span
			class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
			data-testid="erd-zoom-percent"
		>
			{zoomPercent}%
		</span>
	</div>
	{#if downloadError}
		<p class="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700" role="status">
			{downloadError}
		</p>
	{/if}

	{#if relationValidationSummary}
		<section
			class="border-b border-amber-100 bg-amber-50/70 px-4 py-2 text-xs text-amber-800"
			aria-label="ERD 관계 검증 요약"
		>
			관계 검증: 미매칭 {relationValidationSummary.unmatched}건 · 오류
			{relationValidationSummary.errorCount}건 · 경고
			{relationValidationSummary.warningCount}건
		</section>
	{/if}

	<div
		bind:this={viewportElement}
		class="erd-svg-viewport relative flex-1 overflow-hidden bg-slate-50"
		class:erd-layout-editing={layoutEditMode}
		data-testid="erd-viewer-viewport"
		role="application"
		aria-label="ERD 다이어그램 보기 영역 (휠: 상하 이동, Shift+휠: 좌우 이동, Ctrl+휠: 확대/축소, 테이블 우클릭: 정의서 바로가기)"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={finishPanning}
		onpointercancel={finishPanning}
		onwheel={handleWheel}
		oncontextmenu={handleContextMenu}
	>
		{#if previewLoading}
			<div class="absolute inset-0 z-10 flex items-center justify-center bg-gray-50/80">
				<div class="text-center">
					<div
						class="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
					></div>
					<p class="text-sm text-gray-600">ERD 이미지를 불러오는 중...</p>
				</div>
			</div>
		{/if}

		{#if previewError}
			<div class="flex h-full items-center justify-center p-4">
				<div class="max-w-lg rounded-lg border border-red-200 bg-red-50 p-5 text-center">
					<p class="text-sm font-medium text-red-800">이미지 생성 오류</p>
					<p class="mt-2 text-sm text-red-600">{previewError}</p>
				</div>
			</div>
		{:else if svgMarkup}
			<div
				bind:this={canvasElement}
				class="erd-svg-canvas absolute left-0 top-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
				data-testid="erd-svg-preview"
				style:transform={canvasTransform}
				style:transform-origin="0 0"
			>
				{@html svgMarkup}
			</div>
		{/if}

		{#if contextMenu}
			<div
				class="absolute z-20 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
				style:left={`${contextMenu.x}px`}
				style:top={`${contextMenu.y}px`}
				style:width={`${CONTEXT_MENU_WIDTH}px`}
				role="menu"
				tabindex="-1"
				aria-label="ERD 테이블 정의서 바로가기"
				data-testid="erd-node-context-menu"
				onpointerdown={(event) => event.stopPropagation()}
				oncontextmenu={(event) => event.preventDefault()}
			>
				<div class="border-b border-gray-100 bg-gray-50 px-3 py-2">
					<p class="truncate text-sm font-semibold text-gray-900">{contextMenu.title}</p>
					{#if contextMenu.detail}
						<p class="truncate text-xs text-gray-500">{contextMenu.detail}</p>
					{/if}
				</div>
				{#each contextMenu.links as link (link.type)}
					<a
						href={link.href}
						role="menuitem"
						class="block px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
						onclick={closeContextMenu}
					>
						<span class="block text-sm font-medium text-gray-800">{link.label}</span>
						<span class="block truncate text-xs text-gray-500">{link.description}</span>
					</a>
				{/each}
			</div>
		{/if}
	</div>

	<div class="border-t border-gray-200 bg-white px-4 py-2">
		<div class="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
			<span>
				데이터 생성 시간: {new Date(erdData.metadata.generatedAt).toLocaleString('ko-KR')}
			</span>
			<span>
				노드: {erdData.metadata.totalNodes}개 | 관계: {relationshipCount}개 | 출력: SVG/PNG
			</span>
		</div>
	</div>
</div>

<style>
	.erd-svg-viewport {
		touch-action: none;
		cursor: grab;
		-webkit-user-select: none;
		user-select: none;
	}

	.erd-svg-viewport:active {
		cursor: grabbing;
	}

	.erd-svg-viewport.erd-layout-editing,
	.erd-svg-viewport.erd-layout-editing:active {
		cursor: default;
	}

	:global(.erd-svg-canvas svg) {
		display: block;
		max-width: none;
		height: auto;
	}

	:global(.erd-svg-canvas svg text),
	:global(.erd-svg-canvas svg tspan) {
		-webkit-user-select: none;
		user-select: none;
	}

	:global(.erd-layout-editing .erd-manual-node) {
		cursor: move;
	}

	:global(.erd-layout-editing .erd-manual-node:hover) {
		filter: drop-shadow(0 0 6px rgb(37 99 235 / 0.35));
	}

	:global(.erd-manual-node-moved) {
		filter: drop-shadow(0 0 5px rgb(14 165 233 / 0.25));
	}

	:global(.erd-manual-edges) {
		pointer-events: none;
	}
</style>
