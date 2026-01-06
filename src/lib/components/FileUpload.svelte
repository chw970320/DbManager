<script lang="ts">
	import type { ApiResponse, UploadResult } from '$lib/types/vocabulary';

	// 컴포넌트 속성
	let {
		accept = '.xlsx,.xls',
		maxSize = 10 * 1024 * 1024, // 10MB
		replaceExisting = true,
		disabled = false,
		apiEndpoint = '/api/upload', // 기본값은 vocabulary API
		contentType = '단어집', // 표시할 데이터 타입 ('단어집' 또는 '도메인')
		filename = 'vocabulary.json', // 대상 파일명
		onuploadstart,
		onuploadsuccess,
		onuploaderror,
		onuploadcomplete
	}: {
		accept?: string;
		maxSize?: number;
		replaceExisting?: boolean;
		disabled?: boolean;
		apiEndpoint?: string;
		contentType?: string;
		filename?: string;
		onuploadstart: () => void;
		onuploadsuccess: (detail: { result: UploadResult }) => void;
		onuploaderror: (detail: { error: string }) => void;
		onuploadcomplete: () => void;
	} = $props();

	// 상태 변수
	let files = $state<FileList | null>(null);
	let uploading = $state(false);
	let uploadProgress = $state(0);
	let dragOver = $state(false);
	let uploadResult = $state('');
	let errorMessage = $state('');
	let selectedMode = $state<'validated-replace' | 'simple-replace'>(
		replaceExisting ? 'validated-replace' : 'simple-replace'
	);

	// 파생 상태
	let dragoverClass = $derived(
		dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'
	);

	let containerClass = $derived(
		disabled || uploading
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer hover:border-blue-400 hover:bg-blue-50'
	);

	// 파일 선택 input 참조
	let fileInput: HTMLInputElement;

	/**
	 * 파일 드래그 오버 처리
	 */
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (!disabled && !uploading) {
			dragOver = true;
		}
	}

	/**
	 * 드래그 리브 처리
	 */
	function handleDragLeave() {
		dragOver = false;
	}

	/**
	 * 파일 드롭 처리
	 */
	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;

		if (disabled || uploading) return;

		const droppedFiles = event.dataTransfer?.files;
		if (droppedFiles && droppedFiles.length > 0) {
			handleFileSelection(droppedFiles);
		}
	}

	/**
	 * 파일 선택 처리
	 */
	function handleFileInput(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			handleFileSelection(target.files);
		}
	}

	/**
	 * 파일 선택 공통 처리
	 */
	function handleFileSelection(selectedFiles: FileList) {
		// 첫 번째 파일만 처리
		const file = selectedFiles[0];

		// 파일 타입 검증
		if (!accept.split(',').some((ext) => file.name.toLowerCase().endsWith(ext.trim()))) {
			errorMessage = `지원하지 않는 파일 형식입니다. ${accept} 파일만 업로드 가능합니다.`;
			return;
		}

		// 파일 크기 검증
		if (file.size > maxSize) {
			const maxSizeMB = Math.round(maxSize / (1024 * 1024));
			errorMessage = `파일 크기가 너무 큽니다. 최대 ${maxSizeMB}MB까지 업로드 가능합니다.`;
			return;
		}

		// 에러 메시지 초기화
		errorMessage = '';
		files = selectedFiles;
	}

	/**
	 * 파일 업로드 실행
	 */
	async function handleUpload() {
		if (!files || files.length === 0) {
			errorMessage = '업로드할 파일을 선택해주세요.';
			return;
		}

		// 단순 교체 모드일 때 백업 권장 메시지
		if (selectedMode === 'simple-replace') {
			const confirmed = confirm(
				`단순 교체 모드를 선택하셨습니다.\n\n기존 ${contentType}이 완전히 삭제되고 새로운 데이터로 교체됩니다.\n히스토리도 초기화됩니다.\n\n⚠️ 파일 백업을 권장합니다.\n\n정말로 교체하시겠습니까?`
			);

			if (!confirmed) {
				return; // 사용자가 취소한 경우 업로드 중단
			}
		}

		// 검증 교체 모드일 때 확인 메시지
		if (selectedMode === 'validated-replace') {
			const confirmed = confirm(
				`검증 교체 모드를 선택하셨습니다.\n\n기존 ${contentType}이 완전히 삭제되고 새로운 데이터로 교체됩니다.\n데이터 검증 후 업로드됩니다.\n히스토리도 초기화됩니다.\n\n정말로 교체하시겠습니까?`
			);

			if (!confirmed) {
				return; // 사용자가 취소한 경우 업로드 중단
			}
		}

		const file = files[0];
		uploading = true;
		uploadProgress = 0;
		uploadResult = '';
		errorMessage = '';

		// 업로드 시작 이벤트
		onuploadstart();

		try {
			// FormData 생성
			const formData = new FormData();
			formData.append('file', file);
			// 두 모드 모두 교체 모드이므로 replace는 항상 true
			formData.append('replace', 'true');
			// validation 파라미터 추가: 검증 교체 모드일 때만 true
			formData.append('validation', (selectedMode === 'validated-replace').toString());
			if (filename) {
				formData.append('filename', filename);
			}

			// 진행 상태 시뮬레이션 (실제로는 XMLHttpRequest로 진행률 추적 가능)
			const progressInterval = setInterval(() => {
				uploadProgress = Math.min(uploadProgress + 10, 90);
			}, 200);

			// API 호출
			const response = await fetch(apiEndpoint, {
				method: 'POST',
				body: formData
			});

			clearInterval(progressInterval);
			uploadProgress = 100;

			const result: ApiResponse = await response.json();

			if (result.success && result.data) {
				const data = result.data as UploadResult;
				uploadResult = `✅ ${data.message}`;
				onuploadsuccess({ result: data });
			} else {
				throw new Error(result.error || '업로드 처리 중 오류가 발생했습니다.');
			}
		} catch (error) {
			uploadProgress = 0;
			errorMessage = error instanceof Error ? error.message : '업로드 실패';
			onuploaderror({ error: errorMessage });
		} finally {
			uploading = false;
			onuploadcomplete();

			// 완료 후 입력 초기화
			if (fileInput) {
				fileInput.value = '';
			}
			files = null;
		}
	}

	/**
	 * 파일 선택 버튼 클릭
	 */
	function triggerFileSelect() {
		if (!disabled && !uploading) {
			fileInput?.click();
		}
	}

	/**
	 * 업로드 취소
	 */
	function cancelUpload() {
		if (fileInput) {
			fileInput.value = '';
		}
		files = null;
		uploadResult = '';
		errorMessage = '';
		uploadProgress = 0;
	}
