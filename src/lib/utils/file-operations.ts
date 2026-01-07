/**
 * 제네릭 파일 관리 유틸리티
 * 중복된 create/rename/delete 함수들을 통합
 */

import { writeFile, rename, unlink, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve, basename } from 'path';

// 데이터 타입 정의
export type DataType =
	| 'vocabulary'
	| 'domain'
	| 'term'
	| 'database'
	| 'entity'
	| 'attribute'
	| 'table'
	| 'column';

// 데이터 저장 경로 설정
const DATA_DIR = process.env.DATA_PATH || 'static/data';

const DATA_DIRS: Record<DataType, string> = {
	vocabulary: join(DATA_DIR, 'vocabulary'),
	domain: join(DATA_DIR, 'domain'),
	term: join(DATA_DIR, 'term'),
	database: join(DATA_DIR, 'database'),
	entity: join(DATA_DIR, 'entity'),
	attribute: join(DATA_DIR, 'attribute'),
	table: join(DATA_DIR, 'table'),
	column: join(DATA_DIR, 'column')
};

/**
 * 파일명 검증 (공통)
 */
export function validateFilenameForOps(filename: string): void {
	if (!filename || filename.trim() === '') {
		throw new Error('파일명이 비어있습니다.');
	}
	if (!filename.endsWith('.json')) {
		throw new Error('파일명은 .json으로 끝나야 합니다.');
	}
	if (/[\\/:*?"<>|]/.test(filename.replace('.json', ''))) {
		throw new Error('파일명에 사용할 수 없는 문자가 포함되어 있습니다.');
	}
	if (filename.includes('..')) {
		throw new Error('유효하지 않은 파일명입니다.');
	}
}

/**
 * 안전한 파일 경로 생성
 */
export function getSafeDataPath(filename: string, type: DataType): string {
	const safeFilename = basename(filename);
	const baseDir = DATA_DIRS[type];
	const fullPath = resolve(baseDir, safeFilename);
	const resolvedBaseDir = resolve(baseDir);

	if (!fullPath.startsWith(resolvedBaseDir)) {
		throw new Error('유효하지 않은 파일 경로입니다.');
	}

	return fullPath;
}

/**
 * 제네릭 파일 생성
 */
export async function createDataFile<T>(
	type: DataType,
	filename: string,
	createEmptyData: () => T
): Promise<void> {
	validateFilenameForOps(filename);
	const filePath = getSafeDataPath(filename, type);

	if (existsSync(filePath)) {
		throw new Error('이미 존재하는 파일명입니다.');
	}

	const emptyData = createEmptyData();
	await writeFile(filePath, JSON.stringify(emptyData, null, 2), 'utf-8');
}

/**
 * 제네릭 파일 이름 변경
 */
export async function renameDataFile(
	type: DataType,
	oldFilename: string,
	newFilename: string
): Promise<void> {
	validateFilenameForOps(oldFilename);
	validateFilenameForOps(newFilename);

	const oldPath = getSafeDataPath(oldFilename, type);
	const newPath = getSafeDataPath(newFilename, type);

	if (!existsSync(oldPath)) {
		throw new Error('파일을 찾을 수 없습니다.');
	}

	if (existsSync(newPath)) {
		throw new Error('이미 존재하는 파일명입니다.');
	}

	await rename(oldPath, newPath);
}

/**
 * 제네릭 파일 삭제
 */
export async function deleteDataFile(type: DataType, filename: string): Promise<void> {
	validateFilenameForOps(filename);
	const filePath = getSafeDataPath(filename, type);

	if (!existsSync(filePath)) {
		throw new Error('파일을 찾을 수 없습니다.');
	}

	await unlink(filePath);
}

/**
 * 제네릭 파일 목록 조회
 */
export async function listDataFiles(type: DataType): Promise<string[]> {
	const dirPath = DATA_DIRS[type];

	if (!existsSync(dirPath)) {
		return [];
	}

	const files = await readdir(dirPath);
	const jsonFiles: string[] = [];

	for (const file of files) {
		if (file.endsWith('.json') && !file.startsWith('history')) {
			const filePath = join(dirPath, file);
			const fileStat = await stat(filePath);
			if (fileStat.isFile()) {
				jsonFiles.push(file);
			}
		}
	}

	return jsonFiles;
}

/**
 * 파일 존재 여부 확인
 */
export function dataFileExists(type: DataType, filename: string): boolean {
	try {
		const filePath = getSafeDataPath(filename, type);
		return existsSync(filePath);
	} catch {
		return false;
	}
}

/**
 * 디렉토리 경로 가져오기
 */
export function getDataDir(type: DataType): string {
	return DATA_DIRS[type];
}
