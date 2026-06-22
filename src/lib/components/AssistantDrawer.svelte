<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import AssistantMarkdown from './AssistantMarkdown.svelte';
	import Icon from './Icon.svelte';
	import {
		createEmptyAssistantState,
		loadAssistantState,
		parseAssistantState,
		saveAssistantState,
		serializeAssistantState
	} from '$lib/assistant/history.js';
	import type {
		AssistantAction,
		AssistantBundleListResponse,
		AssistantChatMessage,
		AssistantChatResponse,
		AssistantPersistedState
	} from '$lib/types/assistant.js';
	import type { SharedFileMappingBundleEntry } from '$lib/types/shared-file-mapping.js';

	type AssistantViewMode = 'floating' | 'tab';

	const ASSISTANT_MODE_STORAGE_KEY = 'dbmanager.assistant.view-mode';
	const MAX_ASSISTANT_INPUT_LENGTH = 1200;
	const MODE_BUTTON_CLASS =
		'rounded-md p-1.5 text-content-muted transition-colors hover:bg-surface-raised hover:text-content disabled:cursor-not-allowed disabled:opacity-50';
	const ACTIVE_MODE_BUTTON_CLASS = `${MODE_BUTTON_CLASS} bg-brand-50 text-brand`;
	const HEADER_ICON_BUTTON_CLASS =
		'rounded-md p-1.5 text-content-muted transition-colors hover:bg-surface-raised hover:text-content disabled:cursor-not-allowed disabled:opacity-50';

	let open = $state(false);
	let viewMode = $state<AssistantViewMode>('floating');
	let bundles = $state<SharedFileMappingBundleEntry[]>([]);
	let selectedBundleId = $state('');
	let messages = $state<AssistantChatMessage[]>([]);
	let persistedState = $state<AssistantPersistedState | null>(null);
	let input = $state('');
	let loadingBundles = $state(true);
	let sending = $state(false);
	let errorMessage = $state('');
	let launcherButton: HTMLButtonElement | undefined = $state();
	let assistantPanel: HTMLDivElement | undefined = $state();
	let importInput: HTMLInputElement | undefined = $state();
	let messageList: HTMLDivElement | undefined = $state();

	const inputLength = $derived(input.length);
	const inputTooLong = $derived(inputLength > MAX_ASSISTANT_INPUT_LENGTH);
	const canSend = $derived(
		input.trim().length > 0 && !inputTooLong && Boolean(selectedBundleId) && !sending
	);
	const historyLocked = $derived(loadingBundles || sending || !selectedBundleId);
	const panelAriaLabel = $derived(
		viewMode === 'floating' ? 'AI Assistant 플로팅 창' : 'AI Assistant 좌측 탭'
	);
	const panelClass = $derived(
		viewMode === 'floating'
			? 'fixed inset-x-3 bottom-3 z-assistant flex h-[calc(100vh-1.5rem)] max-h-[46rem] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl sm:inset-x-auto sm:bottom-6 sm:left-6 sm:h-[calc(100vh-3rem)] sm:w-[30rem] sm:max-w-[calc(100vw-3rem)]'
			: 'fixed left-0 top-[var(--layout-header-height)] z-assistant flex h-[calc(100vh-var(--layout-header-height))] w-full max-w-lg flex-col overflow-hidden border-r border-border bg-surface shadow-2xl sm:w-[26rem]'
	);
	const floatingModeButtonClass = $derived(
		viewMode === 'floating' ? ACTIVE_MODE_BUTTON_CLASS : MODE_BUTTON_CLASS
	);
	const tabModeButtonClass = $derived(
		viewMode === 'tab' ? ACTIVE_MODE_BUTTON_CLASS : MODE_BUTTON_CLASS
	);

	onMount(() => {
		viewMode = readAssistantViewMode();
		void initializeAssistant();
	});

	function readAssistantViewMode(): AssistantViewMode {
		try {
			return localStorage.getItem(ASSISTANT_MODE_STORAGE_KEY) === 'tab' ? 'tab' : 'floating';
		} catch {
			return 'floating';
		}
	}

	function setViewMode(nextMode: AssistantViewMode) {
		viewMode = nextMode;
		try {
			localStorage.setItem(ASSISTANT_MODE_STORAGE_KEY, nextMode);
		} catch {
			// Mode memory is a convenience; the assistant remains usable if storage is blocked.
		}
	}

	async function openAssistant() {
		open = true;
		await tick();
		assistantPanel?.focus();
	}

	async function closeAssistant() {
		open = false;
		await tick();
		launcherButton?.focus();
	}

	async function initializeAssistant() {
		loadingBundles = true;
		errorMessage = '';
		try {
			const response = await fetch('/api/assistant/bundles');
			const result = (await response.json()) as AssistantBundleListResponse;
			if (!response.ok || !result.success || !result.data) {
				throw new Error(result.error || 'Assistant 번들 목록을 불러오지 못했습니다.');
			}

			bundles = result.data.bundles;
			const fallbackBundleId = result.data.recommendedBundleId || bundles[0]?.id || '';
			const persisted = await loadAssistantState(fallbackBundleId);
			const persistedBundleExists = bundles.some(
				(bundle) => bundle.id === persisted.selectedBundleId
			);
			const nextState = persistedBundleExists
				? persisted
				: ensureStateForBundle(persisted, fallbackBundleId);

			persistedState = nextState;
			selectedBundleId = nextState.selectedBundleId;
			messages = messagesForBundle(nextState, nextState.selectedBundleId);
			await persistState();
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Assistant를 초기화하는 중 오류가 발생했습니다.';
		} finally {
			loadingBundles = false;
		}
	}

	function currentState(): AssistantPersistedState {
		const base = persistedState ?? createEmptyAssistantState(selectedBundleId);
		return withBundleMessages(base, selectedBundleId, messages);
	}

	function messagesForBundle(
		state: AssistantPersistedState,
		bundleId: string
	): AssistantChatMessage[] {
		return state.conversations[bundleId]?.messages ?? [];
	}

	function ensureStateForBundle(
		state: AssistantPersistedState,
		bundleId: string
	): AssistantPersistedState {
		if (state.conversations[bundleId]) {
			return {
				...state,
				selectedBundleId: bundleId,
				updatedAt: new Date().toISOString()
			};
		}

		return withBundleMessages(state, bundleId, []);
	}

	function withBundleMessages(
		state: AssistantPersistedState,
		bundleId: string,
		nextMessages: AssistantChatMessage[]
	): AssistantPersistedState {
		const now = new Date().toISOString();
		const scopedMessages = nextMessages.map((message) => ({
			...message,
			bundleId
		}));

		return {
			version: 1,
			selectedBundleId: bundleId,
			conversations: {
				...state.conversations,
				[bundleId]: {
					bundleId,
					messages: scopedMessages,
					updatedAt: now
				}
			},
			updatedAt: now
		};
	}

	async function persistState(): Promise<boolean> {
		if (!selectedBundleId) {
			return true;
		}
		try {
			const nextState = currentState();
			await saveAssistantState(nextState);
			persistedState = nextState;
			return true;
		} catch {
			errorMessage = '대화 기록을 저장하지 못했습니다.';
			return false;
		}
	}

	async function sendMessage() {
		if (!canSend) {
			return;
		}

		sending = true;
		const userMessage: AssistantChatMessage = {
			id: crypto.randomUUID(),
			role: 'user',
			content: input.trim(),
			createdAt: new Date().toISOString(),
			bundleId: selectedBundleId
		};
		input = '';
		errorMessage = '';
		const requestBundleId = selectedBundleId;
		const requestMessages = [...messages, userMessage];
		messages = requestMessages;
		await persistState();
		await scrollToLatestMessage();

		try {
			const response = await fetch('/api/assistant/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bundleId: requestBundleId,
					messages: requestMessages.map((message) => ({
						role: message.role,
						content: message.content
					}))
				})
			});
			const result = (await response.json()) as AssistantChatResponse;
			if (!response.ok || !result.success || !result.data) {
				throw new Error(result.error || 'Assistant 응답을 생성하지 못했습니다.');
			}

			const responseMessages = [...requestMessages, result.data.message];
			const nextState = withBundleMessages(currentState(), requestBundleId, responseMessages);
			persistedState = nextState;
			if (selectedBundleId === requestBundleId) {
				messages = responseMessages;
			}
			await saveAssistantState(nextState);
			await scrollToLatestMessage();
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Assistant 응답 생성 중 오류가 발생했습니다.';
		} finally {
			sending = false;
		}
	}

	async function scrollToLatestMessage() {
		await tick();
		if (messageList && typeof messageList.scrollTo === 'function') {
			messageList.scrollTo({ top: messageList.scrollHeight, behavior: 'smooth' });
		}
	}

	async function handleBundleChange(event: Event) {
		const nextBundleId = (event.currentTarget as HTMLSelectElement).value;
		const nextState = ensureStateForBundle(currentState(), nextBundleId);
		persistedState = nextState;
		selectedBundleId = nextBundleId;
		messages = messagesForBundle(nextState, nextBundleId);
		errorMessage = '';
		try {
			await saveAssistantState(nextState);
		} catch {
			errorMessage = '대화 기록을 저장하지 못했습니다.';
		}
	}

	async function clearHistory() {
		if (historyLocked) {
			return;
		}

		try {
			messages = [];
			const nextState = currentState();
			await saveAssistantState(nextState);
			persistedState = nextState;
			errorMessage = '';
		} catch {
			errorMessage = '대화 기록을 삭제하지 못했습니다.';
		}
	}

	function exportHistory() {
		if (historyLocked) {
			return;
		}

		const snapshot = currentState();
		const conversation = snapshot.conversations[selectedBundleId];
		const scopedState: AssistantPersistedState = {
			version: 1,
			selectedBundleId,
			conversations: conversation ? { [selectedBundleId]: conversation } : {},
			updatedAt: snapshot.updatedAt
		};
		const blob = new Blob([serializeAssistantState(scopedState)], {
			type: 'application/json;charset=utf-8'
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `dbmanager-assistant-${new Date().toISOString().slice(0, 10)}.json`;
		link.click();
		URL.revokeObjectURL(url);
	}

	function openImportDialog() {
		if (historyLocked) {
			return;
		}

		importInput?.click();
	}

	async function importHistory(event: Event) {
		if (historyLocked) {
			return;
		}

		const inputElement = event.currentTarget as HTMLInputElement;
		const file = inputElement.files?.[0];
		if (!file) {
			return;
		}

		try {
			const text = await file.text();
			const imported = parseAssistantState(text, selectedBundleId);
			const importedMessages =
				imported.conversations[imported.selectedBundleId]?.messages ??
				Object.values(imported.conversations)[0]?.messages ??
				[];
			const nextState = withBundleMessages(currentState(), selectedBundleId, importedMessages);

			persistedState = nextState;
			messages = messagesForBundle(nextState, selectedBundleId);
			await saveAssistantState(nextState);
			errorMessage = '';
		} catch {
			errorMessage = '가져오기 파일 형식이 올바르지 않습니다.';
		} finally {
			inputElement.value = '';
		}
	}

	async function handleAction(action: AssistantAction) {
		if (action.type === 'navigate') {
			await goto(action.href);
		}
	}

	function handleComposerKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			void sendMessage();
		}
	}

	function handlePanelKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			void closeAssistant();
		}
	}

	function formatTime(value: string): string {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) {
			return '';
		}
		return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
	}
