<script lang="ts">
	import { onMount } from 'svelte';
	import mermaid from 'mermaid';
	import type { ERDData } from '../types/erd-mapping.js';
	import { generateMermaidERD } from '../utils/erd-generator.js';

	let { erdData }: { erdData: ERDData } = $props();

	// Mermaid 텍스트 크기 제한을 위한 최대 노드/엣지 수 계산
	// 안전한 기본값: 노드 100개, 엣지 200개
	const MAX_NODES = 100;
	const MAX_EDGES = 200;

	// 실제 노드/엣지 수와 제한값 비교
	const entityTableNodeCount = $derived(
		erdData.nodes.filter((n) => n.type === 'entity' || n.type === 'table').length
	);
	const actualEdgeCount = $derived(erdData.edges.length);

	const maxNodes = $derived(entityTableNodeCount > MAX_NODES ? MAX_NODES : undefined);
	const maxEdges = $derived(actualEdgeCount > MAX_EDGES ? MAX_EDGES : undefined);

	const isSizeLimited = $derived(maxNodes !== undefined || maxEdges !== undefined);

	let mermaidCode = $derived(generateMermaidERD(erdData, maxNodes, maxEdges));
	let mermaidHtml = $state<string>('');
	let loading = $state(true);
	let error = $state<string | null>(null);
	let mermaidContainer = $state<HTMLDivElement | undefined>(undefined);

	// Mermaid 초기화 (한 번만 실행)
	let mermaidInitialized = $state(false);

	function initializeMermaid() {
		if (mermaidInitialized) return;

		mermaid.initialize({
			startOnLoad: false,
			theme: 'default',
			er: {
				layoutDirection: 'TB',
				minEntityWidth: 100,
				minEntityHeight: 75,
				entityPadding: 15,
				stroke: '#666',
				fill: '#fff',
				fontSize: 12
			}
		});

		mermaidInitialized = true;
	}

	async function renderMermaid() {
		if (!mermaidContainer || !erdData) return;

		// mermaidContainer가 실제로 DOM에 존재하는지 확인
		if (!mermaidContainer.isConnected) {
			console.warn('mermaidContainer가 DOM에 연결되지 않았습니다.');
			return;
		}

		loading = true;
		error = null;

		try {
			// Mermaid 초기화
			initializeMermaid();

			// 기존 내용 제거
			// eslint-disable-next-line svelte/no-dom-manipulating
			mermaidContainer.innerHTML = '';

			// DOM 업데이트가 완료될 때까지 기다림
			await new Promise<void>((resolve) => {
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						resolve();
					});
				});
			});

			// Mermaid 다이어그램 렌더링
			// Mermaid 라이브러리는 DOM 조작이 필수적이므로 eslint-disable 사용
			const id = `mermaid-${Date.now()}`;
			const div = document.createElement('div');
			div.className = 'mermaid';
			div.id = id;
			div.textContent = mermaidCode;
			// eslint-disable-next-line svelte/no-dom-manipulating
			mermaidContainer.appendChild(div);

			// div가 DOM에 추가된 후 다시 한 번 확인
			if (!div.isConnected) {
				throw new Error('Mermaid div가 DOM에 추가되지 않았습니다.');
			}

			// DOM 업데이트 완료 후 렌더링
			await new Promise<void>((resolve) => {
				requestAnimationFrame(() => {
					resolve();
				});
			});

			await mermaid.run({
				nodes: [div]
			});

			mermaidHtml = mermaidContainer.innerHTML;
			loading = false;
		} catch (err) {
			console.error('Mermaid 렌더링 실패:', err);
			error = err instanceof Error ? err.message : 'Mermaid 다이어그램을 렌더링할 수 없습니다.';
			loading = false;
		}
	}

	// erdData 또는 mermaidCode 변경 시 자동 재렌더링
	$effect(() => {
		// mermaidCode를 의존성으로 추가하여 변경 감지
		void mermaidCode;

		if (!erdData) {
			loading = false;
			return;
		}

		// DOM이 준비되었는지 확인하고 렌더링
		if (mermaidContainer && mermaidContainer.isConnected) {
			// 다음 프레임에 렌더링하여 DOM 업데이트 완료 보장
			requestAnimationFrame(() => {
				if (mermaidContainer && mermaidContainer.isConnected && erdData) {
					renderMermaid();
				}
			});
		}
	});

	// 컴포넌트 마운트 시 초기 렌더링 (DOM이 준비된 후)
	onMount(() => {
		// requestAnimationFrame을 사용하여 DOM 바인딩이 완료된 후 렌더링
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				if (erdData && mermaidContainer && mermaidContainer.isConnected) {
					renderMermaid();
				} else if (!erdData) {
					loading = false;
				}
			});
		});
	});
