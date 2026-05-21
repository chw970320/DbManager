<script lang="ts">
	import type { ERDData } from '../types/erd-mapping.js';

	let {
		erdData,
		renderUrl,
		svgDownloadUrl,
		pngDownloadUrl,
		mode = 'logical'
	}: {
		erdData: ERDData;
		renderUrl: string;
		svgDownloadUrl: string;
		pngDownloadUrl: string;
		mode?: 'logical' | 'physical';
	} = $props();

	let previewLoading = $state(true);
	let previewError = $state<string | null>(null);

	$effect(() => {
		void renderUrl;
		previewLoading = true;
		previewError = null;
	});

	function handlePreviewLoad() {
		previewLoading = false;
		previewError = null;
	}

	function handlePreviewError() {
		previewLoading = false;
		previewError =
			'Graphviz ERD 이미지를 불러오지 못했습니다. Graphviz 설치 상태와 필터 조건을 확인해 주세요.';
	}
</script>

<div class="flex h-full flex-col">
	<!-- 헤더 -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
		<div>
			<h2 class="text-lg font-semibold text-gray-900">Graphviz ERD 다이어그램</h2>
			<p class="text-sm text-gray-500">
				현재 표시 모드: {mode === 'logical' ? '논리명' : '물리명'} | 논리 노드:
				{erdData.metadata.logicalNodes}개 | 물리 노드: {erdData.metadata.physicalNodes}개 | 매핑:
				{erdData.metadata.totalMappings}건
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<a
				href={svgDownloadUrl}
				download
				class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
			>
				SVG 다운로드
			</a>
			<a
				href={pngDownloadUrl}
				download
				class="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
			>
				PNG 다운로드
			</a>
		</div>
	</div>

	<!-- 다이어그램 영역 -->
	<div class="relative flex-1 overflow-auto bg-gray-50 p-4">
		{#if previewLoading}
			<div class="absolute inset-0 z-10 flex items-center justify-center bg-gray-50/80">
				<div class="text-center">
					<div
						class="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
					></div>
					<p class="text-sm text-gray-600">Graphviz ERD 이미지를 불러오는 중...</p>
				</div>
			</div>
		{/if}

		{#if previewError}
			<div class="flex h-full items-center justify-center">
				<div class="max-w-lg rounded-lg border border-red-200 bg-red-50 p-5 text-center">
					<p class="text-sm font-medium text-red-800">이미지 생성 오류</p>
					<p class="mt-2 text-sm text-red-600">{previewError}</p>
					<p class="mt-2 text-xs text-gray-500">
						서버 API는 /api/erd/render에서 Graphviz dot CLI를 사용합니다.
					</p>
				</div>
			</div>
		{:else}
			<div class="flex min-h-full justify-center">
				<div class="inline-block rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
					<img
						src={renderUrl}
						alt="Graphviz ERD 다이어그램"
						class="max-w-none"
						onload={handlePreviewLoad}
						onerror={handlePreviewError}
					/>
				</div>
			</div>
		{/if}
	</div>

	<!-- 메타데이터 -->
	<div class="border-t border-gray-200 bg-white px-4 py-2">
		<div class="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
			<span>데이터 생성 시간: {new Date(erdData.metadata.generatedAt).toLocaleString('ko-KR')}</span>
			<span>
				노드: {erdData.metadata.totalNodes}개 | 엣지: {erdData.metadata.totalEdges}개 | Graphviz
				출력: SVG/PNG
			</span>
		</div>
	</div>
</div>
