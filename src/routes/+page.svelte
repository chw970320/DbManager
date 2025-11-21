<script lang="ts">
</script>

<!-- 페이지 헤드 설정 -->
<svelte:head>
	<title>데이터 관리 시스템</title>
	<meta name="description" content="데이터 관리 시스템" />
</svelte:head>

<div class="overflow-hidden">
	<!-- 기능 섹션 -->
	<section class="py-20 sm:py-32">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<!-- 섹션 헤더 -->
			<div class="animate-fade-in-up mx-auto max-w-2xl text-center opacity-0">
				<h2 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
					<span class="text-blue-600">데이터 관리 시스템</span>
				</h2>
				<p class="mt-4 text-lg text-gray-600">데이터 및 단어 관리 시스템</p>
			</div>

			<!-- 기능 그리드 -->
			<div class="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
				<!-- 기능 1 -->
				<a
					href="/browse"
					class="animate-fade-in-up delay-400 group relative overflow-hidden rounded-2xl border border-gray-200/50 bg-white p-8 opacity-0 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
					></div>
					<div class="relative">
						<div
							class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 transition-all duration-300 group-hover:bg-blue-600 group-hover:text-white"
						>
							<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
						</div>
						<h3 class="mt-4 text-lg font-semibold text-gray-900">단어집 관리</h3>
						<p class="mt-2 text-sm text-gray-600">쉽고 빠르게 단어집을 관리하세요.</p>
					</div>
				</a>

				<!-- 기능 2 -->
				<a
					href="/upload"
					class="animate-fade-in-up group relative overflow-hidden rounded-2xl border border-gray-200/50 bg-white p-8 opacity-0 shadow-sm transition-all delay-500 duration-300 hover:scale-105 hover:shadow-xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
					></div>
					<div class="relative">
						<div
							class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 transition-all duration-300 group-hover:bg-purple-600 group-hover:text-white"
						>
							<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
								/>
							</svg>
						</div>
						<h3 class="mt-4 text-lg font-semibold text-gray-900">단어집 업로드</h3>
						<p class="mt-2 text-sm text-gray-600">드래그 앤 드롭으로 단어집을 업로드하세요.</p>
					</div>
				</a>

				<!-- 기능 3: 도메인 조회 -->
				<a
					href="/domain/browse"
					class="animate-fade-in-up delay-600 group relative overflow-hidden rounded-2xl border border-gray-200/50 bg-white p-8 opacity-0 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
					></div>
					<div class="relative">
						<div
							class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600 transition-all duration-300 group-hover:bg-green-600 group-hover:text-white"
						>
							<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
								/>
							</svg>
						</div>
						<h3 class="mt-4 text-lg font-semibold text-gray-900">도메인 조회</h3>
						<p class="mt-2 text-sm text-gray-600">등록된 도메인 정보를 검색하고 조회하세요.</p>
					</div>
				</a>

				<!-- 기능 4: 도메인 업로드 -->
				<a
					href="/domain/upload"
					class="animate-fade-in-up group relative overflow-hidden rounded-2xl border border-gray-200/50 bg-white p-8 opacity-0 shadow-sm transition-all delay-700 duration-300 hover:scale-105 hover:shadow-xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-orange-50 to-red-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
					></div>
					<div class="relative">
						<div
							class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600 transition-all duration-300 group-hover:bg-orange-600 group-hover:text-white"
						>
							<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l3-3m0 0l3 3m-3-3v9"
								/>
							</svg>
						</div>
						<h3 class="mt-4 text-lg font-semibold text-gray-900">도메인 업로드</h3>
						<p class="mt-2 text-sm text-gray-600">드래그 앤 드롭으로 도메인 정보를 업로드하세요.</p>
					</div>
				</a>
			</div>
		</div>
	</section>

	<!-- 서비스 기능 설명 섹션 -->
	<section class="bg-gray-50 py-20 sm:py-32">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="mx-auto max-w-2xl text-center">
				<h2 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
					주요 기능
				</h2>
				<p class="mt-4 text-lg leading-8 text-gray-600">
					데이터 관리 시스템은 다음과 같은 핵심 기능을 통해 사용자의 데이터 관리 효율성을
					극대화합니다.
				</p>
			</div>
			<div
				class="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none"
			>
				<dl class="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
					<div class="flex flex-col">
						<dt class="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
							<svg
								class="h-5 w-5 flex-none text-blue-600"
								viewBox="0 0 20 20"
								fill="currentColor"
								aria-hidden="true"
							>
								<path
									fill-rule="evenodd"
									d="M15.312 5.125l-6.188 6.188-2.125-2.125-1.062 1.062 3.188 3.188 7.25-7.25-1.062-1.062z"
								/>
							</svg>
							단어 및 도메인 관리
						</dt>
						<dd class="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
							<p class="flex-auto">
								용어, 동의어, 금지어 등 다양한 단어와 도메인 정보를 체계적으로 관리하고 검색할 수
								있습니다.
							</p>
						</dd>
					</div>
					<div class="flex flex-col">
						<dt class="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
							<svg
								class="h-5 w-5 flex-none text-blue-600"
								viewBox="0 0 20 20"
								fill="currentColor"
								aria-hidden="true"
							>
								<path
									fill-rule="evenodd"
									d="M15.312 5.125l-6.188 6.188-2.125-2.125-1.062 1.062 3.188 3.188 7.25-7.25-1.062-1.062z"
								/>
							</svg>
							파일 업로드 및 다운로드
						</dt>
						<dd class="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
							<p class="flex-auto">
								엑셀 파일을 통해 대량의 단어 및 도메인 정보를 손쉽게 업로드하고, 필요한 데이터를
								다시 엑셀 파일로 다운로드할 수 있습니다.
							</p>
						</dd>
					</div>
					<div class="flex flex-col">
						<dt class="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
							<svg
								class="h-5 w-5 flex-none text-blue-600"
								viewBox="0 0 20 20"
								fill="currentColor"
								aria-hidden="true"
							>
								<path
									fill-rule="evenodd"
									d="M15.312 5.125l-6.188 6.188-2.125-2.125-1.062 1.062 3.188 3.188 7.25-7.25-1.062-1.062z"
								/>
							</svg>
							변경 이력 추적
						</dt>
						<dd class="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
							<p class="flex-auto">
								모든 데이터 변경 사항에 대한 이력을 자동으로 기록하여, 언제든지 변경 내용을 확인하고
								추적할 수 있습니다.
							</p>
						</dd>
					</div>
				</dl>
			</div>
		</div>
	</section>
</div>

<style>
	@keyframes fade-in-up {
		from {
			opacity: 0;
			transform: translateY(30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-fade-in-up {
		animation: fade-in-up 0.6s ease-out forwards;
	}

	.delay-400 {
		animation-delay: 0.4s;
	}

	.delay-500 {
		animation-delay: 0.5s;
	}

	.delay-600 {
		animation-delay: 0.6s;
	}

	.delay-700 {
		animation-delay: 0.7s;
	}
</style>