</script>

<div class="flex h-full flex-col">
	<!-- 헤더 -->
	<div class="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
		<div>
			<h2 class="text-lg font-semibold text-gray-900">ERD 다이어그램</h2>
			<p class="text-sm text-gray-500">
				논리적 계층: {erdData.metadata.logicalNodes}개 | 물리적 계층: {erdData.metadata
					.physicalNodes}개 | 도메인: {erdData.metadata.domainNodes}개
			</p>
			{#if isSizeLimited}
				<p class="mt-1 text-xs text-amber-600">
					⚠️ 다이어그램이 너무 커서 일부만 표시됩니다. (노드: {entityTableNodeCount}개 → {maxNodes ||
						entityTableNodeCount}개, 엣지: {actualEdgeCount}개 → {maxEdges || actualEdgeCount}개)
				</p>
			{/if}
		</div>
		<div class="flex gap-2">
			<button
				onclick={() => {
					navigator.clipboard.writeText(mermaidCode);
					alert('Mermaid 코드가 클립보드에 복사되었습니다.');
				}}
				class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
			>
				Mermaid 코드 복사
			</button>
			<button
				onclick={() => {
					const blob = new Blob([mermaidCode], { type: 'text/plain' });
					const url = URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = url;
					a.download = 'erd-diagram.mmd';
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					URL.revokeObjectURL(url);
				}}
				class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
			>
				Mermaid 파일 다운로드
			</button>
		</div>
	</div>

	<!-- 다이어그램 영역 -->
	<div class="flex-1 overflow-auto bg-gray-50 p-4">
		<!-- mermaidContainer는 항상 렌더링하여 DOM에 바인딩 -->
		<div class="flex justify-center" class:hidden={loading || !!error}>
			<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
				<div bind:this={mermaidContainer}>
					{#if mermaidHtml}
						{@html mermaidHtml}
					{:else}
						<div class="flex items-center justify-center p-8">
							<p class="text-sm text-gray-500">ERD 데이터가 없습니다.</p>
						</div>
					{/if}
				</div>
			</div>
		</div>

		{#if loading}
			<div class="flex h-full items-center justify-center">
				<div class="text-center">
					<div
						class="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
					></div>
					<p class="text-sm text-gray-600">ERD 다이어그램 생성 중...</p>
				</div>
			</div>
		{:else if error}
			<div class="flex h-full items-center justify-center">
				<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
					<p class="text-sm font-medium text-red-800">오류 발생</p>
					<p class="mt-1 text-xs text-red-600">{error}</p>
					<p class="mt-2 text-xs text-gray-500">
						Mermaid 라이브러리가 필요합니다. npm install mermaid를 실행하세요.
					</p>
				</div>
			</div>
		{/if}
	</div>

	<!-- 메타데이터 -->
	<div class="border-t border-gray-200 bg-white px-4 py-2">
		<div class="flex items-center justify-between text-xs text-gray-500">
			<span>생성 시간: {new Date(erdData.metadata.generatedAt).toLocaleString('ko-KR')}</span>
			<span>
				노드: {erdData.metadata.totalNodes}개 | 엣지: {erdData.metadata.totalEdges}개 | 매핑:
				{erdData.metadata.totalMappings}개
			</span>
		</div>
	</div>
</div>

<style>
	:global(.mermaid) {
		display: flex;
		justify-content: center;
	}
</style>
