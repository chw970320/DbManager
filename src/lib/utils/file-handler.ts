import { writeFile, readFile, mkdir, readdir, rename, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve, basename } from 'path';
import type { VocabularyData, VocabularyEntry } from '$lib/types/vocabulary';
import type { DomainData, DomainEntry } from '$lib/types/domain';
import type { TermData, TermEntry } from '$lib/types/term';
import {
	isVocabularyData,
	isDomainData,
	isTermData,
	safeJsonParse,
	TypeValidationError
} from './type-guards';
import { safeWriteFile, safeReadFile, FileReadError } from './file-lock';
import { isValidUUID, isValidISODate } from './validation';
import {
	createDataFile,
	renameDataFile,
	deleteDataFile,
	listDataFiles,
	type DataType
} from './file-operations';

// 데이터 저장 경로 설정
const DATA_DIR = process.env.DATA_PATH || 'static/data';
const VOCABULARY_DIR = join(DATA_DIR, 'vocabulary');
const DOMAIN_DIR = join(DATA_DIR, 'domain');
const TERM_DIR = join(DATA_DIR, 'term');

const DEFAULT_VOCABULARY_FILE = 'vocabulary.json';
const DEFAULT_DOMAIN_FILE = 'domain.json';
const DEFAULT_TERM_FILE = 'term.json';
const HISTORY_FILE = 'history.json';

/**
 * 파일명 유효성 검증
 * @param filename - 검증할 파일명
 * @throws 유효하지 않은 파일명인 경우 에러
 */
function validateFilename(filename: string): void {
	// 빈 파일명 체크
	if (!filename || filename.trim() === '') {
		throw new Error('파일명이 비어있습니다.');
	}

	// Path Traversal 공격 방지: 상위 디렉토리 접근 시도 차단
	if (filename.includes('..')) {
		throw new Error('유효하지 않은 파일명입니다: 상위 디렉토리 접근이 허용되지 않습니다.');
	}

	// Null byte injection 방지
	if (filename.includes('\0')) {
		throw new Error('유효하지 않은 파일명입니다: 허용되지 않는 문자가 포함되어 있습니다.');
	}

	// 절대 경로 차단 (Windows와 Unix 모두)
	if (filename.startsWith('/') || filename.startsWith('\\') || /^[a-zA-Z]:/.test(filename)) {
		throw new Error('유효하지 않은 파일명입니다: 절대 경로는 허용되지 않습니다.');
	}
}

/**
 * 데이터 파일 경로 가져오기 (Path Traversal 방지 포함)
 * @param filename - 파일명
 * @param type - 데이터 타입 ('vocabulary' | 'domain' | 'term' | 'forbidden' | 'history')
 * @throws 유효하지 않은 파일명이거나 허용된 디렉토리 외부 접근 시 에러
 */
function getDataPath(
	filename: string,
	type: 'vocabulary' | 'domain' | 'term' | 'forbidden' | 'history' = 'vocabulary'
): string {
	// 1. 파일명 유효성 검증
	validateFilename(filename);

	// 2. 파일명에서 경로 구분자 제거하여 기본 파일명만 추출
	const safeFilename = basename(filename);

	// 3. 타입별 base 디렉토리 결정
	let baseDir: string;
	if (type === 'domain') {
		baseDir = DOMAIN_DIR;
	} else if (type === 'term') {
		baseDir = TERM_DIR;
	} else {
		// vocabulary, forbidden, history는 vocabulary 폴더에 저장
		baseDir = VOCABULARY_DIR;
	}

	// 4. 전체 경로 생성 및 정규화
	const fullPath = resolve(baseDir, safeFilename);
	const resolvedBaseDir = resolve(baseDir);

	// 5. Path Traversal 최종 검증: 결과 경로가 base 디렉토리 내에 있는지 확인
	if (!fullPath.startsWith(resolvedBaseDir)) {
		throw new Error('유효하지 않은 파일 경로입니다: 허용된 디렉토리 외부 접근이 감지되었습니다.');
	}

	return fullPath;
}

/**
 * 데이터 마이그레이션 (기존 파일을 하위 폴더로 이동)
 */
