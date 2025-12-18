import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface Settings {
	showVocabularySystemFiles: boolean;
	showDomainSystemFiles: boolean;
	showTermSystemFiles: boolean;
}

export const settingsStore = writable<Settings>({
	showVocabularySystemFiles: false,
	showDomainSystemFiles: false,
	showTermSystemFiles: false
});

// 초기값 로드 (클라이언트 사이드에서만)
if (browser) {
	// API를 통해 설정 로드
	fetch('/api/settings')
		.then((res) => res.json())
		.then((result) => {
			if (result.success && result.data) {
				settingsStore.set({
					showVocabularySystemFiles: result.data.showVocabularySystemFiles ?? false,
					showDomainSystemFiles: result.data.showDomainSystemFiles ?? false,
					showTermSystemFiles: result.data.showTermSystemFiles ?? false
				});
			}
		})
		.catch((error) => {
			console.error('설정 초기값 로드 실패:', error);
		});
}

// 설정 변경 시 API를 통해 저장 (클라이언트 사이드에서만)
if (browser) {
	let isUpdatingFromApi = false;

	settingsStore.subscribe(async (settings) => {
		if (isUpdatingFromApi) return;

		try {
			isUpdatingFromApi = true;
			await fetch('/api/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					showVocabularySystemFiles: settings.showVocabularySystemFiles,
					showDomainSystemFiles: settings.showDomainSystemFiles,
					showTermSystemFiles: settings.showTermSystemFiles
				})
			});
			isUpdatingFromApi = false;
		} catch (error) {
			console.error('설정 저장 실패:', error);
		}
	});
}
