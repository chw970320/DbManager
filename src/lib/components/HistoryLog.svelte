<script lang="ts">
	import { onMount } from 'svelte';
	import type { HistoryLogEntry, ApiResponse } from '$lib/types/vocabulary';

	// 상태 변수
	let historyLogs = $state<HistoryLogEntry[]>([]);
	let isLoading = $state(false);
	let isExpanded = $state(false);
	let error = $state<string | null>(null);
	let totalCount = $state(0);
	let isHovered = $state(false);

	// 컴포넌트 마운트 시 히스토리 데이터 로드
	onMount(() => {
		loadHistoryData();
		// 30초마다 자동 새로고침 (폴링)
		const interval = setInterval(loadHistoryData, 30000);
		return () => clearInterval(interval);
	});

	/**
	 * 히스토리 데이터 로드
	 */
	async function loadHistoryData() {
		isLoading = true;
		error = null;

		try {
			const response = await fetch('/api/history?limit=20');
			const result: ApiResponse = await response.json();

			if (result.success && result.data) {
				historyLogs = result.data.logs || [];
				totalCount = result.data.pagination?.totalCount || 0;
			} else {
				error = result.error || '히스토리 데이터 로드 실패';
			}
		} catch (err) {
			console.error('히스토리 데이터 로드 오류:', err);
			error = '네트워크 오류가 발생했습니다.';
		} finally {
			isLoading = false;
		}
	}

	/**
	 * 액션 타입에 따른 한글 표시명 반환
	 */
	function getActionText(action: string): string {
		switch (action) {
			case 'add':
				return '추가';
			case 'update':
				return '수정';
			case 'delete':
				return '삭제';
			case 'UPLOAD_MERGE':
				return '업로드(병합)';
			default:
				return action;
		}
	}

	/**
	 * 액션 타입에 따른 색상 클래스 반환
	 */
	function getActionColor(action: string): string {
		switch (action) {
			case 'add':
				return 'text-green-600 bg-green-50';
			case 'update':
				return 'text-blue-600 bg-blue-50';
			case 'delete':
				return 'text-red-600 bg-red-50';
			case 'UPLOAD_MERGE':
				return 'text-indigo-600 bg-indigo-50';
			default:
				return 'text-gray-600 bg-gray-50';
		}
	}

	/**
	 * 타임스탬프를 읽기 쉬운 형태로 변환
	 */
	function formatTimestamp(timestamp: string): string {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMinutes = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffMinutes < 1) {
			return '방금 전';
		} else if (diffMinutes < 60) {
			return `${diffMinutes}분 전`;
		} else if (diffHours < 24) {
			return `${diffHours}시간 전`;
		} else if (diffDays < 7) {
			return `${diffDays}일 전`;
		} else {
			return date.toLocaleDateString('ko-KR', {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		}
	}

	/**
	 * 수동 새로고침
	 */
	async function handleRefresh() {
		await loadHistoryData();
	}

	// 외부에서 새로고침을 트리거할 수 있도록 전역 함수 등록
	if (typeof window !== 'undefined') {
		(window as any).refreshHistoryLog = loadHistoryData;
	}

	/**
	 * 컨테이너가 보여야 하는지 계산 (파생 상태)
	 */
	let shouldShowContainer = $derived(isHovered || isExpanded);
</script>

<!-- 플로팅 컨테이너 -->
<div
	class="fixed right-4 top-20 z-40"
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
>
	<!-- 플로팅 박스들 컨테이너 -->
	<div
		class="w-80 space-y-4 transition-transform duration-300 ease-in-out"
		class:translate-x-72={!shouldShowContainer}
		class:translate-x-0={shouldShowContainer}
	>
		<!-- 작업 히스토리 박스 -->
		<div class="rounded-xl border border-gray-200 bg-white shadow-lg">
			<!-- 헤더 (항상 표시) -->
			<div
				class="flex cursor-pointer items-center justify-between rounded-t-xl border border-gray-200 bg-white p-3 shadow-lg"
				class:rounded-b-xl={!isExpanded}
				onclick={() => (isExpanded = !isExpanded)}
			>
				<div class="flex items-center space-x-2">
					<div class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
						<svg
							class="h-4 w-4 text-blue-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<h3 class="text-sm font-semibold text-gray-800">작업 히스토리</h3>
					{#if totalCount > 0}
						<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
							{totalCount}
						</span>
					{/if}
				</div>

				<div class="flex items-center space-x-1">
					<!-- 새로고침 버튼 -->
					<button
						type="button"
						onclick={(e) => {
							e.stopPropagation();
							handleRefresh();
						}}
						disabled={isLoading}
						class="rounded-md p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
						title="새로고침"
					>
						<svg
							class="h-4 w-4"
							class:animate-spin={isLoading}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
					</button>

					<!-- 확장/축소 아이콘 -->
					<svg
						class="h-4 w-4 text-gray-400 transition-transform duration-200"
						class:rotate-180={isExpanded}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</div>
			</div>

			<!-- 본문 (항상 존재하지만 높이로 제어) -->
			<div
				class="overflow-y-auto rounded-b-xl border-x border-b border-gray-200 bg-white shadow-lg transition-all duration-300 ease-in-out"
				class:max-h-96={isExpanded}
				class:max-h-0={!isExpanded}
			>
				{#if error}
					<div class="p-4 text-center">
						<p class="text-sm text-red-600">{error}</p>
						<button
							type="button"
							onclick={handleRefresh}
							class="mt-2 text-xs text-blue-600 hover:underline"
						>
							다시 시도
						</button>
					</div>
				{:else if historyLogs.length === 0}
					<div class="p-4 text-center">
						<p class="text-sm text-gray-500">
							{isLoading ? '로딩 중...' : '아직 작업 내역이 없습니다.'}
						</p>
					</div>
				{:else}
					<div class="divide-y divide-gray-100">
						{#each historyLogs as log (log.id)}
							<div class="p-3 hover:bg-gray-50">
								<div class="flex items-start justify-between">
									<div class="min-w-0 flex-1">
										<div class="flex items-center space-x-2">
											<span
												class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {getActionColor(
													log.action
												)}"
											>
												{getActionText(log.action)}
											</span>
										</div>
										<p
											class="mt-1 truncate text-sm font-medium text-gray-900"
											title={log.targetName}
										>
											{log.targetName}
										</p>
										<p class="text-xs text-gray-500">
											{formatTimestamp(log.timestamp)}
										</p>
									</div>
								</div>
							</div>
						{/each}
					</div>

					{#if totalCount > historyLogs.length}
						<div class="border-t border-gray-100 p-3 text-center">
							<p class="text-xs text-gray-500">
								{historyLogs.length}개 표시 중 (전체 {totalCount}개)
							</p>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
</div>
