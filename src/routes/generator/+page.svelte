<script lang="ts">
	import TermGenerator from '$lib/components/TermGenerator.svelte';
</script>

<svelte:head>
	<title>용어 변환 생성기 - 모던한 용어 관리 시스템</title>
	<meta
		name="description"
		content="용어집에 등록된 단어를 기반으로 표준단어명과 영문약어명을 상호 변환합니다."
	/>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50 py-12">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="mb-12 text-center">
			<h1
				class="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-4xl font-bold text-transparent"
			>
				용어 변환 생성기
			</h1>
			<p class="mx-auto mt-3 max-w-2xl text-lg text-gray-600">
				등록된 용어집을 기반으로 표준단어명과 영문약어명을 실시간으로 변환합니다.
			</p>
		</div>

		<TermGenerator />
	</div>
</div>
