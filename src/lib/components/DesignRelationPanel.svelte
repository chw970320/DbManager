<script lang="ts">
	import { onMount } from 'svelte';
	import type { DbDesignApiResponse } from '$lib/types/database-design.js';
	import type { DesignRelationValidationResult } from '$lib/types/design-relation.js';

	type DefinitionType = 'database' | 'entity' | 'attribute' | 'table' | 'column';

	type RelationValidationPayload = {
		files: Record<DefinitionType, string | null>;
		validation: DesignRelationValidationResult;
	};

	type RelationSyncPayload = {
		mode: 'preview' | 'apply';
		files: Record<DefinitionType, string | null>;
		counts: {
			tableCandidates: number;
			columnCandidates: number;
			totalCandidates: number;
			fieldChanges: number;
			attributeColumnSuggestions: number;
			appliedTableUpdates: number;
			appliedColumnUpdates: number;
			appliedTotalUpdates: number;
		};
		changes: Array<{
			targetType: 'table' | 'column';
			targetId: string;
			targetLabel: string;
			field: 'relatedEntityName' | 'schemaName' | 'tableEnglishName';
			before: string;
			after: string;
			reason: string;
		}>;
		suggestions: Array<{
			attributeId: string;
			attributeName: string;
			schemaName: string;
			entityName: string;
			candidates: Array<{
				columnId: string;
				columnLabel: string;
				schemaName?: string;
				tableEnglishName?: string;
				relatedEntityName?: string;
			}>;
		}>;
		validationBefore: DesignRelationValidationResult;
		validationAfter: DesignRelationValidationResult;
	};
	type UnifiedValidationPayload = {
		files: {
			term: string;
		} & Record<DefinitionType, string | null>;
		summary: {
			totalIssues: number;
			errorCount: number;
			autoFixableCount: number;
			warningCount: number;
			infoCount: number;
			termFailedCount: number;
			relationUnmatchedCount: number;
		};
		sections: {
			term: {
				totalCount: number;
				passedCount: number;
				failedCount: number;
			};
		};
	};
	type AlignmentSyncPayload = {
		mode: 'preview' | 'apply';
		applied: boolean;
		steps: {
			relation?: { data?: RelationSyncPayload };
			column?: { data?: { updated?: number } };
			validation?: { data?: UnifiedValidationPayload };
		};
		summary: {
			appliedRelationUpdates: number;
			appliedColumnUpdates: number;
			remainingTermFailed: number;
			relationUnmatchedCount: number;
			totalIssues: number;
		};
	};

	let {
		currentType,
		currentFilename,
		fileMapping,
		onApplied
	}: {
		currentType: DefinitionType;
		currentFilename: string;
		fileMapping?: Partial<Record<DefinitionType, string>>;
		onApplied?: () => void | Promise<void>;
	} = $props();

	let loading = $state(false);
	let syncing = $state(false);
	let error = $state<string | null>(null);
	let validationData = $state<RelationValidationPayload | null>(null);
	let unifiedValidationData = $state<UnifiedValidationPayload | null>(null);
	let syncData = $state<RelationSyncPayload | null>(null);
	let lastLoadedKey = $state('');
	let showSyncDetails = $state(false);

	const definitionLabels: Record<DefinitionType, string> = {
		database: 'DB',
		entity: 'Entity',
		attribute: 'Attribute',
		table: 'Table',
		column: 'Column'
	};
	const definitionTypes = Object.keys(definitionLabels) as DefinitionType[];

	function currentFileParamName(type: DefinitionType): `${DefinitionType}File` {
		if (type === 'database') return 'databaseFile';
		if (type === 'entity') return 'entityFile';
		if (type === 'attribute') return 'attributeFile';
		if (type === 'table') return 'tableFile';
		return 'columnFile';
	}

	function buildFileParams() {
		const params = new URLSearchParams();
		const selectedFiles: Partial<Record<DefinitionType, string>> = {};
		if (currentFilename?.trim()) {
			selectedFiles[currentType] = currentFilename.trim();
		}

		for (const type of definitionTypes) {
			if (type === currentType) continue;
			const mappedFile = fileMapping?.[type];
			if (mappedFile?.trim()) {
				selectedFiles[type] = mappedFile.trim();
			}
		}

		for (const type of definitionTypes) {
			const filename = selectedFiles[type];
			if (filename) {
				params.set(currentFileParamName(type), filename);
			}
		}

		return params;
	}

	async function loadValidation() {
		loading = true;
		error = null;

		try {
			const params = buildFileParams();
			const response = await fetch(`/api/erd/relations?${params.toString()}`);
			const result = (await response.json()) as DbDesignApiResponse<RelationValidationPayload>;

			if (!result.success || !result.data) {
				error = result.error || '연관관계 상태를 불러오지 못했습니다.';
				return;
			}

			validationData = result.data;
		} catch (err) {
			console.error('연관관계 상태 조회 오류:', err);
			error = err instanceof Error ? err.message : '연관관계 상태 조회 중 오류가 발생했습니다.';
		} finally {
			loading = false;
		}
	}

	async function loadUnifiedValidation() {
		loading = true;
		error = null;

		try {
			const params = buildFileParams();
			const response = await fetch(`/api/validation/report?${params.toString()}`);
			const result = (await response.json()) as DbDesignApiResponse<UnifiedValidationPayload>;

			if (!result.success || !result.data) {
				error = result.error || '통합 정합성 상태를 불러오지 못했습니다.';
				return;
			}

			unifiedValidationData = result.data;
		} catch (err) {
			console.error('통합 정합성 상태 조회 오류:', err);
			error = err instanceof Error ? err.message : '통합 정합성 상태 조회 중 오류가 발생했습니다.';
		} finally {
			loading = false;
		}
	}

	async function loadAllValidations() {
		loading = true;
		error = null;
		try {
			await Promise.all([loadValidation(), loadUnifiedValidation()]);
		} finally {
			loading = false;
		}
	}

	async function runSync(apply: boolean) {
		syncing = true;
		error = null;
		try {
			const body: Record<string, string | boolean> = { apply };
			const params = buildFileParams();
			for (const type of definitionTypes) {
				const paramName = currentFileParamName(type);
				const filename = params.get(paramName);
				if (filename) {
					body[paramName] = filename;
				}
			}

			const response = await fetch('/api/erd/relations/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const result = (await response.json()) as DbDesignApiResponse<RelationSyncPayload>;

			if (!result.success || !result.data) {
				error = result.error || '관계 동기화 실행에 실패했습니다.';
				return;
			}

			syncData = result.data;
			showSyncDetails = false;
			validationData = {
				files: result.data.files,
				validation: result.data.validationAfter
			};

			if (apply && result.data.counts.appliedTotalUpdates > 0 && onApplied) {
				await onApplied();
			}
		} catch (err) {
			console.error('관계 동기화 오류:', err);
			error = err instanceof Error ? err.message : '관계 동기화 중 오류가 발생했습니다.';
		} finally {
			syncing = false;
		}
	}

	async function runStandardAlignment() {
		syncing = true;
		error = null;
		try {
			const body: Record<string, string | boolean> = { apply: true };
			const params = buildFileParams();
			for (const type of definitionTypes) {
				const paramName = currentFileParamName(type);
				const filename = params.get(paramName);
				if (filename) {
					body[paramName] = filename;
				}
			}

			const response = await fetch('/api/alignment/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const result = (await response.json()) as DbDesignApiResponse<AlignmentSyncPayload>;
			if (!result.success || !result.data) {
				error = result.error || '표준 순서 실행에 실패했습니다.';
				return;
			}

			if (result.data.steps.relation?.data) {
				syncData = result.data.steps.relation.data;
				validationData = {
					files: result.data.steps.relation.data.files,
					validation: result.data.steps.relation.data.validationAfter
				};
			}

			if (result.data.steps.validation?.data) {
				unifiedValidationData = result.data.steps.validation.data;
			} else {
				await loadUnifiedValidation();
			}

			showSyncDetails = false;
			if (onApplied) {
				await onApplied();
			}
		} catch (err) {
			console.error('표준 순서 실행 오류:', err);
			error = err instanceof Error ? err.message : '표준 순서 실행 중 오류가 발생했습니다.';
		} finally {
			syncing = false;
		}
	}

	onMount(async () => {
		const mappingKey = definitionTypes.map((type) => `${type}:${fileMapping?.[type] || ''}`).join('|');
		lastLoadedKey = `${currentType}:${currentFilename}:${mappingKey}`;
		await loadAllValidations();
	});

	$effect(() => {
		const mappingKey = definitionTypes.map((type) => `${type}:${fileMapping?.[type] || ''}`).join('|');
		const nextKey = `${currentType}:${currentFilename}:${mappingKey}`;
		if (nextKey === lastLoadedKey) return;
		lastLoadedKey = nextKey;
		syncData = null;
		showSyncDetails = false;
		void loadAllValidations();
	});
</script>

<section class="mb-8 rounded-2xl border border-amber-200/70 bg-amber-50/90 p-4 shadow-sm backdrop-blur-sm">
	<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
		<div>
			<h2 class="text-lg font-semibold text-amber-800">5개 정의서 연관 상태</h2>
			<p class="text-xs text-amber-700">현재 파일 기준으로 연관 파일/정합성/자동보정을 확인합니다.</p>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={loadAllValidations}
				disabled={loading || syncing}
				class="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{loading ? '조회 중...' : '정합성 조회'}
			</button>
			<button
				type="button"
				onclick={runStandardAlignment}
				disabled={loading || syncing}
				class="rounded-md border border-indigo-300 bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{syncing ? '실행 중...' : '표준 순서 실행'}
			</button>
			<button
				type="button"
				onclick={() => runSync(false)}
				disabled={loading || syncing}
				class="rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
			>
				보정 미리보기
			</button>
			<button
				type="button"
				onclick={() => runSync(true)}
				disabled={loading || syncing}
				class="rounded-md border border-blue-400 bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{syncing ? '실행 중...' : '자동 보정 실행'}
			</button>
		</div>
	</div>

	{#if validationData}
		<div class="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
			{#each (Object.keys(definitionLabels) as DefinitionType[]) as type (type)}
				<div class="rounded border border-amber-200 bg-white px-2 py-1">
					<div class="text-[11px] font-semibold {type === currentType ? 'text-blue-700' : 'text-amber-700'}">
						{definitionLabels[type]}
					</div>
					<div class="truncate text-[11px] text-gray-700" title={validationData.files[type] || '-'}>
						{validationData.files[type] || '-'}
					</div>
				</div>
			{/each}
		</div>

		<div class="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
			<div class="rounded border border-green-200 bg-white p-2 text-center">
				<div class="font-semibold text-green-700">{validationData.validation.totals.matched}</div>
				<div class="text-green-600">매칭</div>
			</div>
			<div class="rounded border border-red-200 bg-white p-2 text-center">
				<div class="font-semibold text-red-700">{validationData.validation.totals.errorCount}</div>
				<div class="text-red-600">오류</div>
			</div>
			<div class="rounded border border-yellow-200 bg-white p-2 text-center">
				<div class="font-semibold text-yellow-700">{validationData.validation.totals.warningCount}</div>
				<div class="text-yellow-600">경고</div>
			</div>
			<div class="rounded border border-gray-200 bg-white p-2 text-center">
				<div class="font-semibold text-gray-700">{validationData.validation.totals.unmatched}</div>
				<div class="text-gray-600">미매칭</div>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
			{#each validationData.validation.summaries as summary (summary.relationId)}
				<div class="flex items-center justify-between rounded border border-amber-100 bg-white px-2 py-1">
					<span class="truncate text-gray-700">{summary.relationName}</span>
					<span class={summary.severity === 'error' ? 'font-semibold text-red-700' : 'font-semibold text-yellow-700'}>
						{summary.unmatched}
					</span>
				</div>
			{/each}
		</div>
	{/if}

	{#if unifiedValidationData}
		<div class="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
			<div class="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
				통합 정합성 요약
			</div>
			<div class="mb-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
				<div class="rounded border border-amber-200 bg-white p-2 text-center">
					<div class="font-semibold text-amber-700">
						{unifiedValidationData.summary.relationUnmatchedCount}
					</div>
					<div class="text-amber-600">관계 미매칭</div>
				</div>
				<div class="rounded border border-rose-200 bg-white p-2 text-center">
					<div class="font-semibold text-rose-700">
						{unifiedValidationData.summary.termFailedCount}
					</div>
					<div class="text-rose-600">용어계 실패</div>
				</div>
				<div class="rounded border border-green-200 bg-white p-2 text-center">
					<div class="font-semibold text-green-700">
						{unifiedValidationData.sections.term.passedCount}
					</div>
					<div class="text-green-600">용어계 통과</div>
				</div>
				<div class="rounded border border-gray-200 bg-white p-2 text-center">
					<div class="font-semibold text-gray-700">{unifiedValidationData.summary.totalIssues}</div>
					<div class="text-gray-600">통합 이슈</div>
				</div>
			</div>
			<div class="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
				<div class="rounded border border-red-200 bg-white p-1 text-center text-red-700">
					Error {unifiedValidationData.summary.errorCount}
				</div>
				<div class="rounded border border-yellow-200 bg-white p-1 text-center text-yellow-700">
					Auto-fixable {unifiedValidationData.summary.autoFixableCount}
				</div>
				<div class="rounded border border-amber-200 bg-white p-1 text-center text-amber-700">
					Warning {unifiedValidationData.summary.warningCount}
				</div>
				<div class="rounded border border-slate-200 bg-white p-1 text-center text-slate-700">
					Info {unifiedValidationData.summary.infoCount}
				</div>
			</div>
		</div>
	{/if}

	{#if syncData}
		<div class="mt-3 rounded-lg border border-blue-200 bg-white p-3 text-xs">
			<div class="mb-1 flex items-center justify-between">
				<div class="font-semibold text-blue-700">
					최근 동기화 결과 ({syncData.mode === 'apply' ? '실행' : '미리보기'})
				</div>
				<button
					type="button"
					onclick={() => (showSyncDetails = !showSyncDetails)}
					class="rounded border border-blue-200 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50"
				>
					{showSyncDetails ? '상세 숨기기' : '상세 보기'}
				</button>
			</div>
			<div class="grid grid-cols-2 gap-1 text-gray-700 sm:grid-cols-4">
				<div>테이블 후보: {syncData.counts.tableCandidates}</div>
				<div>컬럼 후보: {syncData.counts.columnCandidates}</div>
				<div>추천 후보: {syncData.counts.attributeColumnSuggestions}</div>
				<div>실제 반영: {syncData.counts.appliedTotalUpdates}</div>
			</div>
			<div class="mt-1 text-gray-600">
				정합성 변화: {syncData.validationBefore.totals.unmatched} -> {syncData.validationAfter.totals.unmatched}
			</div>

			{#if showSyncDetails}
				<div class="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
					<div class="rounded border border-blue-100 bg-blue-50/40 p-2">
						<div class="mb-1 font-semibold text-blue-800">
							변경 후보 ({Math.min(syncData.changes.length, 15)} / {syncData.changes.length})
						</div>
						<div class="max-h-48 space-y-1 overflow-y-auto pr-1">
							{#each syncData.changes.slice(0, 15) as change (change.targetId + change.field)}
								<div class="rounded border border-blue-100 bg-white px-2 py-1 text-[11px] text-gray-700">
									<div class="font-medium text-blue-700">
										{change.targetType.toUpperCase()} · {change.targetLabel}
									</div>
									<div>{change.field}: "{change.before || '-'}" -> "{change.after || '-'}"</div>
								</div>
							{/each}
							{#if syncData.changes.length === 0}
								<div class="text-[11px] text-gray-500">변경 후보가 없습니다.</div>
							{/if}
						</div>
					</div>

					<div class="rounded border border-indigo-100 bg-indigo-50/40 p-2">
						<div class="mb-1 font-semibold text-indigo-800">
							속성-컬럼 추천 ({Math.min(syncData.suggestions.length, 10)} / {syncData.suggestions.length})
						</div>
						<div class="max-h-48 space-y-1 overflow-y-auto pr-1">
							{#each syncData.suggestions.slice(0, 10) as suggestion (suggestion.attributeId)}
								<div class="rounded border border-indigo-100 bg-white px-2 py-1 text-[11px] text-gray-700">
									<div class="font-medium text-indigo-700">
										{suggestion.attributeName} ({suggestion.schemaName}.{suggestion.entityName})
									</div>
									<div class="truncate">
										후보: {suggestion.candidates.map((c) => c.columnLabel).join(', ')}
									</div>
								</div>
							{/each}
							{#if syncData.suggestions.length === 0}
								<div class="text-[11px] text-gray-500">추천 후보가 없습니다.</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	{#if error}
		<div class="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
			{error}
		</div>
	{/if}
</section>
