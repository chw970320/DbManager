<script lang="ts">
	import { onMount } from 'svelte';
	import { writable, derived } from 'svelte/store';

	// 상태 변수
	const scrollY = writable(0);
	const showButton = derived(scrollY, ($scrollY) => $scrollY > 300);

	/**
	 * 맨 위로 스크롤하는 함수
	 */
	function scrollToTop() {
		window.scrollTo({
			top: 0,
			behavior: 'smooth'
		});
	}

	/**
	 * 스크롤 이벤트 핸들러
	 */
	function handleScroll() {
		scrollY.set(window.scrollY);
	}

	onMount(() => {
		// 스크롤 이벤트 리스너 등록
		window.addEventListener('scroll', handleScroll);

		// 초기 스크롤 위치 설정
		handleScroll();

		// 컴포넌트 언마운트 시 이벤트 리스너 제거
		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});
</script>

<!-- 맨 위로 이동 버튼 -->
{#if $showButton}
	<button
		type="button"
		onclick={scrollToTop}
		class="fixed bottom-8 right-8 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
		aria-label="맨 위로 이동"
		title="맨 위로 이동"
	>
		<!-- 위쪽 화살표 아이콘 -->
		<svg
			class="h-6 w-6 transition-transform duration-200 hover:scale-110"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M5 10l7-7m0 0l7 7m-7-7v18"
			/>
		</svg>
	</button>
{/if}

<style>
	/* 버튼 애니메이션 */
	button {
		animation: fadeInUp 0.3s ease-out;
	}

	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* 호버 시 그림자 효과 강화 */
	button:hover {
		box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
	}
</style>
