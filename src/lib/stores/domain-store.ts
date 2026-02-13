/**
 * 도메인 스토어
 * @deprecated unified-store의 domainDataStore를 사용하세요.
 * 하위 호환성을 위해 유지됩니다.
 */
import { writable } from 'svelte/store';
import { domainDataStore } from './unified-store';

const _store = writable({
	selectedFilename: 'domain.json'
});

// unified-store와 동기화
domainDataStore.subscribe((state) => {
	_store.set({ selectedFilename: state.selectedFilename });
});

export const domainStore = _store;
