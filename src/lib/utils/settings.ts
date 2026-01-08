import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const SETTINGS_DIR = 'static/global';
const SETTINGS_FILE = 'settings.json';
const SETTINGS_PATH = join(SETTINGS_DIR, SETTINGS_FILE);

export interface Settings {
	showVocabularySystemFiles: boolean;
	showDomainSystemFiles: boolean;
	showTermSystemFiles: boolean;
	showDatabaseSystemFiles: boolean;
	showEntitySystemFiles: boolean;
	showAttributeSystemFiles: boolean;
	showTableSystemFiles: boolean;
	showColumnSystemFiles: boolean;
}

const DEFAULT_SETTINGS: Settings = {
	showVocabularySystemFiles: false,
	showDomainSystemFiles: false,
	showTermSystemFiles: false,
	showDatabaseSystemFiles: false,
	showEntitySystemFiles: false,
	showAttributeSystemFiles: false,
	showTableSystemFiles: false,
	showColumnSystemFiles: false
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
	try {
		await ensureSettingsDirectory();

		if (!existsSync(SETTINGS_PATH)) {
			// 설정 파일이 없으면 기본값으로 생성
			await saveSettings(DEFAULT_SETTINGS);
			return DEFAULT_SETTINGS;
		}

		const content = await readFile(SETTINGS_PATH, 'utf-8');
		if (!content.trim()) {
			return DEFAULT_SETTINGS;
		}

		const settings = JSON.parse(content) as Partial<Settings>;
		return {
			...DEFAULT_SETTINGS,
			...settings
		};
	} catch (error) {
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
	return settings.showVocabularySystemFiles ?? false;
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
	return settings.showDomainSystemFiles ?? false;
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
 * 용어 시스템 파일 표시 설정 가져오기
 */
export async function getShowTermSystemFiles(): Promise<boolean> {
	const settings = await loadSettings();
	return settings.showTermSystemFiles ?? false;
}

/**
 * 용어 시스템 파일 표시 설정 저장
 */
export async function setShowTermSystemFiles(value: boolean): Promise<void> {
	const settings = await loadSettings();
	settings.showTermSystemFiles = value;
	await saveSettings(settings);
}

/**
 * 데이터베이스 시스템 파일 표시 설정 가져오기
 */
export async function getShowDatabaseSystemFiles(): Promise<boolean> {
	const settings = await loadSettings();
	return settings.showDatabaseSystemFiles ?? false;
}

/**
 * 데이터베이스 시스템 파일 표시 설정 저장
 */
export async function setShowDatabaseSystemFiles(value: boolean): Promise<void> {
	const settings = await loadSettings();
	settings.showDatabaseSystemFiles = value;
	await saveSettings(settings);
}

/**
 * 엔터티 시스템 파일 표시 설정 가져오기
 */
export async function getShowEntitySystemFiles(): Promise<boolean> {
	const settings = await loadSettings();
	return settings.showEntitySystemFiles ?? false;
}

/**
 * 엔터티 시스템 파일 표시 설정 저장
 */
export async function setShowEntitySystemFiles(value: boolean): Promise<void> {
	const settings = await loadSettings();
	settings.showEntitySystemFiles = value;
	await saveSettings(settings);
}

/**
 * 속성 시스템 파일 표시 설정 가져오기
 */
export async function getShowAttributeSystemFiles(): Promise<boolean> {
	const settings = await loadSettings();
	return settings.showAttributeSystemFiles ?? false;
}

/**
 * 속성 시스템 파일 표시 설정 저장
 */
export async function setShowAttributeSystemFiles(value: boolean): Promise<void> {
	const settings = await loadSettings();
	settings.showAttributeSystemFiles = value;
	await saveSettings(settings);
}

/**
 * 테이블 시스템 파일 표시 설정 가져오기
 */
export async function getShowTableSystemFiles(): Promise<boolean> {
	const settings = await loadSettings();
	return settings.showTableSystemFiles ?? false;
}

/**
 * 테이블 시스템 파일 표시 설정 저장
 */
export async function setShowTableSystemFiles(value: boolean): Promise<void> {
	const settings = await loadSettings();
	settings.showTableSystemFiles = value;
	await saveSettings(settings);
}

/**
 * 컬럼 시스템 파일 표시 설정 가져오기
 */
export async function getShowColumnSystemFiles(): Promise<boolean> {
	const settings = await loadSettings();
	return settings.showColumnSystemFiles ?? false;
}

/**
 * 컬럼 시스템 파일 표시 설정 저장
 */
export async function setShowColumnSystemFiles(value: boolean): Promise<void> {
	const settings = await loadSettings();
	settings.showColumnSystemFiles = value;
	await saveSettings(settings);
}

/**
 * @deprecated 단어집과 도메인 설정이 분리되었습니다. getShowVocabularySystemFiles 또는 getShowDomainSystemFiles를 사용하세요.
 */
export async function getShowSystemFiles(): Promise<boolean> {
	const settings = await loadSettings();
	return settings.showVocabularySystemFiles ?? false;
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
export async function setAllSettings(settings: Partial<Settings>): Promise<void> {
	const currentSettings = await loadSettings();
	const updatedSettings: Settings = {
		...currentSettings,
		...settings
	};
	await saveSettings(updatedSettings);
}
