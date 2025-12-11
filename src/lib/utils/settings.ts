import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const SETTINGS_DIR = 'static/global';
const SETTINGS_FILE = 'settings.json';
const SETTINGS_PATH = join(SETTINGS_DIR, SETTINGS_FILE);

interface Settings {
	showVocabularySystemFiles: boolean;
	showDomainSystemFiles: boolean;
}

const DEFAULT_SETTINGS: Settings = {
	showVocabularySystemFiles: true,
	showDomainSystemFiles: true
};

/**
 * 설정 디렉토리 확인 및 생성
 */
async function ensureSettingsDirectory(): Promise<void> {
	try {
		if (!existsSync(SETTINGS_DIR)) {
			await mkdir(SETTINGS_DIR, { recursive: true });
		}
	} catch (error) {
		console.error('설정 디렉토리 생성 실패:', error);
		throw new Error(
			`설정 디렉토리 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 설정 파일 로드
 */
async function loadSettings(): Promise<Settings> {
	// #region agent log
	fetch('http://127.0.0.1:7243/ingest/96f8572e-efc8-49db-b3c0-8dba0f2c9491',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings.ts:loadSettings:entry',message:'loadSettings 시작',data:{path:SETTINGS_PATH},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
	// #endregion
	try {
		await ensureSettingsDirectory();
		// #region agent log
		fetch('http://127.0.0.1:7243/ingest/96f8572e-efc8-49db-b3c0-8dba0f2c9491',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings.ts:loadSettings:afterEnsure',message:'디렉토리 확인 완료',data:{exists:existsSync(SETTINGS_PATH)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
		// #endregion

		if (!existsSync(SETTINGS_PATH)) {
			// #region agent log
			fetch('http://127.0.0.1:7243/ingest/96f8572e-efc8-49db-b3c0-8dba0f2c9491',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings.ts:loadSettings:fileNotExists',message:'설정 파일 없음, 기본값 생성',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
			// #endregion
			// 설정 파일이 없으면 기본값으로 생성
			await saveSettings(DEFAULT_SETTINGS);
			return DEFAULT_SETTINGS;
		}

		const content = await readFile(SETTINGS_PATH, 'utf-8');
		// #region agent log
		fetch('http://127.0.0.1:7243/ingest/96f8572e-efc8-49db-b3c0-8dba0f2c9491',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings.ts:loadSettings:afterRead',message:'파일 읽기 완료',data:{contentLength:content.length,isEmpty:!content.trim()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
		// #endregion
		if (!content.trim()) {
			return DEFAULT_SETTINGS;
		}

		const settings = JSON.parse(content) as Settings;
		// #region agent log
		fetch('http://127.0.0.1:7243/ingest/96f8572e-efc8-49db-b3c0-8dba0f2c9491',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings.ts:loadSettings:afterParse',message:'JSON 파싱 완료',data:{parsed:settings},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
		// #endregion
		return {
			...DEFAULT_SETTINGS,
			...settings
		};
	} catch (error) {
		// #region agent log
		fetch('http://127.0.0.1:7243/ingest/96f8572e-efc8-49db-b3c0-8dba0f2c9491',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings.ts:loadSettings:error',message:'설정 로드 실패',data:{error:error instanceof Error?error.message:String(error),stack:error instanceof Error?error.stack:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
		// #endregion
		console.error('설정 로드 실패:', error);
		return DEFAULT_SETTINGS;
	}
}

/**
 * 설정 파일 저장
 */
async function saveSettings(settings: Settings): Promise<void> {
	try {
		await ensureSettingsDirectory();
		await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
	} catch (error) {
		console.error('설정 저장 실패:', error);
		throw new Error(
			`설정 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 단어집 시스템 파일 표시 설정 가져오기
 */
export async function getShowVocabularySystemFiles(): Promise<boolean> {
	const settings = await loadSettings();
	return settings.showVocabularySystemFiles ?? true;
}

/**
 * 단어집 시스템 파일 표시 설정 저장
 */
export async function setShowVocabularySystemFiles(value: boolean): Promise<void> {
	const settings = await loadSettings();
	settings.showVocabularySystemFiles = value;
	await saveSettings(settings);
}

/**
 * 도메인 시스템 파일 표시 설정 가져오기
 */
export async function getShowDomainSystemFiles(): Promise<boolean> {
	const settings = await loadSettings();
	return settings.showDomainSystemFiles ?? true;
}

/**
 * 도메인 시스템 파일 표시 설정 저장
 */
export async function setShowDomainSystemFiles(value: boolean): Promise<void> {
	const settings = await loadSettings();
	settings.showDomainSystemFiles = value;
	await saveSettings(settings);
}

/**
 * @deprecated 단어집과 도메인 설정이 분리되었습니다. getShowVocabularySystemFiles 또는 getShowDomainSystemFiles를 사용하세요.
 */
export async function getShowSystemFiles(): Promise<boolean> {
	const settings = await loadSettings();
	return settings.showVocabularySystemFiles ?? true;
}

/**
 * @deprecated 단어집과 도메인 설정이 분리되었습니다. setShowVocabularySystemFiles 또는 setShowDomainSystemFiles를 사용하세요.
 */
export async function setShowSystemFiles(value: boolean): Promise<void> {
	const settings = await loadSettings();
	settings.showVocabularySystemFiles = value;
	settings.showDomainSystemFiles = value;
	await saveSettings(settings);
}

/**
 * 모든 설정 가져오기
 */
export async function getAllSettings(): Promise<Settings> {
	return await loadSettings();
}

/**
 * 모든 설정 저장
 */
export async function setAllSettings(settings: Settings): Promise<void> {
	await saveSettings(settings);
}

