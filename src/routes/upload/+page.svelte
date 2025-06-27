<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import type { UploadResult } from '$lib/types/terminology.js';

	// 상태 변수
	let uploading = $state(false);
	let uploadMessage = $state('');
	let errorMessage = $state('');
	let uploadHistory = $state<UploadResult[]>([]);

	type UploadSuccessDetail = { result: UploadResult };
	type UploadErrorDetail = { error: string };

	/**
	 * 컴포넌트 마운트 시 업로드 기록 로드
	 */
	onMount(async () => {
		await loadUploadHistory();
	});

	/**
	 * 업로드 기록 로드
	 */
	async function loadUploadHistory() {
		try {
			const response = await fetch('/api/upload');
			const result = await response.json();

			if (result.success && result.data?.history) {
				uploadHistory = result.data.history;
			}
		} catch (error) {
			console.error('업로드 기록 로드 오류:', error);
		}
	}

	/**
	 * 파일 업로드 시작 처리
	 */
	function handleUploadStart() {
		uploading = true;
		uploadMessage = '';
		errorMessage = '';
	}

	/** 업로드 성공 처리
	 */
	async function handleUploadSuccess(detail: UploadSuccessDetail) {
		const { result } = detail;
		uploadMessage = result.message;

		// 업로드 기록 새로고침
		await loadUploadHistory();

		// 3초 후 조회 페이지로 이동
		setTimeout(() => {
			goto('/browse');
		}, 3000);
	}

	/**
	 * 파일 업로드 오류 처리
	 */
	function handleUploadError(detail: UploadErrorDetail) {
		const { error } = detail;
		errorMessage = error;
	}

	/**
	 * 파일 업로드 완료 처리
	 */
	function handleUploadComplete() {
		uploading = false;
	}

	/**
	 * 날짜 포맷팅
	 */
	function formatDate(dateString: string): string {
		try {
			const date = new Date(dateString);
			return date.toLocaleString('ko-KR', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return dateString;
		}
	}
</script>

<svelte:head>
	<title>용어집 업로드</title>
	<meta
		name="description"
		content="드래그 앤 드롭으로 Excel 파일을 업로드하고 용어집을 구축하세요."
	/>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<!-- 페이지 헤더 -->
		<div class="mb-10 text-center">
			<h1
				class="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-4xl font-bold text-transparent"
			>
				용어집 업로드
			</h1>
			<p class="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
				드래그 앤 드롭으로 Excel 파일을 업로드하여 <span class="font-semibold text-blue-600"
					>용어집</span
				>을 등록하세요
			</p>
		</div>

		<!-- 상태 메시지 -->
		{#if uploadMessage}
			<div class="animate-fade-in mx-auto mb-8 max-w-2xl">
				<div
					class="rounded-2xl border border-green-200/50 bg-gradient-to-r from-green-50 to-emerald-50 p-6 shadow-lg backdrop-blur-sm"
				>
					<div class="flex items-start">
						<div class="rounded-full bg-green-100 p-2">
							<svg class="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
						<div class="ml-4">
							<h4 class="text-lg font-semibold text-green-800">업로드 완료!</h4>
							<p class="text-green-700">{uploadMessage}</p>
							<p class="mt-2 flex items-center text-sm text-green-600">
								<svg
									class="mr-1 h-4 w-4 animate-spin"
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
								3초 후 조회 페이지로 이동합니다...
							</p>
						</div>
					</div>
				</div>
			</div>
		{/if}

		{#if errorMessage}
			<div class="animate-fade-in mx-auto mb-8 max-w-2xl">
				<div
					class="rounded-2xl border border-red-200/50 bg-gradient-to-r from-red-50 to-pink-50 p-6 shadow-lg backdrop-blur-sm"
				>
					<div class="flex items-start">
						<div class="rounded-full bg-red-100 p-2">
							<svg class="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
						<div class="ml-4">
							<h4 class="text-lg font-semibold text-red-800">업로드 실패</h4>
							<p class="text-red-700">{errorMessage}</p>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
			<!-- 메인 업로드 영역 -->
			<div class="space-y-8 lg:col-span-2">
				<!-- 업로드 컴포넌트 -->
				<div
					class="group relative overflow-hidden rounded-3xl border border-gray-200/50 bg-white/80 p-8 shadow-lg backdrop-blur-sm transition-all duration-300"
				>
					<div class="relative">
						<FileUpload
							disabled={uploading}
							onuploadstart={handleUploadStart}
							onuploadsuccess={handleUploadSuccess}
							onuploaderror={handleUploadError}
							onuploadcomplete={handleUploadComplete}
						/>
					</div>
				</div>

				<!-- 업로드 가이드 -->
				<div
					class="rounded-3xl border border-gray-200/50 bg-white/80 p-8 shadow-lg backdrop-blur-sm"
				>
					<div class="flex items-start">
						<div class="rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 p-4">
							<svg
								class="h-8 w-8 text-blue-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<div class="ml-6 flex-1">
							<h3 class="mb-4 text-2xl font-bold text-gray-900">업로드 가이드</h3>
							<div class="grid gap-4 md:grid-cols-2">
								<div class="space-y-3">
									<div class="flex items-center space-x-3">
										<div class="h-2 w-2 rounded-full bg-blue-500"></div>
										<span class="text-sm text-gray-700"
											><strong>A열:</strong> 표준단어명 (한국어)</span
										>
									</div>
									<div class="flex items-center space-x-3">
										<div class="h-2 w-2 rounded-full bg-purple-500"></div>
										<span class="text-sm text-gray-700"><strong>B열:</strong> 영문약어</span>
									</div>
									<div class="flex items-center space-x-3">
										<div class="h-2 w-2 rounded-full bg-green-500"></div>
										<span class="text-sm text-gray-700"><strong>C열:</strong> 영문명</span>
									</div>
									<div class="flex items-center space-x-3">
										<div class="h-2 w-2 rounded-full bg-orange-500"></div>
										<span class="text-sm text-gray-700">첫 번째 행은 헤더로 자동 제외</span>
									</div>
								</div>
								<div class="space-y-3">
									<div class="flex items-center space-x-3">
										<div class="h-2 w-2 rounded-full bg-indigo-500"></div>
										<span class="text-sm text-gray-700">최대 파일 크기: <strong>10MB</strong></span>
									</div>
									<div class="flex items-center space-x-3">
										<div class="h-2 w-2 rounded-full bg-pink-500"></div>
										<span class="text-sm text-gray-700"
											>지원 형식: <strong>.xlsx, .xls</strong></span
										>
									</div>
									<div class="flex items-center space-x-3">
										<div class="h-2 w-2 rounded-full bg-yellow-500"></div>
										<span class="text-sm text-gray-700">중복 용어 자동 제거</span>
									</div>
									<div class="flex items-center space-x-3">
										<div class="h-2 w-2 rounded-full bg-red-500"></div>
										<span class="text-sm text-gray-700">기존 데이터 완전 대체</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-fade-in {
		animation: fade-in 0.5s ease-out forwards;
	}
</style>
