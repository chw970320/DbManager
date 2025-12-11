<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import VocabularyFileManager from '$lib/components/VocabularyFileManager.svelte';
	import type { UploadResult, VocabularyEntry, ApiResponse } from '$lib/types/vocabulary.js';
	import { vocabularyStore } from '$lib/stores/vocabularyStore';
	import { settingsStore } from '$lib/stores/settings-store';
	import { filterVocabularyFiles, isSystemVocabularyFile } from '$lib/utils/file-filter';

	// 상태 변수
	let uploading = $state(false);
	let uploadMessage = $state('');
	let errorMessage = $state('');
	let vocabularyFiles: string[] = $state([]);
	let selectedFilename = $state('vocabulary.json');
	let isFileManagerOpen = $state(false);

	type UploadSuccessDetail = { result: UploadResult };
	type UploadErrorDetail = { error: string };

	// 스토어 구독
	const unsubscribe = vocabularyStore.subscribe((value) => {
		selectedFilename = value.selectedFilename;
	});

	/**
	 * 컴포넌트 마운트 시 업로드 기록 및 파일 목록 로드
	 */
	onMount(async () => {
		await loadVocabularyFiles();
		// await loadUploadHistory(); // 업로드 히스토리 로드는 일단 보류 (API 미구현 가능성)
	});

	onDestroy(() => {
		unsubscribe();
	});

	/**
	 * 단어집 파일 목록 로드
	 */
	async function loadVocabularyFiles() {
		try {
			const response = await fetch('/api/vocabulary/files');
			const result: ApiResponse = await response.json();
			if (result.success && Array.isArray(result.data)) {
				const allFiles = result.data as string[];
				// 설정에 따라 필터링
				settingsStore.subscribe((settings) => {
					vocabularyFiles = filterVocabularyFiles(allFiles, settings.showVocabularySystemFiles);
				})();
			}
		} catch (error) {
			console.error('파일 목록 로드 오류:', error);
		}
	}

	// 설정 변경 시 파일 목록 재필터링
	$effect(() => {
		const unsubscribe = settingsStore.subscribe((settings) => {
			if (vocabularyFiles.length > 0 || vocabularyFiles.length === 0) {
				// 파일 목록이 로드된 경우에만 재필터링
				const response = fetch('/api/vocabulary/files')
					.then((res) => res.json())
					.then((result: ApiResponse) => {
						if (result.success && Array.isArray(result.data)) {
							const allFiles = result.data as string[];
							const previousSelected = selectedFilename;
							vocabularyFiles = filterVocabularyFiles(allFiles, settings.showVocabularySystemFiles);
							
							// 현재 선택된 파일이 필터링 후 목록에 없고 시스템 파일이면 첫 번째 파일로 자동 선택
							if (
								!vocabularyFiles.includes(previousSelected) &&
								isSystemVocabularyFile(previousSelected) &&
								vocabularyFiles.length > 0
							) {
								selectedFilename = vocabularyFiles[0];
								vocabularyStore.set({ selectedFilename: vocabularyFiles[0] });
							}
						}
					})
					.catch((error) => console.error('파일 목록 로드 오류:', error));
			}
		});
		return unsubscribe;
	});

	/**
	 * 파일 선택 변경 처리
	 */
	function handleFileSelect(event: Event) {
		const select = event.target as HTMLSelectElement;
		const filename = select.value;
		vocabularyStore.update((store) => ({ ...store, selectedFilename: filename }));
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
		uploadMessage = result.message || '업로드 성공';

		// 작업 히스토리 새로고침 (전역 함수 호출)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		if (typeof window !== 'undefined' && (window as any).refreshHistoryLog) {
			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(window as any).refreshHistoryLog();
			} catch (error) {
				console.warn('작업 히스토리 새로고침 실패:', error);
			}
		}

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
</script>

<svelte:head>
	<title>단어집 업로드</title>
	<meta
		name="description"
		content="드래그 앤 드롭으로 Excel 파일을 업로드하고 단어집을 구축하세요."
	/>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-8">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<!-- 페이지 헤더 -->
		<div class="mb-10 text-center">
			<h1
				class="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-4xl font-bold text-transparent"
			>
				단어집 업로드
			</h1>
			<p class="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
				드래그 앤 드롭으로 Excel 파일을 업로드하여 <span class="font-semibold text-blue-600"
					>단어집</span
				>을 등록하세요
			</p>
		</div>

		<!-- 대상 파일 선택 -->
		<div class="mx-auto mb-10 max-w-lg">
			<div class="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
				<div class="mb-3 flex items-center justify-between">
					<label for="targetFile" class="block text-sm font-semibold text-gray-800">
						대상 파일 선택
						<span class="ml-1 text-xs font-normal text-gray-500">(데이터가 병합될 파일)</span>
					</label>
					<button
						onclick={() => (isFileManagerOpen = true)}
						class="flex items-center text-xs text-blue-600 hover:text-blue-800"
					>
						<svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
						파일 관리
					</button>
				</div>
				<div class="relative">
					<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
						<svg
							class="h-5 w-5 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
					</div>
					<select
						id="targetFile"
						value={selectedFilename}
						onchange={handleFileSelect}
						class="block w-full appearance-none rounded-xl border-gray-200 bg-gray-50 py-3.5 pl-10 pr-10 text-gray-700 transition-all hover:bg-gray-100 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
						disabled={uploading}
					>
						{#each vocabularyFiles as file}
							<option value={file}>{file}</option>
						{/each}
					</select>
					<div
						class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</div>
				</div>
			</div>
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
							filename={selectedFilename}
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
										<span class="text-sm text-gray-700">중복 단어 자동 제거</span>
									</div>
									<div class="flex items-center space-x-3">
										<div class="h-2 w-2 rounded-full bg-red-500"></div>
										<span class="text-sm text-gray-700">교체/병합 모드 선택 가능</span>
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

<VocabularyFileManager
	isOpen={isFileManagerOpen}
	on:close={() => (isFileManagerOpen = false)}
	on:change={loadVocabularyFiles}
/>

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
