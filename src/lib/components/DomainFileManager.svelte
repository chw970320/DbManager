<script lang="ts">
	import { createEventDispatcher, untrack } from 'svelte';
	import { get } from 'svelte/store';
	import FileUpload from './FileUpload.svelte';
	import DbDesignFileMappingFields from './DbDesignFileMappingFields.svelte';
	import type { ApiResponse, UploadResult } from '$lib/types/vocabulary';
	import { settingsStore } from '$lib/stores/settings-store';
	import { filterDomainFiles } from '$lib/utils/file-filter';
	import { resolvePreferredFilename } from '$lib/utils/file-selection';
	import { showConfirm } from '$lib/stores/confirm-store';
	import { domainDataStore } from '$lib/stores/unified-store';
	import {
		createDbDesignRelatedMapping,
		createEmptyDbDesignFileOptions,
		mergeDbDesignRelatedMapping,
		getDbDesignSelectableTypes,
		type DbDesignDefinitionType
	} from '$lib/utils/db-design-file-mapping';

	interface Props {
		isOpen?: boolean;
		currentFilename?: string;
	}

	const SYSTEM_FILE = 'domain.json';

	let { isOpen = false, currentFilename = SYSTEM_FILE }: Props = $props();

	const dispatch = createEventDispatcher<{
		close: void;
		change: void;
	}>();

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
	let activeTab = $state<'files' | 'mapping' | 'upload'>('files');

	let selectedUploadFile = $state(currentFilename);
	type UploadSuccessDetail = { result: UploadResult };
	type UploadErrorDetail = { error: string };

	const currentType: DbDesignDefinitionType = 'domain';
	let dbDesignFileOptions = $state(createEmptyDbDesignFileOptions(currentType));
	let selectedDbDesignMapping = $state(createDbDesignRelatedMapping(currentType));
	let currentMappingFile = $state<string | null>(null);
	let isMappingLoading = $state(false);

	$effect(() => {
		const unsubscribe = settingsStore.subscribe((settings) => {
			showSystemFiles = settings.showDomainSystemFiles;
			if (allFiles.length > 0) {
				filterFiles();
			}
		});
		return unsubscribe;
	});

	async function saveSettings(value: boolean) {
		settingsStore.update((settings) => ({
			...settings,
			showDomainSystemFiles: value
		}));
	}

	function isSystemFile(file: string): boolean {
		return file === SYSTEM_FILE || file === 'history.json';
	}

	function filterFiles() {
		files = filterDomainFiles(allFiles, showSystemFiles);
	}

	async function loadFiles() {
		isLoading = true;
		try {
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

	async function loadDbDesignFileOptions() {
		const nextOptions = createEmptyDbDesignFileOptions(currentType);

		await Promise.all(
			getDbDesignSelectableTypes(currentType).map(async (type) => {
				try {
					const response = await fetch(`/api/${type}/files`);
					const result: ApiResponse = await response.json();
					if (result.success && Array.isArray(result.data)) {
						nextOptions[type] = result.data as string[];
					}
				} catch (loadError) {
					console.error(`${type} 파일 목록 로드 실패:`, loadError);
				}
			})
		);

		dbDesignFileOptions = nextOptions;
	}

	async function loadMappingInfo(filename: string) {
		isMappingLoading = true;
		try {
			const response = await fetch(`/api/domain/files/mapping?filename=${encodeURIComponent(filename)}`);
			const result: ApiResponse = await response.json();
			const mapping = (result.data as { mapping?: Record<string, unknown> } | undefined)?.mapping;
			if (result.success && mapping) {
				selectedDbDesignMapping = mergeDbDesignRelatedMapping(currentType, mapping);
			} else {
				selectedDbDesignMapping = createDbDesignRelatedMapping(currentType);
			}
			currentMappingFile = filename;
		} catch (loadError) {
			console.error('매핑 정보 로드 실패:', loadError);
			selectedDbDesignMapping = createDbDesignRelatedMapping(currentType);
			currentMappingFile = filename;
		} finally {
			isMappingLoading = false;
		}
	}

	async function saveMappingInfo(
		filename = currentMappingFile,
		showSuccess = true
	): Promise<boolean> {
		if (!filename) {
			error = '매핑할 파일을 선택하세요.';
			return false;
		}

		isSubmitting = true;
		error = '';
		if (showSuccess) {
			successMessage = '';
		}

		try {
			const response = await fetch('/api/domain/files/mapping', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					filename,
					mapping: selectedDbDesignMapping
				})
			});
			const result: ApiResponse = await response.json();

			if (!response.ok || !result.success) {
				error = result.error || '매핑 정보 저장에 실패했습니다.';
				return false;
			}

			currentMappingFile = filename;
			if (showSuccess) {
				successMessage = '매핑 정보가 저장되었습니다.';
				dispatch('change');
			}
			return true;
		} catch (_err) {
			error = '매핑 정보 저장 중 오류가 발생했습니다.';
			return false;
		} finally {
			isSubmitting = false;
		}
	}

	async function toggleSystemFiles(event: Event) {
		const target = event.target as HTMLInputElement;
		showSystemFiles = target.checked;
		await saveSettings(showSystemFiles);
		filterFiles();
	}

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
				selectedUploadFile = filename;
				domainDataStore.set({ selectedFilename: filename });
				await loadMappingInfo(filename);
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
				const wasCurrentFile = currentMappingFile === editingFile || selectedUploadFile === editingFile;
				editingFile = null;
				await loadFiles();
				if (wasCurrentFile) {
					selectedUploadFile = filename;
					domainDataStore.set({ selectedFilename: filename });
					await loadMappingInfo(filename);
				}
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

	async function handleDelete(file: string) {
		const confirmed = await showConfirm({
			title: '확인',
			message: '파일 삭제 전 백업을 권장합니다. 정말 삭제하시겠습니까?',
			confirmText: '삭제',
			variant: 'danger'
		});
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

				if (currentMappingFile === file || selectedUploadFile === file) {
					const fallback = resolvePreferredFilename({
						files,
						preferredFilename: currentFilename,
						fallbackFilename: SYSTEM_FILE
					});
					selectedUploadFile = fallback;
					domainDataStore.set({ selectedFilename: fallback });
					await loadMappingInfo(fallback);
				}

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

	function handleFileSelect(file: string) {
		selectedUploadFile = file;
		domainDataStore.set({ selectedFilename: file });
		void loadMappingInfo(file);
		dispatch('change');
	}

	function handleClose() {
		error = '';
		successMessage = '';
		newFilename = '';
		editingFile = null;
		selectedUploadFile = resolvePreferredFilename({
			files,
			preferredFilename: currentFilename,
			fallbackFilename: SYSTEM_FILE
		});
		dispatch('close');
	}

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
		error = detail.error;
	}

	function handleUploadComplete() {
		// no-op
	}

	$effect(() => {
		if (!isOpen) {
			return;
		}

		const currentUploadFile = untrack(() => selectedUploadFile);
		const nextUploadFile = resolvePreferredFilename({
			files,
			preferredFilename: currentFilename,
			currentSelection: currentUploadFile,
			fallbackFilename: SYSTEM_FILE
		});

		if (currentUploadFile !== nextUploadFile) {
			selectedUploadFile = nextUploadFile;
		}
	});

	$effect(() => {
		if (isOpen) {
			let settingsLoaded = false;
			const unsubscribe = settingsStore.subscribe((settings) => {
				showSystemFiles = settings.showDomainSystemFiles;
				if (!settingsLoaded) {
					settingsLoaded = true;
					void (async () => {
						await loadFiles();
						await loadDbDesignFileOptions();
						const mappingFilename = resolvePreferredFilename({
							files,
							preferredFilename: currentFilename || get(domainDataStore).selectedFilename,
							currentSelection: selectedUploadFile,
							fallbackFilename: SYSTEM_FILE
						});
						selectedUploadFile = mappingFilename;
						await loadMappingInfo(mappingFilename);
					})();
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

	$effect(() => {
		if (isOpen && selectedUploadFile && selectedUploadFile !== currentMappingFile) {
			void loadMappingInfo(selectedUploadFile);
		}
	});

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
					onclick={() => (activeTab = 'mapping')}
					class="flex-1 px-6 py-3 text-sm font-medium transition-colors {activeTab === 'mapping'
						? 'border-b-2 border-blue-600 text-blue-600'
						: 'text-gray-500 hover:text-gray-700'}"
				>
					파일 매핑
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

			<div class="flex-1 overflow-y-auto px-6 py-4">
				{#if activeTab === 'files'}
					<div class="space-y-6">
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
														<button
															type="button"
															onclick={() => handleFileSelect(file)}
															class="flex flex-1 items-center gap-2 text-left"
														>
															<span class="text-sm font-medium text-gray-700">{file}</span>
															{#if isSystemFile(file)}
																<span
																	class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
																>
																	시스템 파일
																</span>
															{/if}
														</button>
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
				{:else if activeTab === 'mapping'}
					<div class="space-y-6">
						<div class="rounded-lg border border-gray-200 bg-white/70 p-4">
							<div class="mb-3 flex items-center justify-between">
								<div>
									<h3 class="text-sm font-semibold text-gray-800">파일 매핑 설정</h3>
									<p class="text-xs text-gray-500">
										{#if currentMappingFile}
											현재 파일: {currentMappingFile}
										{:else}
											매핑할 파일을 선택하세요
										{/if}
									</p>
								</div>
								<button
									onclick={() => saveMappingInfo()}
									class="rounded-md bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
									disabled={isSubmitting || isMappingLoading || !currentMappingFile}
								>
									매핑 저장
								</button>
							</div>
							<DbDesignFileMappingFields
								{currentType}
								bind:mapping={selectedDbDesignMapping}
								fileOptions={dbDesignFileOptions}
								disabled={isMappingLoading || !currentMappingFile}
							/>
						</div>
					</div>
				{:else}
					<div class="space-y-6">
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
