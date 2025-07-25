<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import ScrollToTop from '$lib/components/ScrollToTop.svelte';
	import HistoryLog from '$lib/components/HistoryLog.svelte';

	let { children } = $props();

	// 모바일 메뉴 상태
	let mobileMenuOpen = $state(false);

	// 네비게이션 메뉴 아이템
	const menuItems = [
		{ href: '/browse', label: '단어집 관리', icon: 'search' },
		{ href: '/upload', label: '단어집 업로드', icon: 'upload' },
		{ href: '/domain/browse', label: '도메인 조회', icon: 'database' },
		{ href: '/domain/upload', label: '도메인 업로드', icon: 'cloud-upload' }
	];

	// 모바일 메뉴 토글
	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	// 현재 페이지 체크
	function isCurrentPage(href: string) {
		return $page.url.pathname === href;
	}

	// SVG 아이콘 컴포넌트
	function getIcon(iconName: string) {
		const icons = {
			search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
			upload:
				'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',
			database:
				'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4',
			'cloud-upload':
				'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l3-3m0 0l3 3m-3-3v9'
		};
		return icons[iconName as keyof typeof icons];
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
								<svg
									class="h-6 w-6 text-white"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									></path>
								</svg>
							</div>
						</div>
						<span
							class="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent"
							>데이터 관리</span
						>
					</a>

					<!-- 데스크탑 네비게이션 -->
					<nav class="hidden items-center space-x-2 md:flex">
						{#each menuItems as item (item.href)}
							<a
								href={item.href}
								class="flex items-center space-x-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 {isCurrentPage(
									item.href
								)
									? 'bg-blue-50 text-blue-700 shadow-sm'
									: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d={getIcon(item.icon)}
									></path>
								</svg>
								<span>{item.label}</span>
							</a>
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
							<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						{:else}
							<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 6h16M4 12h16m-7 6h7"
								/>
							</svg>
						{/if}
					</button>
				</div>
			</div>
		</div>

		<!-- 모바일 메뉴 -->
		{#if mobileMenuOpen}
			<div class="border-t border-gray-200 bg-white/95 backdrop-blur-sm md:hidden" id="mobile-menu">
				<div class="space-y-1 px-4 py-3">
					{#each menuItems as item (item.href)}
						<a
							href={item.href}
							class="flex items-center space-x-3 rounded-lg px-3 py-2 text-base font-medium transition-colors {isCurrentPage(
								item.href
							)
								? 'bg-blue-50 text-blue-700'
								: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d={getIcon(item.icon)}
								></path>
							</svg>
							<span>{item.label}</span>
						</a>
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
	<HistoryLog />
</div>
