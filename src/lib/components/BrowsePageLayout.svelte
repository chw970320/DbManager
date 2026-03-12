<script lang="ts">
	import type { Snippet } from 'svelte';
	import Breadcrumb from './Breadcrumb.svelte';

	interface Props {
		title: string;
		description?: string;
		breadcrumbItems?: Array<{ label: string; href?: string }>;
		actions?: Snippet;
		sidebar?: Snippet;
		children: Snippet;
	}

	let {
		title,
		description = '',
		breadcrumbItems = [],
		actions,
		sidebar,
		children
	}: Props = $props();

	let mobileSidebarOpen = $state(false);
</script>

<!-- 배경 및 밀집도 조정 (py-8 -> py-4 sm:py-6), 향후 다크모드 대응 -->
<div class="min-h-screen bg-gradient-to-br from-slate-50 via-surface to-blue-50 py-4 sm:py-6 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
	<div class="mx-auto w-full px-4 sm:px-6 lg:px-8">
		{#if breadcrumbItems.length > 0}
			<div class="mb-4">
				<Breadcrumb items={breadcrumbItems} />
			</div>
		{/if}

		<div class="gap-6 lg:grid lg:grid-cols-[16rem_1fr] lg:items-start">
			<!-- 사이드바 -->
			{#if sidebar}
				<aside class="hidden h-full w-64 lg:block">
					<div class="sticky top-6 rounded-2xl border border-border bg-surface/95 p-4 shadow-xl backdrop-blur-md dark:bg-surface/90">
						{@render sidebar()}
					</div>
				</aside>

				{#if mobileSidebarOpen}
					<!-- 체계적인 z-index 사용 (z-modal-backdrop) -->
					<div class="fixed inset-0 z-modal-backdrop flex lg:hidden">
						<div
							class="w-64 transform bg-surface p-4 pt-20 shadow-2xl transition-transform duration-300"
							role="dialog"
							aria-modal="true"
						>
							{@render sidebar()}
						</div>
						<button
							type="button"
							class="flex-1 bg-black/30 backdrop-blur-sm"
							onclick={() => (mobileSidebarOpen = false)}
							aria-label="사이드바 닫기"
						></button>
					</div>
				{/if}
			{/if}

			<!-- 메인 -->
			<main class="w-full min-w-0 overflow-x-hidden">
				<!-- 헤더 영역 여백 축소로 F자형 시선 이동과 데이터 밀집도 최적화 -->
				<div class="mb-6">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex items-center gap-4">
							{#if sidebar}
								<button
									type="button"
									onclick={() => (mobileSidebarOpen = true)}
									class="rounded-lg p-2 text-content-muted hover:bg-surface-raised hover:text-content lg:hidden"
									title="사이드바 열기"
									aria-label="사이드바 열기"
								>
									<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M4 6h16M4 12h16M4 18h16"
										/>
									</svg>
								</button>
							{/if}
							<div>
								<h1 class="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-3xl sm:text-4xl font-bold text-transparent dark:from-white dark:to-gray-300">
									{title}
								</h1>
								{#if description}
									<p class="mt-2 text-sm text-content-muted">{description}</p>
								{/if}
							</div>
						</div>
						{#if actions}
							<div class="flex items-center gap-3">
								{@render actions()}
							</div>
						{/if}
					</div>
				</div>

				{@render children()}
			</main>
		</div>
	</div>
</div>
