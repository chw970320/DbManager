<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import ScrollToTop from '$lib/components/ScrollToTop.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { children } = $props();

	// 모바일 메뉴 상태
	let mobileMenuOpen = $state(false);

	// 네비게이션 메뉴 아이템
	const menuItems = [
		{ href: '/browse', label: '단어집', icon: 'search' },
		{ href: '/domain/browse', label: '도메인', icon: 'database' },
		{ href: '/term/browse', label: '용어', icon: 'tag' },
		{ href: '/database/browse', label: 'DB', icon: 'server' },
		{ href: '/entity/browse', label: '엔터티', icon: 'cube' },
		{ href: '/attribute/browse', label: '속성', icon: 'key' },
		{ href: '/table/browse', label: '테이블', icon: 'table' },
		{ href: '/column/browse', label: '컬럼', icon: 'columns' },
		{ href: '/erd', label: 'ERD', icon: 'diagram' }
	];

	// 모바일 메뉴 토글
	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	// 현재 페이지 체크
	function isCurrentPage(href: string) {
		return $page.url.pathname === href;
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
								<Icon name={item.icon} size="sm" />
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
							<Icon name={item.icon} size="md" />
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
	<Toast />
	<ConfirmDialog />
</div>
