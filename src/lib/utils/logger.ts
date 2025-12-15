/**
 * 로깅 유틸리티
 * 환경에 따른 조건부 로깅 및 로그 레벨 관리
 */

// ============================================================================
// 환경 설정
// ============================================================================

const isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

const isBrowser = typeof window !== 'undefined';

// ============================================================================
// 로그 레벨
// ============================================================================

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
	NONE = 4
}

// 현재 로그 레벨 (개발: DEBUG, 프로덕션: WARN)
let currentLogLevel: LogLevel = isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;

/**
 * 로그 레벨 설정
 */
export function setLogLevel(level: LogLevel): void {
	currentLogLevel = level;
}

/**
 * 현재 로그 레벨 조회
 */
export function getLogLevel(): LogLevel {
	return currentLogLevel;
}

// ============================================================================
// 로거 인터페이스
// ============================================================================

interface LoggerOptions {
	prefix?: string;
	showTimestamp?: boolean;
}

function formatMessage(prefix: string | undefined, showTimestamp: boolean): string {
	const parts: string[] = [];

	if (showTimestamp) {
		parts.push(`[${new Date().toISOString()}]`);
	}

	if (prefix) {
		parts.push(`[${prefix}]`);
	}

	return parts.length > 0 ? parts.join(' ') + ' ' : '';
}

// ============================================================================
// 로거 생성
// ============================================================================

export function createLogger(options: LoggerOptions = {}) {
	const { prefix, showTimestamp = false } = options;

	return {
		/**
		 * 디버그 레벨 로그 (개발 환경에서만)
		 */
		debug: (...args: unknown[]): void => {
			if (currentLogLevel <= LogLevel.DEBUG) {
				console.log(formatMessage(prefix, showTimestamp), ...args);
			}
		},

		/**
		 * 정보 레벨 로그 (개발 환경에서만)
		 */
		info: (...args: unknown[]): void => {
			if (currentLogLevel <= LogLevel.INFO) {
				console.info(formatMessage(prefix, showTimestamp), ...args);
			}
		},

		/**
		 * 경고 레벨 로그
		 */
		warn: (...args: unknown[]): void => {
			if (currentLogLevel <= LogLevel.WARN) {
				console.warn(formatMessage(prefix, showTimestamp), ...args);
			}
		},

		/**
		 * 에러 레벨 로그 (항상 출력)
		 */
		error: (...args: unknown[]): void => {
			if (currentLogLevel <= LogLevel.ERROR) {
				console.error(formatMessage(prefix, showTimestamp), ...args);
			}
		}
	};
}

// ============================================================================
// 기본 로거 인스턴스
// ============================================================================

export const logger = createLogger();

// 모듈별 로거 생성 예시
export const fileLogger = createLogger({ prefix: 'FileHandler' });
export const apiLogger = createLogger({ prefix: 'API' });
export const historyLogger = createLogger({ prefix: 'History' });
