<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { ApiResponse } from '$lib/types/vocabulary';
	import { settingsStore } from '$lib/stores/settings-store';
	import { filterVocabularyFiles } from '$lib/utils/file-filter';

	interface Props {
		isOpen?: boolean;
	}

	let { isOpen = false }: Props = $props();

	const dispatch = createEventDispatcher<{
		close: void;
		change: void;
	}>();

	const SYSTEM_FILE = 'vocabulary.json';

	let files = $state<string[]>([]);
	let allFiles = $state<string[]>([]);
	let isLoading = $state(false);
	let error = $state('');
	let successMessage = $state('');
	let newFilename = $state('');
	let editingFile = $state<string | null>(null);
	let renameValue = $state('');
	let isSubmitting = $state(false);
	let showSystemFiles = $state(true);

	// Settings store 구독
	$effect(() => {
		const unsubscribe = settingsStore.subscribe((settings) => {
			showSystemFiles = settings.showVocabularySystemFiles;
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
			showVocabularySystemFiles: value
		}));
	}

	// Check if file is system file
	function isSystemFile(file: string): boolean {
		return file === SYSTEM_FILE;
	}

	// Filter files based on settings
	function filterFiles() {
		files = filterVocabularyFiles(allFiles, showSystemFiles);
	}

	// Load files
	async function loadFiles() {
		isLoading = true;
		try {
			const response = await fetch('/api/vocabulary/files');
			const result: ApiResponse = await response.json();
			if (result.success && Array.isArray(result.data)) {
				allFiles = result.data as string[];
				filterFiles();
			}
		} catch (err) {
			error = '파일 목록을 불러오는데 실패했습니다.';
		} finally {
			isLoading = false;
		}
	}

	// Toggle system files visibility
	async function toggleSystemFiles() {
		showSystemFiles = !showSystemFiles;
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
			const response = await fetch('/api/vocabulary/files', {
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
		} catch (err) {
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
			const response = await fetch('/api/vocabulary/files', {
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
		} catch (err) {
			error = '서버 오류가 발생했습니다.';
		} finally {
			isSubmitting = false;
		}
	}

	// Delete file
	async function handleDelete(file: string) {
		if (!confirm('파일 삭제 전 백업을 권장합니다. 정말 삭제하시겠습니까?')) {
			return;
		}

		isSubmitting = true;
		error = '';
		successMessage = '';

		try {
			const response = await fetch('/api/vocabulary/files', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ filename: file })
			});
			const result: ApiResponse = await response.json();

			if (result.success) {
				successMessage = '파일이 삭제되었습니다.';
				if (editingFile === file) {
					editingFile = null;
				}
				await loadFiles();
				dispatch('change');
			} else {
				error = result.error || '파일 삭제 실패';
			}
		} catch (err) {
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
		dispatch('close');
	}

	$effect(() => {
		if (isOpen) {
			// 초기 설정 로드
			const unsubscribe = settingsStore.subscribe((settings) => {
				showSystemFiles = settings.showVocabularySystemFiles;
			});
			loadFiles();
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
		<div class="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
			<div class="mb-4 flex items-center justify-between border-b pb-4">
				<h2 class="text-xl font-bold text-gray-900">단어집 파일 관리</h2>
				<button onclick={handleClose} class="text-gray-400 hover:text-gray-600" aria-label="Close">
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

			{#if error}
				<div class="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
			{/if}
			{#if successMessage}
				<div class="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">{successMessage}</div>
			{/if}

			<!-- Create New File -->
			<div class="mb-6 rounded-lg bg-gray-50 p-4">
				<h3 class="mb-2 text-sm font-medium text-gray-700">새 파일 생성</h3>
				<div class="flex gap-2">
					<input
						type="text"
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								handleCreate();
							}
						}}
						bind:value={newFilename}
						placeholder="파일명 (예: new_vocab)"
						class="flex-1 rounded-md border-gray-300 px-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
						disabled={isSubmitting}
					/>
					<button
						onclick={handleCreate}
						class="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
						disabled={!newFilename.trim() || isSubmitting}
					>
						생성
					</button>
				</div>
			</div>

			<!-- File List -->
			<div class="max-h-60 overflow-y-auto">
				<div class="mb-2 flex items-center justify-between">
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
					<div class="py-4 text-center text-sm text-gray-500">로딩 중...</div>
				{:else if files.length === 0}
					<div class="py-4 text-center text-sm text-gray-500">파일이 없습니다.</div>
				{:else}
					<ul class="divide-y divide-gray-100">
						{#each files as file}
							<li class="flex items-center justify-between py-2">
								{#if editingFile === file}
									<div class="flex flex-1 items-center gap-2 px-1">
										<input
											type="text"
											bind:value={renameValue}
											onkeydown={(e) => {
												if (e.key === 'Enter') {
													handleRename();
												}
											}}
											use:focus
											class="flex-1 rounded-md border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
											disabled={isSystemFile(file)}
										/>
										<button
											onclick={handleRename}
											class="text-green-600 hover:text-green-800 disabled:opacity-50"
											disabled={isSubmitting || isSystemFile(file)}
											aria-label="Save"
										>
											<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
											class="text-gray-400 hover:text-gray-600"
											disabled={isSubmitting}
											aria-label="Cancel"
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
								{:else}
									<div class="flex flex-1 items-center gap-2 px-1">
										<div class="flex flex-1 items-center gap-2">
											<span class="text-sm text-gray-700">{file}</span>
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
											class="text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
											disabled={isSystemFile(file)}
											aria-label="Rename"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
											class="text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
											disabled={isSystemFile(file)}
											aria-label="Delete"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

			<div class="mt-6 flex justify-end border-t pt-4">
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
