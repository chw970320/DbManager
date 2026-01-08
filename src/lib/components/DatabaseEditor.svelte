<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { DatabaseEntry } from '$lib/types/database-design.js';

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
		organizationName: entry.organizationName || '',
		departmentName: entry.departmentName || '',
		appliedTask: entry.appliedTask || '',
		relatedLaw: entry.relatedLaw || '',
		logicalDbName: entry.logicalDbName || '',
		physicalDbName: entry.physicalDbName || '',
		buildDate: entry.buildDate || '',
		dbDescription: entry.dbDescription || '',
		dbmsInfo: entry.dbmsInfo || '',
		osInfo: entry.osInfo || '',
		exclusionReason: entry.exclusionReason || ''
	});

	// 유효성 검증 상태
	let errors = $state<Record<string, string>>({});
	let showDeleteConfirm = $state(false);

	// 폼 데이터 초기화
	$effect(() => {
		formData = {
			organizationName: entry.organizationName || '',
			departmentName: entry.departmentName || '',
			appliedTask: entry.appliedTask || '',
			relatedLaw: entry.relatedLaw || '',
			logicalDbName: entry.logicalDbName || '',
			physicalDbName: entry.physicalDbName || '',
			buildDate: entry.buildDate || '',
			dbDescription: entry.dbDescription || '',
			dbmsInfo: entry.dbmsInfo || '',
			osInfo: entry.osInfo || '',
			exclusionReason: entry.exclusionReason || ''
		};
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
		if (!formData.relatedLaw.trim()) {
			newErrors.relatedLaw = '관련법령은 필수입니다.';
		}
		if (!formData.buildDate.trim()) {
			newErrors.buildDate = '구축일자는 필수입니다.';
		}
		if (!formData.osInfo.trim()) {
			newErrors.osInfo = '운영체제정보는 필수입니다.';
		}
		if (!formData.exclusionReason.trim()) {
			newErrors.exclusionReason = '수집제외사유는 필수입니다.';
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
	function handleDelete() {
		if (entry.id) {
			dispatch('delete', entry as DatabaseEntry);
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

<svelte:window onkeydown={handleKeydown} />

<!-- 모달 백드롭 -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
	onclick={handleBackdropClick}
	role="dialog"
	aria-modal="true"
	aria-labelledby="modal-title"
>
	<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
	<div
		class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl"
		onclick={(e) => e.stopPropagation()}
	>
		<!-- 헤더 -->
		<div class="flex flex-shrink-0 items-center justify-between border-b p-6">
			<h2 id="modal-title" class="text-xl font-bold text-gray-900">
				{isEditMode ? '데이터베이스 정의서 수정' : '새 데이터베이스 정의서'}
			</h2>
			<button
				onclick={handleCancel}
				class="text-gray-400 hover:text-gray-600"
				aria-label="닫기"
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

		<!-- 스크롤 가능한 내부 컨텐츠 -->
		<div class="flex-1 overflow-y-auto p-6">
			<form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
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
						class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.organizationName ? 'border-red-500' : 'border-gray-300'}"
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
						class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.departmentName ? 'border-red-500' : 'border-gray-300'}"
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
						class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.appliedTask ? 'border-red-500' : 'border-gray-300'}"
						placeholder="적용업무 입력"
					/>
					{#if errors.appliedTask}
						<p class="mt-1 text-xs text-red-500">{errors.appliedTask}</p>
					{/if}
				</div>

				<!-- 관련법령 (필수) -->
				<div>
					<label for="relatedLaw" class="mb-1 block text-sm font-medium text-gray-700">
						관련법령 <span class="text-red-500">*</span>
					</label>
					<input
						id="relatedLaw"
						type="text"
						bind:value={formData.relatedLaw}
						class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.relatedLaw ? 'border-red-500' : 'border-gray-300'}"
						placeholder="관련법령 입력"
					/>
					{#if errors.relatedLaw}
						<p class="mt-1 text-xs text-red-500">{errors.relatedLaw}</p>
					{/if}
				</div>

				<!-- 논리DB명 (선택) -->
				<div>
					<label for="logicalDbName" class="mb-1 block text-sm font-medium text-gray-700">
						논리DB명
					</label>
					<input
						id="logicalDbName"
						type="text"
						bind:value={formData.logicalDbName}
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						placeholder="논리DB명 입력"
					/>
				</div>

				<!-- 물리DB명 (선택) -->
				<div>
					<label for="physicalDbName" class="mb-1 block text-sm font-medium text-gray-700">
						물리DB명
					</label>
					<input
						id="physicalDbName"
						type="text"
						bind:value={formData.physicalDbName}
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						placeholder="물리DB명 입력"
					/>
				</div>

				<!-- 구축일자 (필수) -->
				<div>
					<label for="buildDate" class="mb-1 block text-sm font-medium text-gray-700">
						구축일자 <span class="text-red-500">*</span>
					</label>
					<input
						id="buildDate"
						type="date"
						bind:value={formData.buildDate}
						class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.buildDate ? 'border-red-500' : 'border-gray-300'}"
					/>
					{#if errors.buildDate}
						<p class="mt-1 text-xs text-red-500">{errors.buildDate}</p>
					{/if}
				</div>

				<!-- DBMS정보 (선택) -->
				<div>
					<label for="dbmsInfo" class="mb-1 block text-sm font-medium text-gray-700">
						DBMS정보
					</label>
					<select
						id="dbmsInfo"
						bind:value={formData.dbmsInfo}
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
				</div>

				<!-- 운영체제정보 (필수) -->
				<div>
					<label for="osInfo" class="mb-1 block text-sm font-medium text-gray-700">
						운영체제정보 <span class="text-red-500">*</span>
					</label>
					<input
						id="osInfo"
						type="text"
						bind:value={formData.osInfo}
						class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.osInfo ? 'border-red-500' : 'border-gray-300'}"
						placeholder="운영체제정보 입력"
					/>
					{#if errors.osInfo}
						<p class="mt-1 text-xs text-red-500">{errors.osInfo}</p>
					{/if}
				</div>

				<!-- 수집제외사유 (필수) -->
				<div>
					<label for="exclusionReason" class="mb-1 block text-sm font-medium text-gray-700">
						수집제외사유 <span class="text-red-500">*</span>
					</label>
					<input
						id="exclusionReason"
						type="text"
						bind:value={formData.exclusionReason}
						class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.exclusionReason ? 'border-red-500' : 'border-gray-300'}"
						placeholder="수집제외사유 입력"
					/>
					{#if errors.exclusionReason}
						<p class="mt-1 text-xs text-red-500">{errors.exclusionReason}</p>
					{/if}
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

			<!-- 푸터 버튼 -->
			<div class="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
				<div>
					{#if isEditMode}
						{#if showDeleteConfirm}
							<div class="flex items-center gap-2">
								<span class="text-sm text-red-600">정말 삭제하시겠습니까?</span>
								<button
									type="button"
									onclick={handleDelete}
									class="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
								>
									확인
								</button>
								<button
									type="button"
									onclick={() => (showDeleteConfirm = false)}
									class="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
								>
									취소
								</button>
							</div>
						{:else}
							<button
								type="button"
								onclick={() => (showDeleteConfirm = true)}
								class="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
							>
								삭제
							</button>
						{/if}
					{/if}
				</div>

				<div class="flex items-center gap-3">
					<button
						type="button"
						onclick={handleCancel}
						class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
					>
						취소
					</button>
					<button
						type="submit"
						class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
					>
						{isEditMode ? '수정' : '추가'}
					</button>
				</div>
			</div>
			</form>
		</div>
	</div>
</div>