</script>

{#if !open}
	<button
		type="button"
		class="fixed bottom-8 left-8 z-assistant flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
		aria-label="AI Assistant 열기"
		title="AI Assistant"
		bind:this={launcherButton}
		onclick={openAssistant}
	>
		<Icon name="message-circle" size="lg" />
	</button>
{/if}

{#if open}
	<div
		bind:this={assistantPanel}
		class={panelClass}
		role="dialog"
		aria-modal="false"
		aria-label={panelAriaLabel}
		tabindex="-1"
		onkeydown={handlePanelKeydown}
	>
		<header class="border-b border-border bg-surface px-3 py-3">
			<div class="flex items-center justify-between gap-2">
				<h2 class="min-w-0 truncate text-base font-semibold text-content">AI Assistant</h2>
				<div class="flex shrink-0 items-center gap-1">
					<button
						type="button"
						class={floatingModeButtonClass}
						aria-label="플로팅 보기"
						aria-pressed={viewMode === 'floating'}
						title="플로팅 보기"
						onclick={() => setViewMode('floating')}
					>
						<Icon name="window" size="sm" />
					</button>
					<button
						type="button"
						class={tabModeButtonClass}
						aria-label="좌측 탭 보기"
						aria-pressed={viewMode === 'tab'}
						title="좌측 탭 보기"
						onclick={() => setViewMode('tab')}
					>
						<Icon name="panel-left" size="sm" />
					</button>
					<button
						type="button"
						class={HEADER_ICON_BUTTON_CLASS}
						aria-label="내보내기"
						title="내보내기"
						onclick={exportHistory}
						disabled={historyLocked}
					>
						<Icon name="download" size="sm" />
					</button>
					<button
						type="button"
						class={HEADER_ICON_BUTTON_CLASS}
						aria-label="가져오기"
						title="가져오기"
						onclick={openImportDialog}
						disabled={historyLocked}
					>
						<Icon name="upload" size="sm" />
					</button>
					<button
						type="button"
						class={`${HEADER_ICON_BUTTON_CLASS} text-status-error hover:text-status-error`}
						aria-label="삭제"
						title="삭제"
						onclick={clearHistory}
						disabled={historyLocked}
					>
						<Icon name="trash" size="sm" />
					</button>
					<button
						type="button"
						class={HEADER_ICON_BUTTON_CLASS}
						aria-label="AI Assistant 닫기"
						onclick={closeAssistant}
					>
						<Icon name="x" size="sm" />
					</button>
				</div>
			</div>

			<div class="mt-2">
				<label for="assistant-bundle" class="sr-only">번들</label>
				<select
					id="assistant-bundle"
					class="input h-9 text-sm"
					value={selectedBundleId}
					onchange={handleBundleChange}
					disabled={loadingBundles || sending || bundles.length === 0}
				>
					{#each bundles as bundle (bundle.id)}
						<option value={bundle.id}>{bundle.name}</option>
					{/each}
				</select>
			</div>
			<input
				bind:this={importInput}
				type="file"
				accept="application/json,.json"
				class="hidden"
				onchange={importHistory}
			/>
		</header>

		<div
			bind:this={messageList}
			class="min-h-0 flex-1 space-y-3 overflow-y-auto bg-surface-muted p-3"
		>
			{#if loadingBundles}
				<div class="rounded-lg border border-border bg-surface p-3 text-sm text-content-muted">
					Assistant를 준비하는 중입니다.
				</div>
			{:else if messages.length === 0}
				<div
					class="rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-content-muted"
				>
					<p class="font-medium text-content-secondary">질문을 입력해 주세요.</p>
					<p class="mt-2">
						예: 휴일_전전일자 영문약어가 뭐야? 또는 방문자 관련 단어와 컬럼을 찾아줘.
					</p>
				</div>
			{:else}
				{#each messages as message (message.id)}
					<article
						class="rounded-lg border px-3 py-2.5 shadow-sm {message.role === 'user'
							? 'ml-4 border-brand-100 bg-brand-50'
							: 'mr-4 border-border bg-surface'}"
					>
						<div class="flex items-center justify-between gap-3">
							<span class="text-xs font-semibold text-content-secondary">
								{message.role === 'user' ? '나' : 'AI Assistant'}
							</span>
							<span class="text-[11px] text-content-subtle">{formatTime(message.createdAt)}</span>
						</div>
						<div class="mt-2">
							{#if message.role === 'assistant'}
								<AssistantMarkdown content={message.content} />
							{:else}
								<p class="whitespace-pre-wrap text-sm leading-6 text-content">
									{message.content}
								</p>
							{/if}
						</div>

						{#if message.sources?.length}
							<div class="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
								<span class="mr-1 text-[11px] font-semibold text-content-secondary">출처</span>
								{#each message.sources as source (source.id)}
									<span
										class="inline-flex items-center rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[11px] text-content-muted"
										title={`${source.bundleName}${source.filename ? ` · ${source.filename}` : ''}`}
									>
										{source.title}
										{source.count !== undefined ? ` · ${source.count}건` : ''}
									</span>
								{/each}
							</div>
						{/if}

						{#if message.actions?.length}
							<div class="mt-2 flex flex-wrap gap-1.5">
								{#each message.actions as action (action.id)}
									<button
										type="button"
										class="btn btn-outline btn-sm"
										title={action.description}
										onclick={() => handleAction(action)}
									>
										<Icon name="external-link" size="sm" />
										{action.label}
									</button>
								{/each}
							</div>
						{/if}
					</article>
				{/each}
			{/if}

			{#if sending}
				<div
					class="mr-4 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-content-muted"
				>
					<Icon name="spinner" size="sm" class="mr-2 inline-block" />
					응답을 생성하는 중입니다.
				</div>
			{/if}

			{#if errorMessage}
				<div
					class="rounded-lg border border-status-error-border bg-status-error-bg px-4 py-3 text-sm text-status-error"
				>
					{errorMessage}
				</div>
			{/if}
		</div>

		<form
			class="border-t border-border bg-surface p-3"
			onsubmit={(event) => {
				event.preventDefault();
				void sendMessage();
			}}
		>
			<label for="assistant-input" class="sr-only">Assistant 질문</label>
			<textarea
				id="assistant-input"
				class="input min-h-16 resize-none text-sm"
				placeholder="선택한 번들에 대해 질문하세요."
				bind:value={input}
				maxlength={MAX_ASSISTANT_INPUT_LENGTH}
				onkeydown={handleComposerKeydown}
				disabled={!selectedBundleId || sending}
			></textarea>
			<div class="mt-2 flex items-center justify-between gap-3">
				<span
					class="text-xs {inputTooLong ? 'text-status-error' : 'text-content-muted'}"
					aria-live="polite"
				>
					{inputLength}/{MAX_ASSISTANT_INPUT_LENGTH}
				</span>
				<button type="submit" class="btn btn-primary btn-sm" disabled={!canSend}>
					<Icon name="send" size="sm" />
					전송
				</button>
			</div>
		</form>
	</div>
{/if}
