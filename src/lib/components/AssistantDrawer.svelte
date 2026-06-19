<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
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

	let open = $state(false);
	let bundles = $state<SharedFileMappingBundleEntry[]>([]);
	let selectedBundleId = $state('');
	let messages = $state<AssistantChatMessage[]>([]);
	let persistedState = $state<AssistantPersistedState | null>(null);
	let input = $state('');
	let loadingBundles = $state(true);
	let sending = $state(false);
	let errorMessage = $state('');
	let importInput: HTMLInputElement | undefined = $state();
	let messageList: HTMLDivElement | undefined = $state();

	const selectedBundle = $derived(
		bundles.find((bundle) => bundle.id === selectedBundleId) ?? bundles[0] ?? null
	);
	const canSend = $derived(input.trim().length > 0 && Boolean(selectedBundleId) && !sending);
	const historyLocked = $derived(loadingBundles || sending || !selectedBundleId);

	onMount(() => {
		void initializeAssistant();
	});

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

	function formatTime(value: string): string {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) {
			return '';
		}
		return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
	}
</script>

<button
	type="button"
	class="fixed bottom-24 right-8 z-assistant flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-white shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
	aria-label="AI Assistant 열기"
	title="AI Assistant"
	onclick={() => (open = true)}
>
	<Icon name="message-circle" size="lg" />
</button>

{#if open}
	<div class="fixed inset-0 z-assistant">
		<button
			type="button"
			class="absolute inset-0 h-full w-full cursor-default bg-gray-900/20"
			aria-label="AI Assistant 닫기"
			onclick={() => (open = false)}
		></button>

		<aside
			class="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-border bg-surface shadow-2xl sm:w-[30rem]"
			aria-label="AI Assistant"
		>
			<header class="border-b border-border bg-surface px-4 py-4">
				<div class="flex items-start justify-between gap-3">
					<div>
						<h2 class="text-base font-semibold text-content">AI Assistant</h2>
						<p class="mt-1 text-xs text-content-muted">
							선택한 번들의 검색 출처를 기준으로 답변합니다.
						</p>
					</div>
					<button
						type="button"
						class="btn btn-ghost btn-sm"
						aria-label="AI Assistant 닫기"
						onclick={() => (open = false)}
					>
						<Icon name="x" size="sm" />
					</button>
				</div>

				<div class="mt-4">
					<label for="assistant-bundle" class="mb-1 block text-xs font-medium text-content">
						번들
					</label>
					<select
						id="assistant-bundle"
						class="input text-sm"
						value={selectedBundleId}
						onchange={handleBundleChange}
						disabled={loadingBundles || sending || bundles.length === 0}
					>
						{#each bundles as bundle (bundle.id)}
							<option value={bundle.id}>{bundle.name}</option>
						{/each}
					</select>
					{#if selectedBundle}
						<p class="mt-1 text-xs text-content-muted">
							용어 {selectedBundle.files.term} · 컬럼 {selectedBundle.files.column}
						</p>
					{/if}
				</div>
			</header>

			<div class="flex items-center gap-2 border-b border-border bg-surface-muted px-4 py-2">
				<button
					type="button"
					class="btn btn-ghost btn-sm"
					onclick={exportHistory}
					disabled={historyLocked}
				>
					<Icon name="download" size="sm" />
					내보내기
				</button>
				<button
					type="button"
					class="btn btn-ghost btn-sm"
					onclick={openImportDialog}
					disabled={historyLocked}
				>
					<Icon name="upload" size="sm" />
					가져오기
				</button>
				<button
					type="button"
					class="btn btn-ghost btn-sm text-status-error"
					onclick={clearHistory}
					disabled={historyLocked}
				>
					<Icon name="trash" size="sm" />
					삭제
				</button>
				<input
					bind:this={importInput}
					type="file"
					accept="application/json,.json"
					class="hidden"
					onchange={importHistory}
				/>
			</div>

			<div bind:this={messageList} class="flex-1 space-y-4 overflow-y-auto bg-surface-muted p-4">
				{#if loadingBundles}
					<div class="rounded-lg border border-border bg-surface p-4 text-sm text-content-muted">
						Assistant를 준비하는 중입니다.
					</div>
				{:else if messages.length === 0}
					<div
						class="rounded-lg border border-dashed border-border bg-surface p-5 text-sm text-content-muted"
					>
						<p class="font-medium text-content-secondary">질문을 입력해 주세요.</p>
						<p class="mt-2">
							예: 휴일_전전일자 영문약어가 뭐야? 또는 방문자 관련 단어와 컬럼을 찾아줘.
						</p>
					</div>
				{:else}
					{#each messages as message (message.id)}
						<article
							class="rounded-lg border px-4 py-3 shadow-sm {message.role === 'user'
								? 'ml-8 border-brand-100 bg-brand-50'
								: 'mr-8 border-border bg-surface'}"
						>
							<div class="flex items-center justify-between gap-3">
								<span class="text-xs font-semibold text-content-secondary">
									{message.role === 'user' ? '나' : 'AI Assistant'}
								</span>
								<span class="text-[11px] text-content-subtle">{formatTime(message.createdAt)}</span>
							</div>
							<p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-content">
								{message.content}
							</p>

							{#if message.sources?.length}
								<div class="mt-3 border-t border-border pt-3">
									<p class="text-xs font-semibold text-content-secondary">출처</p>
									<div class="mt-2 flex flex-wrap gap-2">
										{#each message.sources as source (source.id)}
											<span
												class="inline-flex items-center rounded-full border border-border bg-surface-muted px-2 py-1 text-[11px] text-content-muted"
												title={`${source.bundleName}${source.filename ? ` · ${source.filename}` : ''}`}
											>
												{source.title}
												{source.count !== undefined ? ` · ${source.count}건` : ''}
											</span>
										{/each}
									</div>
								</div>
							{/if}

							{#if message.actions?.length}
								<div class="mt-3 flex flex-wrap gap-2">
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
						class="mr-8 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-content-muted"
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
				class="border-t border-border bg-surface p-4"
				onsubmit={(event) => {
					event.preventDefault();
					void sendMessage();
				}}
			>
				<label for="assistant-input" class="sr-only">Assistant 질문</label>
				<textarea
					id="assistant-input"
					class="input min-h-24 resize-none text-sm"
					placeholder="선택한 번들에 대해 질문하세요."
					bind:value={input}
					onkeydown={handleComposerKeydown}
					disabled={!selectedBundleId || sending}
				></textarea>
				<div class="mt-3 flex items-center justify-between gap-3">
					<span aria-hidden="true"></span>
					<button type="submit" class="btn btn-primary btn-sm" disabled={!canSend}>
						<Icon name="send" size="sm" />
						전송
					</button>
				</div>
			</form>
		</aside>
	</div>
{/if}
