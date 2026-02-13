/**
 * 단어집/도메인/용어 파일 핸들러
 * @deprecated data-registry의 제네릭 CRUD를 사용하세요.
 * 하위 호환성을 위해 기존 API를 유지하며 내부적으로 data-registry로 위임합니다.
 *
 * 마이그레이션 가이드:
 * - loadVocabularyData(filename) → loadData('vocabulary', filename)
 * - saveVocabularyData(data, filename) → saveData('vocabulary', data, filename)
 * - mergeVocabularyData(entries, replace, filename) → mergeData('vocabulary', entries, replace, filename)
 * - listVocabularyFiles() → listFiles('vocabulary')
 * - createVocabularyFile(filename) → createFile('vocabulary', filename)
 * - renameVocabularyFile(old, new) → renameFile('vocabulary', old, new)
 * - deleteVocabularyFile(filename) → deleteFile('vocabulary', filename)
 * (domain, term도 동일 패턴)
 */

import { writeFile, readFile, readdir, stat, rename } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { VocabularyData, VocabularyEntry } from '$lib/types/vocabulary';
import type { DomainData, DomainEntry } from '$lib/types/domain';
import type { TermData, TermEntry } from '$lib/types/term';
import { safeReadFile, FileReadError } from './file-lock';
import {
	loadData,
	saveData,
	mergeData,
	listFiles,
	createFile,
	renameFile,
	deleteFile,
	ensureDirectories,
	getDirectoryPath
} from '$lib/registry/data-registry';

// 데이터 저장 경로 설정 (마이그레이션 로직에서만 사용)
const DATA_DIR = process.env.DATA_PATH || 'static/data';
const VOCABULARY_DIR = join(DATA_DIR, 'vocabulary');
const DOMAIN_DIR = join(DATA_DIR, 'domain');
const TERM_DIR = join(DATA_DIR, 'term');

const DEFAULT_VOCABULARY_FILE = 'vocabulary.json';
const DEFAULT_DOMAIN_FILE = 'domain.json';
const DEFAULT_TERM_FILE = 'term.json';
const HISTORY_FILE = 'history.json';

