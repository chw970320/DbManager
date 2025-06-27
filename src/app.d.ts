/// <reference types="@sveltejs/kit" />

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

declare module 'svelte-copy-to-clipboard' {
	import type { SvelteComponent } from 'svelte';
	export default class CopyToClipboard extends SvelteComponent { }
}

export { };
