<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type {
		QualityRuleEntry,
		QualityRuleInput,
		QualityRuleMetric,
		QualityRuleScope
	} from '$lib/types/data-quality-rule.js';
	import { QUALITY_RULE_METRICS_BY_SCOPE } from '$lib/types/data-quality-rule.js';

	export type QualityRuleEditorSubmitDetail = QualityRuleInput & {
		id?: string;
	};

	interface Props {
		isOpen?: boolean;
		entry?: QualityRuleEntry | null;
		isSubmitting?: boolean;
		serverError?: string;
	}

	let { isOpen = false, entry = null, isSubmitting = false, serverError = '' }: Props = $props();

	const dispatch = createEventDispatcher<{
		save: QualityRuleEditorSubmitDetail;
		close: void;
	}>();

	const severityOptions = [
		{ value: 'error', label: 'error' },
		{ value: 'warning', label: 'warning' },
		{ value: 'info', label: 'info' }
	] as const;

	const scopeOptions = [
		{ value: 'column', label: 'column' },
		{ value: 'table', label: 'table' }
	] as const;

	const metricOptions = {
		column: [
			{ value: 'nullRatio', label: 'nullRatio' },
			{ value: 'nullCount', label: 'nullCount' },
			{ value: 'distinctRatio', label: 'distinctRatio' },
			{ value: 'distinctCount', label: 'distinctCount' },
			{ value: 'minLength', label: 'minLength' },
			{ value: 'maxLength', label: 'maxLength' }
		],
		table: [{ value: 'rowCount', label: 'rowCount' }]
	} as const;

	const operatorOptions = [
		{ value: 'lte', label: 'lte' },
		{ value: 'gte', label: 'gte' },
		{ value: 'eq', label: 'eq' }
	] as const;

	let hydrationKey = $state('');
	let validationError = $state('');
	let formData = $state({
		name: '',
		description: '',
		enabled: true,
		severity: 'warning',
		scope: 'column' as QualityRuleScope,
		metric: 'nullRatio' as QualityRuleMetric,
		operator: 'lte',
		threshold: 0.05,
		schemaPattern: '',
		tablePattern: '',
		columnPattern: ''
	});

	const isEditMode = $derived(Boolean(entry?.id));
	const availableMetrics = $derived(metricOptions[formData.scope]);

	function hydrateForm() {
		formData.name = entry?.name ?? '';
		formData.description = entry?.description ?? '';
		formData.enabled = entry?.enabled ?? true;
		formData.severity = entry?.severity ?? 'warning';
		formData.scope = entry?.scope ?? 'column';
		formData.metric = entry?.metric ?? (formData.scope === 'table' ? 'rowCount' : 'nullRatio');
		formData.operator = entry?.operator ?? 'lte';
		formData.threshold = entry?.threshold ?? (formData.scope === 'table' ? 1 : 0.05);
		formData.schemaPattern = entry?.target.schemaPattern ?? '';
		formData.tablePattern = entry?.target.tablePattern ?? '';
		formData.columnPattern = entry?.target.columnPattern ?? '';
		validationError = '';
	}

	function buildPayload(): QualityRuleEditorSubmitDetail {
		return {
			id: entry?.id,
			name: formData.name.trim(),
			description: formData.description.trim(),
			enabled: formData.enabled,
			severity: formData.severity as QualityRuleInput['severity'],
			scope: formData.scope,
			metric: formData.metric,
			operator: formData.operator as QualityRuleInput['operator'],
			threshold: Number(formData.threshold),
			target: {
				schemaPattern: formData.schemaPattern.trim() || undefined,
				tablePattern: formData.tablePattern.trim() || undefined,
				columnPattern:
					formData.scope === 'column' ? formData.columnPattern.trim() || undefined : undefined
			}
		};
	}

	function validatePayload(): boolean {
		const payload = buildPayload();

		if (!payload.name) {
			validationError = '규칙 이름은 필수입니다.';
			return false;
		}

		if (!Number.isFinite(payload.threshold)) {
			validationError = '기준값은 숫자여야 합니다.';
			return false;
		}

		if (!QUALITY_RULE_METRICS_BY_SCOPE[payload.scope].includes(payload.metric)) {
			validationError = '선택한 범위에서 사용할 수 없는 메트릭입니다.';
			return false;
		}

		validationError = '';
		return true;
	}

	function handleSave() {
		if (!validatePayload()) {
			return;
		}

		dispatch('save', buildPayload());
	}

	function handleClose() {
		dispatch('close');
	}

	$effect(() => {
		if (!isOpen) {
			hydrationKey = '';
			validationError = '';
			return;
		}

		const nextKey = entry ? `${entry.id}:${entry.updatedAt}` : 'new';
		if (hydrationKey !== nextKey) {
			hydrationKey = nextKey;
			hydrateForm();
		}
	});

	$effect(() => {
		const allowedMetrics = QUALITY_RULE_METRICS_BY_SCOPE[formData.scope];
		if (!allowedMetrics.includes(formData.metric)) {
			formData.metric = allowedMetrics[0];
		}
	});
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="quality-rule-editor-title"
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
		tabindex="-1"
	>
		<div class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-surface shadow-xl">
			<div class="flex items-center justify-between border-b border-border px-6 py-4">
				<div>
					<h2 id="quality-rule-editor-title" class="text-xl font-semibold text-content">
						{isEditMode ? '품질 규칙 수정' : '새 품질 규칙 추가'}
					</h2>
					<p class="mt-1 text-sm text-content-muted">
						프로파일링 결과에 즉시 적용할 최소 규칙을 저장합니다. `*`를 사용하면 패턴 매칭이
						가능합니다.
					</p>
				</div>
				<button type="button" class="btn btn-ghost btn-sm" onclick={handleClose} aria-label="닫기">
					<Icon name="x" size="md" />
				</button>
			</div>

			<div class="flex-1 overflow-y-auto px-6 py-5">
				<form
					class="space-y-4"
					onsubmit={(event) => {
						event.preventDefault();
						handleSave();
					}}
				>
					{#if serverError}
						<div
							class="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error"
						>
							{serverError}
						</div>
					{/if}

					{#if validationError}
						<div
							class="rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning"
						>
							{validationError}
						</div>
					{/if}

					<div class="space-y-4">
						<FormField label="규칙 이름" name="quality-rule-name" required>
							<input
								id="quality-rule-name"
								class="input"
								bind:value={formData.name}
								aria-label="규칙 이름"
							/>
						</FormField>

						<FormField
							label="설명"
							name="quality-rule-description"
							hint="실패 원인이나 운영 기준을 짧게 적어두면 재사용이 쉬워집니다."
						>
							<textarea
								id="quality-rule-description"
								class="input min-h-24"
								bind:value={formData.description}
							></textarea>
						</FormField>

						<FormField label="활성화" name="quality-rule-enabled">
							<label
								class="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-content-secondary"
							>
								<input id="quality-rule-enabled" type="checkbox" bind:checked={formData.enabled} />
								<span>저장 후 즉시 프로파일링 평가에 포함</span>
							</label>
						</FormField>

						<FormField label="심각도" name="quality-rule-severity" required>
							<select
								id="quality-rule-severity"
								class="input"
								bind:value={formData.severity}
								aria-label="심각도"
							>
								{#each severityOptions as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</FormField>

						<FormField label="범위" name="quality-rule-scope" required>
							<select
								id="quality-rule-scope"
								class="input"
								bind:value={formData.scope}
								aria-label="범위"
							>
								{#each scopeOptions as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</FormField>

						<FormField label="메트릭" name="quality-rule-metric" required>
							<select
								id="quality-rule-metric"
								class="input"
								bind:value={formData.metric}
								aria-label="메트릭"
							>
								{#each availableMetrics as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</FormField>

						<FormField label="연산자" name="quality-rule-operator" required>
							<select
								id="quality-rule-operator"
								class="input"
								bind:value={formData.operator}
								aria-label="연산자"
							>
								{#each operatorOptions as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</FormField>

						<FormField label="기준값" name="quality-rule-threshold" required>
							<input
								id="quality-rule-threshold"
								type="number"
								step="0.0001"
								class="input"
								bind:value={formData.threshold}
								aria-label="기준값"
							/>
						</FormField>

						<FormField
							label="스키마 패턴"
							name="quality-rule-schema-pattern"
							hint="비워두면 모든 스키마에 적용됩니다. 예: `public`, `audit_*`"
						>
							<input
								id="quality-rule-schema-pattern"
								class="input"
								bind:value={formData.schemaPattern}
								aria-label="스키마 패턴"
							/>
						</FormField>

						<FormField
							label="테이블 패턴"
							name="quality-rule-table-pattern"
							hint="비워두면 모든 테이블에 적용됩니다. 예: `customers`, `tb_*`"
						>
							<input
								id="quality-rule-table-pattern"
								class="input"
								bind:value={formData.tablePattern}
								aria-label="테이블 패턴"
							/>
						</FormField>

						<FormField
							label="컬럼 패턴"
							name="quality-rule-column-pattern"
							hint="column 범위일 때만 적용됩니다. 예: `email`, `*_id`"
						>
							<input
								id="quality-rule-column-pattern"
								class="input"
								bind:value={formData.columnPattern}
								aria-label="컬럼 패턴"
								disabled={formData.scope !== 'column'}
							/>
						</FormField>
					</div>
				</form>
			</div>

			<div class="flex items-center justify-between border-t border-border px-6 py-4">
				<p class="text-xs text-content-muted">
					{formData.scope === 'table'
						? 'table 범위는 현재 rowCount 메트릭만 지원합니다.'
						: 'column 범위는 컬럼별 null/distinct/길이 지표를 평가합니다.'}
				</p>
				<div class="flex items-center gap-2">
					<button
						type="button"
						class="btn btn-secondary"
						onclick={handleClose}
						disabled={isSubmitting}
					>
						취소
					</button>
					<button
						type="button"
						class="btn btn-primary"
						onclick={handleSave}
						disabled={isSubmitting}
					>
						{isSubmitting ? '저장 중...' : '저장'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
