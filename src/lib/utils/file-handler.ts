import { writeFile, readFile, mkdir, readdir, rename } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { ForbiddenWordsData } from '$lib/types/vocabulary';

// 데이터 저장 경로 설정
const DATA_DIR = 'static/data';
const DEFAULT_DATA_FILE = 'vocabulary.json';

/**
 * 데이터 파일 경로 가져오기
 * @param filename - 파일명 (기본값: vocabulary.json)
 */
function getDataPath(filename: string = DEFAULT_DATA_FILE): string {
	// 파일명에 경로 구분자가 포함되어 있으면 제거 (보안)
	const safeFilename = filename.replace(/^.*[\\\/]/, '');
	return join(DATA_DIR, safeFilename);
}

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
 * 단어집 데이터를 JSON 파일로 저장
 * @param data - 저장할 VocabularyData 객체
 * @param filename - 저장할 파일명 (기본값: vocabulary.json)
 */
export async function saveVocabularyData(
	data: import('../types/vocabulary.js').VocabularyData,
	filename: string = DEFAULT_DATA_FILE
): Promise<void> {
	try {
		// 데이터 디렉토리 확인 및 생성
		await ensureDataDirectory();

		// 데이터 유효성 검증
		if (!data || !Array.isArray(data.entries)) {
			throw new Error('유효하지 않은 단어집 데이터입니다.');
		}

		// 각 엔트리 유효성 검증
		const validEntries = data.entries.filter((entry) => {
			const isValid =
				entry.id &&
				entry.standardName &&
				entry.abbreviation &&
				entry.englishName &&
				entry.createdAt;
			return isValid;
		});

		if (validEntries.length === 0 && data.entries.length > 0) {
			throw new Error('저장할 유효한 단어집 데이터가 없습니다.');
		}

		// 최종 데이터 객체 구성
		const finalData: import('../types/vocabulary.js').VocabularyData = {
			entries: validEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: validEntries.length
		};

		// JSON 파일로 저장 (들여쓰기 포함)
		const jsonString = JSON.stringify(finalData, null, 2);
		await writeFile(getDataPath(filename), jsonString, 'utf-8');
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
 * @returns 로드된 VocabularyData 객체
 */
export async function loadVocabularyData(
	filename: string = DEFAULT_DATA_FILE
): Promise<import('../types/vocabulary.js').VocabularyData> {
	try {
		const dataPath = getDataPath(filename);

		// 파일 존재 확인
		if (!existsSync(dataPath)) {
			return {
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			};
		}

		// 파일 읽기
		const jsonString = await readFile(dataPath, 'utf-8');

		if (!jsonString.trim()) {
			console.warn('단어집 데이터 파일이 비어있습니다.');
			return {
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			};
		}

		// JSON 파싱
		const data = JSON.parse(jsonString) as import('../types/vocabulary.js').VocabularyData;

		// 데이터 구조 검증
		if (!data || typeof data !== 'object') {
			throw new Error('단어집 데이터 형식이 올바르지 않습니다.');
		}

		if (!Array.isArray(data.entries)) {
			throw new Error('단어집 엔트리 데이터가 배열이 아닙니다.');
		}

		// 각 엔트리 유효성 검증 및 필터링
		const validEntries = data.entries.filter((entry) => {
			const isValid =
				entry.id &&
				entry.standardName &&
				entry.abbreviation &&
				entry.englishName &&
				entry.createdAt;
			return isValid;
		});

		return {
			entries: validEntries,
			lastUpdated: data.lastUpdated || new Date().toISOString(),
			totalCount: validEntries.length
		};
	} catch (error) {
		console.error('단어집 데이터 로드 실패:', error);

		// JSON 파싱 오류인 경우 더 구체적인 메시지
		if (error instanceof SyntaxError) {
			throw new Error('단어집 데이터 파일 형식이 손상되었습니다. 파일을 다시 업로드해주세요.');
		}

		throw new Error(
			`데이터 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 기존 단어집 데이터에 새로운 엔트리들을 병합
 * @param newEntries - 추가할 새로운 엔트리들
 * @param replaceExisting - 기존 데이터를 교체할지 여부 (기본값: true)
 * @param filename - 병합할 파일명 (기본값: vocabulary.json)
 * @returns 병합된 VocabularyData 객체
 */
export async function mergeVocabularyData(
	newEntries: import('../types/vocabulary.js').VocabularyEntry[],
	replaceExisting: boolean = true,
	filename: string = DEFAULT_DATA_FILE
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
				if (mergedMap.has(compositeKey)) {
					const existingEntry = mergedMap.get(compositeKey)!;
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
 * 데이터 파일의 백업 생성
 * @param filename - 백업할 파일명 (기본값: vocabulary.json)
 * @returns 백업 파일 경로
 */
export async function createBackup(filename: string = DEFAULT_DATA_FILE): Promise<string> {
	try {
		const dataPath = getDataPath(filename);

		if (!existsSync(dataPath)) {
			throw new Error('백업할 데이터 파일이 존재하지 않습니다.');
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const safeFilename = filename.replace(/\.json$/, '');
		const backupFileName = `${safeFilename}_backup_${timestamp}.json`;
		const backupPath = join(DATA_DIR, backupFileName);

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
 * @returns 파일명 목록
 */
export async function listVocabularyFiles(): Promise<string[]> {
	try {
		await ensureDataDirectory();
		const files = await readdir(DATA_DIR);
		return files.filter((file) => {
			return (
				file.endsWith('.json') &&
				file !== 'forbidden-words.json' &&
				file !== 'domain.json' &&
				file !== 'history.json' &&
				!file.includes('_backup_')
			);
		});
	} catch (error) {
		console.error('단어집 파일 목록 조회 실패:', error);
		return [DEFAULT_DATA_FILE];
	}
}

/**
 * 새로운 단어집 파일 생성
 * @param filename - 생성할 파일명 (확장자 .json 포함)
 */
export async function createVocabularyFile(filename: string): Promise<void> {
	try {
		await ensureDataDirectory();

		// 파일명 유효성 검사
		if (!filename.endsWith('.json')) {
			throw new Error('파일명은 .json으로 끝나야 합니다.');
		}
		if (/[\\/:*?"<>|]/.test(filename)) {
			throw new Error('파일명에 사용할 수 없는 문자가 포함되어 있습니다.');
		}

		const filePath = getDataPath(filename);

		if (existsSync(filePath)) {
			throw new Error('이미 존재하는 파일명입니다.');
		}

		// 빈 단어집 데이터 생성
		const emptyData: import('../types/vocabulary.js').VocabularyData = {
			entries: [],
			lastUpdated: new Date().toISOString(),
			totalCount: 0
		};

		await writeFile(filePath, JSON.stringify(emptyData, null, 2), 'utf-8');
	} catch (error) {
		console.error('단어집 파일 생성 실패:', error);
		throw error;
	}
}

/**
 * 단어집 파일 이름 변경
 * @param oldFilename - 변경할 기존 파일명
 * @param newFilename - 새로운 파일명
 */
export async function renameVocabularyFile(
	oldFilename: string,
	newFilename: string
): Promise<void> {
	try {
		await ensureDataDirectory();

		// 파일명 유효성 검사
		if (!newFilename.endsWith('.json')) {
			throw new Error('새 파일명은 .json으로 끝나야 합니다.');
		}
		if (/[\\/:*?"<>|]/.test(newFilename)) {
			throw new Error('파일명에 사용할 수 없는 문자가 포함되어 있습니다.');
		}

		const oldPath = getDataPath(oldFilename);
		const newPath = getDataPath(newFilename);

		if (!existsSync(oldPath)) {
			throw new Error('변경할 파일이 존재하지 않습니다.');
		}
		if (existsSync(newPath)) {
			throw new Error('이미 존재하는 파일명입니다.');
		}

		// 기본 파일 보호
		if (
			oldFilename === 'forbidden-words.json' ||
			oldFilename === 'domain.json' ||
			oldFilename === 'history.json'
		) {
			throw new Error('시스템 파일은 이름을 변경할 수 없습니다.');
		}

		await rename(oldPath, newPath);
	} catch (error) {
		console.error('단어집 파일 이름 변경 실패:', error);
		throw error;
	}
}

// 금지어 데이터 파일 경로
const FORBIDDEN_WORDS_FILE = 'forbidden-words.json';
const FORBIDDEN_WORDS_PATH = join(DATA_DIR, FORBIDDEN_WORDS_FILE);

/**
 * 금지어 데이터를 JSON 파일에서 불러오기
 * @returns 금지어 데이터 객체
 */
export async function loadForbiddenWordsData(): Promise<ForbiddenWordsData> {
	try {
		// 파일이 존재하지 않으면 기본 데이터 구조 반환
		if (!existsSync(FORBIDDEN_WORDS_PATH)) {
			const defaultData: ForbiddenWordsData = {
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			};
			await saveForbiddenWordsData(defaultData);
			return defaultData;
		}

		const fileContent = await readFile(FORBIDDEN_WORDS_PATH, 'utf-8');
		const data: ForbiddenWordsData = JSON.parse(fileContent);

		// 데이터 유효성 검증
		if (!data || !Array.isArray(data.entries)) {
			throw new Error('유효하지 않은 금지어 데이터 형식입니다.');
		}

		// 엔트리 수 재계산
		data.totalCount = data.entries.length;

		return data;
	} catch (error) {
		console.error('금지어 데이터 로드 실패:', error);
		throw new Error(
			`금지어 데이터 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 금지어 데이터를 JSON 파일로 저장
 * @param data - 저장할 ForbiddenWordsData 객체
 */
export async function saveForbiddenWordsData(data: ForbiddenWordsData): Promise<void> {
	try {
		// 데이터 디렉토리 확인 및 생성
		await ensureDataDirectory();

		// 데이터 유효성 검증
		if (!data || !Array.isArray(data.entries)) {
			throw new Error('유효하지 않은 금지어 데이터입니다.');
		}

		// 각 엔트리 유효성 검증
		const validEntries = data.entries.filter((entry) => {
			const isValid = entry.id && entry.keyword && entry.type && entry.createdAt;
			if (!isValid) {
				console.warn('유효하지 않은 금지어 엔트리 제외:', entry);
			}
			return isValid;
		});

		if (validEntries.length === 0 && data.entries.length > 0) {
			throw new Error('저장할 유효한 금지어 데이터가 없습니다.');
		}

		// 최종 데이터 구조 생성
		const finalData: ForbiddenWordsData = {
			entries: validEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: validEntries.length
		};

		// JSON 문자열로 변환 (가독성을 위해 들여쓰기 적용)
		const jsonData = JSON.stringify(finalData, null, 2);

		// 파일 저장
		await writeFile(FORBIDDEN_WORDS_PATH, jsonData, 'utf-8');
	} catch (error) {
		console.error('금지어 데이터 저장 실패:', error);
		throw new Error(
			`금지어 데이터 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

// 도메인 데이터 파일 경로
const DOMAIN_FILE = 'domain.json';
const DOMAIN_PATH = join(DATA_DIR, DOMAIN_FILE);

/**
 * 도메인 데이터를 JSON 파일에서 불러오기
 * @returns 도메인 데이터 객체
 */
export async function loadDomainData(): Promise<import('../types/domain.js').DomainData> {
	try {
		// 파일이 존재하지 않으면 기본 데이터 구조 반환
		if (!existsSync(DOMAIN_PATH)) {
			const defaultData: import('../types/domain.js').DomainData = {
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			};
			await saveDomainData(defaultData);
			return defaultData;
		}

		const fileContent = await readFile(DOMAIN_PATH, 'utf-8');

		if (!fileContent.trim()) {
			console.warn('도메인 데이터 파일이 비어있습니다.');
			const defaultData: import('../types/domain.js').DomainData = {
				entries: [],
				lastUpdated: new Date().toISOString(),
				totalCount: 0
			};
			return defaultData;
		}

		const data: import('../types/domain.js').DomainData = JSON.parse(fileContent);

		// 데이터 유효성 검증
		if (!data || !Array.isArray(data.entries)) {
			throw new Error('유효하지 않은 도메인 데이터 형식입니다.');
		}

		// 엔트리 수 재계산
		data.totalCount = data.entries.length;

		return data;
	} catch (error) {
		console.error('도메인 데이터 로드 실패:', error);
		throw new Error(
			`도메인 데이터 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 도메인 데이터를 JSON 파일로 저장
 * @param data - 저장할 DomainData 객체
 */
export async function saveDomainData(data: import('../types/domain.js').DomainData): Promise<void> {
	try {
		// 데이터 디렉토리 확인 및 생성
		await ensureDataDirectory();

		// 데이터 유효성 검증
		if (!data || !Array.isArray(data.entries)) {
			throw new Error('유효하지 않은 도메인 데이터입니다.');
		}

		// 각 엔트리 유효성 검증
		const validEntries = data.entries.filter((entry) => {
			const isValid =
				entry.id &&
				entry.domainGroup &&
				entry.domainCategory &&
				entry.standardDomainName &&
				entry.logicalDataType &&
				entry.physicalDataType &&
				entry.createdAt;
			if (!isValid) {
				console.warn('유효하지 않은 도메인 엔트리 제외:', entry);
			}
			return isValid;
		});

		if (validEntries.length === 0 && data.entries.length > 0) {
			throw new Error('저장할 유효한 도메인 데이터가 없습니다.');
		}

		// 최종 데이터 구조 생성
		const finalData: import('../types/domain.js').DomainData = {
			entries: validEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: validEntries.length
		};

		// JSON 문자열로 변환 (가독성을 위해 들여쓰기 적용)
		const jsonData = JSON.stringify(finalData, null, 2);

		// 파일 저장
		await writeFile(DOMAIN_PATH, jsonData, 'utf-8');
	} catch (error) {
		console.error('도메인 데이터 저장 실패:', error);
		throw new Error(
			`도메인 데이터 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 기존 도메인 데이터에 새로운 엔트리들을 병합
 * @param newEntries - 추가할 새로운 엔트리들
 * @param replaceExisting - 기존 데이터를 교체할지 여부 (기본값: true)
 * @returns 병합된 DomainData 객체
 */
export async function mergeDomainData(
	newEntries: import('../types/domain.js').DomainEntry[],
	replaceExisting: boolean = true
): Promise<import('../types/domain.js').DomainData> {
	try {
		// 기존 데이터 로드
		const existingData = await loadDomainData();

		let finalEntries: import('../types/domain.js').DomainEntry[];

		if (replaceExisting || existingData.entries.length === 0) {
			// 기존 데이터 교체 또는 기존 데이터가 없는 경우
			finalEntries = [...newEntries];
		} else {
			// 기존 데이터와 병합
			const mergedMap = new Map<string, import('../types/domain.js').DomainEntry>();
			existingData.entries.forEach((entry) => {
				const compositeKey = `${entry.domainGroup.toLowerCase()}|${entry.domainCategory.toLowerCase()}|${entry.standardDomainName.toLowerCase()}`;
				mergedMap.set(compositeKey, entry);
			});
			newEntries.forEach((entry) => {
				const compositeKey = `${entry.domainGroup.toLowerCase()}|${entry.domainCategory.toLowerCase()}|${entry.standardDomainName.toLowerCase()}`;

				if (mergedMap.has(compositeKey)) {
					// 완전히 동일한 엔트리 - 기존 정보 보존하면서 업데이트
					const existingEntry = mergedMap.get(compositeKey)!;
					const mergedEntry: import('../types/domain.js').DomainEntry = {
						...entry,
						// 기존 비고가 있고 새 비고가 없으면 기존 비고 유지
						remarks: entry.remarks || existingEntry.remarks,
						// 생성일은 기존 것 유지, 수정일은 현재 시간으로 업데이트
						createdAt: existingEntry.createdAt,
						updatedAt: new Date().toISOString()
					};

					mergedMap.set(compositeKey, mergedEntry);
				} else {
					// 새로운 엔트리 추가
					mergedMap.set(compositeKey, entry);
				}
			});

			finalEntries = Array.from(mergedMap.values());
		}

		// 최종 데이터 객체 생성
		const mergedData: import('../types/domain.js').DomainData = {
			entries: finalEntries,
			lastUpdated: new Date().toISOString(),
			totalCount: finalEntries.length
		};

		// 병합된 데이터 저장
		await saveDomainData(mergedData);

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
 * @returns 백업 파일 경로
 */
export async function createDomainBackup(): Promise<string> {
	try {
		if (!existsSync(DOMAIN_PATH)) {
			throw new Error('백업할 도메인 데이터 파일이 존재하지 않습니다.');
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const backupFileName = `domain_backup_${timestamp}.json`;
		const backupPath = join(DATA_DIR, backupFileName);

		const originalData = await readFile(DOMAIN_PATH, 'utf-8');
		await writeFile(backupPath, originalData, 'utf-8');

		return backupPath;
	} catch (error) {
		console.error('도메인 백업 생성 실패:', error);
		throw new Error(
			`도메인 백업 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}
