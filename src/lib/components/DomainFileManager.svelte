<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import FileUpload from './FileUpload.svelte';
	import type { ApiResponse, UploadResult } from '$lib/types/vocabulary';
	import { settingsStore } from '$lib/stores/settings-store';
	import { filterDomainFiles } from '$lib/utils/file-filter';
	import { showConfirm } from '$lib/stores/confirm-store';

	interface Props {
		isOpen?: boolean;
	}

	let { isOpen = false }: Props = $props();

	const dispatch = createEventDispatcher<{
		close: void;
		change: void;
	}>();

	const SYSTEM_FILE = 'domain.json';

	let files = $state<string[]>([]);
	let allFiles = $state<string[]>([]);
	let isLoading = $state(false);
	let error = $state('');
	let successMessage = $state('');
	let warningMessage = $state('');
	let newFilename = $state('');
	let editingFile = $state<string | null>(null);
	let renameValue = $state('');
	let isSubmitting = $state(false);
	let showSystemFiles = $state(true);
	let activeTab = $state<'files' | 'upload'>('files');

	// 업로드 관련 상태
	let selectedUploadFile = $state('domain.json');
	let uploadMode = $state<'validated-replace' | 'simple-replace'>('validated-replace');
	type UploadSuccessDetail = { result: UploadResult };
	type UploadErrorDetail = { error: string };

	// Settings store 구독
	$effect(() => {
		const unsubscribe = settingsStore.subscribe((settings) => {
			showSystemFiles = settings.showDomainSystemFiles;
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
			showDomainSystemFiles: value
		}));
	}

	// Check if file is system file
	function isSystemFile(file: string): boolean {
		return file === SYSTEM_FILE || file === 'history.json';
	}

	// Filter files based on settings
	function filterFiles() {
		files = filterDomainFiles(allFiles, showSystemFiles);
	}

	// Load files
	async function loadFiles() {
		isLoading = true;
		try {
			// 캐시를 무시하여 최신 파일 목록을 가져옴
			const response = await fetch('/api/domain/files', {
				cache: 'no-store',
				headers: {
					'Cache-Control': 'no-cache'
				}
			});
			const result: ApiResponse = await response.json();
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

	// Create file
	async function handleCreate() {
		if (!newFilename.trim()) return;

		let filename = newFilename.trim();
		if (!filename.endsWith('.json')) {
			filename += '.json';
		}

		isSubmitting = true;
		error = '';
		successMessage = '';

		try {
			const response = await fetch('/api/domain/files', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ filename })
			});
			const result: ApiResponse = await response.json();

			if (result.success) {
				successMessage = '파일이 생성되었습니다.';
				newFilename = '';
				await loadFiles();
				dispatch('change');
			} else {
				error = result.error || '파일 생성 실패';
			}
		} catch (_err) {
			error = '서버 오류가 발생했습니다.';
		} finally {
			isSubmitting = false;
		}
	}

	// Rename file
	async function handleRename() {
		if (!editingFile || !renameValue.trim()) return;

		let filename = renameValue.trim();
		if (!filename.endsWith('.json')) {
			filename += '.json';
		}

		if (filename === editingFile) {
			editingFile = null;
			return;
		}

		isSubmitting = true;
		error = '';
		successMessage = '';

		try {
			const response = await fetch('/api/domain/files', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ oldFilename: editingFile, newFilename: filename })
			});
			const result: ApiResponse = await response.json();

			if (result.success) {
				successMessage = '파일 이름이 변경되었습니다.';
				editingFile = null;
				await loadFiles();
				dispatch('change');
			} else {
				error = result.error || '파일 이름 변경 실패';
			}
		} catch (_err) {
			error = '서버 오류가 발생했습니다.';
		} finally {
			isSubmitting = false;
		}
	}

	// Delete file
	async function handleDelete(file: string) {
		const confirmed = await showConfirm({ title: '확인', message: '파일 삭제 전 백업을 권장합니다. 정말 삭제하시겠습니까?', confirmText: '삭제', variant: 'danger' });
		if (!confirmed) {
			return;
		}

		isSubmitting = true;
		error = '';
		successMessage = '';
		warningMessage = '';

		try {
			const response = await fetch('/api/domain/files', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ filename: file })
			});
			const result: ApiResponse = await response.json();

			if (result.success) {
				const warns = (result as ApiResponse & { warnings?: unknown[] }).warnings;
				const warnCount = Array.isArray(warns) ? warns.length : 0;
				successMessage = '파일이 삭제되었습니다.';
				warningMessage = warnCount > 0 ? `경고 ${warnCount}건: 참조 정보를 확인하세요.` : '';
				if (editingFile === file) {
					editingFile = null;
				}
				await loadFiles();
				dispatch('change');
			} else {
				error = result.error || '파일 삭제 실패';
			}
		} catch (_err) {
			error = '서버 오류가 발생했습니다.';
		} finally {
			isSubmitting = false;
		}
	}

	function startEditing(file: string) {
		editingFile = file;
		renameValue = file;
	}

	function cancelEditing() {
		editingFile = null;
		renameValue = '';
	}

	function handleClose() {
		error = '';
		successMessage = '';
		newFilename = '';
		editingFile = null;
		selectedUploadFile = files.length > 0 ? files[0] : 'domain.json';
		dispatch('close');
	}

	// 업로드 이벤트 핸들러
	function handleUploadStart() {
		error = '';
		successMessage = '';
	}

	async function handleUploadSuccess(detail: UploadSuccessDetail) {
		const { result } = detail;
		successMessage = result.message || '업로드가 완료되었습니다.';
		// 파일 목록 새로고침 (약간의 지연을 두어 서버가 파일을 완전히 처리할 시간을 줌)
		await new Promise((resolve) => setTimeout(resolve, 300));
		await loadFiles();
		dispatch('change');
	}

	function handleUploadError(detail: UploadErrorDetail) {
		const { error: uploadError } = detail;
		error = uploadError;
	}

	function handleUploadComplete() {
		// 업로드 완료 후 처리 (필요시)
	}

	// 파일 목록이 변경되면 업로드 대상 파일도 업데이트
	$effect(() => {
		if (files.length > 0 && !files.includes(selectedUploadFile)) {
			selectedUploadFile = files[0];
		} else if (files.length === 0) {
			selectedUploadFile = 'domain.json';
		}
	});

	$effect(() => {
		if (isOpen) {
			// 초기 설정 로드 및 파일 목록 로드
			let settingsLoaded = false;
			const unsubscribe = settingsStore.subscribe((settings) => {
				showSystemFiles = settings.showDomainSystemFiles;
				// 설정이 로드된 후 파일 목록 로드 (한 번만 실행)
				if (!settingsLoaded) {
					settingsLoaded = true;
					loadFiles();
				} else if (allFiles.length > 0) {
					// 설정 변경 시 필터링만 재실행
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
	$effect(() => {
		if (warningMessage) {
			const timer = setTimeout(() => {
				warningMessage = '';
			}, 5000);
			return () => clearTimeout(timer);
		}
	});

	function focus(el: HTMLElement) {
		el.focus();
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		onclick={(e) => {
			if (e.target === e.currentTarget) handleClose();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') handleClose();
		}}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
			<!-- 헤더 -->
			<div class="flex items-center justify-between border-b px-6 py-4">
				<h2 class="text-xl font-bold text-gray-900">도메인 파일 관리</h2>
				<button onclick={handleClose} class="text-gray-600 hover:text-gray-600" aria-label="Close">
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<!-- 탭 네비게이션 -->
			<div class="flex border-b">
				<button
					onclick={() => (activeTab = 'files')}
					class="flex-1 px-6 py-3 text-sm font-medium transition-colors {activeTab === 'files'
						? 'border-b-2 border-blue-600 text-blue-600'
						: 'text-gray-500 hover:text-gray-700'}"
				>
					파일 목록
				</button>
				<button
					onclick={() => (activeTab = 'upload')}
					class="flex-1 px-6 py-3 text-sm font-medium transition-colors {activeTab === 'upload'
						? 'border-b-2 border-blue-600 text-blue-600'
						: 'text-gray-500 hover:text-gray-700'}"
				>
					파일 업로드
				</button>
			</div>

			<!-- 메시지 영역 -->
			{#if successMessage}
				<div class="mx-6 mt-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
					{successMessage}
				</div>
			{/if}
			{#if warningMessage}
				<div class="mx-6 mt-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
					{warningMessage}
				</div>
			{/if}
			{#if error}
				<div class="mx-6 mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
			{/if}

			<!-- 탭 컨텐츠 -->
			<div class="flex-1 overflow-y-auto px-6 py-4">
				{#if activeTab === 'files'}
					<!-- 파일 목록 탭 -->
					<div class="space-y-6">
						<!-- Create New File -->
						<div class="rounded-lg bg-gray-50 p-4">
							<h3 class="mb-3 text-sm font-medium text-gray-700">새 파일 생성</h3>
							<div class="flex gap-2">
								<input
									type="text"
									onkeydown={(e) => {
										if (e.key === 'Enter') {
											handleCreate();
										}
									}}
									bind:value={newFilename}
									placeholder="파일명 (예: new_domain)"
									class="flex-1 rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
									disabled={isSubmitting}
								/>
								<button
									onclick={handleCreate}
									class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
									disabled={!newFilename.trim() || isSubmitting}
								>
									생성
								</button>
							</div>
						</div>

						<!-- File List -->
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
							<div class="max-h-96 overflow-y-auto rounded-lg border border-gray-200">
								{#if isLoading}
									<div class="py-8 text-center text-sm text-gray-500">로딩 중...</div>
								{:else if files.length === 0}
									<div class="py-8 text-center text-sm text-gray-500">파일이 없습니다.</div>
								{:else}
									<ul class="divide-y divide-gray-100">
										{#each files as file (file)}
											<li class="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
												{#if editingFile === file}
													<div class="flex flex-1 items-center gap-2">
														<input
															type="text"
															bind:value={renameValue}
															onkeydown={(e) => {
																if (e.key === 'Enter') {
																	handleRename();
																}
															}}
															use:focus
															class="flex-1 rounded-md border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
															disabled={isSystemFile(file)}
														/>
														<button
															onclick={handleRename}
															class="rounded-md p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-50"
															disabled={isSubmitting || isSystemFile(file)}
															aria-label="Save"
														>
															<svg
																class="h-5 w-5"
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
														</button>
														<button
															onclick={cancelEditing}
															class="rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
															disabled={isSubmitting}
															aria-label="Cancel"
														>
															<svg
																class="h-5 w-5"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	stroke-width="2"
																	d="M6 18L18 6M6 6l12 12"
																/>
															</svg>
														</button>
													</div>
												{:else}
													<div class="flex flex-1 items-center gap-3">
														<div class="flex flex-1 items-center gap-2">
															<span class="text-sm font-medium text-gray-700">{file}</span>
															{#if isSystemFile(file)}
																<span
																	class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
																>
																	시스템 파일
																</span>
															{/if}
														</div>
														<button
															onclick={() => startEditing(file)}
															class="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
															disabled={isSystemFile(file)}
															aria-label="Rename"
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
															onclick={() => handleDelete(file)}
															class="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
															disabled={isSystemFile(file)}
															aria-label="Delete"
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
													</div>
												{/if}
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						</div>
					</div>
				{:else}
					<!-- 파일 업로드 탭 -->
					<div class="space-y-6">
						<!-- 대상 파일 선택 -->
						<div>
							<label for="uploadTargetFile" class="mb-2 block text-sm font-medium text-gray-700">
								대상 파일 선택
								<span class="ml-1 text-xs font-normal text-gray-500">(데이터가 병합될 파일)</span>
							</label>
							<select
								id="uploadTargetFile"
								bind:value={selectedUploadFile}
								class="block w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
								disabled={isSubmitting || files.length === 0}
							>
								{#each files as file (file)}
									<option value={file}>{file}</option>
								{/each}
								{#if files.length === 0}
									<option value="domain.json">domain.json</option>
								{/if}
							</select>
						</div>

						<!-- FileUpload 컴포넌트 -->
						<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
							<FileUpload
								disabled={isSubmitting || files.length === 0}
								apiEndpoint="/api/domain/upload"
								contentType="도메인"
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

			<!-- 푸터 -->
			<div class="flex justify-end border-t px-6 py-4">
				<button
					onclick={handleClose}
					class="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
				>
					닫기
				</button>
			</div>
		</div>
	</div>
{/if}
