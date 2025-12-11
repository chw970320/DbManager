import { writable } from 'svelte/store';

export const domainStore = writable({
	selectedFilename: 'domain.json'
});