// ============================================================================
// 마이그레이션 로직 (기존 코드 유지 - 레거시 파일 이동용)
// ============================================================================

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
				file.includes('_backup_')
			) {
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
						await rename(filePath, join(VOCABULARY_DIR, file));
						console.log(`Migrated ${file} to vocabulary directory (default)`);
					}
				} else {
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
		// 1. data-registry를 통한 디렉토리 생성
		await ensureDirectories(['vocabulary', 'domain', 'term']);

		// 2. 마이그레이션 필요 여부 확인 (루트 데이터 디렉토리에 json 파일이 남아있는지)
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

// ============================================================================
// Vocabulary (단어집) - data-registry로 위임
// ============================================================================

/**
 * 단어집 데이터를 JSON 파일로 저장 (파일 락 적용)
 * @deprecated saveData('vocabulary', data, filename) 사용 권장
 */
export async function saveVocabularyData(
	data: VocabularyData,
	filename: string = DEFAULT_VOCABULARY_FILE
): Promise<void> {
	await saveData('vocabulary', data, filename);
}

/**
 * 저장된 단어집 데이터를 JSON 파일에서 로드
 * @deprecated loadData('vocabulary', filename) 사용 권장
 */
export async function loadVocabularyData(
	filename: string = DEFAULT_VOCABULARY_FILE
): Promise<VocabularyData> {
	return loadData('vocabulary', filename);
}

/**
 * 기존 단어집 데이터에 새로운 엔트리들을 병합
 * @deprecated mergeData('vocabulary', entries, replace, filename) 사용 권장
 */
export async function mergeVocabularyData(
	newEntries: VocabularyEntry[],
	replaceExisting: boolean = true,
	filename: string = DEFAULT_VOCABULARY_FILE
): Promise<VocabularyData> {
	return mergeData('vocabulary', newEntries, replaceExisting, filename);
}

/**
 * 데이터 파일의 백업 생성 (단어집)
 */
export async function createBackup(filename: string = DEFAULT_VOCABULARY_FILE): Promise<string> {
	try {
		await ensureDirectories(['vocabulary']);
		const vocabDir = getDirectoryPath('vocabulary');
		const { default: pathModule } = await import('path');
		const dataPath = pathModule.resolve(vocabDir, pathModule.basename(filename));

		if (!existsSync(dataPath)) {
			throw new Error('백업할 데이터 파일이 존재하지 않습니다.');
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const safeFilename = filename.replace(/\.json$/, '');
		const backupFileName = `${safeFilename}_backup_${timestamp}.json`;
		const backupPath = join(vocabDir, backupFileName);

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
 * @deprecated listFiles('vocabulary') 사용 권장
 */
export async function listVocabularyFiles(): Promise<string[]> {
	return listFiles('vocabulary');
}

/**
 * 금지어 데이터를 JSON 파일에서 로드
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadForbiddenWords(
	filename = 'forbidden-words.json'
): Promise<Record<string, any>[]> {
	try {
		await ensureDirectories(['vocabulary']);
		const vocabDir = getDirectoryPath('vocabulary');
		const { default: pathModule } = await import('path');
		const dataPath = pathModule.resolve(vocabDir, pathModule.basename(filename));

		if (!existsSync(dataPath)) {
			return [];
		}

		const jsonString = await safeReadFile(dataPath);
		if (!jsonString) {
			return [];
		}

		const data = JSON.parse(jsonString);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (data.entries || []) as Record<string, any>[];
	} catch (error) {
		console.error('금지어 데이터 로드 실패:', error);
		return [];
	}
}

/**
 * 새로운 단어집 파일 생성
 * @deprecated createFile('vocabulary', filename) 사용 권장
 */
export async function createVocabularyFile(filename: string): Promise<void> {
	await createFile('vocabulary', filename);
}

/**
 * 단어집 파일 이름 변경
 * @deprecated renameFile('vocabulary', old, new) 사용 권장
 */
export async function renameVocabularyFile(
	oldFilename: string,
	newFilename: string
): Promise<void> {
	if (oldFilename === DEFAULT_VOCABULARY_FILE || oldFilename === HISTORY_FILE) {
		throw new Error('시스템 파일은 이름을 변경할 수 없습니다.');
	}
	await renameFile('vocabulary', oldFilename, newFilename);
}

/**
 * 단어집 파일 삭제
 * @deprecated deleteFile('vocabulary', filename) 사용 권장
 */
export async function deleteVocabularyFile(filename: string): Promise<void> {
	if (filename === DEFAULT_VOCABULARY_FILE || filename === HISTORY_FILE) {
		throw new Error('시스템 파일은 삭제할 수 없습니다.');
	}
	await deleteFile('vocabulary', filename);
}

// ============================================================================
// Domain (도메인) - data-registry로 위임
// ============================================================================

/**
 * 도메인 데이터를 JSON 파일에서 불러오기
 * @deprecated loadData('domain', filename) 사용 권장
 */
export async function loadDomainData(filename: string = DEFAULT_DOMAIN_FILE): Promise<DomainData> {
	return loadData('domain', filename);
}

/**
 * 도메인 데이터를 JSON 파일로 저장 (파일 락 적용)
 * @deprecated saveData('domain', data, filename) 사용 권장
 */
export async function saveDomainData(
	data: DomainData,
	filename: string = DEFAULT_DOMAIN_FILE
): Promise<void> {
	await saveData('domain', data, filename);
}

/**
 * 기존 도메인 데이터에 새로운 엔트리들을 병합
 * @deprecated mergeData('domain', entries, replace, filename) 사용 권장
 */
export async function mergeDomainData(
	newEntries: DomainEntry[],
	replaceExisting: boolean = true,
	filename: string = DEFAULT_DOMAIN_FILE
): Promise<DomainData> {
	return mergeData('domain', newEntries, replaceExisting, filename);
}

/**
 * 도메인 데이터 파일의 백업 생성
 */
export async function createDomainBackup(filename: string = DEFAULT_DOMAIN_FILE): Promise<string> {
	try {
		await ensureDirectories(['domain']);
		const domainDir = getDirectoryPath('domain');
		const { default: pathModule } = await import('path');
		const dataPath = pathModule.resolve(domainDir, pathModule.basename(filename));

		if (!existsSync(dataPath)) {
			throw new Error('백업할 도메인 데이터 파일이 존재하지 않습니다.');
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const safeFilename = filename.replace(/\.json$/, '');
		const backupFileName = `${safeFilename}_backup_${timestamp}.json`;
		const backupPath = join(domainDir, backupFileName);

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
 * @deprecated listFiles('domain') 사용 권장
 */
export async function listDomainFiles(): Promise<string[]> {
	return listFiles('domain');
}

/**
 * 새로운 도메인 파일 생성
 * @deprecated createFile('domain', filename) 사용 권장
 */
export async function createDomainFile(filename: string): Promise<void> {
	await createFile('domain', filename);
}

/**
 * 도메인 파일 이름 변경
 * @deprecated renameFile('domain', old, new) 사용 권장
 */
export async function renameDomainFile(oldFilename: string, newFilename: string): Promise<void> {
	if (oldFilename === DEFAULT_DOMAIN_FILE) {
		throw new Error('시스템 파일은 이름을 변경할 수 없습니다.');
	}
	await renameFile('domain', oldFilename, newFilename);
}

/**
 * 도메인 파일 삭제
 * @deprecated deleteFile('domain', filename) 사용 권장
 */
export async function deleteDomainFile(filename: string): Promise<void> {
	if (filename === DEFAULT_DOMAIN_FILE) {
		throw new Error('시스템 파일은 삭제할 수 없습니다.');
	}
	await deleteFile('domain', filename);
}

// ============================================================================
// Term (용어) - data-registry로 위임
// ============================================================================

/**
 * 용어 데이터를 JSON 파일에서 불러오기
 * @deprecated loadData('term', filename) 사용 권장
 */
export async function loadTermData(filename: string = DEFAULT_TERM_FILE): Promise<TermData> {
	return loadData('term', filename);
}

/**
 * 용어 데이터를 JSON 파일로 저장 (파일 락 적용)
 * @deprecated saveData('term', data, filename) 사용 권장
 */
export async function saveTermData(
	data: TermData,
	filename: string = DEFAULT_TERM_FILE
): Promise<void> {
	await saveData('term', data, filename);
}

/**
 * 기존 용어 데이터에 새로운 엔트리들을 병합
 * @deprecated mergeData('term', entries, replace, filename) 사용 권장
 */
export async function mergeTermData(
	newEntries: TermEntry[],
	replaceExisting: boolean = true,
	filename: string = DEFAULT_TERM_FILE
): Promise<TermData> {
	return mergeData('term', newEntries, replaceExisting, filename);
}

/**
 * 용어 데이터 백업 생성
 */
export async function createTermBackup(filename: string = DEFAULT_TERM_FILE): Promise<string> {
	try {
		await ensureDirectories(['term']);
		const termDir = getDirectoryPath('term');
		const { default: pathModule } = await import('path');
		const dataPath = pathModule.resolve(termDir, pathModule.basename(filename));

		if (!existsSync(dataPath)) {
			throw new Error('백업할 파일이 존재하지 않습니다.');
		}

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const safeFilename = filename.replace(/\.json$/, '');
		const backupFileName = `${safeFilename}_backup_${timestamp}.json`;
		const backupPath = join(termDir, backupFileName);

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
 * @deprecated listFiles('term') 사용 권장
 */
export async function listTermFiles(): Promise<string[]> {
	return listFiles('term');
}

/**
 * 새로운 용어 파일 생성
 * @deprecated createFile('term', filename) 사용 권장
 */
export async function createTermFile(filename: string): Promise<void> {
	await createFile('term', filename);
}

/**
 * 용어 파일 이름 변경
 * @deprecated renameFile('term', old, new) 사용 권장
 */
export async function renameTermFile(oldFilename: string, newFilename: string): Promise<void> {
	if (oldFilename === DEFAULT_TERM_FILE) {
		throw new Error('시스템 파일은 이름을 변경할 수 없습니다.');
	}
	await renameFile('term', oldFilename, newFilename);
}

/**
 * 용어 파일 삭제
 * @deprecated deleteFile('term', filename) 사용 권장
 */
export async function deleteTermFile(filename: string): Promise<void> {
	if (filename === DEFAULT_TERM_FILE) {
		throw new Error('시스템 파일은 삭제할 수 없습니다.');
	}
	await deleteFile('term', filename);
}

// ============================================================================
// 참조 무결성 검증 (Referential Integrity)
// - 이 로직은 엔트리 레벨 검사이므로 file-handler에 유지
// - 추후 mapping-registry와 연동 예정
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
			const termParts = term.termName.toLowerCase().split('_');
			const hasTermNameRef = termParts.some(
				(part) => part === standardNameLower || part === abbreviationLower
			);

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
		console.warn('참조 검증 중 오류 (삭제 허용):', error);
		return { canDelete: true, references: [] };
	}
}

/**
 * Domain 삭제 전 참조 검증
 * Vocabulary나 Term에서 해당 도메인을 참조하는지 확인
 */
export async function checkDomainReferences(
	domainEntry: DomainEntry,
	vocabularyFilename: string = DEFAULT_VOCABULARY_FILE,
	termFilename: string = DEFAULT_TERM_FILE
): Promise<ReferenceCheckResult> {
	const references: ReferenceCheckResult['references'] = [];
	const domainNameLower = domainEntry.standardDomainName.toLowerCase();

	try {
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
