<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import FileUpload from './FileUpload.svelte';
	import type { DbDesignApiResponse, DbDesignUploadResult } from '$lib/types/database-design';
	import { entityStore } from '$lib/stores/database-design-store';
	import { settingsStore } from '$lib/stores/settings-store';

	interface Props {
		isOpen?: boolean;
	}

	let { isOpen = false }: Props = $props();

	const dispatch = createEventDispatcher<{
		close: void;
		change: void;
	}>();

	const SYSTEM_FILE = 'entity.json';

	let files = $state<string[]>([]);
	let allFiles = $state<string[]>([]);
	let isLoading = $state(false);
	let error = $state('');
	let successMessage = $state('');
	let newFilename = $state('');
	let editingFile = $state<string | null>(null);
	let renameValue = $state('');
	let isSubmitting = $state(false);
	let showSystemFiles = $state(false);
	let activeTab = $state<'files' | 'upload'>('files');

	// 업로드 관련 상태
	let selectedUploadFile = $state('entity.json');
	type UploadSuccessDetail = { result: DbDesignUploadResult };
	type UploadErrorDetail = { error: string };

	// Settings store 구독
	$effect(() => {
		const unsubscribe = settingsStore.subscribe((settings) => {
			showSystemFiles = settings.showEntitySystemFiles ?? false;
			if (allFiles.length > 0) {
				filterFiles();
			}
		});
		return unsubscribe;
	});

	// Save settings
	async function saveSettings(value: boolean) {
		settingsStore.update((settings) => ({
			...settings,
			showEntitySystemFiles: value
		}));
	}

	// Check if file is system file
	function isSystemFile(file: string): boolean {
		return file === SYSTEM_FILE;
	}

	// Filter files based on settings
	function filterFiles() {
		if (showSystemFiles) {
			files = [...allFiles];
		} else {
			files = allFiles.filter((f) => !isSystemFile(f));
		}
	}

	// Load files
	async function loadFiles() {
		isLoading = true;
		try {
			const response = await fetch('/api/entity/files', {
				cache: 'no-store',
				headers: { 'Cache-Control': 'no-cache' }
			});
			const result: DbDesignApiResponse = await response.json();
			if (result.success && Array.isArray(result.data)) {
				allFiles = result.data as string[];
				filterFiles();
			}
		} catch (_err) {
			error = '파일 목록을 불러오는데 실패했습니다.';
		} finally {
			isLoading = false;
		}
	}

	// Toggle system files visibility
	async function toggleSystemFiles(event: Event) {
		const target = event.target as HTMLInputElement;
		showSystemFiles = target.checked;
		await saveSettings(showSystemFiles);
		filterFiles();
	}

	// Create new file
	async function handleCreateFile() {
		if (!newFilename.trim()) {
			error = '파일명을 입력하세요.';
			return;
		}

		const filename = newFilename.trim().endsWith('.json')
			? newFilename.trim()
			: `${newFilename.trim()}.json`;

		if (allFiles.includes(filename)) {
			error = '이미 존재하는 파일명입니다.';
			return;
		}

		isSubmitting = true;
		error = '';
		successMessage = '';

		try {
			const response = await fetch('/api/entity/files', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ filename })
			});

			const result: DbDesignApiResponse = await response.json();
			if (result.success) {
				successMessage = `파일 "${filename}"이(가) 생성되었습니다.`;
				newFilename = '';
				await loadFiles();
				dispatch('change');
			} else {
				error = result.error || '파일 생성에 실패했습니다.';
			}
		} catch (_err) {
			error = '파일 생성 중 오류가 발생했습니다.';
		} finally {
			isSubmitting = false;
		}
	}

	// Delete file
	async function handleDeleteFile(filename: string) {
		if (isSystemFile(filename)) {
			error = '시스템 파일은 삭제할 수 없습니다.';
			return;
		}

		if (!confirm(`정말 "${filename}" 파일을 삭제하시겠습니까?`)) {
			return;
		}

		isSubmitting = true;
		error = '';
		successMessage = '';

		try {
			const response = await fetch('/api/entity/files', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ filename })
			});

			const result: DbDesignApiResponse = await response.json();
			if (result.success) {
				successMessage = `파일 "${filename}"이(가) 삭제되었습니다.`;
				await loadFiles();
				dispatch('change');
			} else {
				error = result.error || '파일 삭제에 실패했습니다.';
			}
		} catch (_err) {
			error = '파일 삭제 중 오류가 발생했습니다.';
		} finally {
			isSubmitting = false;
		}
	}

	// Start rename
	function startRename(filename: string) {
		editingFile = filename;
		renameValue = filename.replace('.json', '');
	}

	// Cancel rename
	function cancelRename() {
		editingFile = null;
		renameValue = '';
	}

	// Save rename
	async function saveRename(oldFilename: string) {
		if (!renameValue.trim()) {
			error = '파일명을 입력하세요.';
			return;
		}

		const newFilenameValue = renameValue.trim().endsWith('.json')
			? renameValue.trim()
			: `${renameValue.trim()}.json`;

		if (newFilenameValue === oldFilename) {
			cancelRename();
			return;
		}

		if (allFiles.includes(newFilenameValue)) {
			error = '이미 존재하는 파일명입니다.';
			return;
		}

		isSubmitting = true;
		error = '';
		successMessage = '';

		try {
			const response = await fetch('/api/entity/files', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ oldFilename, newFilename: newFilenameValue })
			});

			const result: DbDesignApiResponse = await response.json();
			if (result.success) {
				successMessage = `파일명이 "${newFilenameValue}"(으)로 변경되었습니다.`;
				cancelRename();
				await loadFiles();
				dispatch('change');
			} else {
				error = result.error || '파일명 변경에 실패했습니다.';
			}
		} catch (_err) {
			error = '파일명 변경 중 오류가 발생했습니다.';
		} finally {
			isSubmitting = false;
		}
	}

	// Handle file select
	function handleFileSelect(filename: string) {
		entityStore.update((store) => ({ ...store, selectedFilename: filename }));
		dispatch('change');
	}

	// 업로드 이벤트 핸들러
	function handleUploadStart() {
		error = '';
		successMessage = '';
	}

	async function handleUploadSuccess(detail: UploadSuccessDetail) {
		const { result } = detail;
		successMessage = result.message || '업로드가 완료되었습니다.';
		await new Promise((resolve) => setTimeout(resolve, 300));
		await loadFiles();
		dispatch('change');
	}

	function handleUploadError(detail: UploadErrorDetail) {
		error = detail.error || '업로드 중 오류가 발생했습니다.';
	}

	function handleUploadComplete() {
		// 업로드 완료 후 처리 (필요시)
	}

	// Close modal
	function handleClose() {
		error = '';
		successMessage = '';
		newFilename = '';
		editingFile = null;
		selectedUploadFile = files.length > 0 ? files[0] : 'entity.json';
		dispatch('close');
	}

	// Backdrop click handler
	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	// 파일 목록이 변경되면 업로드 대상 파일도 업데이트
	$effect(() => {
		if (files.length > 0 && !files.includes(selectedUploadFile)) {
			selectedUploadFile = files[0];
		} else if (files.length === 0) {
			selectedUploadFile = 'entity.json';
		}
	});

	$effect(() => {
		if (isOpen) {
			let settingsLoaded = false;
			const unsubscribe = settingsStore.subscribe((settings) => {
				showSystemFiles = settings.showEntitySystemFiles ?? false;
				if (!settingsLoaded) {
					settingsLoaded = true;
					loadFiles();
				} else if (allFiles.length > 0) {
					filterFiles();
				}
			});
			return unsubscribe;
		}
	});

	$effect(() => {
		if (allFiles.length > 0) {
			filterFiles();
		}
	});

	// Clear messages after 3 seconds
	$effect(() => {
		if (successMessage) {
			const timer = setTimeout(() => {
				successMessage = '';
			}, 3000);
			return () => clearTimeout(timer);
		}
	});

	function focus(el: HTMLElement) {
		el.focus();
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
		onclick={handleBackdropClick}
		onkeydown={(e) => {
			if (e.key === 'Escape') handleClose();
		}}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
			<!-- 헤더 -->
			<div class="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-bold text-gray-900">엔터티 정의서 파일 관리</h2>
					<button
						onclick={handleClose}
						class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
						aria-label="닫기"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<!-- 탭 -->
				<div class="mt-4 flex space-x-4 border-b border-gray-200">
					<button
						onclick={() => (activeTab = 'files')}
						class="border-b-2 px-4 py-2 text-sm font-medium transition-colors {activeTab === 'files'
							? 'border-blue-600 text-blue-600'
							: 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						파일 목록
					</button>
					<button
						onclick={() => (activeTab = 'upload')}
						class="border-b-2 px-4 py-2 text-sm font-medium transition-colors {activeTab ===
						'upload'
							? 'border-blue-600 text-blue-600'
							: 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						파일 업로드
					</button>
				</div>
			</div>

			<!-- 컨텐츠 -->
			<div class="p-6">
				<!-- 알림 메시지 -->
				{#if error}
					<div class="mb-4 rounded-lg bg-red-50 p-3 text-red-700">
						<p class="text-sm">{error}</p>
					</div>
				{/if}
				{#if successMessage}
					<div class="mb-4 rounded-lg bg-green-50 p-3 text-green-700">
						<p class="text-sm">{successMessage}</p>
					</div>
				{/if}

				{#if activeTab === 'files'}
					<!-- 새 파일 생성 -->
					<div class="mb-6">
						<h3 class="mb-2 text-sm font-medium text-gray-700">새 파일 생성</h3>
						<div class="flex gap-2">
							<input
								type="text"
								bind:value={newFilename}
								onkeydown={(e) => {
									if (e.key === 'Enter') handleCreateFile();
								}}
								placeholder="파일명 입력 (확장자 제외)"
								class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
								disabled={isSubmitting}
							/>
							<button
								onclick={handleCreateFile}
								disabled={isSubmitting || !newFilename.trim()}
								class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
							>
								생성
							</button>
						</div>
					</div>

					<!-- 파일 목록 -->
					<div>
						<div class="mb-3 flex items-center justify-between">
							<h3 class="text-sm font-medium text-gray-700">파일 목록</h3>
							<label class="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
								<input
									type="checkbox"
									checked={showSystemFiles}
									onchange={toggleSystemFiles}
									class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
								/>
								<span>시스템 파일 표시</span>
							</label>
						</div>
						{#if isLoading}
							<div class="py-8 text-center text-gray-500">로딩 중...</div>
						{:else if files.length === 0}
							<div class="py-8 text-center text-gray-500">파일이 없습니다.</div>
						{:else}
							<ul class="divide-y divide-gray-200 rounded-lg border border-gray-200">
								{#each files as file (file)}
									<li class="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
										{#if editingFile === file}
											<div class="flex flex-1 items-center gap-2">
												<input
													type="text"
													bind:value={renameValue}
													onkeydown={(e) => {
														if (e.key === 'Enter') saveRename(file);
													}}
													use:focus
													class="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
													disabled={isSubmitting || isSystemFile(file)}
												/>
												<button
													onclick={() => saveRename(file)}
													disabled={isSubmitting || isSystemFile(file)}
													class="text-sm text-blue-600 hover:text-blue-700"
												>
													저장
												</button>
												<button
													onclick={cancelRename}
													class="text-sm text-gray-500 hover:text-gray-700"
												>
													취소
												</button>
											</div>
										{:else}
											<button
												onclick={() => handleFileSelect(file)}
												class="flex-1 text-left text-sm text-gray-900 hover:text-blue-600"
											>
												{file}
												{#if isSystemFile(file)}
													<span
														class="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800"
													>
														시스템 파일
													</span>
												{/if}
											</button>
											<div class="flex items-center gap-1">
												{#if !isSystemFile(file)}
													<button
														onclick={() => startRename(file)}
														class="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
														disabled={isSubmitting}
														aria-label="이름변경"
													>
														<svg
															class="h-4 w-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
															/>
														</svg>
													</button>
													<button
														onclick={() => handleDeleteFile(file)}
														class="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
														disabled={isSubmitting}
														aria-label="삭제"
													>
														<svg
															class="h-4 w-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
															/>
														</svg>
													</button>
												{/if}
											</div>
										{/if}
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{:else}
					<!-- 업로드 탭 -->
					<div class="space-y-4">
						<!-- 대상 파일 선택 -->
						<div>
							<label for="uploadTargetFile" class="mb-2 block text-sm font-medium text-gray-700">
								대상 파일 선택
								<span class="ml-1 text-xs font-normal text-gray-500">(데이터가 저장될 파일)</span>
							</label>
							<select
								id="uploadTargetFile"
								bind:value={selectedUploadFile}
								class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
								disabled={isSubmitting}
							>
								{#each files as file (file)}
									<option value={file}>{file}</option>
								{/each}
								{#if files.length === 0}
									<option value="entity.json">entity.json</option>
								{/if}
							</select>
						</div>

						<!-- FileUpload 컴포넌트 -->
						<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
							<FileUpload
								disabled={isSubmitting}
								apiEndpoint="/api/entity/upload"
								contentType="엔터티 정의서"
								filename={selectedUploadFile}
								replaceExisting={true}
								onuploadstart={handleUploadStart}
								onuploadsuccess={handleUploadSuccess}
								onuploaderror={handleUploadError}
								onuploadcomplete={handleUploadComplete}
							/>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
