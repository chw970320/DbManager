/**
 * 파일 락 메커니즘 및 원자적 쓰기
 * 동시 파일 접근으로 인한 데이터 손실을 방지합니다.
 */

import { writeFile, readFile, unlink, stat, rename, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';

// 락 설정
const LOCK_TIMEOUT_MS = 30000; // 30초 타임아웃
const LOCK_RETRY_INTERVAL_MS = 100; // 100ms 재시도 간격
const LOCK_MAX_RETRIES = 300; // 최대 30초 대기 (100ms * 300)
const STALE_LOCK_THRESHOLD_MS = 60000; // 60초 이상 된 락은 stale로 간주

// 메모리 내 락 관리 (같은 프로세스 내 동시성 처리)
const inMemoryLocks = new Map<string, { acquiredAt: number; owner: string }>();

/**
 * 락 파일 경로 생성
 */
function getLockPath(filePath: string): string {
	return `${filePath}.lock`;
}

/**
 * 고유 락 소유자 ID 생성
 */
function generateLockOwner(): string {
	return `${process.pid}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 락 파일 내용 인터페이스
 */
interface LockContent {
	owner: string;
	acquiredAt: number;
	pid: number;
}

/**
 * 락 파일이 stale(만료)인지 확인
 */
async function isLockStale(lockPath: string): Promise<boolean> {
	try {
		if (!existsSync(lockPath)) {
			return true;
		}

		const content = await readFile(lockPath, 'utf-8');
		const lockData: LockContent = JSON.parse(content);
		const age = Date.now() - lockData.acquiredAt;

		return age > STALE_LOCK_THRESHOLD_MS;
	} catch {
		// 락 파일 읽기 실패 시 stale로 간주
		return true;
	}
}

/**
 * 락 획득
 * @param filePath - 락을 걸 파일 경로
 * @param options - 옵션 (timeout, retries)
 * @returns 락 해제 함수
 * @throws 락 획득 실패 시 에러
 */
export async function acquireLock(
	filePath: string,
	options: {
		timeout?: number;
		maxRetries?: number;
	} = {}
): Promise<() => Promise<void>> {
	const lockPath = getLockPath(filePath);
	const owner = generateLockOwner();
	const maxRetries = options.maxRetries ?? LOCK_MAX_RETRIES;
	const timeout = options.timeout ?? LOCK_TIMEOUT_MS;

	let retries = 0;
	const startTime = Date.now();

	while (retries < maxRetries) {
		// 타임아웃 체크
		if (Date.now() - startTime > timeout) {
			throw new Error(`파일 락 획득 타임아웃: ${filePath}`);
		}

		// 메모리 락 체크 (같은 프로세스 내)
		const memoryLock = inMemoryLocks.get(filePath);
		if (memoryLock) {
			// 메모리 락이 stale인지 확인
			if (Date.now() - memoryLock.acquiredAt > STALE_LOCK_THRESHOLD_MS) {
				inMemoryLocks.delete(filePath);
			} else {
				retries++;
				await sleep(LOCK_RETRY_INTERVAL_MS);
				continue;
			}
		}

		// 파일 락 체크
		if (existsSync(lockPath)) {
			// stale 락 확인
			if (await isLockStale(lockPath)) {
				// stale 락 제거
				try {
					await unlink(lockPath);
				} catch {
					// 다른 프로세스가 이미 제거했을 수 있음
				}
			} else {
				retries++;
				await sleep(LOCK_RETRY_INTERVAL_MS);
				continue;
			}
		}

		// 락 획득 시도
		try {
			const lockContent: LockContent = {
				owner,
				acquiredAt: Date.now(),
				pid: process.pid
			};

			// 원자적 파일 쓰기 (wx 플래그: 파일이 없을 때만 생성)
			await writeFile(lockPath, JSON.stringify(lockContent), { flag: 'wx' });

			// 메모리 락도 설정
			inMemoryLocks.set(filePath, { acquiredAt: Date.now(), owner });

			// 락 해제 함수 반환
			return async () => {
				try {
					// 메모리 락 해제
					inMemoryLocks.delete(filePath);

					// 락 파일이 우리 것인지 확인 후 삭제
					if (existsSync(lockPath)) {
						const content = await readFile(lockPath, 'utf-8');
						const lockData: LockContent = JSON.parse(content);
						if (lockData.owner === owner) {
							await unlink(lockPath);
						}
					}
				} catch (error) {
					console.warn('락 해제 중 오류:', error);
				}
			};
		} catch (error) {
			// EEXIST: 파일이 이미 존재 (다른 프로세스가 먼저 락 획득)
			if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
				retries++;
				await sleep(LOCK_RETRY_INTERVAL_MS);
				continue;
			}
			throw error;
		}
	}

	throw new Error(`파일 락 획득 실패 (최대 재시도 횟수 초과): ${filePath}`);
}

/**
 * 락을 걸고 작업 수행 후 자동 해제
 * @param filePath - 락을 걸 파일 경로
 * @param operation - 수행할 작업
 * @returns 작업 결과
 */
export async function withFileLock<T>(filePath: string, operation: () => Promise<T>): Promise<T> {
	const releaseLock = await acquireLock(filePath);

	try {
		return await operation();
	} finally {
		await releaseLock();
	}
}

/**
 * sleep 유틸리티
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 모든 락 강제 해제 (테스트/긴급 상황용)
 */
export async function forceReleaseAllLocks(): Promise<void> {
	inMemoryLocks.clear();
	console.warn('모든 메모리 락이 강제 해제되었습니다.');
}

/**
 * 현재 락 상태 조회 (디버깅용)
 */
export function getLockStatus(): Map<string, { acquiredAt: number; owner: string }> {
	return new Map(inMemoryLocks);
}

// ============================================================================
// 원자적 쓰기 (Atomic Write)
// ============================================================================

/**
 * 임시 파일 경로 생성
 */
function getTempPath(filePath: string): string {
	const dir = dirname(filePath);
	const timestamp = Date.now();
	const random = Math.random().toString(36).substr(2, 9);
	return join(dir, `.tmp_${timestamp}_${random}.json`);
}

/**
 * 백업 파일 경로 생성
 */
function getBackupPath(filePath: string): string {
	return `${filePath}.backup`;
}

/**
 * 원자적 파일 쓰기
 * 1. 임시 파일에 쓰기
 * 2. 기존 파일 백업 (존재하는 경우)
 * 3. 임시 파일을 원본 위치로 rename
 * 4. 백업 파일 삭제
 *
 * @param filePath - 저장할 파일 경로
 * @param content - 저장할 내용
 * @throws 쓰기 실패 시 에러 (원본 파일은 보존됨)
 */
export async function atomicWriteFile(filePath: string, content: string): Promise<void> {
	const tempPath = getTempPath(filePath);
	const backupPath = getBackupPath(filePath);
	const originalExists = existsSync(filePath);

	try {
		// 1. 임시 파일에 쓰기
		await writeFile(tempPath, content, 'utf-8');

		// 2. 임시 파일 검증 (읽기 가능한지 확인)
		const written = await readFile(tempPath, 'utf-8');
		if (written !== content) {
			throw new Error('임시 파일 검증 실패: 내용이 일치하지 않습니다.');
		}

		// 3. 기존 파일이 있으면 백업
		if (originalExists) {
			await copyFile(filePath, backupPath);
		}

		// 4. 임시 파일을 원본 위치로 rename (원자적 연산)
		await rename(tempPath, filePath);

		// 5. 백업 파일 삭제 (성공 시)
		if (originalExists && existsSync(backupPath)) {
			try {
				await unlink(backupPath);
			} catch {
				// 백업 삭제 실패는 무시 (다음에 덮어쓰게 됨)
			}
		}
	} catch (error) {
		// 실패 시 정리
		// 임시 파일 삭제
		if (existsSync(tempPath)) {
			try {
				await unlink(tempPath);
			} catch {
				// 무시
			}
		}

		// 백업에서 복원 시도 (원본이 손상된 경우)
		if (originalExists && existsSync(backupPath) && !existsSync(filePath)) {
			try {
				await rename(backupPath, filePath);
				console.warn('백업에서 원본 파일을 복원했습니다:', filePath);
			} catch (restoreError) {
				console.error('백업 복원 실패:', restoreError);
			}
		}

		throw new Error(
			`파일 쓰기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 파일 락 + 원자적 쓰기를 함께 사용
 * @param filePath - 저장할 파일 경로
 * @param content - 저장할 내용
 */
export async function safeWriteFile(filePath: string, content: string): Promise<void> {
	await withFileLock(filePath, async () => {
		await atomicWriteFile(filePath, content);
	});
}

// ============================================================================
// 안전한 파일 읽기 (Safe Read with Backup Recovery)
// ============================================================================

/**
 * 파일 읽기 에러 클래스
 */
export class FileReadError extends Error {
	constructor(
		message: string,
		public readonly filePath: string,
		public readonly errorCode?: string,
		public readonly recoveredFromBackup: boolean = false
	) {
		super(message);
		this.name = 'FileReadError';
	}
}

/**
 * 안전한 파일 읽기
 * - 파일이 없으면 null 반환
 * - 파일 읽기 실패 시 백업에서 복구 시도
 * - 권한 에러, 손상 에러 등 구체적인 에러 메시지 제공
 *
 * @param filePath - 읽을 파일 경로
 * @returns 파일 내용 또는 null (파일 없음)
 * @throws FileReadError - 읽기 실패 시
 */
export async function safeReadFile(filePath: string): Promise<string | null> {
	// 파일이 없으면 null 반환
	if (!existsSync(filePath)) {
		return null;
	}

	try {
		return await readFile(filePath, 'utf-8');
	} catch (error) {
		const errorCode = (error as NodeJS.ErrnoException).code;

		// 권한 에러
		if (errorCode === 'EACCES' || errorCode === 'EPERM') {
			throw new FileReadError(`파일 접근 권한이 없습니다: ${filePath}`, filePath, errorCode);
		}

		// 백업 파일에서 복구 시도
		const backupPath = getBackupPath(filePath);
		if (existsSync(backupPath)) {
			try {
				console.warn(`원본 파일 읽기 실패, 백업에서 복구 시도: ${filePath}`);
				const backupContent = await readFile(backupPath, 'utf-8');

				// 백업 내용으로 원본 복원 시도
				try {
					await writeFile(filePath, backupContent, 'utf-8');
					console.warn(`백업에서 원본 파일 복원 완료: ${filePath}`);
				} catch {
					// 복원 실패해도 백업 내용은 반환
				}

				const readError = new FileReadError(
					`원본 파일 읽기 실패, 백업에서 복구됨: ${filePath}`,
					filePath,
					errorCode,
					true
				);
				console.warn(readError.message);
				return backupContent;
			} catch (backupError) {
				throw new FileReadError(`파일 및 백업 모두 읽기 실패: ${filePath}`, filePath, errorCode);
			}
		}

		throw new FileReadError(
			`파일 읽기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
			filePath,
			errorCode
		);
	}
}
