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
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8">
	<div class="mx-auto w-full px-4 sm:px-6 lg:px-8">
		{#if breadcrumbItems.length > 0}
			<Breadcrumb items={breadcrumbItems} />
		{/if}

		<div class="gap-8 lg:grid lg:grid-cols-[16rem_1fr] lg:items-start">
			<!-- 사이드바 -->
			{#if sidebar}
				<aside class="hidden h-full w-64 lg:block">
					<div class="sticky top-20 rounded-2xl border border-gray-200/50 bg-white/95 p-4 shadow-xl backdrop-blur-md">
						{@render sidebar()}
					</div>
				</aside>
			{/if}

			<!-- 메인 -->
			<main class="w-full overflow-x-hidden">
				<!-- 헤더 -->
				<div class="mb-10">
					<div class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
						<div>
							<h1 class="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-4xl font-bold text-transparent">
								{title}
							</h1>
							{#if description}
								<p class="mt-2 text-sm text-content-muted">{description}</p>
							{/if}
						</div>
						{#if actions}
							<div class="flex items-center space-x-3">
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
