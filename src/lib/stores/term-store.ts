import { writable } from 'svelte/store';

export const termStore = writable({
	selectedFilename: 'term.json'
});