async function migrateDataFiles(): Promise<void> {
	try {
		const files = await readdir(DATA_DIR);

		for (const file of files) {
			const filePath = join(DATA_DIR, file);
			const fileStat = await stat(filePath);

			if (fileStat.isDirectory()) continue;
			if (!file.endsWith('.json')) continue;

			// 시스템 파일 이동
			if (
				file === DEFAULT_VOCABULARY_FILE ||
				file === HISTORY_FILE ||
				file.includes('_backup_') // 백업 파일은 일단 vocabulary로 가정 (내용 확인 필요할 수도 있음)
			) {
				// 백업 파일의 경우 이름에 domain이 있으면 domain으로, 아니면 vocabulary로
				if (file.includes('domain') && file.includes('_backup_')) {
					await rename(filePath, join(DOMAIN_DIR, file));
					console.log(`Migrated ${file} to domain directory`);
				} else {
					await rename(filePath, join(VOCABULARY_DIR, file));
					console.log(`Migrated ${file} to vocabulary directory`);
				}
				continue;
			}

			if (file === DEFAULT_DOMAIN_FILE) {
				await rename(filePath, join(DOMAIN_DIR, file));
				console.log(`Migrated ${file} to domain directory`);
				continue;
			}

			// 사용자 정의 파일 내용 기반 이동
			try {
				const content = await readFile(filePath, 'utf-8');
				const json = JSON.parse(content);

				if (json.entries && Array.isArray(json.entries) && json.entries.length > 0) {
					const firstEntry = json.entries[0];
					if (firstEntry.domainGroup !== undefined) {
						await rename(filePath, join(DOMAIN_DIR, file));
						console.log(`Migrated ${file} to domain directory (content-based)`);
					} else if (firstEntry.standardName !== undefined) {
						await rename(filePath, join(VOCABULARY_DIR, file));
						console.log(`Migrated ${file} to vocabulary directory (content-based)`);
					} else {
						// 알 수 없는 형식이면 vocabulary로 이동 (기본값)
						await rename(filePath, join(VOCABULARY_DIR, file));
						console.log(`Migrated ${file} to vocabulary directory (default)`);
					}
				} else {
					// 빈 파일이거나 entries가 없으면 vocabulary로 이동 (기본값)
					await rename(filePath, join(VOCABULARY_DIR, file));
					console.log(`Migrated ${file} to vocabulary directory (empty/unknown)`);
				}
			} catch (e) {
				console.warn(`Failed to parse ${file} during migration, skipping: ${e}`);
			}
		}
	} catch (error) {
		console.error('Data migration failed:', error);
	}
}

/**
 * 데이터 디렉토리가 존재하는지 확인하고 없으면 생성
 * 또한 마이그레이션 로직을 실행
 */
