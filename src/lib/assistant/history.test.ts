import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	createEmptyAssistantState,
	loadAssistantState,
	normalizeAssistantState,
	saveAssistantState
} from './history.js';

const originalIndexedDbDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');

function setIndexedDb(value: IDBFactory | undefined): void {
	Object.defineProperty(globalThis, 'indexedDB', {
		value,
		configurable: true,
		writable: true
	});
}

function restoreIndexedDb(): void {
	if (originalIndexedDbDescriptor) {
		Object.defineProperty(globalThis, 'indexedDB', originalIndexedDbDescriptor);
		return;
	}

	delete (globalThis as { indexedDB?: IDBFactory }).indexedDB;
}

function createFailingIndexedDb(error: Error): IDBFactory {
	return {
		open: vi.fn(() => {
			const request = {
				error,
				onerror: null,
				onsuccess: null,
				onupgradeneeded: null
			} as {
				error: Error;
				onerror: ((this: IDBRequest, event: Event) => unknown) | null;
				onsuccess: ((this: IDBRequest, event: Event) => unknown) | null;
				onupgradeneeded: ((this: IDBOpenDBRequest, event: IDBVersionChangeEvent) => unknown) | null;
			};

			setTimeout(() => {
				request.onerror?.call(request as unknown as IDBRequest, new Event('error'));
			}, 0);

			return request as unknown as IDBOpenDBRequest;
		})
	} as unknown as IDBFactory;
}

describe('assistant history storage', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
		restoreIndexedDb();
		vi.restoreAllMocks();
	});

	it('uses localStorage only when IndexedDB is unavailable', async () => {
		setIndexedDb(undefined);
		const state = createEmptyAssistantState('bio');
		state.conversations.bio.messages = [
			{
				id: 'message-1',
				role: 'user',
				content: '휴일_전전일자 영문약어가 뭐야?',
				createdAt: '2026-06-19T00:00:00.000Z',
				bundleId: 'bio'
			}
		];

		await saveAssistantState(state);
		const loaded = await loadAssistantState('default-shared-file-mapping');

		expect(loaded.selectedBundleId).toBe('bio');
		expect(loaded.conversations.bio.messages).toHaveLength(1);
		expect(loaded.conversations.bio.messages[0]?.content).toContain('휴일_전전일자');
	});

	it('does not mask a failing IndexedDB with localStorage', async () => {
		setIndexedDb(createFailingIndexedDb(new Error('IndexedDB open failed for test')));

		await expect(saveAssistantState(createEmptyAssistantState('bio'))).rejects.toThrow(
			'IndexedDB open failed for test'
		);
		expect(localStorage.length).toBe(0);
	});

	it('normalizes legacy top-level messages into the selected bundle conversation', () => {
		const state = normalizeAssistantState(
			{
				version: 1,
				selectedBundleId: 'bio',
				messages: [
					{
						id: 'legacy-1',
						role: 'user',
						content: '방문자 찾아줘',
						createdAt: '2026-06-19T00:00:00.000Z'
					}
				],
				updatedAt: '2026-06-19T00:00:00.000Z'
			},
			'default-shared-file-mapping'
		);

		expect(state.conversations.bio.messages).toEqual([
			expect.objectContaining({
				id: 'legacy-1',
				content: '방문자 찾아줘',
				bundleId: 'bio'
			})
		]);
	});
});
