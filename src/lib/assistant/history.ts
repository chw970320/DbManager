import { isValidDataType } from '$lib/types/base.js';
import type {
	AssistantAction,
	AssistantChatMessage,
	AssistantPersistedState,
	AssistantSource
} from '$lib/types/assistant.js';

const DB_NAME = 'dbmanager-assistant';
const DB_VERSION = 1;
const STORE_NAME = 'state';
const STATE_KEY = 'assistant-state';
const LOCAL_STORAGE_KEY = 'dbmanager.assistant.state';

class IndexedDbUnavailableError extends Error {
	constructor() {
		super('IndexedDB is not available.');
		this.name = 'IndexedDbUnavailableError';
	}
}

export function createEmptyAssistantState(selectedBundleId: string): AssistantPersistedState {
	const now = new Date().toISOString();
	return {
		version: 1,
		selectedBundleId,
		conversations: {
			[selectedBundleId]: {
				bundleId: selectedBundleId,
				messages: [],
				updatedAt: now
			}
		},
		updatedAt: now
	};
}

export async function loadAssistantState(
	selectedBundleId: string
): Promise<AssistantPersistedState> {
	try {
		const db = await openAssistantDb();
		try {
			const value = await readStateFromDb(db);
			return normalizeAssistantState(value, selectedBundleId);
		} finally {
			db.close();
		}
	} catch (error) {
		if (error instanceof IndexedDbUnavailableError) {
			return normalizeAssistantState(readStateFromLocalStorage(), selectedBundleId);
		}
		throw error;
	}
}

export async function saveAssistantState(state: AssistantPersistedState): Promise<void> {
	const normalized = normalizeAssistantState(state, state.selectedBundleId);
	try {
		const db = await openAssistantDb();
		try {
			await writeStateToDb(db, normalized);
		} finally {
			db.close();
		}
	} catch (error) {
		if (error instanceof IndexedDbUnavailableError) {
			writeStateToLocalStorage(normalized);
			return;
		}
		throw error;
	}
}

export function normalizeAssistantState(
	value: unknown,
	fallbackBundleId: string
): AssistantPersistedState {
	if (!value || typeof value !== 'object') {
		return createEmptyAssistantState(fallbackBundleId);
	}

	const record = value as Partial<AssistantPersistedState & { messages?: AssistantChatMessage[] }>;
	const selectedBundleId =
		typeof record.selectedBundleId === 'string' && record.selectedBundleId.trim()
			? record.selectedBundleId.trim()
			: fallbackBundleId;
	const conversations: AssistantPersistedState['conversations'] = {};

	if (record.conversations && typeof record.conversations === 'object') {
		for (const [bundleId, conversation] of Object.entries(record.conversations)) {
			if (!bundleId || !conversation || typeof conversation !== 'object') {
				continue;
			}

			const candidate = conversation as {
				bundleId?: unknown;
				messages?: unknown;
				updatedAt?: unknown;
			};
			conversations[bundleId] = {
				bundleId,
				messages: normalizeMessages(candidate.messages, bundleId),
				updatedAt:
					typeof candidate.updatedAt === 'string' && candidate.updatedAt.trim()
						? candidate.updatedAt
						: new Date().toISOString()
			};
		}
	}

	if (Array.isArray(record.messages) && !conversations[selectedBundleId]) {
		conversations[selectedBundleId] = {
			bundleId: selectedBundleId,
			messages: normalizeMessages(record.messages, selectedBundleId),
			updatedAt: new Date().toISOString()
		};
	}

	if (!conversations[selectedBundleId]) {
		conversations[selectedBundleId] = {
			bundleId: selectedBundleId,
			messages: [],
			updatedAt: new Date().toISOString()
		};
	}

	return {
		version: 1,
		selectedBundleId,
		conversations,
		updatedAt:
			typeof record.updatedAt === 'string' && record.updatedAt.trim()
				? record.updatedAt
				: new Date().toISOString()
	};
}

export function serializeAssistantState(state: AssistantPersistedState): string {
	return JSON.stringify(normalizeAssistantState(state, state.selectedBundleId), null, 2);
}

export function parseAssistantState(
	text: string,
	fallbackBundleId: string
): AssistantPersistedState {
	return normalizeAssistantState(JSON.parse(text), fallbackBundleId);
}

function isAssistantMessage(value: unknown): value is AssistantChatMessage {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const message = value as Partial<AssistantChatMessage>;
	return (
		(message.role === 'user' || message.role === 'assistant') &&
		typeof message.id === 'string' &&
		typeof message.content === 'string' &&
		typeof message.createdAt === 'string'
	);
}

