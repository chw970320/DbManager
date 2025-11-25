import { writable } from 'svelte/store';

export const vocabularyStore = writable({
	selectedFilename: 'vocabulary.json'
});
