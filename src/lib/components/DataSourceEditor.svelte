<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import FormField from '$lib/components/FormField.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type {
		DataSourceConnectionTestResult,
		DataSourceInput,
		DataSourceSummaryEntry
	} from '$lib/types/data-source.js';

	export type DataSourceEditorSubmitDetail = DataSourceInput & {
		id?: string;
	};

	interface Props {
		isOpen?: boolean;
		entry?: DataSourceSummaryEntry | null;
		isSubmitting?: boolean;
		isTesting?: boolean;
		serverError?: string;
		testResult?: DataSourceConnectionTestResult | null;
	}

	let {
		isOpen = false,
		entry = null,
		isSubmitting = false,
		isTesting = false,
		serverError = '',
		testResult = null
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		save: DataSourceEditorSubmitDetail;
		test: DataSourceEditorSubmitDetail;
		close: void;
	}>();

	let hydrationKey = $state('');
	let validationError = $state('');
	let formData = $state({
		name: '',
		description: '',
		host: '',
		port: 5432,
		database: '',
		schema: 'public',
		username: '',
		password: '',
		ssl: false,
		connectionTimeoutSeconds: 5
	});

	const isEditMode = $derived(Boolean(entry?.id));

	function hydrateForm() {
		formData.name = entry?.name ?? '';
		formData.description = entry?.description ?? '';
		formData.host = entry?.config.host ?? '';
		formData.port = entry?.config.port ?? 5432;
		formData.database = entry?.config.database ?? '';
		formData.schema = entry?.config.schema ?? 'public';
		formData.username = entry?.config.username ?? '';
		formData.password = '';
		formData.ssl = entry?.config.ssl ?? false;
		formData.connectionTimeoutSeconds = entry?.config.connectionTimeoutSeconds ?? 5;
		validationError = '';
	}

	function buildPayload(): DataSourceEditorSubmitDetail {
		return {
			id: entry?.id,
			name: formData.name.trim(),
			type: 'postgresql',
			description: formData.description.trim(),
			config: {
				host: formData.host.trim(),
				port: Number(formData.port),
				database: formData.database.trim(),
				schema: formData.schema.trim() || undefined,
				username: formData.username.trim(),
				password: formData.password,
				ssl: formData.ssl,
				connectionTimeoutSeconds: Number(formData.connectionTimeoutSeconds)
			}
		};
	}

	function validatePayload(): boolean {
		const payload = buildPayload();

		if (!payload.name) {
			validationError = '연결 이름은 필수입니다.';
			return false;
		}

		if (!payload.config.host) {
			validationError = '호스트는 필수입니다.';
			return false;
		}

		if (!Number.isInteger(payload.config.port) || payload.config.port < 1) {
			validationError = '포트는 1 이상의 정수여야 합니다.';
			return false;
		}

		if (!payload.config.database) {
			validationError = '데이터베이스는 필수입니다.';
			return false;
		}

		if (!payload.config.username) {
			validationError = '사용자명은 필수입니다.';
			return false;
		}

		if (!isEditMode && !payload.config.password.trim()) {
			validationError = '비밀번호는 필수입니다.';
			return false;
		}

		if (
			!Number.isInteger(payload.config.connectionTimeoutSeconds) ||
			payload.config.connectionTimeoutSeconds < 1
		) {
			validationError = '연결 타임아웃은 1초 이상의 정수여야 합니다.';
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

	function handleTest() {
		if (!validatePayload()) {
			return;
		}

		dispatch('test', buildPayload());
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
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="data-source-editor-title"
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
					<h2 id="data-source-editor-title" class="text-xl font-semibold text-content">
						{isEditMode ? '데이터 소스 수정' : '새 데이터 소스 추가'}
					</h2>
					<p class="mt-1 text-sm text-content-muted">
						현재는 PostgreSQL 연결만 지원합니다. 저장 전 직접 연결 테스트를 실행할 수 있습니다.
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

					{#if isEditMode}
						<div
							class="rounded-lg border border-status-info-border bg-status-info-bg p-4 text-sm text-status-info"
						>
							비밀번호를 비워두면 기존 저장값을 유지합니다.
						</div>
					{/if}

					<div class="space-y-4">
						<FormField label="연결 이름" name="data-source-name" required>
							<input
								id="data-source-name"
								class="input"
								bind:value={formData.name}
								aria-label="연결 이름"
							/>
						</FormField>

						<FormField
							label="설명"
							name="data-source-description"
							hint="운영/개발 구분이나 용도를 간단히 남겨두면 관리가 쉬워집니다."
						>
							<textarea
								id="data-source-description"
								class="input min-h-24"
								bind:value={formData.description}
							></textarea>
						</FormField>

						<FormField label="연결 타입" name="data-source-type">
							<input id="data-source-type" class="input" value="PostgreSQL" disabled />
						</FormField>

						<FormField label="호스트" name="data-source-host" required>
							<input
								id="data-source-host"
								class="input"
								bind:value={formData.host}
								aria-label="호스트"
							/>
						</FormField>

						<FormField label="포트" name="data-source-port" required>
							<input
								id="data-source-port"
								type="number"
								min="1"
								class="input"
								bind:value={formData.port}
								aria-label="포트"
							/>
						</FormField>

						<FormField label="데이터베이스" name="data-source-database" required>
							<input
								id="data-source-database"
								class="input"
								bind:value={formData.database}
								aria-label="데이터베이스"
							/>
						</FormField>

						<FormField
							label="스키마"
							name="data-source-schema"
							hint="비워두면 PostgreSQL 기본 스키마를 사용합니다."
						>
							<input
								id="data-source-schema"
								class="input"
								bind:value={formData.schema}
								aria-label="스키마"
							/>
						</FormField>

						<FormField label="사용자명" name="data-source-username" required>
							<input
								id="data-source-username"
								class="input"
								bind:value={formData.username}
								aria-label="사용자명"
							/>
						</FormField>

						<FormField
							label="비밀번호"
							name="data-source-password"
							required={!isEditMode}
							hint={isEditMode ? '변경이 필요할 때만 다시 입력하세요.' : ''}
						>
							<input
								id="data-source-password"
								type="password"
								class="input"
								bind:value={formData.password}
								aria-label="비밀번호"
							/>
						</FormField>

						<FormField label="연결 타임아웃(초)" name="data-source-timeout" required>
							<input
								id="data-source-timeout"
								type="number"
								min="1"
								class="input"
								bind:value={formData.connectionTimeoutSeconds}
							/>
						</FormField>

						<FormField label="SSL 사용" name="data-source-ssl">
							<label
								class="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-content-secondary"
							>
								<input id="data-source-ssl" type="checkbox" bind:checked={formData.ssl} />
								<span>PostgreSQL SSL 연결 사용</span>
							</label>
						</FormField>
					</div>
				</form>

				{#if testResult}
					<div
						class="mt-5 rounded-lg border border-status-info-border bg-status-info-bg p-4 text-sm"
					>
						<div class="flex items-start gap-3">
							<Icon
								name={testResult.success ? 'check-circle' : 'warning'}
								size="md"
								class={testResult.success ? 'text-status-success' : 'text-status-warning'}
							/>
							<div class="flex-1">
								<p class="font-medium text-content">{testResult.message}</p>
								<div class="mt-2 grid gap-2 text-content-secondary sm:grid-cols-2">
									<p>호스트: {testResult.details?.host ?? formData.host}</p>
									<p>DB: {testResult.details?.database ?? formData.database}</p>
									<p>스키마: {testResult.details?.schema ?? (formData.schema || 'public')}</p>
									<p>지연시간: {testResult.latencyMs ? `${testResult.latencyMs}ms` : '-'}</p>
								</div>
								{#if testResult.details?.serverVersion}
									<p class="mt-2 break-all text-content-muted">
										{testResult.details.serverVersion}
									</p>
								{/if}
							</div>
						</div>
					</div>
				{/if}
			</div>

			<div class="flex items-center justify-between border-t border-border px-6 py-4">
				<p class="text-xs text-content-muted">
					{isEditMode
						? '저장 전 연결 테스트로 변경값을 확인하세요.'
						: '저장 전에 연결 가능 여부를 확인하세요.'}
				</p>
				<div class="flex items-center gap-2">
					<button
						type="button"
						class="btn btn-secondary"
						onclick={handleClose}
						disabled={isSubmitting || isTesting}
					>
						취소
					</button>
					<button
						type="button"
						class="btn btn-outline"
						onclick={handleTest}
						disabled={isSubmitting || isTesting}
					>
						{isTesting ? '테스트 중...' : '연결 테스트 실행'}
					</button>
					<button
						type="button"
						class="btn btn-primary"
						onclick={handleSave}
						disabled={isSubmitting || isTesting}
					>
						{isSubmitting ? '저장 중...' : '저장'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