</script>

<!-- 파일 업로드 컴포넌트 -->
<div class="shadow%-md mx-auto w-full rounded-lg bg-white p-6">
	<!-- 업로드 모드 선택 -->
	<div class="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
		<h3 class="mb-3 text-sm font-semibold text-gray-700">업로드 모드 선택</h3>
		<div class="space-y-3">
			<label class="flex cursor-pointer items-start space-x-3">
				<input
					type="radio"
					name="uploadMode"
					value="validated-replace"
					bind:group={selectedMode}
					class="mt-0.5 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
					{disabled}
				/>
				<div class="flex-1">
					<div class="text-sm font-medium text-gray-900">검증 교체 모드</div>
					<div class="text-xs text-gray-600">
						기존 {contentType}을 완전히 삭제하고 새로운 데이터로 교체합니다. 데이터 검증 후
						업로드됩니다. 히스토리도 초기화됩니다.
					</div>
				</div>
			</label>
			<label class="flex cursor-pointer items-start space-x-3">
				<input
					type="radio"
					name="uploadMode"
					value="simple-replace"
					bind:group={selectedMode}
					class="mt-0.5 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
					{disabled}
				/>
				<div class="flex-1">
					<div class="text-sm font-medium text-gray-900">단순 교체 모드</div>
					<div class="text-xs text-gray-600">
						기존 {contentType}을 완전히 삭제하고 새로운 데이터로 교체합니다. 검증 없이 바로
						교체됩니다. 히스토리도 초기화됩니다. 파일 백업을 권장합니다.
					</div>
				</div>
			</label>
		</div>
	</div>

	<!-- 드래그앤드롭 영역 -->
	<div
		class="relative rounded-lg border-2 border-dashed p-8 text-center transition-all duration-200 {dragoverClass} {containerClass}"
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		onclick={triggerFileSelect}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				triggerFileSelect();
			}
		}}
		role="button"
		tabindex="0"
		aria-label="파일 업로드 영역"
	>
		<!-- 파일 선택 input (숨김) -->
		<input
			bind:this={fileInput}
			type="file"
			{accept}
			class="hidden"
			onchange={handleFileInput}
			{disabled}
		/>

		<!-- 아이콘 -->
		<div class="mb-4">
			<svg
				class="mx-auto h-12 w-12 text-gray-400"
				stroke="currentColor"
				fill="none"
				viewBox="0 0 48 48"
				aria-hidden="true"
			>
				<path
					d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</div>

		<!-- 메시지 -->
		<div class="space-y-2">
			{#if dragOver}
				<p class="text-lg font-medium text-blue-600">파일을 여기에 드롭하세요</p>
			{:else if files && files.length > 0}
				<p class="text-lg font-medium text-green-600">
					선택된 파일: {files[0].name}
				</p>
				<p class="text-sm text-gray-500">
					크기: {(files[0].size / 1024 / 1024).toFixed(2)}MB
				</p>
			{:else}
				<p class="text-lg font-medium text-gray-600">
					파일을 드래그하거나 <span class="font-semibold text-blue-600">클릭하여 선택</span>
				</p>
				<p class="text-xs text-gray-500">
					XLSX, XLS 파일 형식 지원 (최대 {Math.round(maxSize / 1024 / 1024)}MB)
				</p>
			{/if}
		</div>
	</div>

	<!-- 업로드 진행률 -->
	{#if uploading}
		<div class="mt-6">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-gray-700">업로드 중...</span>
				<span class="text-sm font-medium text-blue-600">{uploadProgress}%</span>
			</div>
			<div class="mt-2 w-full rounded-full bg-gray-200">
				<div
					class="rounded-full bg-blue-500 p-0.5 text-center text-xs font-medium leading-none text-white transition-all duration-300"
					style="width: {uploadProgress}%"
				></div>
			</div>
		</div>
	{/if}

	<!-- 결과 메시지 -->
	{#if uploadResult}
		<div
			class="mt-6 flex items-center rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
		>
			<svg
				class="mr-2 h-5 w-5 flex-shrink-0"
				fill="currentColor"
				viewBox="0 0 20 20"
				aria-hidden="true"
			>
				<path
					fill-rule="evenodd"
					d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
					clip-rule="evenodd"
				></path>
			</svg>
			{uploadResult}
		</div>
	{/if}

	<!-- 에러 메시지 -->
	{#if errorMessage}
		<div
			class="mt-6 flex items-center rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
		>
			<svg
				class="mr-2 h-5 w-5 flex-shrink-0"
				fill="currentColor"
				viewBox="0 0 20 20"
				aria-hidden="true"
			>
				<path
					fill-rule="evenodd"
					d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
					clip-rule="evenodd"
				></path>
			</svg>
			{errorMessage}
		</div>
	{/if}

	<!-- 액션 버튼 -->
	<div class="mt-8 flex justify-end space-x-4">
		{#if files && files.length > 0 && !uploading}
			<button
				onclick={cancelUpload}
				class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
			>
				취소
			</button>
			<button
				onclick={handleUpload}
				class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
				{disabled}
			>
				업로드
			</button>
		{/if}
	</div>
</div>
