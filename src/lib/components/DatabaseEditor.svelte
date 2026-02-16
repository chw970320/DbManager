<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { DatabaseEntry } from '$lib/types/database-design.js';
	import { showConfirm } from '$lib/stores/confirm-store';

	// Props
	let props = $props<{
		entry?: Partial<DatabaseEntry>;
		isEditMode?: boolean;
		serverError?: string;
		filename?: string;
	}>();

	const dispatch = createEventDispatcher<{
		save: DatabaseEntry;
		delete: DatabaseEntry;
		cancel: void;
	}>();

	let entry = $derived(props.entry ?? {});
	let isEditMode = $derived(props.isEditMode ?? false);
	let serverError = $derived(props.serverError ?? '');

	// 폼 상태
	let formData = $state({
		organizationName: '',
		departmentName: '',
		appliedTask: '',
		relatedLaw: '',
		logicalDbName: '',
		physicalDbName: '',
		buildDate: '',
		dbDescription: '',
		dbmsInfo: '',
		osInfo: '',
		exclusionReason: ''
	});

	// 유효성 검증 상태
	let errors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);

	// 폼 데이터 초기화
	$effect(() => {
		formData.organizationName = entry.organizationName || '';
		formData.departmentName = entry.departmentName || '';
		formData.appliedTask = entry.appliedTask || '';
		formData.relatedLaw = entry.relatedLaw || '';
		formData.logicalDbName = entry.logicalDbName || '';
		formData.physicalDbName = entry.physicalDbName || '';
		formData.buildDate = entry.buildDate || '';
		formData.dbDescription = entry.dbDescription || '';
		formData.dbmsInfo = entry.dbmsInfo || '';
		formData.osInfo = entry.osInfo || '';
		formData.exclusionReason = entry.exclusionReason || '';
	});

	/**
	 * 폼 유효성 검증
	 */
	function validate(): boolean {
		const newErrors: Record<string, string> = {};

		if (!formData.organizationName.trim()) {
			newErrors.organizationName = '기관명은 필수입니다.';
		}
		if (!formData.departmentName.trim()) {
			newErrors.departmentName = '부서명은 필수입니다.';
		}
		if (!formData.appliedTask.trim()) {
			newErrors.appliedTask = '적용업무는 필수입니다.';
		}
		if (!formData.logicalDbName?.trim()) {
			newErrors.logicalDbName = '논리DB명은 필수입니다.';
		}
		if (!formData.physicalDbName?.trim()) {
			newErrors.physicalDbName = '물리DB명은 필수입니다.';
		}
		if (!formData.dbmsInfo?.trim()) {
			newErrors.dbmsInfo = 'DBMS정보는 필수입니다.';
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	/**
	 * 저장 핸들러
	 */
	function handleSave() {
		if (!validate()) return;

		const saveData: DatabaseEntry = {
			id: entry.id || crypto.randomUUID(),
			organizationName: formData.organizationName.trim(),
			departmentName: formData.departmentName.trim(),
			appliedTask: formData.appliedTask.trim(),
			relatedLaw: formData.relatedLaw.trim(),
			logicalDbName: formData.logicalDbName.trim() || undefined,
			physicalDbName: formData.physicalDbName.trim() || undefined,
			buildDate: formData.buildDate.trim(),
			dbDescription: formData.dbDescription.trim() || undefined,
			dbmsInfo: formData.dbmsInfo.trim() || undefined,
			osInfo: formData.osInfo.trim(),
			exclusionReason: formData.exclusionReason.trim(),
			createdAt: entry.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		dispatch('save', saveData);
	}

	/**
	 * 삭제 핸들러
	 */
	async function handleDelete() {
		if (!entry.id) return;

		const confirmed = await showConfirm({ title: '삭제 확인', message: '정말로 이 항목을 삭제하시겠습니까?', confirmText: '삭제', variant: 'danger' });
		if (confirmed) {
			const entryToDelete: DatabaseEntry = {
				id: entry.id,
				organizationName: formData.organizationName.trim() || entry.organizationName || '',
				departmentName: formData.departmentName.trim() || entry.departmentName || '',
				appliedTask: formData.appliedTask.trim() || entry.appliedTask || '',
				relatedLaw: formData.relatedLaw.trim() || entry.relatedLaw || '',
				logicalDbName: formData.logicalDbName.trim() || entry.logicalDbName || undefined,
				physicalDbName: formData.physicalDbName.trim() || entry.physicalDbName || undefined,
				buildDate: formData.buildDate.trim() || entry.buildDate || '',
				dbDescription: formData.dbDescription.trim() || entry.dbDescription || undefined,
				dbmsInfo: formData.dbmsInfo.trim() || entry.dbmsInfo || undefined,
				osInfo: formData.osInfo.trim() || entry.osInfo || '',
				exclusionReason: formData.exclusionReason.trim() || entry.exclusionReason || '',
				createdAt: entry.createdAt || '',
				updatedAt: entry.updatedAt || ''
			};
			dispatch('delete', entryToDelete);
		}
	}

	/**
	 * 취소 핸들러
	 */
	function handleCancel() {
		dispatch('cancel');
	}

	/**
	 * 배경 클릭 핸들러
	 */
	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleCancel();
		}
	}

	/**
	 * 키보드 이벤트 핸들러
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleCancel();
		}
	}
</script>

<!-- 모달 백드롭 -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
	onclick={handleBackdropClick}
	onkeydown={handleKeydown}
	role="dialog"
	aria-modal="true"
	aria-labelledby="modal-title"
	tabindex="-1"
>
	<div class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
		<!-- 헤더 -->
		<div class="flex flex-shrink-0 items-center justify-between border-b p-6">
			<h2 id="modal-title" class="text-xl font-bold text-gray-900">
				{isEditMode ? '데이터베이스 정의서 수정' : '새 데이터베이스 정의서'}
			</h2>
			<button onclick={handleCancel} class="text-gray-600 hover:text-gray-600" aria-label="닫기">
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

		<!-- 스크롤 가능한 내부 컨텐츠 -->
		<div class="flex-1 overflow-y-auto p-6">
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSave();
				}}
			>
				<!-- 서버 에러 표시 -->
				{#if serverError}
					<div class="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
						<p class="text-sm">{serverError}</p>
					</div>
				{/if}

				<div class="space-y-4">
					<!-- 기관명 (필수) -->
					<div>
						<label for="organizationName" class="mb-1 block text-sm font-medium text-gray-700">
							기관명 <span class="text-red-500">*</span>
						</label>
						<input
							id="organizationName"
							type="text"
							bind:value={formData.organizationName}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.organizationName
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="기관명 입력"
						/>
						{#if errors.organizationName}
							<p class="mt-1 text-xs text-red-500">{errors.organizationName}</p>
						{/if}
					</div>

					<!-- 부서명 (필수) -->
					<div>
						<label for="departmentName" class="mb-1 block text-sm font-medium text-gray-700">
							부서명 <span class="text-red-500">*</span>
						</label>
						<input
							id="departmentName"
							type="text"
							bind:value={formData.departmentName}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.departmentName
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="부서명 입력"
						/>
						{#if errors.departmentName}
							<p class="mt-1 text-xs text-red-500">{errors.departmentName}</p>
						{/if}
					</div>

					<!-- 적용업무 (필수) -->
					<div>
						<label for="appliedTask" class="mb-1 block text-sm font-medium text-gray-700">
							적용업무 <span class="text-red-500">*</span>
						</label>
						<input
							id="appliedTask"
							type="text"
							bind:value={formData.appliedTask}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.appliedTask
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="적용업무 입력"
						/>
						{#if errors.appliedTask}
							<p class="mt-1 text-xs text-red-500">{errors.appliedTask}</p>
						{/if}
					</div>

					<!-- 관련법령 (선택) -->
					<div>
						<label for="relatedLaw" class="mb-1 block text-sm font-medium text-gray-700">
							관련법령
						</label>
						<input
							id="relatedLaw"
							type="text"
							bind:value={formData.relatedLaw}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="관련법령 입력"
						/>
					</div>

					<!-- 논리DB명 (필수) -->
					<div>
						<label for="logicalDbName" class="mb-1 block text-sm font-medium text-gray-700">
							논리DB명 <span class="text-red-500">*</span>
						</label>
						<input
							id="logicalDbName"
							type="text"
							bind:value={formData.logicalDbName}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.logicalDbName
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="논리DB명 입력"
						/>
						{#if errors.logicalDbName}
							<p class="mt-1 text-xs text-red-500">{errors.logicalDbName}</p>
						{/if}
					</div>

					<!-- 물리DB명 (필수) -->
					<div>
						<label for="physicalDbName" class="mb-1 block text-sm font-medium text-gray-700">
							물리DB명 <span class="text-red-500">*</span>
						</label>
						<input
							id="physicalDbName"
							type="text"
							bind:value={formData.physicalDbName}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.physicalDbName
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="물리DB명 입력"
						/>
						{#if errors.physicalDbName}
							<p class="mt-1 text-xs text-red-500">{errors.physicalDbName}</p>
						{/if}
					</div>

					<!-- 구축일자 (선택) -->
					<div>
						<label for="buildDate" class="mb-1 block text-sm font-medium text-gray-700">
							구축일자
						</label>
						<input
							id="buildDate"
							type="date"
							bind:value={formData.buildDate}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						/>
					</div>

					<!-- DBMS정보 (필수) -->
					<div>
						<label for="dbmsInfo" class="mb-1 block text-sm font-medium text-gray-700">
							DBMS정보 <span class="text-red-500">*</span>
						</label>
						<select
							id="dbmsInfo"
							bind:value={formData.dbmsInfo}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.dbmsInfo
								? 'border-red-500'
								: 'border-gray-300'}"
						>
							<option value="">선택</option>
							<option value="Oracle">Oracle</option>
							<option value="MySQL">MySQL</option>
							<option value="PostgreSQL">PostgreSQL</option>
							<option value="SQL Server">SQL Server</option>
							<option value="MariaDB">MariaDB</option>
							<option value="MongoDB">MongoDB</option>
							<option value="기타">기타</option>
						</select>
						{#if errors.dbmsInfo}
							<p class="mt-1 text-xs text-red-500">{errors.dbmsInfo}</p>
						{/if}
					</div>

					<!-- 운영체제정보 (선택) -->
					<div>
						<label for="osInfo" class="mb-1 block text-sm font-medium text-gray-700">
							운영체제정보
						</label>
						<input
							id="osInfo"
							type="text"
							bind:value={formData.osInfo}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="운영체제정보 입력"
						/>
					</div>

					<!-- 수집제외사유 (선택) -->
					<div>
						<label for="exclusionReason" class="mb-1 block text-sm font-medium text-gray-700">
							수집제외사유
						</label>
						<input
							id="exclusionReason"
							type="text"
							bind:value={formData.exclusionReason}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="수집제외사유 입력"
						/>
					</div>

					<!-- DB설명 (선택) -->
					<div>
						<label for="dbDescription" class="mb-1 block text-sm font-medium text-gray-700">
							DB설명
						</label>
						<textarea
							id="dbDescription"
							bind:value={formData.dbDescription}
							rows="3"
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="DB설명 입력"
						></textarea>
					</div>
				</div>

				<!-- 버튼 그룹 -->
				<div class="flex justify-between border-t border-gray-200 pt-4">
					{#if isEditMode && entry.id}
						<button
							type="button"
							onclick={handleDelete}
							class="group inline-flex items-center space-x-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 shadow-sm transition-all duration-200 hover:border-red-400 hover:bg-red-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={isSubmitting}
						>
							<svg
								class="h-4 w-4 transition-transform duration-200 group-hover:scale-110"
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
							<span>삭제</span>
						</button>
					{:else}
						<div></div>
					{/if}
					<div class="flex space-x-3">
						<button
							type="button"
							onclick={handleCancel}
							class="btn btn-secondary"
							disabled={isSubmitting}
						>
							취소
						</button>
						<button
							type="submit"
							class="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
							disabled={isSubmitting}
						>
							{#if isSubmitting}
								저장 중...
							{:else}
								{isEditMode ? '수정' : '저장'}
							{/if}
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
</div>
