import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { HistoryData, HistoryLogEntry } from '$lib/types/vocabulary';
// vocabulary 기준으로 주석 정리

// 히스토리 데이터 저장 경로 설정
const DATA_DIR = 'static/data';
const HISTORY_FILE = 'history.json';
const HISTORY_PATH = join(DATA_DIR, HISTORY_FILE);

/**
 * 데이터 디렉토리가 존재하는지 확인하고 없으면 생성
 */
export async function ensureDataDirectory(): Promise<void> {
	try {
		if (!existsSync(DATA_DIR)) {
			await mkdir(DATA_DIR, { recursive: true });
		}
	} catch (error) {
		console.error('데이터 디렉토리 생성 실패:', error);
		throw new Error(
			`데이터 디렉토리 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 히스토리 데이터를 JSON 파일로 저장
 * @param data - 저장할 HistoryData 객체
 */
export async function saveHistoryData(data: HistoryData): Promise<void> {
	try {
		// 데이터 디렉토리 확인 및 생성
		await ensureDataDirectory();

		// 데이터 유효성 검증
		if (!data || !Array.isArray(data.logs)) {
			throw new Error('유효하지 않은 히스토리 데이터입니다.');
		}

		// 각 로그 엔트리 기본 유효성 검증
		const validLogs = data.logs.filter((log) => {
			const isValid = log.id && log.action && log.targetId && log.targetName && log.timestamp;
			if (!isValid) {
				console.warn('유효하지 않은 히스토리 로그 제외:', log);
			}
			return isValid;
		});

		// 최종 데이터 객체 구성
		const finalData: HistoryData = {
			logs: validLogs,
			lastUpdated: new Date().toISOString(),
			totalCount: validLogs.length
		};

		// JSON 파일로 저장 (들여쓰기 포함)
		const jsonString = JSON.stringify(finalData, null, 2);
		await writeFile(HISTORY_PATH, jsonString, 'utf-8');
	} catch (error) {
		console.error('히스토리 데이터 저장 실패:', error);
		throw new Error(
			`히스토리 데이터 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 저장된 히스토리 데이터를 JSON 파일에서 로드
 * @returns 로드된 HistoryData 객체
 */
export async function loadHistoryData(filename?: string): Promise<HistoryData> {
	try {
		// 파일 존재 확인
		if (!existsSync(HISTORY_PATH)) {
			return {
				logs: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			};
		}

		// 파일 읽기
		const jsonString = await readFile(HISTORY_PATH, 'utf-8');

		if (!jsonString.trim()) {
			console.warn('히스토리 데이터 파일이 비어있습니다.');
			return {
				logs: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			};
		}

		// JSON 파싱
		const data = JSON.parse(jsonString) as HistoryData;

		// 데이터 구조 검증
		if (!data || typeof data !== 'object') {
			throw new Error('히스토리 데이터 형식이 올바르지 않습니다.');
		}

		if (!Array.isArray(data.logs)) {
			throw new Error('히스토리 로그 데이터가 배열이 아닙니다.');
		}

		// 각 로그 엔트리 기본 유효성 검증 및 필터링
		let validLogs = data.logs.filter((log) => {
			const isValid = log.id && log.action && log.targetId && log.targetName && log.timestamp;
			if (!isValid) {
				console.warn('로드 중 유효하지 않은 히스토리 로그 발견:', log);
			}
			return isValid;
		});

		// 파일명으로 필터링 (filename이 제공된 경우)
		if (filename) {
			validLogs = validLogs.filter((log) => !log.filename || log.filename === filename);
		}

		return {
			logs: validLogs,
			lastUpdated: data.lastUpdated || new Date().toISOString(),
			totalCount: validLogs.length
		};
	} catch (error) {
		console.error('히스토리 데이터 로드 실패:', error);

		// JSON 파싱 오류인 경우 더 구체적인 메시지
		if (error instanceof SyntaxError) {
			throw new Error('히스토리 데이터 파일 형식이 손상되었습니다.');
		}

		throw new Error(
			`히스토리 데이터 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 새로운 히스토리 로그 엔트리를 추가
 * @param newLog - 추가할 새로운 히스토리 로그 엔트리
 * @returns 업데이트된 HistoryData 객체
 */
export async function addHistoryLog(newLog: HistoryLogEntry): Promise<HistoryData> {
	try {
		// 기존 히스토리 데이터 로드
		const existingData = await loadHistoryData();

		// 새 로그를 배열 맨 앞에 추가 (최신 로그가 먼저 오도록)
		const updatedLogs = [newLog, ...existingData.logs];

		// 업데이트된 데이터 객체 생성
		const updatedData: HistoryData = {
			logs: updatedLogs,
			lastUpdated: new Date().toISOString(),
			totalCount: updatedLogs.length
		};

		// 업데이트된 데이터 저장
		await saveHistoryData(updatedData);

		return updatedData;
	} catch (error) {
		console.error('히스토리 로그 추가 실패:', error);
		throw new Error(
			`히스토리 로그 추가 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 히스토리 데이터 파일의 백업 생성
 * @returns 백업 파일 경로
 */
export async function createHistoryBackup(): Promise<string> {
	try {
		if (!existsSync(HISTORY_PATH)) {
			throw new Error('백업할 히스토리 데이터 파일이 존재하지 않습니다.');
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const backupFileName = `history_backup_${timestamp}.json`;
		const backupPath = join(DATA_DIR, backupFileName);

		const originalData = await readFile(HISTORY_PATH, 'utf-8');
		await writeFile(backupPath, originalData, 'utf-8');

		return backupPath;
	} catch (error) {
		console.error('히스토리 백업 생성 실패:', error);
		throw new Error(
			`히스토리 백업 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 히스토리 데이터를 초기화 (모든 로그 삭제)
 * @param createBackup - 초기화 전 백업 생성 여부 (기본값: true)
 * @returns 초기화된 빈 HistoryData 객체
 */
export async function clearHistoryData(createBackup: boolean = true): Promise<HistoryData> {
	try {
		// 백업 생성 (요청된 경우)
		if (createBackup && existsSync(HISTORY_PATH)) {
			await createHistoryBackup();
		}

		// 빈 히스토리 데이터 생성
		const emptyData: HistoryData = {
			logs: [],
			lastUpdated: new Date().toISOString(),
			totalCount: 0
		};

		// 빈 데이터로 파일 저장
		await saveHistoryData(emptyData);

		return emptyData;
	} catch (error) {
		console.error('히스토리 데이터 초기화 실패:', error);
		throw new Error(
			`히스토리 데이터 초기화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}
