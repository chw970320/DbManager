/**
 * 용어 스토어
 * @deprecated unified-store의 termDataStore를 사용하세요.
 * 하위 호환성을 위해 유지됩니다.
 */
import { writable } from 'svelte/store';
import { termDataStore } from './unified-store';

const _store = writable({
	selectedFilename: 'term.json'
});

// unified-store와 동기화
termDataStore.subscribe((state) => {
	_store.set({ selectedFilename: state.selectedFilename });
});

export const termStore = _store;
