<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import FileUpload from './FileUpload.svelte';
	import type { DbDesignApiResponse, DbDesignUploadResult } from '$lib/types/database-design';
	import { tableStore } from '$lib/stores/database-design-store';

	interface Props { isOpen?: boolean; }
	let { isOpen = false }: Props = $props();

	const dispatch = createEventDispatcher<{ close: void; change: void }>();
	const SYSTEM_FILE = 'table.json';
	let files = $state<string[]>([]); let isLoading = $state(false); let error = $state(''); let successMessage = $state('');
	let newFilename = $state(''); let editingFile = $state<string | null>(null); let renameValue = $state(''); let isSubmitting = $state(false);
	let activeTab = $state<'files' | 'upload'>('files'); let selectedUploadFile = $state('table.json'); let uploadMode = $state<'merge' | 'replace'>('merge');
	type UploadSuccessDetail = { result: DbDesignUploadResult }; type UploadErrorDetail = { error: string };

	$effect(() => { if (isOpen) loadFiles(); });
	function isSystemFile(file: string): boolean { return file === SYSTEM_FILE; }

	async function loadFiles() { isLoading = true; try { const response = await fetch('/api/table/files', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }); const result: DbDesignApiResponse = await response.json(); if (result.success && Array.isArray(result.data)) files = result.data as string[]; } catch (_err) { error = '파일 목록을 불러오는데 실패했습니다.'; } finally { isLoading = false; } }
	async function handleCreateFile() { if (!newFilename.trim()) { error = '파일명을 입력하세요.'; return; } const filename = newFilename.trim().endsWith('.json') ? newFilename.trim() : `${newFilename.trim()}.json`; if (files.includes(filename)) { error = '이미 존재하는 파일명입니다.'; return; } isSubmitting = true; error = ''; successMessage = ''; try { const response = await fetch('/api/table/files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename }) }); const result: DbDesignApiResponse = await response.json(); if (result.success) { successMessage = `파일 "${filename}"이(가) 생성되었습니다.`; newFilename = ''; await loadFiles(); dispatch('change'); } else error = result.error || '파일 생성에 실패했습니다.'; } catch (_err) { error = '파일 생성 중 오류가 발생했습니다.'; } finally { isSubmitting = false; } }
	async function handleDeleteFile(filename: string) { if (isSystemFile(filename)) { error = '시스템 파일은 삭제할 수 없습니다.'; return; } if (!confirm(`정말 "${filename}" 파일을 삭제하시겠습니까?`)) return; isSubmitting = true; error = ''; successMessage = ''; try { const response = await fetch('/api/table/files', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename }) }); const result: DbDesignApiResponse = await response.json(); if (result.success) { successMessage = `파일 "${filename}"이(가) 삭제되었습니다.`; await loadFiles(); dispatch('change'); } else error = result.error || '파일 삭제에 실패했습니다.'; } catch (_err) { error = '파일 삭제 중 오류가 발생했습니다.'; } finally { isSubmitting = false; } }
	function startRename(filename: string) { editingFile = filename; renameValue = filename.replace('.json', ''); }
	function cancelRename() { editingFile = null; renameValue = ''; }
	async function saveRename(oldFilename: string) { if (!renameValue.trim()) { error = '파일명을 입력하세요.'; return; } const newFilename = renameValue.trim().endsWith('.json') ? renameValue.trim() : `${renameValue.trim()}.json`; if (newFilename === oldFilename) { cancelRename(); return; } if (files.includes(newFilename)) { error = '이미 존재하는 파일명입니다.'; return; } isSubmitting = true; error = ''; successMessage = ''; try { const response = await fetch('/api/table/files', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldFilename, newFilename }) }); const result: DbDesignApiResponse = await response.json(); if (result.success) { successMessage = `파일명이 "${newFilename}"(으)로 변경되었습니다.`; cancelRename(); await loadFiles(); dispatch('change'); } else error = result.error || '파일명 변경에 실패했습니다.'; } catch (_err) { error = '파일명 변경 중 오류가 발생했습니다.'; } finally { isSubmitting = false; } }
	function handleFileSelect(filename: string) { tableStore.update((store) => ({ ...store, selectedFilename: filename })); dispatch('change'); }
	async function handleUploadSuccess(event: CustomEvent<UploadSuccessDetail>) { const { result } = event.detail; successMessage = result.message || '업로드가 완료되었습니다.'; await loadFiles(); dispatch('change'); }
	function handleUploadError(event: CustomEvent<UploadErrorDetail>) { error = event.detail.error || '업로드 중 오류가 발생했습니다.'; }
	function handleClose() { error = ''; successMessage = ''; dispatch('close'); }
	function handleBackdropClick(event: MouseEvent) { if (event.target === event.currentTarget) handleClose(); }
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onclick={handleBackdropClick} role="dialog" aria-modal="true">
		<div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onclick={(e) => e.stopPropagation()}>
			<div class="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
				<div class="flex items-center justify-between"><h2 class="text-xl font-bold text-gray-900">테이블 정의서 파일 관리</h2><button onclick={handleClose} class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" aria-label="닫기"><svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
				<div class="mt-4 flex space-x-4 border-b border-gray-200"><button onclick={() => (activeTab = 'files')} class="border-b-2 px-4 py-2 text-sm font-medium transition-colors {activeTab === 'files' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">파일 목록</button><button onclick={() => (activeTab = 'upload')} class="border-b-2 px-4 py-2 text-sm font-medium transition-colors {activeTab === 'upload' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">파일 업로드</button></div>
			</div>
			<div class="p-6">
				{#if error}<div class="mb-4 rounded-lg bg-red-50 p-3 text-red-700"><p class="text-sm">{error}</p></div>{/if}
				{#if successMessage}<div class="mb-4 rounded-lg bg-green-50 p-3 text-green-700"><p class="text-sm">{successMessage}</p></div>{/if}
				{#if activeTab === 'files'}
					<div class="mb-6"><h3 class="mb-2 text-sm font-medium text-gray-700">새 파일 생성</h3><div class="flex gap-2"><input type="text" bind:value={newFilename} placeholder="파일명 입력 (확장자 제외)" class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" disabled={isSubmitting} /><button onclick={handleCreateFile} disabled={isSubmitting || !newFilename.trim()} class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">생성</button></div></div>
					<div><h3 class="mb-2 text-sm font-medium text-gray-700">파일 목록</h3>{#if isLoading}<div class="py-8 text-center text-gray-500">로딩 중...</div>{:else if files.length === 0}<div class="py-8 text-center text-gray-500">파일이 없습니다.</div>{:else}<ul class="divide-y divide-gray-200 rounded-lg border border-gray-200">{#each files as file (file)}<li class="flex items-center justify-between px-4 py-3 hover:bg-gray-50">{#if editingFile === file}<div class="flex flex-1 items-center gap-2"><input type="text" bind:value={renameValue} class="flex-1 rounded border border-gray-300 px-2 py-1 text-sm" disabled={isSubmitting} /><button onclick={() => saveRename(file)} disabled={isSubmitting} class="text-sm text-blue-600 hover:text-blue-700">저장</button><button onclick={cancelRename} class="text-sm text-gray-500 hover:text-gray-700">취소</button></div>{:else}<button onclick={() => handleFileSelect(file)} class="flex-1 text-left text-sm text-gray-900 hover:text-blue-600">{file}{#if isSystemFile(file)}<span class="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">시스템</span>{/if}</button><div class="flex items-center gap-2">{#if !isSystemFile(file)}<button onclick={() => startRename(file)} class="text-sm text-gray-500 hover:text-gray-700" disabled={isSubmitting}>이름변경</button><button onclick={() => handleDeleteFile(file)} class="text-sm text-red-500 hover:text-red-700" disabled={isSubmitting}>삭제</button>{/if}</div>{/if}</li>{/each}</ul>{/if}</div>
				{:else}
					<div class="space-y-4"><div><label for="uploadTargetFile" class="mb-1 block text-sm font-medium text-gray-700">업로드 대상 파일</label><select id="uploadTargetFile" bind:value={selectedUploadFile} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">{#each files as file (file)}<option value={file}>{file}</option>{/each}</select></div><div><label class="mb-1 block text-sm font-medium text-gray-700">업로드 모드</label><div class="flex gap-4"><label class="flex items-center gap-2"><input type="radio" bind:group={uploadMode} value="merge" class="text-blue-600 focus:ring-blue-500" /><span class="text-sm">병합 (기존 데이터 유지)</span></label><label class="flex items-center gap-2"><input type="radio" bind:group={uploadMode} value="replace" class="text-blue-600 focus:ring-blue-500" /><span class="text-sm">덮어쓰기 (기존 데이터 삭제)</span></label></div></div><FileUpload uploadUrl="/api/table/upload" filename={selectedUploadFile} mode={uploadMode} acceptedFormats={['.xlsx', '.xls']} on:success={handleUploadSuccess} on:error={handleUploadError} /></div>
				{/if}
			</div>
		</div>
	</div>
{/if}

