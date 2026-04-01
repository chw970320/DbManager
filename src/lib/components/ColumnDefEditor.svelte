<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { ColumnEntry } from '$lib/types/database-design.js';
	import type {
		ColumnStandardRecommendationField,
		ColumnStandardRecommendationPreview
	} from '$lib/types/column-standard-recommendation.js';
	import { showConfirm } from '$lib/stores/confirm-store';
	import { debounce } from '$lib/utils/debounce';
	import { generateUuid } from '$lib/utils/uuid';

	let props = $props<{
		entry?: Partial<ColumnEntry>;
		isEditMode?: boolean;
		serverError?: string;
		filename?: string;
	}>();
	const dispatch = createEventDispatcher<{
		save: ColumnEntry;
		delete: ColumnEntry;
		cancel: void;
	}>();

	let entry = $derived(props.entry ?? {});
	let isEditMode = $derived(props.isEditMode ?? false);
	let serverError = $derived(props.serverError ?? '');
	let filename = $derived(props.filename ?? 'column.json');

	let formData = $state({
		scopeFlag: '',
		subjectArea: '',
		schemaName: '',
		tableEnglishName: '',
		columnEnglishName: '',
		columnKoreanName: '',
		columnDescription: '',
		relatedEntityName: '',
		domainName: '',
		dataType: '',
		dataLength: '',
		dataDecimalLength: '',
		dataFormat: '',
		notNullFlag: '',
		pkInfo: '',
		fkInfo: '',
		indexName: '',
		indexOrder: '',
		akInfo: '',
		constraint: '',
		personalInfoFlag: '',
		encryptionFlag: '',
		publicFlag: ''
	});

	let errors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);
	let standardRecommendation = $state<ColumnStandardRecommendationPreview | null>(null);
	let recommendationLoading = $state(false);
	let recommendationError = $state('');
	let recommendationRequestToken = 0;

	const recommendationFieldLabels: Record<ColumnStandardRecommendationField, string> = {
		columnKoreanName: '컬럼한글명',
		domainName: '도메인명',
		dataType: '자료타입',
		dataLength: '자료길이',
		dataDecimalLength: '소수점길이'
	};

	$effect(() => {
		formData.scopeFlag = entry.scopeFlag || '';
		formData.subjectArea = entry.subjectArea || '';
		formData.schemaName = entry.schemaName || '';
		formData.tableEnglishName = entry.tableEnglishName || '';
		formData.columnEnglishName = entry.columnEnglishName || '';
		formData.columnKoreanName = entry.columnKoreanName || '';
		formData.columnDescription = entry.columnDescription || '';
		formData.relatedEntityName = entry.relatedEntityName || '';
		formData.domainName = entry.domainName || '';
		formData.dataType = entry.dataType || '';
		formData.dataLength = entry.dataLength || '';
		formData.dataDecimalLength = entry.dataDecimalLength || '';
		formData.dataFormat = entry.dataFormat || '';
		formData.notNullFlag = entry.notNullFlag || '';
		formData.pkInfo = entry.pkInfo || '';
		formData.fkInfo = entry.fkInfo || '';
		formData.indexName = entry.indexName || '';
		formData.indexOrder = entry.indexOrder || '';
		formData.akInfo = entry.akInfo || '';
		formData.constraint = entry.constraint || '';
		formData.personalInfoFlag = entry.personalInfoFlag || '';
		formData.encryptionFlag = entry.encryptionFlag || '';
		formData.publicFlag = entry.publicFlag || '';
	});

	const debouncedLoadStandardRecommendation = debounce(() => {
		void loadStandardRecommendation();
	}, 300);

	$effect(() => {
		void filename;
		void formData.columnEnglishName;
		void formData.columnKoreanName;
		void formData.domainName;
		void formData.dataType;
		void formData.dataLength;
		void formData.dataDecimalLength;

		if (!formData.columnEnglishName.trim()) {
			standardRecommendation = null;
			recommendationError = '';
			return;
		}

		debouncedLoadStandardRecommendation();
	});

	function validate(): boolean {
		const newErrors: Record<string, string> = {};
		if (!formData.scopeFlag?.trim()) newErrors.scopeFlag = '사업범위여부는 필수입니다.';
		if (!formData.subjectArea?.trim()) newErrors.subjectArea = '주제영역은 필수입니다.';
		if (!formData.schemaName?.trim()) newErrors.schemaName = '스키마명은 필수입니다.';
		if (!formData.tableEnglishName?.trim())
			newErrors.tableEnglishName = '테이블영문명은 필수입니다.';
		if (!formData.columnEnglishName?.trim())
			newErrors.columnEnglishName = '컬럼영문명은 필수입니다.';
		if (!formData.columnKoreanName?.trim()) newErrors.columnKoreanName = '컬럼한글명은 필수입니다.';
		if (!formData.relatedEntityName?.trim())
			newErrors.relatedEntityName = '연관엔터티명은 필수입니다.';
		if (!formData.domainName?.trim()) newErrors.domainName = '도메인명은 필수입니다.';
		if (!formData.dataType?.trim()) newErrors.dataType = '자료타입은 필수입니다.';
		if (!formData.notNullFlag?.trim()) newErrors.notNullFlag = 'NOTNULL여부는 필수입니다.';
		if (!formData.personalInfoFlag?.trim())
			newErrors.personalInfoFlag = '개인정보여부는 필수입니다.';
		if (!formData.encryptionFlag?.trim()) newErrors.encryptionFlag = '암호화여부는 필수입니다.';
		if (!formData.publicFlag?.trim()) newErrors.publicFlag = '공개/비공개여부는 필수입니다.';
		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	function getRecommendationStatusLabel(status?: ColumnStandardRecommendationPreview['summary']['status']) {
		if (status === 'aligned') return '표준 일치';
		if (status === 'recommended') return '추천값 있음';
		return '매핑 없음';
	}

	function getRecommendationStatusClass(status?: ColumnStandardRecommendationPreview['summary']['status']) {
		if (status === 'aligned') {
			return 'border-emerald-200 bg-emerald-50 text-emerald-700';
		}
		if (status === 'recommended') {
			return 'border-amber-200 bg-amber-50 text-amber-800';
		}
		return 'border-rose-200 bg-rose-50 text-rose-700';
	}

	function formatRecommendationValue(value?: string) {
		return value?.trim() ? value : '(비어 있음)';
	}

	function buildRecommendationEntry(): Partial<ColumnEntry> {
		return {
			id: entry.id || '',
			columnEnglishName: formData.columnEnglishName.trim(),
			columnKoreanName: formData.columnKoreanName.trim(),
			domainName: formData.domainName.trim(),
			dataType: formData.dataType.trim(),
			dataLength: formData.dataLength.trim(),
			dataDecimalLength: formData.dataDecimalLength.trim()
		};
	}

	async function loadStandardRecommendation() {
		const requestToken = ++recommendationRequestToken;
		recommendationLoading = true;
		recommendationError = '';

		try {
			const response = await fetch('/api/column/recommend-standard', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					columnFilename: filename,
					entry: buildRecommendationEntry()
				})
			});
			const result = await response.json();

			if (requestToken !== recommendationRequestToken) {
				return null;
			}

			if (!response.ok || !result.success || !result.data) {
				throw new Error(result.error || '컬럼 표준 추천을 불러오지 못했습니다.');
			}

			standardRecommendation = result.data as ColumnStandardRecommendationPreview;
			return standardRecommendation;
		} catch (error) {
			if (requestToken !== recommendationRequestToken) {
				return null;
			}

			console.warn('컬럼 표준 추천 로드 실패:', error);
			standardRecommendation = null;
			recommendationError =
				error instanceof Error ? error.message : '컬럼 표준 추천을 불러오지 못했습니다.';
			return null;
		} finally {
			if (requestToken === recommendationRequestToken) {
				recommendationLoading = false;
			}
		}
	}

	function applyRecommendedField(field: ColumnStandardRecommendationField, value: string) {
		if (field === 'columnKoreanName') formData.columnKoreanName = value;
		if (field === 'domainName') formData.domainName = value;
		if (field === 'dataType') formData.dataType = value;
		if (field === 'dataLength') formData.dataLength = value;
		if (field === 'dataDecimalLength') formData.dataDecimalLength = value;
	}

	function applyAllRecommendedValues() {
		if (!standardRecommendation) return;

		for (const change of standardRecommendation.changes) {
			applyRecommendedField(change.field, change.recommendedValue);
		}
	}

	function handleSave() {
		if (!validate()) return;
		const saveData: ColumnEntry = {
			id: entry.id || generateUuid(),
			scopeFlag: formData.scopeFlag.trim(),
			subjectArea: formData.subjectArea.trim(),
			schemaName: formData.schemaName.trim(),
			tableEnglishName: formData.tableEnglishName.trim(),
			columnEnglishName: formData.columnEnglishName.trim(),
			columnKoreanName: formData.columnKoreanName.trim(),
			relatedEntityName: formData.relatedEntityName.trim(),
			domainName: formData.domainName.trim(),
			dataType: formData.dataType.trim(),
			notNullFlag: formData.notNullFlag.trim(),
			personalInfoFlag: formData.personalInfoFlag.trim(),
			encryptionFlag: formData.encryptionFlag.trim(),
			publicFlag: formData.publicFlag.trim(),
			columnDescription: formData.columnDescription.trim() || undefined,
			dataLength: formData.dataLength.trim(),
			dataDecimalLength: formData.dataDecimalLength.trim(),
			dataFormat: formData.dataFormat.trim(),
			pkInfo: formData.pkInfo.trim(),
			fkInfo: formData.fkInfo.trim() || undefined,
			indexName: formData.indexName.trim(),
			indexOrder: formData.indexOrder.trim(),
			akInfo: formData.akInfo.trim(),
			constraint: formData.constraint.trim(),
			createdAt: entry.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
		dispatch('save', saveData);
	}

	async function handleDelete() {
		if (!entry.id) return;
		const confirmed = await showConfirm({ title: '삭제 확인', message: '정말로 이 항목을 삭제하시겠습니까?', confirmText: '삭제', variant: 'danger' });
		if (confirmed) {
			const entryToDelete: ColumnEntry = {
				id: entry.id,
				dataLength: formData.dataLength.trim() || entry.dataLength || '',
				dataDecimalLength: formData.dataDecimalLength.trim() || entry.dataDecimalLength || '',
				dataFormat: formData.dataFormat.trim() || entry.dataFormat || '',
				pkInfo: formData.pkInfo.trim() || entry.pkInfo || '',
				indexName: formData.indexName.trim() || entry.indexName || '',
				indexOrder: formData.indexOrder.trim() || entry.indexOrder || '',
				akInfo: formData.akInfo.trim() || entry.akInfo || '',
				constraint: formData.constraint.trim() || entry.constraint || '',
				scopeFlag: formData.scopeFlag.trim() || entry.scopeFlag || undefined,
				subjectArea: formData.subjectArea.trim() || entry.subjectArea || undefined,
				schemaName: formData.schemaName.trim() || entry.schemaName || undefined,
				tableEnglishName: formData.tableEnglishName.trim() || entry.tableEnglishName || undefined,
				columnEnglishName:
					formData.columnEnglishName.trim() || entry.columnEnglishName || undefined,
				columnKoreanName: formData.columnKoreanName.trim() || entry.columnKoreanName || undefined,
				columnDescription:
					formData.columnDescription.trim() || entry.columnDescription || undefined,
				relatedEntityName:
					formData.relatedEntityName.trim() || entry.relatedEntityName || undefined,
				domainName: formData.domainName.trim() || entry.domainName || undefined,
				dataType: formData.dataType.trim() || entry.dataType || undefined,
				notNullFlag: formData.notNullFlag.trim() || entry.notNullFlag || undefined,
				fkInfo: formData.fkInfo.trim() || entry.fkInfo || undefined,
				personalInfoFlag: formData.personalInfoFlag.trim() || entry.personalInfoFlag || undefined,
				encryptionFlag: formData.encryptionFlag.trim() || entry.encryptionFlag || undefined,
				publicFlag: formData.publicFlag.trim() || entry.publicFlag || undefined,
				createdAt: entry.createdAt || '',
				updatedAt: entry.updatedAt || ''
			};
			dispatch('delete', entryToDelete);
		}
	}
	function handleCancel() {
		dispatch('cancel');
	}
	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) handleCancel();
	}
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') handleCancel();
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
	onclick={handleBackdropClick}
	onkeydown={handleKeydown}
	role="dialog"
	aria-modal="true"
	aria-labelledby="modal-title"
	tabindex="-1"
