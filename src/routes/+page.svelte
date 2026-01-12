<script lang="ts">
</script>

<!-- 페이지 헤드 설정 -->
<svelte:head>
	<title>DbManager - 데이터 표준화 및 설계 관리 시스템</title>
	<meta
		name="description"
		content="한국어 표준 용어 기반의 용어 표준화와 데이터베이스 설계 관리를 통합적으로 수행하는 시스템"
	/>
</svelte:head>

<div class="overflow-hidden">
	<!-- 히어로 섹션 -->
	<section class="bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-20 sm:py-32">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="animate-fade-in-up mx-auto max-w-3xl text-center opacity-0">
				<h1 class="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
					<span class="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
						>DbManager</span
					>
				</h1>
				<p class="mt-6 text-xl leading-8 text-gray-600 sm:text-2xl">
					한국어 표준 용어 기반의 용어 표준화와<br />
					데이터베이스 설계 관리를 통합적으로 수행하는 시스템
				</p>
				<p class="mt-4 text-lg text-gray-500">
					데이터 표준화, 용어 일관성, 그리고 체계적인 데이터베이스 설계 관리를 통해<br />
					조직의 데이터 품질과 생산성을 향상시킵니다.
				</p>
			</div>
		</div>
	</section>

	<!-- 용어 표준화 모듈 섹션 -->
	<section class="py-20 sm:py-32">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<!-- 섹션 헤더 -->
			<div class="animate-fade-in-up mx-auto max-w-2xl text-center opacity-0">
				<h2 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
					<span class="text-blue-600">용어 표준화 모듈</span>
				</h2>
				<p class="mt-4 text-lg text-gray-600">
					한국어 표준 용어를 기반으로 용어의 일관성을 보장하고, 데이터베이스 설계 시 표준 용어를
					자동으로 생성하고 검증합니다.
				</p>
			</div>

			<!-- 모듈 구성 요소 카드 -->
			<div class="mt-16 grid gap-8 md:grid-cols-3">
				<!-- 단어집 카드 -->
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
						<h3 class="mt-4 text-lg font-semibold text-gray-900">단어집 (Vocabulary)</h3>
						<p class="mt-2 text-sm text-gray-600">
							한국어 표준 용어와 그에 대응하는 영문 약어/전체명을 관리하는 사전입니다. 표준 용어의
							중앙 집중식 관리로 용어 일관성을 보장하고 재사용을 촉진합니다.
						</p>
						<div class="mt-4 flex items-center text-sm font-medium text-blue-600">
							<span>자세히 보기</span>
							<svg
								class="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</div>
					</div>
				</a>

				<!-- 도메인 카드 -->
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
						<h3 class="mt-4 text-lg font-semibold text-gray-900">도메인 (Domain)</h3>
						<p class="mt-2 text-sm text-gray-600">
							공통표준도메인 정보를 관리하는 표준 도메인 사전입니다. 도메인 표준의 중앙 관리와
							단어집과의 자동 동기화를 통해 데이터 타입 표준화를 지원합니다.
						</p>
						<div class="mt-4 flex items-center text-sm font-medium text-green-600">
							<span>자세히 보기</span>
							<svg
								class="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</div>
					</div>
				</a>

				<!-- 용어 카드 -->
				<a
					href="/term/browse"
					class="animate-fade-in-up group relative overflow-hidden rounded-2xl border border-gray-200/50 bg-white p-8 opacity-0 shadow-sm transition-all delay-700 duration-300 hover:scale-105 hover:shadow-xl"
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
									d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
								/>
							</svg>
						</div>
						<h3 class="mt-4 text-lg font-semibold text-gray-900">용어 (Term)</h3>
						<p class="mt-2 text-sm text-gray-600">
							단어집과 도메인을 조합한 최종 용어를 관리합니다. 실제 데이터베이스에서 사용할 용어명,
							컬럼명, 도메인명을 생성하고 표준 용어 기반으로 자동 검증합니다.
						</p>
						<div class="mt-4 flex items-center text-sm font-medium text-purple-600">
							<span>자세히 보기</span>
							<svg
								class="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</div>
					</div>
				</a>
			</div>

			<!-- 주요 기능 설명 -->
			<div class="animate-fade-in-up delay-800 mt-12 opacity-0">
				<div class="rounded-2xl bg-blue-50/50 p-8">
					<h3 class="text-lg font-semibold text-gray-900">주요 기능</h3>
					<ul class="mt-4 space-y-2 text-sm text-gray-600">
						<li class="flex items-start">
							<svg
								class="mr-2 h-5 w-5 flex-shrink-0 text-blue-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							<span
								>용어 자동 생성: 한국어 용어를 입력하면 표준 용어 기반으로 가능한 조합을 자동 생성</span
							>
						</li>
						<li class="flex items-start">
							<svg
								class="mr-2 h-5 w-5 flex-shrink-0 text-blue-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							<span>매핑 검증: 단어집과 도메인 간의 매핑 관계를 자동으로 검증하고 일관성 보장</span>
						</li>
						<li class="flex items-start">
							<svg
								class="mr-2 h-5 w-5 flex-shrink-0 text-blue-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							<span>동기화: 단어집과 도메인 간의 자동 동기화로 데이터 일관성 유지</span>
						</li>
					</ul>
				</div>
			</div>
		</div>
	</section>

	<!-- 데이터베이스 설계 모듈 섹션 -->
	<section class="bg-gray-50 py-20 sm:py-32">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<!-- 섹션 헤더 -->
			<div class="animate-fade-in-up mx-auto max-w-2xl text-center opacity-0">
				<h2 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
					<span class="text-green-600">데이터베이스 설계 모듈</span>
				</h2>
				<p class="mt-4 text-lg text-gray-600">
					데이터베이스의 논리적/물리적 설계를 구성하는 요소를 체계적으로 관리하여 설계 정보의
					일관성과 품질을 보장합니다.
				</p>
			</div>

			<!-- 모듈 구성 요소 그리드 -->
			<div class="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				<!-- DB 카드 -->
				<a
					href="/database/browse"
					class="animate-fade-in-up delay-400 group relative overflow-hidden rounded-xl border border-gray-200/50 bg-white p-6 opacity-0 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-lg"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
					></div>
					<div class="relative">
						<div
							class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 transition-all duration-300 group-hover:bg-green-600 group-hover:text-white"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
								/>
							</svg>
						</div>
						<h3 class="mt-3 text-base font-semibold text-gray-900">DB (Database)</h3>
						<p class="mt-2 text-sm text-gray-600">
							관리 대상 데이터베이스 인스턴스 정보를 관리합니다. 기관명, 부서명, 논리/물리 DB명 등의
							정보를 포함합니다.
						</p>
					</div>
				</a>

				<!-- 엔터티 카드 -->
				<a
					href="/entity/browse"
					class="animate-fade-in-up group relative overflow-hidden rounded-xl border border-gray-200/50 bg-white p-6 opacity-0 shadow-sm transition-all delay-500 duration-300 hover:scale-105 hover:shadow-lg"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
					></div>
					<div class="relative">
						<div
							class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 transition-all duration-300 group-hover:bg-green-600 group-hover:text-white"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
								/>
							</svg>
						</div>
						<h3 class="mt-3 text-base font-semibold text-gray-900">엔터티 (Entity)</h3>
						<p class="mt-2 text-sm text-gray-600">
							데이터베이스의 논리적 데이터 단위를 관리합니다. 스키마명, 엔터티명, 주식별자, 수퍼타입
							엔터티명 등의 정보를 포함합니다.
						</p>
					</div>
				</a>

				<!-- 속성 카드 -->
				<a
					href="/attribute/browse"
					class="animate-fade-in-up delay-600 group relative overflow-hidden rounded-xl border border-gray-200/50 bg-white p-6 opacity-0 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-lg"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
					></div>
					<div class="relative">
						<div
							class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 transition-all duration-300 group-hover:bg-green-600 group-hover:text-white"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
								/>
							</svg>
						</div>
						<h3 class="mt-3 text-base font-semibold text-gray-900">속성 (Attribute)</h3>
						<p class="mt-2 text-sm text-gray-600">
							엔터티에 포함되는 속성 정보를 관리합니다. 스키마명, 엔터티명, 속성명, 속성유형,
							식별자여부 등의 정보를 포함합니다.
						</p>
					</div>
				</a>

				<!-- 테이블 카드 -->
				<a
					href="/table/browse"
					class="animate-fade-in-up group relative overflow-hidden rounded-xl border border-gray-200/50 bg-white p-6 opacity-0 shadow-sm transition-all delay-700 duration-300 hover:scale-105 hover:shadow-lg"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
					></div>
					<div class="relative">
						<div
							class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 transition-all duration-300 group-hover:bg-green-600 group-hover:text-white"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
								/>
							</svg>
						</div>
						<h3 class="mt-3 text-base font-semibold text-gray-900">테이블 (Table)</h3>
						<p class="mt-2 text-sm text-gray-600">
							물리 데이터베이스에 생성되는 테이블 명세를 관리합니다. 물리DB명, 스키마명,
							테이블영문명, 테이블한글명, 테이블유형 등의 정보를 포함합니다.
						</p>
					</div>
				</a>

				<!-- 컬럼 카드 -->
				<a
					href="/column/browse"
					class="animate-fade-in-up delay-800 group relative overflow-hidden rounded-xl border border-gray-200/50 bg-white p-6 opacity-0 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-lg"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
					></div>
					<div class="relative">
						<div
							class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 transition-all duration-300 group-hover:bg-green-600 group-hover:text-white"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
								/>
							</svg>
						</div>
						<h3 class="mt-3 text-base font-semibold text-gray-900">컬럼 (Column)</h3>
						<p class="mt-2 text-sm text-gray-600">
							테이블을 구성하는 컬럼의 상세 정보를 관리합니다. 스키마명, 테이블영문명, 컬럼영문명,
							컬럼한글명, 자료타입, PK/FK 정보 등을 포함합니다.
						</p>
					</div>
				</a>
			</div>

			<!-- 주요 기능 설명 -->
			<div class="animate-fade-in-up delay-900 mt-12 opacity-0">
				<div class="rounded-2xl bg-green-50/50 p-8">
					<h3 class="text-lg font-semibold text-gray-900">주요 기능</h3>
					<ul class="mt-4 space-y-2 text-sm text-gray-600">
						<li class="flex items-start">
							<svg
								class="mr-2 h-5 w-5 flex-shrink-0 text-green-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							<span>설계서 관리: 논리적/물리적 설계 정보를 체계적으로 관리하고 검색</span>
						</li>
						<li class="flex items-start">
							<svg
								class="mr-2 h-5 w-5 flex-shrink-0 text-green-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							<span>파일 업로드/다운로드: Excel 파일을 통한 대량 데이터 관리</span>
						</li>
						<li class="flex items-start">
							<svg
								class="mr-2 h-5 w-5 flex-shrink-0 text-green-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							<span>계층 구조 관리: DB → 엔터티 → 속성, DB → 테이블 → 컬럼의 계층적 관계 추적</span>
						</li>
					</ul>
				</div>
			</div>
		</div>
	</section>

	<!-- 주요 기능 섹션 -->
	<section class="py-20 sm:py-32">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="animate-fade-in-up mx-auto max-w-2xl text-center opacity-0">
				<h2 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">주요 기능</h2>
				<p class="mt-4 text-lg leading-8 text-gray-600">
					두 모듈에서 공통으로 제공하는 핵심 기능을 통해 데이터 관리 효율성을 극대화합니다.
				</p>
			</div>
			<div class="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
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
							파일 업로드 및 다운로드
						</dt>
						<dd class="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
							<p class="flex-auto">
								Excel 파일을 통해 대량의 데이터를 손쉽게 업로드하고, 필요한 데이터를 다시 Excel
								파일로 다운로드할 수 있습니다. 검증 교체 모드를 지원하여 데이터 품질을 보장합니다.
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
							검색 및 필터링
						</dt>
						<dd class="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
							<p class="flex-auto">
								다양한 필드별 검색과 필터링 기능을 제공합니다. 정확 일치 검색과 부분 일치 검색을
								지원하며, 컬럼별 필터를 통해 원하는 데이터를 빠르게 찾을 수 있습니다.
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
							데이터 검증 및 품질 관리
						</dt>
						<dd class="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
							<p class="flex-auto">
								필수 필드 검증, 중복 검사, 매핑 검증 등을 통해 데이터 품질을 자동으로 관리합니다.
								용어 표준화 모듈에서는 단어집과 도메인 간의 매핑 관계를 자동으로 검증합니다.
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

	.delay-800 {
		animation-delay: 0.8s;
	}

	.delay-900 {
		animation-delay: 0.9s;
	}
</style>
