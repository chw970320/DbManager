<script lang="ts">
	import { tick } from 'svelte';
	import type { ERDData } from '../types/erd-mapping.js';
	import { isAllowedErdSvgRenderUrl, sanitizeErdSvgText } from '../utils/erd-svg-preview.js';

	let {
		erdData,
		renderUrl
	}: {
		erdData: ERDData;
		renderUrl: string;
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

	let requestSequence = 0;
	let activeAbortController: AbortController | null = null;
	let panStartX = 0;
	let panStartY = 0;
	let panStartTranslateX = 0;
	let panStartTranslateY = 0;

	let relationshipCount = $derived(
		erdData.metadata.totalRelationships ?? erdData.metadata.totalEdges
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

	async function loadSvgPreview(value: string) {
		const sequence = ++requestSequence;
		activeAbortController?.abort();
		const abortController = new AbortController();
		activeAbortController = abortController;

		previewLoading = true;
		previewError = null;
		svgMarkup = '';

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
			}
		} catch (error) {
			if (abortController.signal.aborted || sequence !== requestSequence) return;
			previewLoading = false;
			previewError = PREVIEW_ERROR_MESSAGE;
		}
	}

	function handlePointerDown(event: PointerEvent) {
		if (event.button !== 0 || !svgMarkup) return;
		isPanning = true;
		panStartX = event.clientX;
		panStartY = event.clientY;
		panStartTranslateX = translateX;
		panStartTranslateY = translateY;
		if (event.currentTarget instanceof HTMLElement && 'setPointerCapture' in event.currentTarget) {
			event.currentTarget.setPointerCapture(event.pointerId);
		}
	}

	function handlePointerMove(event: PointerEvent) {
		if (!isPanning) return;
		translateX = panStartTranslateX + event.clientX - panStartX;
		translateY = panStartTranslateY + event.clientY - panStartY;
	}

	function finishPanning(event: PointerEvent) {
		if (!isPanning) return;
		isPanning = false;
		if (
			event.currentTarget instanceof HTMLElement &&
			'releasePointerCapture' in event.currentTarget
		) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	}

	function handleWheel(event: WheelEvent) {
		if (!svgMarkup || !viewportElement) return;
		event.preventDefault();
		const viewportRect = viewportElement.getBoundingClientRect();
		const originX = event.clientX - viewportRect.left;
		const originY = event.clientY - viewportRect.top;
		const direction = event.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
		zoomAt(scale * direction, originX, originY);
	}

	$effect(() => {
		void loadSvgPreview(renderUrl);
		return () => {
			activeAbortController?.abort();
		};
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
		</div>
		<span
			class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
			data-testid="erd-zoom-percent"
		>
			{zoomPercent}%
		</span>
	</div>

	<div
		bind:this={viewportElement}
		class="erd-svg-viewport relative flex-1 overflow-hidden bg-slate-50"
		data-testid="erd-viewer-viewport"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={finishPanning}
		onpointercancel={finishPanning}
		onwheel={handleWheel}
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
				class="erd-svg-canvas absolute left-0 top-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
				data-testid="erd-svg-preview"
				style:transform={canvasTransform}
				style:transform-origin="0 0"
			>
				{@html svgMarkup}
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
	}

	.erd-svg-viewport:active {
		cursor: grabbing;
	}

	:global(.erd-svg-canvas svg) {
		display: block;
		max-width: none;
		height: auto;
	}
</style>
