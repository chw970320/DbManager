import { existsSync } from 'fs';
import { basename, resolve } from 'path';
import type { ForbiddenWord } from '$lib/types/vocabulary';
import { safeReadFile } from './file-lock';

const DATA_DIR = process.env.DATA_PATH || 'static/data';
const VOCABULARY_DIR = resolve(DATA_DIR, 'vocabulary');

/**
 * 금지어 데이터를 JSON 파일에서 로드
 */
export async function loadForbiddenWords(
	filename = 'forbidden-words.json'
): Promise<ForbiddenWord[]> {
	try {
		const dataPath = resolve(VOCABULARY_DIR, basename(filename));
		if (!existsSync(dataPath)) {
			return [];
		}

		const jsonString = await safeReadFile(dataPath);
		if (!jsonString) {
			return [];
		}

		const data = JSON.parse(jsonString);
		return (data.entries || []) as ForbiddenWord[];
	} catch (error) {
		console.error('금지어 데이터 로드 실패:', error);
		return [];
	}
}