function normalizeMessages(value: unknown, bundleId: string): AssistantChatMessage[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((message) => normalizeMessage(message, bundleId))
		.filter((message): message is AssistantChatMessage => Boolean(message))
		.slice(-100);
}

function normalizeMessage(value: unknown, bundleId: string): AssistantChatMessage | null {
	if (!isAssistantMessage(value)) {
		return null;
	}

	const candidate = value;
	const messageBundleId =
		typeof candidate.bundleId === 'string' && candidate.bundleId.trim()
			? candidate.bundleId.trim()
			: bundleId;
	if (messageBundleId !== bundleId) {
		return null;
	}

	const message: AssistantChatMessage = {
		id: candidate.id,
		role: candidate.role,
		content: candidate.content,
		createdAt: candidate.createdAt,
		bundleId: messageBundleId
	};
	const sources = normalizeSources(candidate.sources, messageBundleId);
	const actions = normalizeActions(candidate.actions);
	if (sources.length > 0) {
		message.sources = sources;
	}
	if (actions.length > 0) {
		message.actions = actions;
	}

	return message;
}

function normalizeSources(value: unknown, fallbackBundleId: string): AssistantSource[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((source) => normalizeSource(source, fallbackBundleId))
		.filter((source): source is AssistantSource => Boolean(source));
}

function normalizeSource(value: unknown, fallbackBundleId: string): AssistantSource | null {
	if (!value || typeof value !== 'object') {
		return null;
	}

	const record = value as Partial<AssistantSource>;
	const id = normalizeRequiredString(record.id);
	const tool = normalizeRequiredString(record.tool);
	const title = normalizeRequiredString(record.title);
	const summary = normalizeRequiredString(record.summary);
	const bundleName = normalizeRequiredString(record.bundleName);
	if (!id || !tool || !title || !summary || !bundleName) {
		return null;
	}

	const source: AssistantSource = {
		id,
		tool,
		title,
		summary,
		bundleId: normalizeRequiredString(record.bundleId) ?? fallbackBundleId,
		bundleName
	};
	if (typeof record.type === 'string' && isValidDataType(record.type)) {
		source.type = record.type;
	}
	if (typeof record.filename === 'string' && record.filename.trim()) {
		source.filename = record.filename.trim();
	}
	if (typeof record.count === 'number' && Number.isFinite(record.count)) {
		source.count = record.count;
	}
	if (typeof record.targetId === 'string' && record.targetId.trim()) {
		source.targetId = record.targetId.trim();
	}
	if (typeof record.targetLabel === 'string' && record.targetLabel.trim()) {
		source.targetLabel = record.targetLabel.trim();
	}

	return source;
}

function normalizeActions(value: unknown): AssistantAction[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((action) => normalizeAction(action))
		.filter((action): action is AssistantAction => Boolean(action));
}

function normalizeAction(value: unknown): AssistantAction | null {
	if (!value || typeof value !== 'object') {
		return null;
	}

	const record = value as Partial<AssistantAction>;
	const id = normalizeRequiredString(record.id);
	const label = normalizeRequiredString(record.label);
	const href = normalizeRequiredString(record.href);
	if (!id || record.type !== 'navigate' || !label || !href) {
		return null;
	}

	const action: AssistantAction = {
		id,
		type: 'navigate',
		label,
		href
	};
	if (typeof record.description === 'string' && record.description.trim()) {
		action.description = record.description.trim();
	}

	return action;
}

function normalizeRequiredString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function openAssistantDb(): Promise<IDBDatabase> {
	if (typeof indexedDB === 'undefined') {
		return Promise.reject(new IndexedDbUnavailableError());
	}

	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME);
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed.'));
	});
}

function readStateFromDb(db: IDBDatabase): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, 'readonly');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.get(STATE_KEY);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed.'));
	});
}

function writeStateToDb(db: IDBDatabase, state: AssistantPersistedState): Promise<void> {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.put(state, STATE_KEY);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error ?? new Error('IndexedDB write failed.'));
	});
}

function readStateFromLocalStorage(): unknown {
	if (typeof localStorage === 'undefined') {
		return null;
	}

	const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
	if (!raw) {
		return null;
	}

	try {
		return JSON.parse(raw) as unknown;
	} catch {
		return null;
	}
}

function writeStateToLocalStorage(state: AssistantPersistedState): void {
	if (typeof localStorage === 'undefined') {
		return;
	}

	localStorage.setItem(LOCAL_STORAGE_KEY, serializeAssistantState(state));
}
