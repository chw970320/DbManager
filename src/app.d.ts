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

	// Window 인터페이스 확장 - 히스토리 로그 새로고침 함수들
	interface Window {
		refreshHistoryLog?: () => void;
		refreshDomainHistoryLog?: () => void;
		refreshTermHistoryLog?: () => void;
	}
}

declare module 'svelte-copy-to-clipboard' {
	import type { SvelteComponent } from 'svelte';
	export default class CopyToClipboard extends SvelteComponent {}
}

export {};
