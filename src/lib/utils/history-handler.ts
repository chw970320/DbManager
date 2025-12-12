import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { HistoryData, HistoryLogEntry } from '$lib/types/vocabulary';
import type { DomainHistoryData, DomainHistoryLogEntry } from '$lib/types/domain';
import type { TermHistoryData, TermHistoryLogEntry } from '$lib/types/term';
import {
	isHistoryData,
	isDomainHistoryData,
	isTermHistoryData,
	TypeValidationError
} from './type-guards';
import { withFileLock } from './file-lock';

// 히스토리 타입 정의
export type HistoryType = 'vocabulary' | 'domain' | 'term';

// 히스토리 데이터 저장 경로 설정
const DATA_DIR = 'static/data';

/**
 * 히스토리 타입에 따른 파일 경로 반환
 */
function getHistoryPath(type: HistoryType = 'vocabulary'): string {
	let subDir = 'vocabulary';
	if (type === 'domain') {
		subDir = 'domain';
	} else if (type === 'term') {
		subDir = 'term';
	}
	return join(DATA_DIR, subDir, 'history.json');
}

/**
 * 데이터 디렉토리가 존재하는지 확인하고 없으면 생성
 */
export async function ensureDataDirectory(type: HistoryType = 'vocabulary'): Promise<void> {
	try {
		const historyPath = getHistoryPath(type);
		const dirPath = join(historyPath, '..');
		if (!existsSync(dirPath)) {
			await mkdir(dirPath, { recursive: true });
		}
	} catch (error) {
		console.error('데이터 디렉토리 생성 실패:', error);
		throw new Error(
			`데이터 디렉토리 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 히스토리 데이터를 JSON 파일로 저장 (파일 락 적용)
 * @param data - 저장할 HistoryData, DomainHistoryData 또는 TermHistoryData 객체
 * @param type - 히스토리 타입 ('vocabulary' | 'domain' | 'term', 기본값: 'vocabulary')
 */
export async function saveHistoryData(
	data: HistoryData | DomainHistoryData | TermHistoryData,
	type: HistoryType = 'vocabulary'
): Promise<void> {
	try {
		// 데이터 디렉토리 확인 및 생성
		await ensureDataDirectory(type);

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
		const finalData = {
			logs: validLogs,
			lastUpdated: new Date().toISOString(),
			totalCount: validLogs.length
		};

		const historyPath = getHistoryPath(type);

		// 파일 락을 사용한 안전한 저장
		await withFileLock(historyPath, async () => {
			const jsonString = JSON.stringify(finalData, null, 2);
			await writeFile(historyPath, jsonString, 'utf-8');
		});
	} catch (error) {
		console.error('히스토리 데이터 저장 실패:', error);
		throw new Error(
			`히스토리 데이터 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 저장된 히스토리 데이터를 JSON 파일에서 로드
 * @param filename - 필터링할 파일명 (선택사항)
 * @param type - 히스토리 타입 ('vocabulary' | 'domain' | 'term', 기본값: 'vocabulary')
 * @returns 로드된 HistoryData, DomainHistoryData 또는 TermHistoryData 객체
 * @throws TypeValidationError - 타입 검증 실패 시
 */
export async function loadHistoryData(
	filename?: string,
	type: HistoryType = 'vocabulary'
): Promise<HistoryData | DomainHistoryData | TermHistoryData> {
	try {
		const historyPath = getHistoryPath(type);

		// 파일 존재 확인
		if (!existsSync(historyPath)) {
			return {
				logs: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			};
		}

		// 파일 읽기
		const jsonString = await readFile(historyPath, 'utf-8');

		if (!jsonString.trim()) {
			console.warn('히스토리 데이터 파일이 비어있습니다.');
			return {
				logs: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			};
		}

		// JSON 파싱
		let parsed: unknown;
		try {
			parsed = JSON.parse(jsonString);
		} catch (error) {
			throw new Error('히스토리 데이터 파일 형식이 손상되었습니다.');
		}

		// 타입별 타입 가드로 검증
		let data: HistoryData | DomainHistoryData | TermHistoryData;
		const typeNames: Record<HistoryType, string> = {
			vocabulary: 'HistoryData',
			domain: 'DomainHistoryData',
			term: 'TermHistoryData'
		};

		if (type === 'vocabulary') {
			if (!isHistoryData(parsed)) {
				throw new TypeValidationError(
					`타입 검증 실패: ${typeNames[type]} 형식과 일치하지 않습니다.`,
					typeNames[type],
					parsed
				);
			}
			data = parsed;
		} else if (type === 'domain') {
			if (!isDomainHistoryData(parsed)) {
				throw new TypeValidationError(
					`타입 검증 실패: ${typeNames[type]} 형식과 일치하지 않습니다.`,
					typeNames[type],
					parsed
				);
			}
			data = parsed;
		} else {
			if (!isTermHistoryData(parsed)) {
				throw new TypeValidationError(
					`타입 검증 실패: ${typeNames[type]} 형식과 일치하지 않습니다.`,
					typeNames[type],
					parsed
				);
			}
			data = parsed;
		}

		// 파일명으로 필터링 (filename이 제공된 경우)
		let filteredLogs = data.logs;
		if (filename) {
			filteredLogs = data.logs.filter((log) => {
				// HistoryLogEntry에는 filename이 있고, DomainHistoryLogEntry에는 없을 수 있음
				const logFilename = 'filename' in log ? log.filename : undefined;
				return !logFilename || logFilename === filename;
			});
		}

		return {
			logs: filteredLogs,
			lastUpdated: data.lastUpdated || new Date().toISOString(),
			totalCount: filteredLogs.length
		};
	} catch (error) {
		console.error('히스토리 데이터 로드 실패:', error);

		if (error instanceof TypeValidationError) {
			throw new Error(`히스토리 데이터 형식 오류: ${error.message}`);
		}

		throw new Error(
			`히스토리 데이터 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 새로운 히스토리 로그 엔트리를 추가
 * @param newLog - 추가할 새로운 히스토리 로그 엔트리
 * @param type - 히스토리 타입 ('vocabulary' | 'domain' | 'term', 기본값: 'vocabulary')
 * @returns 업데이트된 HistoryData, DomainHistoryData 또는 TermHistoryData 객체
 */
export async function addHistoryLog(
	newLog: HistoryLogEntry | DomainHistoryLogEntry | TermHistoryLogEntry,
	type: HistoryType = 'vocabulary'
): Promise<HistoryData | DomainHistoryData | TermHistoryData> {
	try {
		// 기존 히스토리 데이터 로드
		const existingData = await loadHistoryData(undefined, type);

		// 새 로그를 배열 맨 앞에 추가 (최신 로그가 먼저 오도록)
		const updatedLogs = [newLog, ...existingData.logs];

		// 업데이트된 데이터 객체 생성
		const updatedData = {
			logs: updatedLogs,
			lastUpdated: new Date().toISOString(),
			totalCount: updatedLogs.length
		};

		// 업데이트된 데이터 저장
		await saveHistoryData(updatedData, type);

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
 * @param type - 히스토리 타입 ('vocabulary' | 'domain' | 'term', 기본값: 'vocabulary')
 * @returns 백업 파일 경로
 */
export async function createHistoryBackup(type: HistoryType = 'vocabulary'): Promise<string> {
	try {
		const historyPath = getHistoryPath(type);
		if (!existsSync(historyPath)) {
			throw new Error('백업할 히스토리 데이터 파일이 존재하지 않습니다.');
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const backupFileName = `${type}_history_backup_${timestamp}.json`;
		const dirPath = join(historyPath, '..');
		const backupPath = join(dirPath, backupFileName);

		const originalData = await readFile(historyPath, 'utf-8');
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
 * @param type - 히스토리 타입 ('vocabulary' | 'domain' | 'term', 기본값: 'vocabulary')
 * @returns 초기화된 빈 HistoryData, DomainHistoryData 또는 TermHistoryData 객체
 */
export async function clearHistoryData(
	createBackup: boolean = true,
	type: HistoryType = 'vocabulary'
): Promise<HistoryData | DomainHistoryData | TermHistoryData> {
	try {
		const historyPath = getHistoryPath(type);

		// 백업 생성 (요청된 경우)
		if (createBackup && existsSync(historyPath)) {
			await createHistoryBackup(type);
		}

		// 빈 히스토리 데이터 생성
		const emptyData = {
			logs: [],
			lastUpdated: new Date().toISOString(),
			totalCount: 0
		};

		// 빈 데이터로 파일 저장
		await saveHistoryData(emptyData, type);

		return emptyData;
	} catch (error) {
		console.error('히스토리 데이터 초기화 실패:', error);
		throw new Error(
			`히스토리 데이터 초기화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}