export async function ensureDataDirectory(): Promise<void> {
	try {
		// 1. 기본 데이터 디렉토리 생성
		if (!existsSync(DATA_DIR)) {
			await mkdir(DATA_DIR, { recursive: true });
		}

		// 2. 하위 디렉토리 확인
		const vocabDirExists = existsSync(VOCABULARY_DIR);
		const domainDirExists = existsSync(DOMAIN_DIR);
		const termDirExists = existsSync(TERM_DIR);

		// 3. 하위 디렉토리가 하나라도 없으면 생성
		if (!vocabDirExists) {
			await mkdir(VOCABULARY_DIR, { recursive: true });
		}
		if (!domainDirExists) {
			await mkdir(DOMAIN_DIR, { recursive: true });
		}
		if (!termDirExists) {
			await mkdir(TERM_DIR, { recursive: true });
		}

		// 4. 마이그레이션 필요 여부 확인 (루트 데이터 디렉토리에 json 파일이 남아있는지)
		// 성능을 위해 매번 체크하지 않고, 디렉토리가 방금 생성되었거나 하는 경우에만 할 수도 있지만,
		// 파일이 루트에 잘못 저장되는 경우를 대비해 루트에 파일이 있으면 이동시키는 것이 안전함.
		const files = await readdir(DATA_DIR);
		const hasRootJsonFiles = files.some((f) => f.endsWith('.json'));

		if (hasRootJsonFiles) {
			await migrateDataFiles();
		}
	} catch (error) {
		console.error('데이터 디렉토리 생성 및 마이그레이션 실패:', error);
		throw new Error(
			`데이터 디렉토리 초기화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 단어집 데이터를 JSON 파일로 저장 (파일 락 적용)
 * @param data - 저장할 VocabularyData 객체
 * @param filename - 저장할 파일명 (기본값: vocabulary.json)
 */
export async function saveVocabularyData(
	data: VocabularyData,
	filename: string = DEFAULT_VOCABULARY_FILE
): Promise<void> {
	try {
		await ensureDataDirectory();

		if (!data || !Array.isArray(data.entries)) {
			throw new Error('유효하지 않은 단어집 데이터입니다.');
		}

		const validEntries = data.entries.filter((entry) => {
			// 필수 필드 존재 검증
			const hasRequiredFields =
				entry.id &&
				entry.standardName &&
				entry.abbreviation &&
				entry.englishName &&
				entry.createdAt;

			if (!hasRequiredFields) return false;

			// 형식 검증 (경고만 출력, 저장은 허용)
			if (!isValidUUID(entry.id)) {
				console.warn(`[검증 경고] 단어집 엔트리 ID가 UUID 형식이 아닙니다: ${entry.id}`);
			}
			if (!isValidISODate(entry.createdAt)) {
				console.warn(
					`[검증 경고] 단어집 엔트리 생성일이 ISO 8601 형식이 아닙니다: ${entry.createdAt}`
				);
			}

			return true;
		});

		if (validEntries.length === 0 && data.entries.length > 0) {
			throw new Error('저장할 유효한 단어집 데이터가 없습니다.');
		}

		const finalData: VocabularyData = {
			entries: validEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: validEntries.length,
			// mapping.domain으로 통합 (mappedDomainFile은 저장하지 않음)
			mapping: data.mapping || {
				domain: data.mappedDomainFile || 'domain.json'
			}
		};

		const dataPath = getDataPath(filename, 'vocabulary');
		const jsonString = JSON.stringify(finalData, null, 2);

		// 파일 락 + 원자적 쓰기를 사용한 안전한 저장
		await safeWriteFile(dataPath, jsonString);
	} catch (error) {
		console.error('단어집 데이터 저장 실패:', error);
		throw new Error(
			`데이터 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 저장된 단어집 데이터를 JSON 파일에서 로드
 * @param filename - 로드할 파일명 (기본값: vocabulary.json)
 * @throws TypeValidationError - 타입 검증 실패 시
 */
export async function loadVocabularyData(
	filename: string = DEFAULT_VOCABULARY_FILE
): Promise<VocabularyData> {
	try {
		await ensureDataDirectory(); // 마이그레이션 확인을 위해 호출
		const dataPath = getDataPath(filename, 'vocabulary');

		// 안전한 파일 읽기 (백업 복구 지원)
		const jsonString = await safeReadFile(dataPath);

		// 파일이 없거나 빈 파일이면 기본 데이터 생성 및 파일 저장
		if (!jsonString || !jsonString.trim()) {
			const defaultData: VocabularyData = {
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			};
			if (filename === DEFAULT_VOCABULARY_FILE) {
				await saveVocabularyData(defaultData, filename);
			}
			return defaultData;
		}

		// 타입 가드를 사용한 안전한 JSON 파싱
		const data = safeJsonParse(jsonString, isVocabularyData, 'VocabularyData');

		// 매핑 정보 처리 (mappedDomainFile → mapping.domain 마이그레이션)
		let mapping = data.mapping;
		if (!mapping && data.mappedDomainFile) {
			// 기존 mappedDomainFile을 mapping.domain으로 마이그레이션
			mapping = {
				domain: data.mappedDomainFile
			};
		} else if (!mapping) {
			// 기본값 설정
			mapping = {
				domain: 'domain.json'
			};
		}

		return {
			entries: data.entries,
			lastUpdated: data.lastUpdated || new Date().toISOString(),
			totalCount: data.entries.length,
			// mapping.domain만 저장 (mappedDomainFile은 deprecated)
			mapping
		};
	} catch (error) {
		console.error('단어집 데이터 로드 실패:', error);
		if (error instanceof FileReadError) {
			if (error.recoveredFromBackup) {
				// 백업에서 복구된 경우 경고만 출력하고 계속 진행
				console.warn(error.message);
			} else {
				throw new Error(`단어집 파일 읽기 실패: ${error.message}`);
			}
		}
		if (error instanceof TypeValidationError) {
			throw new Error(`단어집 데이터 형식 오류: ${error.message}`);
		}
		if (error instanceof SyntaxError) {
			throw new Error('단어집 데이터 파일 형식이 손상되었습니다.');
		}
		throw new Error(
			`데이터 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 기존 단어집 데이터에 새로운 엔트리들을 병합
 */
export async function mergeVocabularyData(
	newEntries: import('../types/vocabulary.js').VocabularyEntry[],
	replaceExisting: boolean = true,
	filename: string = DEFAULT_VOCABULARY_FILE
): Promise<import('../types/vocabulary.js').VocabularyData> {
	try {
		const existingData = await loadVocabularyData(filename);
		let finalEntries: import('../types/vocabulary.js').VocabularyEntry[];
		if (replaceExisting || existingData.entries.length === 0) {
			finalEntries = [...newEntries];
		} else {
			const mergedMap = new Map<string, import('../types/vocabulary.js').VocabularyEntry>();
			existingData.entries.forEach((entry) => {
				const compositeKey = `${entry.standardName.toLowerCase()}|${entry.abbreviation.toLowerCase()}|${entry.englishName.toLowerCase()}`;
				mergedMap.set(compositeKey, entry);
			});
			newEntries.forEach((entry) => {
				const compositeKey = `${entry.standardName.toLowerCase()}|${entry.abbreviation.toLowerCase()}|${entry.englishName.toLowerCase()}`;
				const existingEntry = mergedMap.get(compositeKey);
				if (existingEntry) {
					const mergedEntry: import('../types/vocabulary.js').VocabularyEntry = {
						...entry,
						description: entry.description || existingEntry.description,
						createdAt: existingEntry.createdAt,
						updatedAt: new Date().toISOString()
					};
					mergedMap.set(compositeKey, mergedEntry);
				} else {
					mergedMap.set(compositeKey, entry);
				}
			});
			finalEntries = Array.from(mergedMap.values());
		}
		const mergedData: import('../types/vocabulary.js').VocabularyData = {
			entries: finalEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: finalEntries.length
		};
		await saveVocabularyData(mergedData, filename);
		return mergedData;
	} catch (error) {
		throw new Error(
			`단어집 데이터 병합 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 데이터 파일의 백업 생성 (단어집)
 */
export async function createBackup(filename: string = DEFAULT_VOCABULARY_FILE): Promise<string> {
	try {
		await ensureDataDirectory();
		const dataPath = getDataPath(filename, 'vocabulary');

		if (!existsSync(dataPath)) {
			throw new Error('백업할 데이터 파일이 존재하지 않습니다.');
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const safeFilename = filename.replace(/\.json$/, '');
		const backupFileName = `${safeFilename}_backup_${timestamp}.json`;
		const backupPath = join(VOCABULARY_DIR, backupFileName);

		const originalData = await readFile(dataPath, 'utf-8');
		await writeFile(backupPath, originalData, 'utf-8');

		return backupPath;
	} catch (error) {
		console.error('백업 생성 실패:', error);
		throw new Error(
			`백업 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 사용 가능한 단어집 파일 목록 조회
 */
export async function listVocabularyFiles(): Promise<string[]> {
	try {
		await ensureDataDirectory();
		const files = await readdir(VOCABULARY_DIR);
		return files.filter((file) => {
			return file.endsWith('.json') && file !== HISTORY_FILE && !file.includes('_backup_');
		});
	} catch (error) {
		console.error('단어집 파일 목록 조회 실패:', error);
		return [DEFAULT_VOCABULARY_FILE];
	}
}

/**
 * 새로운 단어집 파일 생성
 */
export async function createVocabularyFile(filename: string): Promise<void> {
	await ensureDataDirectory();
	await createDataFile('vocabulary', filename, () => ({
		entries: [],
		lastUpdated: new Date().toISOString(),
		totalCount: 0,
		mapping: { domain: 'domain.json' }
	}));
}

/**
 * 단어집 파일 이름 변경
 */
export async function renameVocabularyFile(
	oldFilename: string,
	newFilename: string
): Promise<void> {
	// 시스템 파일 보호
	if (oldFilename === DEFAULT_VOCABULARY_FILE || oldFilename === HISTORY_FILE) {
		throw new Error('시스템 파일은 이름을 변경할 수 없습니다.');
	}
	await ensureDataDirectory();
	await renameDataFile('vocabulary', oldFilename, newFilename);
}

/**
 * 단어집 파일 삭제
 */
export async function deleteVocabularyFile(filename: string): Promise<void> {
	// 시스템 파일 보호
	if (filename === DEFAULT_VOCABULARY_FILE || filename === HISTORY_FILE) {
		throw new Error('시스템 파일은 삭제할 수 없습니다.');
	}
	await ensureDataDirectory();
	await deleteDataFile('vocabulary', filename);
}

/**
 * 도메인 데이터를 JSON 파일에서 불러오기
 * @throws TypeValidationError - 타입 검증 실패 시
 */
export async function loadDomainData(filename: string = DEFAULT_DOMAIN_FILE): Promise<DomainData> {
	try {
		await ensureDataDirectory();
		const dataPath = getDataPath(filename, 'domain');

		// 안전한 파일 읽기 (백업 복구 지원)
		const fileContent = await safeReadFile(dataPath);

		// 파일이 없거나 빈 파일이면 기본 데이터 반환
		if (!fileContent || !fileContent.trim()) {
			const defaultData: DomainData = {
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			};
			if (filename === DEFAULT_DOMAIN_FILE) {
				await saveDomainData(defaultData, filename);
			}
			return defaultData;
		}

		// 타입 가드를 사용한 안전한 JSON 파싱
		const data = safeJsonParse(fileContent, isDomainData, 'DomainData');

		return {
			...data,
			totalCount: data.entries.length
		};
	} catch (error) {
		console.error('도메인 데이터 로드 실패:', error);
		if (error instanceof FileReadError) {
			throw new Error(`도메인 파일 읽기 실패: ${error.message}`);
		}
		if (error instanceof TypeValidationError) {
			throw new Error(`도메인 데이터 형식 오류: ${error.message}`);
		}
		throw new Error(
			`도메인 데이터 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 도메인 데이터를 JSON 파일로 저장 (파일 락 적용)
 */
export async function saveDomainData(
	data: DomainData,
	filename: string = DEFAULT_DOMAIN_FILE
): Promise<void> {
	try {
		await ensureDataDirectory();

		if (!data || !Array.isArray(data.entries)) {
			throw new Error('유효하지 않은 도메인 데이터입니다.');
		}

		const validEntries = data.entries.filter((entry) => {
			const hasRequiredFields =
				entry.id &&
				entry.domainGroup &&
				entry.domainCategory &&
				entry.standardDomainName &&
				entry.physicalDataType &&
				entry.createdAt;
			if (!hasRequiredFields) return false;

			// 형식 검증 (경고만 출력)
			if (!isValidUUID(entry.id)) {
				console.warn(`[검증 경고] 도메인 엔트리 ID가 UUID 형식이 아닙니다: ${entry.id}`);
			}
			if (!isValidISODate(entry.createdAt)) {
				console.warn(
					`[검증 경고] 도메인 엔트리 생성일이 ISO 8601 형식이 아닙니다: ${entry.createdAt}`
				);
			}

			return true;
		});

		if (validEntries.length === 0 && data.entries.length > 0) {
			throw new Error('저장할 유효한 도메인 데이터가 없습니다.');
		}

		const finalData: DomainData = {
			entries: validEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: validEntries.length
		};

		const dataPath = getDataPath(filename, 'domain');
		const jsonData = JSON.stringify(finalData, null, 2);

		// 파일 락 + 원자적 쓰기를 사용한 안전한 저장
		await safeWriteFile(dataPath, jsonData);
	} catch (error) {
		console.error('도메인 데이터 저장 실패:', error);
		throw new Error(
			`도메인 데이터 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 기존 도메인 데이터에 새로운 엔트리들을 병합
 */
export async function mergeDomainData(
	newEntries: import('../types/domain.js').DomainEntry[],
	replaceExisting: boolean = true,
	filename: string = DEFAULT_DOMAIN_FILE
): Promise<import('../types/domain.js').DomainData> {
	try {
		const existingData = await loadDomainData(filename);
		let finalEntries: import('../types/domain.js').DomainEntry[];

		if (replaceExisting || existingData.entries.length === 0) {
			finalEntries = [...newEntries];
		} else {
			const mergedMap = new Map<string, import('../types/domain.js').DomainEntry>();
			existingData.entries.forEach((entry) => {
				const compositeKey = `${entry.domainGroup.toLowerCase()}|${entry.domainCategory.toLowerCase()}|${entry.standardDomainName.toLowerCase()}`;
				mergedMap.set(compositeKey, entry);
			});
			newEntries.forEach((entry) => {
				const compositeKey = `${entry.domainGroup.toLowerCase()}|${entry.domainCategory.toLowerCase()}|${entry.standardDomainName.toLowerCase()}`;
				const existingEntry = mergedMap.get(compositeKey);
				if (existingEntry) {
					const mergedEntry: import('../types/domain.js').DomainEntry = {
						...entry,
						createdAt: existingEntry.createdAt,
						updatedAt: new Date().toISOString()
					};
					mergedMap.set(compositeKey, mergedEntry);
				} else {
					mergedMap.set(compositeKey, entry);
				}
			});
			finalEntries = Array.from(mergedMap.values());
		}

		const mergedData: import('../types/domain.js').DomainData = {
			entries: finalEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: finalEntries.length
		};

		await saveDomainData(mergedData, filename);
		return mergedData;
	} catch (error) {
		console.error('도메인 데이터 병합 실패:', error);
		throw new Error(
			`도메인 데이터 병합 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 도메인 데이터 파일의 백업 생성
 */
export async function createDomainBackup(filename: string = DEFAULT_DOMAIN_FILE): Promise<string> {
	try {
		await ensureDataDirectory();
		const dataPath = getDataPath(filename, 'domain');

		if (!existsSync(dataPath)) {
			throw new Error('백업할 도메인 데이터 파일이 존재하지 않습니다.');
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const safeFilename = filename.replace(/\.json$/, '');
		const backupFileName = `${safeFilename}_backup_${timestamp}.json`;
		const backupPath = join(DOMAIN_DIR, backupFileName);

		const originalData = await readFile(dataPath, 'utf-8');
		await writeFile(backupPath, originalData, 'utf-8');

		return backupPath;
	} catch (error) {
		console.error('도메인 백업 생성 실패:', error);
		throw new Error(
			`도메인 백업 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 사용 가능한 도메인 파일 목록 조회
 */
export async function listDomainFiles(): Promise<string[]> {
	try {
		await ensureDataDirectory();
		const files = await readdir(DOMAIN_DIR);
		return files.filter((file) => {
			return file.endsWith('.json') && file !== HISTORY_FILE && !file.includes('_backup_');
		});
	} catch (error) {
		console.error('도메인 파일 목록 조회 실패:', error);
		return [DEFAULT_DOMAIN_FILE];
	}
}

/**
 * 새로운 도메인 파일 생성
 */
export async function createDomainFile(filename: string): Promise<void> {
	await ensureDataDirectory();
	await createDataFile('domain', filename, () => ({
		entries: [],
		lastUpdated: new Date().toISOString(),
		totalCount: 0
	}));
}

/**
 * 도메인 파일 이름 변경
 */
export async function renameDomainFile(oldFilename: string, newFilename: string): Promise<void> {
	if (oldFilename === DEFAULT_DOMAIN_FILE) {
		throw new Error('시스템 파일은 이름을 변경할 수 없습니다.');
	}
	await ensureDataDirectory();
	await renameDataFile('domain', oldFilename, newFilename);
}

/**
 * 도메인 파일 삭제
 */
export async function deleteDomainFile(filename: string): Promise<void> {
	if (filename === DEFAULT_DOMAIN_FILE) {
		throw new Error('시스템 파일은 삭제할 수 없습니다.');
	}
	await ensureDataDirectory();
	await deleteDataFile('domain', filename);
}

/**
 * 용어 데이터를 JSON 파일에서 불러오기
 * @throws TypeValidationError - 타입 검증 실패 시
 */
export async function loadTermData(filename: string = DEFAULT_TERM_FILE): Promise<TermData> {
	try {
		await ensureDataDirectory();
		const dataPath = getDataPath(filename, 'term');

		const defaultMapping = {
			vocabulary: 'vocabulary.json',
			domain: 'domain.json'
		};

		// 안전한 파일 읽기 (백업 복구 지원)
		const fileContent = await safeReadFile(dataPath);

		// 파일이 없거나 빈 파일이면 기본 데이터 반환
		if (!fileContent || !fileContent.trim()) {
			const defaultData: TermData = {
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0,
				mapping: defaultMapping
			};
			if (filename === DEFAULT_TERM_FILE) {
				await saveTermData(defaultData, filename);
			}
			return defaultData;
		}

		// 타입 가드를 사용한 안전한 JSON 파싱
		const data = safeJsonParse(fileContent, isTermData, 'TermData');

		return {
			...data,
			totalCount: data.entries.length,
			// 매핑 정보가 없으면 기본값 설정
			mapping: data.mapping || defaultMapping
		};
	} catch (error) {
		console.error('용어 데이터 로드 실패:', error);
		if (error instanceof FileReadError) {
			throw new Error(`용어 파일 읽기 실패: ${error.message}`);
		}
		if (error instanceof TypeValidationError) {
			throw new Error(`용어 데이터 형식 오류: ${error.message}`);
		}
		throw new Error(
			`용어 데이터 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 용어 데이터를 JSON 파일로 저장 (파일 락 적용)
 */
export async function saveTermData(
	data: TermData,
	filename: string = DEFAULT_TERM_FILE
): Promise<void> {
	try {
		await ensureDataDirectory();

		if (!data || !Array.isArray(data.entries)) {
			throw new Error('유효하지 않은 용어 데이터입니다.');
		}

		const validEntries = data.entries.filter((entry) => {
			const hasRequiredFields =
				entry.id && entry.termName && entry.columnName && entry.domainName && entry.createdAt;
			if (!hasRequiredFields) return false;

			// 형식 검증 (경고만 출력)
			if (!isValidUUID(entry.id)) {
				console.warn(`[검증 경고] 용어 엔트리 ID가 UUID 형식이 아닙니다: ${entry.id}`);
			}
			if (!isValidISODate(entry.createdAt)) {
				console.warn(
					`[검증 경고] 용어 엔트리 생성일이 ISO 8601 형식이 아닙니다: ${entry.createdAt}`
				);
			}

			return true;
		});

		if (validEntries.length === 0 && data.entries.length > 0) {
			throw new Error('저장할 유효한 용어 데이터가 없습니다.');
		}

		const finalData: TermData = {
			entries: validEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: validEntries.length,
			mapping: data.mapping || {
				vocabulary: 'vocabulary.json',
				domain: 'domain.json'
			}
		};

		const dataPath = getDataPath(filename, 'term');
		const jsonData = JSON.stringify(finalData, null, 2);

		// 파일 락 + 원자적 쓰기를 사용한 안전한 저장
		await safeWriteFile(dataPath, jsonData);
	} catch (error) {
		console.error('용어 데이터 저장 실패:', error);
		throw new Error(
			`용어 데이터 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 기존 용어 데이터에 새로운 엔트리들을 병합
 */
export async function mergeTermData(
	newEntries: import('../types/term.js').TermEntry[],
	replaceExisting: boolean = true,
	filename: string = DEFAULT_TERM_FILE
): Promise<import('../types/term.js').TermData> {
	try {
		const existingData = await loadTermData(filename);
		let finalEntries: import('../types/term.js').TermEntry[];

		if (replaceExisting || existingData.entries.length === 0) {
			finalEntries = [...newEntries];
		} else {
			const mergedMap = new Map<string, import('../types/term.js').TermEntry>();
			existingData.entries.forEach((entry) => {
				const compositeKey = `${entry.termName.toLowerCase()}|${entry.columnName.toLowerCase()}|${entry.domainName.toLowerCase()}`;
				mergedMap.set(compositeKey, entry);
			});
			newEntries.forEach((entry) => {
				const compositeKey = `${entry.termName.toLowerCase()}|${entry.columnName.toLowerCase()}|${entry.domainName.toLowerCase()}`;
				const existingEntry = mergedMap.get(compositeKey);
				if (existingEntry) {
					const mergedEntry: import('../types/term.js').TermEntry = {
						...entry,
						createdAt: existingEntry.createdAt,
						updatedAt: new Date().toISOString()
					};
					mergedMap.set(compositeKey, mergedEntry);
				} else {
					mergedMap.set(compositeKey, entry);
				}
			});
			finalEntries = Array.from(mergedMap.values());
		}

		const mergedData: import('../types/term.js').TermData = {
			entries: finalEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: finalEntries.length
		};

		await saveTermData(mergedData, filename);
		return mergedData;
	} catch (error) {
		console.error('용어 데이터 병합 실패:', error);
		throw new Error(
			`용어 데이터 병합 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 용어 데이터 백업 생성
 */
export async function createTermBackup(filename: string = DEFAULT_TERM_FILE): Promise<string> {
	try {
		await ensureDataDirectory();
		const dataPath = getDataPath(filename, 'term');

		if (!existsSync(dataPath)) {
			throw new Error('백업할 파일이 존재하지 않습니다.');
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const safeFilename = filename.replace(/\.json$/, '');
		const backupFileName = `${safeFilename}_backup_${timestamp}.json`;
		const backupPath = join(TERM_DIR, backupFileName);

		const originalData = await readFile(dataPath, 'utf-8');
		await writeFile(backupPath, originalData, 'utf-8');

		return backupPath;
	} catch (error) {
		console.error('용어 백업 생성 실패:', error);
		throw new Error(
			`용어 백업 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 사용 가능한 용어 파일 목록 조회
 */
export async function listTermFiles(): Promise<string[]> {
	try {
		await ensureDataDirectory();
		const files = await readdir(TERM_DIR);
		return files.filter((file) => {
			return file.endsWith('.json') && file !== HISTORY_FILE && !file.includes('_backup_');
		});
	} catch (error) {
		console.error('용어 파일 목록 조회 실패:', error);
		return [DEFAULT_TERM_FILE];
	}
}

/**
 * 새로운 용어 파일 생성
 */
export async function createTermFile(filename: string): Promise<void> {
	await ensureDataDirectory();
	await createDataFile('term', filename, () => ({
		entries: [],
		lastUpdated: new Date().toISOString(),
		totalCount: 0,
		mapping: {
			vocabulary: 'vocabulary.json',
			domain: 'domain.json'
		}
	}));
}

/**
 * 용어 파일 이름 변경
 */
export async function renameTermFile(oldFilename: string, newFilename: string): Promise<void> {
	if (oldFilename === DEFAULT_TERM_FILE) {
		throw new Error('시스템 파일은 이름을 변경할 수 없습니다.');
	}
	await ensureDataDirectory();
	await renameDataFile('term', oldFilename, newFilename);
}

/**
 * 용어 파일 삭제
 */
export async function deleteTermFile(filename: string): Promise<void> {
	if (filename === DEFAULT_TERM_FILE) {
		throw new Error('시스템 파일은 삭제할 수 없습니다.');
	}
	await ensureDataDirectory();
	await deleteDataFile('term', filename);
}

// ============================================================================
// 참조 무결성 검증 (Referential Integrity)
// ============================================================================

/**
 * 참조 무결성 검증 결과
 */
export interface ReferenceCheckResult {
	canDelete: boolean;
	references: {
		type: 'term' | 'vocabulary';
		count: number;
		entries: Array<{ id: string; name: string }>;
	}[];
	message?: string;
}

/**
 * Vocabulary 삭제 전 참조 검증
 * Term에서 해당 단어를 참조하는지 확인
 *
 * @param vocabularyEntry - 삭제하려는 단어 엔트리
 * @param termFilename - 용어 파일명
 * @returns 참조 검증 결과
 */
export async function checkVocabularyReferences(
	vocabularyEntry: VocabularyEntry,
	termFilename: string = DEFAULT_TERM_FILE
): Promise<ReferenceCheckResult> {
	try {
		const termData = await loadTermData(termFilename);
		const standardNameLower = vocabularyEntry.standardName.toLowerCase();
		const abbreviationLower = vocabularyEntry.abbreviation.toLowerCase();

		// Term에서 이 단어를 참조하는 엔트리 찾기
		const referencingTerms = termData.entries.filter((term) => {
			// 용어명에서 단어 참조 확인 (언더스코어로 분리된 단어들)
			const termParts = term.termName.toLowerCase().split('_');
			const hasTermNameRef = termParts.some(
				(part) => part === standardNameLower || part === abbreviationLower
			);

			// 컬럼명에서 단어 참조 확인
			const columnParts = term.columnName.toLowerCase().split('_');
			const hasColumnRef = columnParts.some(
				(part) => part === standardNameLower || part === abbreviationLower
			);

			return hasTermNameRef || hasColumnRef;
		});

		if (referencingTerms.length > 0) {
			return {
				canDelete: false,
				references: [
					{
						type: 'term',
						count: referencingTerms.length,
						entries: referencingTerms.slice(0, 5).map((t) => ({
							id: t.id,
							name: t.termName
						}))
					}
				],
				message: `${referencingTerms.length}개의 용어에서 이 단어를 참조하고 있습니다.`
			};
		}

		return { canDelete: true, references: [] };
	} catch (error) {
		// 용어 파일이 없는 경우 등은 삭제 허용
		console.warn('참조 검증 중 오류 (삭제 허용):', error);
		return { canDelete: true, references: [] };
	}
}

/**
 * Domain 삭제 전 참조 검증
 * Vocabulary나 Term에서 해당 도메인을 참조하는지 확인
 *
 * @param domainEntry - 삭제하려는 도메인 엔트리
 * @param vocabularyFilename - 단어집 파일명
 * @param termFilename - 용어 파일명
 * @returns 참조 검증 결과
 */
export async function checkDomainReferences(
	domainEntry: DomainEntry,
	vocabularyFilename: string = DEFAULT_VOCABULARY_FILE,
	termFilename: string = DEFAULT_TERM_FILE
): Promise<ReferenceCheckResult> {
	const references: ReferenceCheckResult['references'] = [];
	const domainNameLower = domainEntry.standardDomainName.toLowerCase();

	try {
		// Vocabulary에서 참조 확인 (isDomainCategoryMapped가 true이고 도메인 카테고리가 일치)
		const vocabularyData = await loadVocabularyData(vocabularyFilename);
		const referencingVocab = vocabularyData.entries.filter(
			(vocab) =>
				vocab.isDomainCategoryMapped &&
				vocab.domainCategory?.toLowerCase() === domainEntry.domainCategory.toLowerCase()
		);

		if (referencingVocab.length > 0) {
			references.push({
				type: 'vocabulary',
				count: referencingVocab.length,
				entries: referencingVocab.slice(0, 5).map((v) => ({
					id: v.id,
					name: v.standardName
				}))
			});
		}
	} catch (error) {
		console.warn('Vocabulary 참조 검증 중 오류:', error);
	}

	try {
		// Term에서 참조 확인 (domainName이 일치)
		const termData = await loadTermData(termFilename);
		const referencingTerms = termData.entries.filter(
			(term) => term.domainName.toLowerCase() === domainNameLower
		);

		if (referencingTerms.length > 0) {
			references.push({
				type: 'term',
				count: referencingTerms.length,
				entries: referencingTerms.slice(0, 5).map((t) => ({
					id: t.id,
					name: t.termName
				}))
			});
		}
	} catch (error) {
		console.warn('Term 참조 검증 중 오류:', error);
	}

	if (references.length > 0) {
		const totalCount = references.reduce((sum, ref) => sum + ref.count, 0);
		return {
			canDelete: false,
			references,
			message: `${totalCount}개의 항목에서 이 도메인을 참조하고 있습니다.`
		};
	}

	return { canDelete: true, references: [] };
}
