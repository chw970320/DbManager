<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import ScrollToTop from '$lib/components/ScrollToTop.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { menuGroups, type NavigationMenuGroup } from '$lib/utils/navigation';

	let { children } = $props();

	// 모바일 메뉴 상태
	let mobileMenuOpen = $state(false);

	// 모바일 메뉴 그룹 아코디언 상태
	let openMobileGroupId = $state<string | null>(null);

	// 모바일 메뉴 토글
	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	// 현재 페이지 체크
	function isCurrentPage(href: string) {
		return $page.url.pathname === href;
	}

	// 그룹 내에 현재 페이지가 포함되는지 여부
	function isGroupActive(group: NavigationMenuGroup) {
		return group.items.some((item) => isCurrentPage(item.href));
	}

	// 모바일에서 그룹 아코디언 토글
	function toggleMobileGroup(groupId: string) {
		openMobileGroupId = openMobileGroupId === groupId ? null : groupId;
	}
</script>

<div class="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50">
	<!-- 글래스모피즘 네비게이션 -->
	<header class="sticky top-0 z-50 border-b border-white/20 bg-white/80 shadow-sm backdrop-blur-xl">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex h-16 items-center justify-between">
				<!-- 로고 -->
				<div class="flex items-center space-x-8">
					<a href="/" class="flex items-center space-x-3 transition-transform hover:scale-105">
						<div class="relative">
							<div
								class="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 opacity-75 blur"
							></div>
							<div
								class="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-600"
							>
								<Icon name="file" size="lg" class="text-white" />
							</div>
						</div>
						<span
							class="hidden bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent xl:block"
							>데이터 관리</span
						>
					</a>

					<!-- 데스크탑 네비게이션 (그룹 버튼 + 드롭다운) -->
					<nav class="hidden items-center space-x-3 md:flex">
						{#each menuGroups as group (group.id)}
							<div class="group relative">
								<!-- 그룹 버튼: 하위 메뉴 수를 시각적으로 접어서 표시 -->
								<button
									type="button"
									class="inline-flex items-center space-x-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 {isGroupActive(
										group
									)
										? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
										: 'border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-50'}"
								>
									<span>{group.label}</span>
									<span class="text-[10px] text-slate-400">
										{group.items.length}개
									</span>
									<Icon name="chevron-down" size="sm" class="text-slate-400" />
								</button>

								<!-- 드롭다운: 그룹 호버 시에만 전체 메뉴 노출 -->
								<div
									class="invisible absolute left-0 top-full z-40 mt-2 min-w-[220px] rounded-xl border border-slate-100 bg-white/95 p-1 text-sm opacity-0 shadow-lg backdrop-blur-sm transition-all duration-150 group-hover:visible group-hover:opacity-100"
								>
									{#each group.items as item (item.href)}
										<a
											href={item.href}
											class="flex items-center space-x-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors {isCurrentPage(
												item.href
											)
												? 'bg-blue-50 text-blue-700'
												: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
										>
											<Icon name={item.icon} size="sm" />
											<span>{item.label}</span>
										</a>
									{/each}
								</div>
							</div>
						{/each}
					</nav>
				</div>

				<!-- 모바일 메뉴 버튼 -->
				<div class="flex items-center md:hidden">
					<button
						onclick={toggleMobileMenu}
						class="inline-flex items-center justify-center rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-600"
						aria-controls="mobile-menu"
						aria-expanded={mobileMenuOpen}
					>
						<span class="sr-only">메인 메뉴 열기</span>
						{#if mobileMenuOpen}
							<Icon name="x" size="lg" />
						{:else}
							<Icon name="menu" size="lg" />
						{/if}
					</button>
				</div>
			</div>
		</div>

		<!-- 모바일 메뉴 -->
		{#if mobileMenuOpen}
			<div class="border-t border-gray-200 bg-white/95 backdrop-blur-sm md:hidden" id="mobile-menu">
				<div class="space-y-3 px-4 py-3">
					{#each menuGroups as group (group.id)}
						<div>
							<button
								type="button"
								class="flex w-full items-center justify-between rounded-lg px-2 py-2 text-xs font-semibold tracking-wide text-slate-500"
								onclick={() => toggleMobileGroup(group.id)}
							>
								<span>{group.label}</span>
								<Icon
									name="chevron-down"
									size="sm"
									class={`transition-transform ${openMobileGroupId === group.id ? 'rotate-180' : ''}`}
								/>
							</button>

							{#if openMobileGroupId === group.id}
								<div class="mt-1 space-y-1">
									{#each group.items as item (item.href)}
										<a
											href={item.href}
											class="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors {isCurrentPage(
												item.href
											)
												? 'bg-blue-50 text-blue-700'
												: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
										>
											<Icon name={item.icon} size="md" />
											<span>{item.label}</span>
										</a>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</header>

	<!-- 메인 콘텐츠 -->
	<main class="flex-1">
		{@render children()}
	</main>

	<!-- 심플한 푸터 -->
	<footer class="border-t border-gray-200 bg-white/80 backdrop-blur-sm">
		<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<div class="text-center">
				<p class="text-sm text-gray-500">
					© {new Date().getFullYear()}
					<span
						class="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text font-medium text-transparent"
						>DataBase Manager</span
					>
				</p>
			</div>
		</div>
	</footer>

	<ScrollToTop />
	<Toast />
	<ConfirmDialog />
</div>
