<script lang="ts">
	import type { ERDData } from '../types/erd-mapping.js';

	let {
		erdData,
		renderUrl
	}: {
		erdData: ERDData;
		renderUrl: string;
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
		previewError = 'ERD 이미지를 불러오지 못했습니다. 필터 조건을 확인해 주세요.';
	}

	let relationshipCount = $derived(
		erdData.metadata.totalRelationships ?? erdData.metadata.totalEdges
	);
</script>

<div class="flex h-full flex-col">
	<!-- 다이어그램 영역 -->
	<div class="relative flex-1 overflow-auto bg-gray-50 p-4">
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
			<div class="flex h-full items-center justify-center">
				<div class="max-w-lg rounded-lg border border-red-200 bg-red-50 p-5 text-center">
					<p class="text-sm font-medium text-red-800">이미지 생성 오류</p>
					<p class="mt-2 text-sm text-red-600">{previewError}</p>
				</div>
			</div>
		{:else}
			<div class="flex min-h-full justify-center">
				<div class="inline-block rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
					<img
						src={renderUrl}
						alt="ERD 다이어그램"
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
			<span>
				데이터 생성 시간: {new Date(erdData.metadata.generatedAt).toLocaleString('ko-KR')}
			</span>
			<span>
				노드: {erdData.metadata.totalNodes}개 | 관계: {relationshipCount}개 | 출력: SVG/PNG
			</span>
		</div>
	</div>
</div>
