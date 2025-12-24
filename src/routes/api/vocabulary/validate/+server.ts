import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse, VocabularyEntry } from '$lib/types/vocabulary.js';
import { loadVocabularyData, listVocabularyFiles } from '$lib/utils/file-handler.js';
import { validateForbiddenWordsAndSynonyms } from '$lib/utils/validation.js';

/**
 * 단어 validation API
 * POST /api/vocabulary/validate
 * 
 * 클라이언트에서 전송 전에 validation을 수행하기 위한 엔드포인트
 */
export async function POST({ request, url }: RequestEvent) {
	try {
		const body = await request.json();
		const { standardName, abbreviation, entryId } = body;
		const filename = url.searchParams.get('filename') || 'vocabulary.json';

		// 필수 필드 검증
		if (!standardName || typeof standardName !== 'string') {
			return json(
				{
					success: false,
					error: '표준단어명이 필요합니다.',
					message: 'Missing standardName'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 1. 금칙어 및 이음동의어 validation
		try {
			const allVocabularyFiles = await listVocabularyFiles();
			const allVocabularyEntries: VocabularyEntry[] = [];
			for (const file of allVocabularyFiles) {
				try {
					const fileData = await loadVocabularyData(file);
					// 수정 모드인 경우 현재 entry 제외
					const filteredEntries = entryId
						? fileData.entries.filter((e) => e.id !== entryId)
						: fileData.entries;
					allVocabularyEntries.push(...filteredEntries);
				} catch (error) {
					console.warn(`단어집 파일 ${file} 로드 실패:`, error);
				}
			}

			// 금칙어 및 이음동의어 validation
			const validationError = validateForbiddenWordsAndSynonyms(
				standardName,
				allVocabularyEntries
			);
			if (validationError) {
				return json(
					{
						success: false,
						error: validationError,
						message: 'Forbidden word or synonym detected'
					} as ApiResponse,
					{ status: 400 }
				);
			}
		} catch (validationError) {
			console.warn('금칙어 및 이음동의어 확인 중 오류:', validationError);
			// validation 실패 시에도 성공으로 반환 (서버에서 다시 검증)
		}

		// 2. 영문약어 중복 검사 (현재 파일 기준)
		if (abbreviation && typeof abbreviation === 'string') {
			try {
				const vocabularyData = await loadVocabularyData(filename);
				// 수정 모드인 경우 현재 entry 제외
				const filteredEntries = entryId
					? vocabularyData.entries.filter((e) => e.id !== entryId)
					: vocabularyData.entries;
				const isAbbreviationDuplicate = filteredEntries.some(
					(e) => e.abbreviation === abbreviation.trim()
				);
				if (isAbbreviationDuplicate) {
					return json(
						{
							success: false,
							error: '이미 존재하는 영문약어입니다.',
							message: 'Duplicate abbreviation'
						} as ApiResponse,
						{ status: 409 }
					);
				}
			} catch (checkError) {
				console.warn('영문약어 중복 검사 중 오류:', checkError);
				// 중복 검사 실패 시에도 성공으로 반환 (서버에서 다시 검증)
			}
		}

		// 모든 validation 통과
		return json(
			{
				success: true,
				message: 'Validation passed'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('Validation 중 오류:', error);
		return json(
			{
				success: false,
				error: 'Validation 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

