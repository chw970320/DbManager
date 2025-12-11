import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface Settings {
	showVocabularySystemFiles: boolean;
	showDomainSystemFiles: boolean;
}

export const settingsStore = writable<Settings>({
	showVocabularySystemFiles: true,
	showDomainSystemFiles: true
});

// 초기값 로드 (클라이언트 사이드에서만)
if (browser) {
	// #region agent log
	fetch('http://127.0.0.1:7243/ingest/96f8572e-efc8-49db-b3c0-8dba0f2c9491',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-store.ts:init:entry',message:'초기값 로드 시작 (브라우저)',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
	// #endregion
	// API를 통해 설정 로드
	fetch('/api/settings')
		.then((res) => res.json())
		.then((result) => {
			// #region agent log
			fetch('http://127.0.0.1:7243/ingest/96f8572e-efc8-49db-b3c0-8dba0f2c9491',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-store.ts:init:afterApiLoad',message:'API에서 설정 로드 완료',data:{result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
			// #endregion
			if (result.success && result.data) {
				settingsStore.set({
					showVocabularySystemFiles: result.data.showVocabularySystemFiles ?? true,
					showDomainSystemFiles: result.data.showDomainSystemFiles ?? true
				});
			}
		})
		.catch((error) => {
			// #region agent log
			fetch('http://127.0.0.1:7243/ingest/96f8572e-efc8-49db-b3c0-8dba0f2c9491',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-store.ts:init:error',message:'초기값 로드 실패',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
			// #endregion
			console.error('설정 초기값 로드 실패:', error);
		});
}

// 설정 변경 시 API를 통해 저장 (클라이언트 사이드에서만)
if (browser) {
	let isUpdatingFromApi = false;

	settingsStore.subscribe(async (settings) => {
		// #region agent log
		fetch('http://127.0.0.1:7243/ingest/96f8572e-efc8-49db-b3c0-8dba0f2c9491',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-store.ts:subscribe:entry',message:'store 구독 트리거',data:{settings,isUpdatingFromApi},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
		// #endregion
		if (isUpdatingFromApi) return;

		try {
			// #region agent log
			fetch('http://127.0.0.1:7243/ingest/96f8572e-efc8-49db-b3c0-8dba0f2c9491',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-store.ts:subscribe:beforeSave',message:'설정 저장 시작 (API)',data:{settings},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
			// #endregion
			isUpdatingFromApi = true;
			const response = await fetch('/api/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					showVocabularySystemFiles: settings.showVocabularySystemFiles,
					showDomainSystemFiles: settings.showDomainSystemFiles
				})
			});
			const result = await response.json();
			// #region agent log
			fetch('http://127.0.0.1:7243/ingest/96f8572e-efc8-49db-b3c0-8dba0f2c9491',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-store.ts:subscribe:afterSave',message:'설정 저장 완료 (API)',data:{result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
			// #endregion
			isUpdatingFromApi = false;
		} catch (error) {
			// #region agent log
			fetch('http://127.0.0.1:7243/ingest/96f8572e-efc8-49db-b3c0-8dba0f2c9491',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings-store.ts:subscribe:error',message:'설정 저장 실패',data:{error:error instanceof Error?error.message:String(error),stack:error instanceof Error?error.stack:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
			// #endregion
			console.error('설정 저장 실패:', error);
		}
	});
}

