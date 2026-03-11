<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { addToast } from '$lib/stores/toast-store';
	import { showConfirm } from '$lib/stores/confirm-store';
	import type {
		DomainDataTypeMappingData,
		DomainDataTypeMappingEntry,
		DomainDataTypeMappingSyncResult
	} from '$lib/types/domain-data-type-mapping';

	interface Props {
		isOpen?: boolean;
	}

	type ChangeDetail = {
		entries: DomainDataTypeMappingEntry[];
		sync: DomainDataTypeMappingSyncResult;
	};

	type MutationPayload = {
		entry?: DomainDataTypeMappingEntry;
		data: DomainDataTypeMappingData;
		sync: DomainDataTypeMappingSyncResult;
	};

	let { isOpen = false }: Props = $props();

	const dispatch = createEventDispatcher<{
		close: void;
		change: ChangeDetail;
	}>();

	let mappings = $state<DomainDataTypeMappingEntry[]>([]);
	let isLoading = $state(false);
	let isSubmitting = $state(false);
	let error = $state('');
	let successMessage = $state('');
	let syncSummary = $state<DomainDataTypeMappingSyncResult | null>(null);
	let editingId = $state<string | null>(null);
	let formData = $state({
		dataType: '',
		abbreviation: ''
	});

	function resetForm() {
		editingId = null;
		formData.dataType = '';
		formData.abbreviation = '';
	}

	function formatSyncSummary(sync: DomainDataTypeMappingSyncResult): string {
		return `도메인 ${sync.domainsUpdated}건, 용어 ${sync.termsUpdated}건, 컬럼 ${sync.columnsUpdated}건을 갱신했습니다.`;
	}

	async function loadMappings() {
		isLoading = true;
		error = '';

		try {
			const response = await fetch('/api/domain/type-mappings');
			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error || '데이터타입 매핑 목록을 불러오지 못했습니다.');
			}

			const data = result.data as DomainDataTypeMappingData;
			mappings = Array.isArray(data.entries) ? data.entries : [];
		} catch (loadError) {
			error =
				loadError instanceof Error
					? loadError.message
					: '데이터타입 매핑 목록을 불러오지 못했습니다.';
		} finally {
			isLoading = false;
		}
	}

	function applyMutationResult(payload: MutationPayload, successText: string) {
		mappings = payload.data.entries;
		syncSummary = payload.sync;
		successMessage = `${successText} ${formatSyncSummary(payload.sync)}`;
		addToast(successMessage, 'success');
		dispatch('change', {
			entries: payload.data.entries,
			sync: payload.sync
		});
		resetForm();
	}

	async function handleSubmit() {
		if (!formData.dataType.trim() || !formData.abbreviation.trim()) {
			error = '데이터타입과 매핑약어를 모두 입력하세요.';
			return;
		}

		isSubmitting = true;
		error = '';

		try {
			const isEditMode = !!editingId;
			const response = await fetch('/api/domain/type-mappings', {
				method: isEditMode ? 'PUT' : 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					id: editingId,
					dataType: formData.dataType.trim(),
					abbreviation: formData.abbreviation.trim()
				})
			});

			const result = await response.json();
			if (!response.ok || !result.success) {
				throw new Error(result.error || '데이터타입 매핑 저장에 실패했습니다.');
			}

			applyMutationResult(
				result.data as MutationPayload,
				isEditMode ? '데이터타입 매핑을 수정했습니다.' : '데이터타입 매핑을 등록했습니다.'
			);
		} catch (submitError) {
			error =
				submitError instanceof Error
					? submitError.message
					: '데이터타입 매핑 저장에 실패했습니다.';
		} finally {
			isSubmitting = false;
		}
	}

	function handleEdit(entry: DomainDataTypeMappingEntry) {
		editingId = entry.id;
		formData.dataType = entry.dataType;
		formData.abbreviation = entry.abbreviation;
		error = '';
	}

	async function handleDelete(entry: DomainDataTypeMappingEntry) {
		const confirmed = await showConfirm({
			title: '삭제 확인',
			message: `'${entry.dataType}' 매핑을 삭제하시겠습니까?`,
			confirmText: '삭제',
			variant: 'danger'
		});

		if (!confirmed) {
			return;
		}

		isSubmitting = true;
		error = '';

		try {
			const response = await fetch('/api/domain/type-mappings', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ id: entry.id })
			});

			const result = await response.json();
			if (!response.ok || !result.success) {
				throw new Error(result.error || '데이터타입 매핑 삭제에 실패했습니다.');
			}

			applyMutationResult(result.data as MutationPayload, '데이터타입 매핑을 삭제했습니다.');
		} catch (deleteError) {
			error =
				deleteError instanceof Error
					? deleteError.message
					: '데이터타입 매핑 삭제에 실패했습니다.';
		} finally {
			isSubmitting = false;
		}
	}

	function handleClose() {
		error = '';
		successMessage = '';
		syncSummary = null;
		resetForm();
		dispatch('close');
	}

	$effect(() => {
		if (isOpen) {
			void loadMappings();
		}
	});
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		onclick={(event) => {
			if (event.target === event.currentTarget) {
				handleClose();
			}
		}}
		onkeydown={(event) => {
			if (event.key === 'Escape') {
				handleClose();
			}
		}}
		role="dialog"
		aria-modal="true"
		aria-label="데이터타입 매핑 관리"
		tabindex="-1"
	>
		<div class="mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl">
			<div class="flex items-center justify-between border-b px-6 py-4">
				<div>
					<h2 class="text-xl font-bold text-gray-900">데이터타입 매핑 관리</h2>
					<p class="mt-1 text-sm text-gray-500">
						도메인명 생성에 사용할 데이터타입 약어를 관리합니다.
					</p>
				</div>
				<button
					type="button"
					onclick={handleClose}
					class="text-gray-600 hover:text-gray-800"
					aria-label="데이터타입 매핑 관리 닫기"
				>
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

			<div class="flex-1 overflow-y-auto px-6 py-5">
				{#if error}
					<div class="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
				{/if}

				{#if successMessage}
					<div class="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
						{successMessage}
					</div>
				{/if}

				<div class="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
					등록되지 않은 데이터타입은 하위 호환을 위해 첫 글자로 자동 처리됩니다.
				</div>

				<div class="grid gap-6 lg:grid-cols-[20rem_1fr]">
					<section class="rounded-xl border border-gray-200 bg-gray-50 p-4">
						<h3 class="mb-4 text-sm font-semibold text-gray-900">
							{editingId ? '매핑 수정' : '매핑 등록'}
						</h3>
						<div class="space-y-4">
							<div>
								<label for="mappingDataType" class="mb-1 block text-sm font-medium text-gray-900">
									데이터타입 <span class="text-red-700">*</span>
								</label>
								<input
									id="mappingDataType"
									type="text"
									bind:value={formData.dataType}
									placeholder="예: TIMESTAMP"
									class="input"
									disabled={isSubmitting}
								/>
							</div>

							<div>
								<label
									for="mappingAbbreviation"
									class="mb-1 block text-sm font-medium text-gray-900"
								>
									매핑약어 <span class="text-red-700">*</span>
								</label>
								<input
									id="mappingAbbreviation"
									type="text"
									bind:value={formData.abbreviation}
									placeholder="예: TS"
									class="input"
									disabled={isSubmitting}
								/>
							</div>

							<div class="flex gap-2 pt-2">
								<button
									type="button"
									onclick={handleSubmit}
									class="btn btn-primary flex-1"
									disabled={isSubmitting}
								>
									{editingId ? '수정 저장' : '등록'}
								</button>
								{#if editingId}
									<button
										type="button"
										onclick={resetForm}
										class="btn btn-secondary"
										disabled={isSubmitting}
									>
										취소
									</button>
								{/if}
							</div>
						</div>
					</section>

					<section>
						<div class="mb-3 flex items-center justify-between">
							<h3 class="text-sm font-semibold text-gray-900">매핑 목록</h3>
							<span class="text-sm text-gray-500">총 {mappings.length}건</span>
						</div>

						<div class="overflow-hidden rounded-xl border border-gray-200">
							{#if isLoading}
								<div class="py-12 text-center text-sm text-gray-500">로딩 중...</div>
							{:else if mappings.length === 0}
								<div class="py-12 text-center text-sm text-gray-500">
									등록된 데이터타입 매핑이 없습니다.
								</div>
							{:else}
								<div class="max-h-[28rem] overflow-y-auto">
									<table class="min-w-full divide-y divide-gray-200 text-sm">
										<thead class="bg-gray-50">
											<tr>
												<th class="px-4 py-3 text-left font-semibold text-gray-700">
													데이터타입
												</th>
												<th class="px-4 py-3 text-left font-semibold text-gray-700">
													매핑약어
												</th>
												<th class="px-4 py-3 text-right font-semibold text-gray-700">
													관리
												</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-gray-100 bg-white">
											{#each mappings as entry (entry.id)}
												<tr class="hover:bg-gray-50">
													<td class="px-4 py-3 font-medium text-gray-900">{entry.dataType}</td>
													<td class="px-4 py-3 text-gray-700">{entry.abbreviation}</td>
													<td class="px-4 py-3">
														<div class="flex justify-end gap-2">
															<button
																type="button"
																onclick={() => handleEdit(entry)}
																class="rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-blue-600"
																aria-label={`${entry.dataType} 매핑 수정`}
																disabled={isSubmitting}
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
																type="button"
																onclick={() => handleDelete(entry)}
																class="rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-red-600"
																aria-label={`${entry.dataType} 매핑 삭제`}
																disabled={isSubmitting}
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
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							{/if}
						</div>

						{#if syncSummary}
							<div class="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
								{formatSyncSummary(syncSummary)}
							</div>
						{/if}
					</section>
				</div>
			</div>

			<div class="flex justify-end border-t px-6 py-4">
				<button type="button" onclick={handleClose} class="btn btn-secondary">닫기</button>
			</div>
		</div>
	</div>
{/if}
