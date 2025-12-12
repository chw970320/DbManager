/**
 * 파일 락 메커니즘
 * 동시 파일 접근으로 인한 데이터 손실을 방지합니다.
 */

import { writeFile, readFile, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';

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