>
	<div class="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl">
		<div class="flex flex-shrink-0 items-center justify-between border-b p-6">
			<h2 id="modal-title" class="text-xl font-bold text-gray-900">
				{isEditMode ? '컬럼 정의서 수정' : '새 컬럼 정의서'}
			</h2>
			<button onclick={handleCancel} class="text-gray-600 hover:text-gray-600" aria-label="닫기"
				><svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/></svg
				></button
			>
		</div>

		<div class="flex-1 overflow-y-auto p-6">
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSave();
				}}
			>
				{#if serverError}<div class="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
						<p class="text-sm">{serverError}</p>
					</div>{/if}

				<div class="space-y-4">
					<div>
						<label for="scopeFlag" class="mb-1 block text-sm font-medium text-gray-700"
							>사업범위여부 <span class="text-red-500">*</span></label
						><select
							id="scopeFlag"
							bind:value={formData.scopeFlag}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.scopeFlag
								? 'border-red-500'
								: 'border-gray-300'}"
							><option value="">선택</option><option value="Y">Y</option><option value="N">N</option
							></select
						>{#if errors.scopeFlag}<p class="mt-1 text-xs text-red-500">{errors.scopeFlag}</p>{/if}
					</div>
					<div>
						<label for="subjectArea" class="mb-1 block text-sm font-medium text-gray-700"
							>주제영역 <span class="text-red-500">*</span></label
						><input
							id="subjectArea"
							type="text"
							bind:value={formData.subjectArea}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.subjectArea
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="주제영역"
						/>{#if errors.subjectArea}<p class="mt-1 text-xs text-red-500">
								{errors.subjectArea}
							</p>{/if}
					</div>
					<div>
						<label for="schemaName" class="mb-1 block text-sm font-medium text-gray-700"
							>스키마명 <span class="text-red-500">*</span></label
						><input
							id="schemaName"
							type="text"
							bind:value={formData.schemaName}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.schemaName
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="스키마명"
						/>{#if errors.schemaName}<p class="mt-1 text-xs text-red-500">
								{errors.schemaName}
							</p>{/if}
					</div>
					<div>
						<label for="tableEnglishName" class="mb-1 block text-sm font-medium text-gray-700"
							>테이블영문명 <span class="text-red-500">*</span></label
						><input
							id="tableEnglishName"
							type="text"
							bind:value={formData.tableEnglishName}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.tableEnglishName
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="테이블영문명"
						/>{#if errors.tableEnglishName}<p class="mt-1 text-xs text-red-500">
								{errors.tableEnglishName}
							</p>{/if}
					</div>
					<div>
						<label for="columnEnglishName" class="mb-1 block text-sm font-medium text-gray-700"
							>컬럼영문명 <span class="text-red-500">*</span></label
						><input
							id="columnEnglishName"
							type="text"
							bind:value={formData.columnEnglishName}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.columnEnglishName
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="컬럼영문명"
						/>{#if errors.columnEnglishName}<p class="mt-1 text-xs text-red-500">
								{errors.columnEnglishName}
							</p>{/if}
					</div>
					<div
						class="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
						role="region"
						aria-label="컬럼 표준 추천"
					>
						<div class="mb-3 flex items-start justify-between gap-3">
							<div>
								<div class="flex flex-wrap items-center gap-2">
									<h3 class="text-sm font-semibold text-slate-900">표준 추천</h3>
									<span
										class="rounded-full border px-2.5 py-1 text-[11px] font-medium {getRecommendationStatusClass(standardRecommendation?.summary.status)}"
									>
										{getRecommendationStatusLabel(standardRecommendation?.summary.status)}
									</span>
								</div>
								<p class="mt-1 text-xs text-slate-600">
									컬럼영문명 기준으로 연결된 term/domain을 찾아 저장 전에 보정 후보를 보여줍니다.
								</p>
							</div>
							<button
								type="button"
								class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={recommendationLoading || !formData.columnEnglishName.trim()}
								onclick={() => void loadStandardRecommendation()}
							>
								{recommendationLoading ? '계산 중...' : '다시 추천'}
							</button>
						</div>

						{#if recommendationLoading}
							<p class="text-xs text-slate-600">연결된 표준 용어와 도메인을 조회하는 중입니다.</p>
						{:else if standardRecommendation}
							<div class="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
								<div class="rounded-lg border border-white/70 bg-white px-3 py-2">
									<div class="text-slate-500">용어 매핑</div>
									<div class="mt-1 text-base font-semibold text-slate-900">
										{standardRecommendation.summary.exactTermMatch ? '연결됨' : '없음'}
									</div>
								</div>
								<div class="rounded-lg border border-white/70 bg-white px-3 py-2">
									<div class="text-slate-500">도메인 해석</div>
									<div
										class="mt-1 text-base font-semibold {standardRecommendation.summary.domainResolved
											? 'text-emerald-700'
											: 'text-amber-700'}"
									>
										{standardRecommendation.summary.domainResolved ? '정상' : '확인 필요'}
									</div>
								</div>
								<div class="rounded-lg border border-white/70 bg-white px-3 py-2">
									<div class="text-slate-500">추천 변경</div>
									<div class="mt-1 text-base font-semibold text-slate-900">
										{standardRecommendation.summary.changeCount}
									</div>
								</div>
								<div class="rounded-lg border border-white/70 bg-white px-3 py-2">
									<div class="text-slate-500">경고</div>
									<div class="mt-1 text-base font-semibold text-slate-900">
										{standardRecommendation.summary.issueCount}
									</div>
								</div>
							</div>

							<div class="mt-3 grid gap-2 sm:grid-cols-2">
								<div class="rounded-lg border border-white/70 bg-white px-3 py-2 text-xs">
									<div class="font-medium text-slate-800">매핑된 용어</div>
									<div class="mt-2 text-slate-700">
										{#if standardRecommendation.matchedTerm}
											<p>{standardRecommendation.matchedTerm.termName || '(용어명 없음)'}</p>
											<p class="mt-1 text-slate-500">
												컬럼명: {standardRecommendation.matchedTerm.columnName}
											</p>
										{:else}
											<p class="text-rose-700">일치하는 term.columnName이 없습니다.</p>
										{/if}
									</div>
								</div>
								<div class="rounded-lg border border-white/70 bg-white px-3 py-2 text-xs">
									<div class="font-medium text-slate-800">매핑된 도메인</div>
									<div class="mt-2 text-slate-700">
										{#if standardRecommendation.matchedDomain}
											<p>{standardRecommendation.matchedDomain.standardDomainName}</p>
											<p class="mt-1 text-slate-500">
												{standardRecommendation.matchedDomain.physicalDataType || '-'}
												{#if standardRecommendation.matchedDomain.dataLength}
													({standardRecommendation.matchedDomain.dataLength}{#if standardRecommendation.matchedDomain.decimalPlaces}, {standardRecommendation.matchedDomain.decimalPlaces}{/if})
												{/if}
											</p>
										{:else if standardRecommendation.matchedTerm?.domainName}
											<p class="text-amber-700">
												{standardRecommendation.matchedTerm.domainName} 도메인을 찾지 못했습니다.
											</p>
										{:else}
											<p class="text-amber-700">용어에 연결된 도메인 정보가 없습니다.</p>
										{/if}
									</div>
								</div>
							</div>

							{#if standardRecommendation.issues.length > 0}
								<div class="mt-3 space-y-2">
									{#each standardRecommendation.issues as issue (issue.code)}
										<div
											class="rounded-lg border px-3 py-2 text-xs {issue.severity === 'error'
												? 'border-rose-200 bg-rose-50 text-rose-700'
												: 'border-amber-200 bg-amber-50 text-amber-800'}"
										>
											{issue.message}
										</div>
									{/each}
								</div>
							{/if}

							{#if standardRecommendation.changes.length > 0}
								<div class="mt-3 space-y-2">
									<div class="flex items-center justify-between gap-3">
										<div class="text-xs font-medium text-slate-700">
											적용 가능한 추천값
										</div>
										<button
											type="button"
											class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
											onclick={applyAllRecommendedValues}
										>
											추천값 전체 적용
										</button>
									</div>
									{#each standardRecommendation.changes as change (change.field)}
										<div class="rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs">
											<div class="flex items-start justify-between gap-3">
												<div class="min-w-0 flex-1">
													<div class="font-medium text-slate-800">
														{recommendationFieldLabels[change.field]}
													</div>
													<div class="mt-1 text-slate-500">
														현재: {formatRecommendationValue(change.currentValue)}
													</div>
													<div class="mt-1 font-medium text-slate-900">
														추천: {formatRecommendationValue(change.recommendedValue)}
													</div>
													<div class="mt-1 text-slate-500">{change.reason}</div>
												</div>
												<button
													type="button"
													class="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
													onclick={() =>
														applyRecommendedField(change.field, change.recommendedValue)}
												>
													적용
												</button>
											</div>
										</div>
									{/each}
								</div>
							{/if}

							<div class="mt-3 space-y-2">
								{#each standardRecommendation.guidance as guide (guide)}
									<div class="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-700">
										{guide}
									</div>
								{/each}
							</div>
						{:else if recommendationError}
							<p class="text-xs text-rose-700">{recommendationError}</p>
						{:else}
							<p class="text-xs text-slate-600">컬럼영문명을 입력하면 표준 추천을 계산합니다.</p>
						{/if}
					</div>
					<div>
						<label for="columnKoreanName" class="mb-1 block text-sm font-medium text-gray-700"
							>컬럼한글명 <span class="text-red-500">*</span></label
						><input
							id="columnKoreanName"
							type="text"
							bind:value={formData.columnKoreanName}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.columnKoreanName
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="컬럼한글명"
						/>{#if errors.columnKoreanName}<p class="mt-1 text-xs text-red-500">
								{errors.columnKoreanName}
							</p>{/if}
					</div>
					<div>
						<label for="relatedEntityName" class="mb-1 block text-sm font-medium text-gray-700"
							>연관엔터티명 <span class="text-red-500">*</span></label
						><input
							id="relatedEntityName"
							type="text"
							bind:value={formData.relatedEntityName}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.relatedEntityName
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="연관엔터티명"
						/>{#if errors.relatedEntityName}<p class="mt-1 text-xs text-red-500">
								{errors.relatedEntityName}
							</p>{/if}
					</div>
					<div>
						<label for="domainName" class="mb-1 block text-sm font-medium text-gray-700"
							>도메인명 <span class="text-red-500">*</span></label
						><input
							id="domainName"
							type="text"
							bind:value={formData.domainName}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.domainName
								? 'border-red-500'
								: 'border-gray-300'}"
							placeholder="도메인명"
						/>{#if errors.domainName}<p class="mt-1 text-xs text-red-500">{errors.domainName}</p>{/if}
					</div>
					<div>
						<label for="dataType" class="mb-1 block text-sm font-medium text-gray-700"
							>자료타입 <span class="text-red-500">*</span></label
						><select
							id="dataType"
							bind:value={formData.dataType}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.dataType
								? 'border-red-500'
								: 'border-gray-300'}"
							><option value="">선택</option><option value="VARCHAR">VARCHAR</option><option
								value="NUMBER">NUMBER</option
							><option value="DATE">DATE</option><option value="CHAR">CHAR</option><option
								value="CLOB">CLOB</option
							><option value="BLOB">BLOB</option></select
						>{#if errors.dataType}<p class="mt-1 text-xs text-red-500">{errors.dataType}</p>{/if}
					</div>
					<div>
						<label for="dataLength" class="mb-1 block text-sm font-medium text-gray-700"
							>자료길이</label
						><input
							id="dataLength"
							type="text"
							bind:value={formData.dataLength}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="자료길이"
						/>
					</div>
					<div>
						<label for="dataDecimalLength" class="mb-1 block text-sm font-medium text-gray-700"
							>소수점길이</label
						><input
							id="dataDecimalLength"
							type="text"
							bind:value={formData.dataDecimalLength}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="소수점길이"
						/>
					</div>
					<div>
						<label for="dataFormat" class="mb-1 block text-sm font-medium text-gray-700"
							>자료형식</label
						><input
							id="dataFormat"
							type="text"
							bind:value={formData.dataFormat}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="자료형식"
						/>
					</div>
					<div>
						<label for="notNullFlag" class="mb-1 block text-sm font-medium text-gray-700"
							>NOT NULL <span class="text-red-500">*</span></label
						><select
							id="notNullFlag"
							bind:value={formData.notNullFlag}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.notNullFlag
								? 'border-red-500'
								: 'border-gray-300'}"
							><option value="">선택</option><option value="Y">Y</option><option value="N">N</option
							></select
						>{#if errors.notNullFlag}<p class="mt-1 text-xs text-red-500">
								{errors.notNullFlag}
							</p>{/if}
					</div>
					<div>
						<label for="pkInfo" class="mb-1 block text-sm font-medium text-gray-700">PK정보</label
						><input
							id="pkInfo"
							type="text"
							bind:value={formData.pkInfo}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="PK정보"
						/>
					</div>
					<div>
						<label for="fkInfo" class="mb-1 block text-sm font-medium text-gray-700">FK정보</label
						><input
							id="fkInfo"
							type="text"
							bind:value={formData.fkInfo}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="FK정보"
						/>
					</div>
					<div>
						<label for="indexName" class="mb-1 block text-sm font-medium text-gray-700"
							>인덱스명</label
						><input
							id="indexName"
							type="text"
							bind:value={formData.indexName}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="인덱스명"
						/>
					</div>
					<div>
						<label for="indexOrder" class="mb-1 block text-sm font-medium text-gray-700"
							>인덱스순번</label
						><input
							id="indexOrder"
							type="text"
							bind:value={formData.indexOrder}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="인덱스순번"
						/>
					</div>
					<div>
						<label for="akInfo" class="mb-1 block text-sm font-medium text-gray-700">AK정보</label
						><input
							id="akInfo"
							type="text"
							bind:value={formData.akInfo}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="AK정보"
						/>
					</div>
					<div>
						<label for="constraint" class="mb-1 block text-sm font-medium text-gray-700"
							>제약조건</label
						><input
							id="constraint"
							type="text"
							bind:value={formData.constraint}
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="제약조건"
						/>
					</div>
					<div>
						<label for="personalInfoFlag" class="mb-1 block text-sm font-medium text-gray-700"
							>개인정보여부 <span class="text-red-500">*</span></label
						><select
							id="personalInfoFlag"
							bind:value={formData.personalInfoFlag}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.personalInfoFlag
								? 'border-red-500'
								: 'border-gray-300'}"
							><option value="">선택</option><option value="Y">Y</option><option value="N">N</option
							></select
						>{#if errors.personalInfoFlag}<p class="mt-1 text-xs text-red-500">
								{errors.personalInfoFlag}
							</p>{/if}
					</div>
					<div>
						<label for="encryptionFlag" class="mb-1 block text-sm font-medium text-gray-700"
							>암호화여부 <span class="text-red-500">*</span></label
						><select
							id="encryptionFlag"
							bind:value={formData.encryptionFlag}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.encryptionFlag
								? 'border-red-500'
								: 'border-gray-300'}"
							><option value="">선택</option><option value="Y">Y</option><option value="N">N</option
							></select
						>{#if errors.encryptionFlag}<p class="mt-1 text-xs text-red-500">
								{errors.encryptionFlag}
							</p>{/if}
					</div>
					<div>
						<label for="publicFlag" class="mb-1 block text-sm font-medium text-gray-700"
							>공개/비공개여부 <span class="text-red-500">*</span></label
						><select
							id="publicFlag"
							bind:value={formData.publicFlag}
							class="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.publicFlag
								? 'border-red-500'
								: 'border-gray-300'}"
							><option value="">선택</option><option value="Y">공개</option><option value="N"
								>비공개</option
							></select
						>{#if errors.publicFlag}<p class="mt-1 text-xs text-red-500">
								{errors.publicFlag}
							</p>{/if}
					</div>
					<div>
						<label for="columnDescription" class="mb-1 block text-sm font-medium text-gray-700"
							>컬럼설명</label
						><textarea
							id="columnDescription"
							bind:value={formData.columnDescription}
							rows="2"
							class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="컬럼설명 입력"
						></textarea>
					</div>
				</div>

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
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/></svg
							>
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
							disabled={isSubmitting}>취소</button
						>
						<button
							type="submit"
							class="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
							disabled={isSubmitting}
							>{#if isSubmitting}저장 중...{:else}{isEditMode ? '수정' : '저장'}{/if}</button
						>
					</div>
				</div>
			</form>
		</div>
	</div>
</div>
