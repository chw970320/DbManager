/**
 * 단어집 스토어
 * @deprecated unified-store의 vocabularyDataStore를 사용하세요.
 * 하위 호환성을 위해 유지됩니다.
 */
import { vocabularyDataStore } from './unified-store';

// unified-store에서 가져온 스토어를 기존 API 형태로 내보냄
// 기존: writable({ selectedFilename, selectedDomainFilename })
// 신규: writable({ selectedFilename })
// selectedDomainFilename은 mapping-registry로 이전되었으므로,
// 하위 호환성을 위해 derived store로 변환
import { derived, writable } from 'svelte/store';
import { domainDataStore } from './unified-store';

interface LegacyVocabularyStoreState {
	selectedFilename: string;
	selectedDomainFilename: string;
}

// 기존 코드와 동일한 인터페이스를 제공하는 writable store
const _store = writable<LegacyVocabularyStoreState>({
	selectedFilename: 'vocabulary.json',
	selectedDomainFilename: 'domain.json'
});

// unified-store와 동기화
vocabularyDataStore.subscribe((state) => {
	_store.update((s) => ({ ...s, selectedFilename: state.selectedFilename }));
});

domainDataStore.subscribe((state) => {
	_store.update((s) => ({ ...s, selectedDomainFilename: state.selectedFilename }));
});

export const vocabularyStore = _store;
