import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '$lib/types/vocabulary.js';
import type { TermEntry } from '$lib/types/term.js';
import { loadTermData, listTermFiles, loadVocabularyData } from '$lib/utils/file-handler.js';
import {
	validateTermNameSuffix,
	validateTermUniqueness,
	validateTermNameUniqueness
} from '$lib/utils/validation.js';

/**
 * 용어 validation API
 * POST /api/term/validate
 *
 * 클라이언트에서 전송 전에 validation을 수행하기 위한 엔드포인트
 */
export async function POST({ request, url }: RequestEvent) {
	try {
		const body = await request.json();
		const { termName, columnName, domainName, entryId } = body;
		const filename = url.searchParams.get('filename') || 'term.json';

		// 필수 필드 검증
		if (!termName || typeof termName !== 'string' || !termName.trim()) {
			return json(
				{
					success: false,
					error: '용어명이 필요합니다.',
					message: 'Missing termName'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		if (!columnName || typeof columnName !== 'string' || !columnName.trim()) {
			return json(
				{
					success: false,
					error: '컬럼명이 필요합니다.',
					message: 'Missing columnName'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// domainName은 선택적 필드 (용어 변환기에서는 아직 선택하지 않을 수 있음)
		const hasDomainName = domainName && typeof domainName === 'string' && domainName.trim();

		// 0. 용어명이 2단어 이상의 조합인지 확인
		const termParts = termName
			.trim()
			.split('_')
			.map((p) => p.trim())
			.filter((p) => p.length > 0);
		if (termParts.length < 2) {
			return json(
				{
					success: false,
					error: '용어명은 2단어 이상의 조합이어야 합니다.',
					message: 'Term name must consist of at least 2 words'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 매핑 정보 로드
		let termData;
		try {
			termData = await loadTermData(filename);
		} catch {
			return json(
				{
					success: false,
					error: '용어 파일을 로드할 수 없습니다.',
					message: 'Failed to load term data'
				} as ApiResponse,
				{ status: 500 }
			);
		}

		const mapping = termData.mapping || {
			vocabulary: 'vocabulary.json',
			domain: 'domain.json'
		};

		// 단어집 데이터 로드
		let vocabularyData;
		try {
			vocabularyData = await loadVocabularyData(mapping.vocabulary);
		} catch (vocabError) {
			console.warn('단어집 데이터 로드 실패:', vocabError);
			vocabularyData = { entries: [] };
		}

		// 1. 용어명 접미사 validation
		const suffixValidationError = validateTermNameSuffix(termName.trim(), vocabularyData.entries);
		if (suffixValidationError) {
			return json(
				{
					success: false,
					error: suffixValidationError,
					message: 'Term name suffix validation failed'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 2. 모든 용어 파일 로드 (중복 검사에 사용)
		const allTermEntries: TermEntry[] = [];
		try {
			const allTermFiles = await listTermFiles();
			for (const file of allTermFiles) {
				try {
					const fileData = await loadTermData(file);
					// 수정 모드인 경우 현재 entry 제외
					const filteredEntries = entryId
						? fileData.entries.filter((e) => e.id !== entryId)
						: fileData.entries;
					allTermEntries.push(...filteredEntries);
				} catch (error) {
					console.warn(`용어 파일 ${file} 로드 실패:`, error);
				}
			}
		} catch (loadError) {
			console.warn('용어 파일 목록 로드 실패:', loadError);
		}

		// 3. 용어명 중복 검사 (이미 등록된 용어명인지 확인)
		if (allTermEntries.length > 0) {
			const termNameUniquenessError = validateTermNameUniqueness(
				termName.trim(),
				allTermEntries,
				entryId
			);
			if (termNameUniquenessError) {
				return json(
					{
						success: false,
						error: termNameUniquenessError,
						message: 'Duplicate term name'
					} as ApiResponse,
					{ status: 409 }
				);
			}
		}

		// 4. 용어명 유일성 validation (termName, columnName, domainName 조합) - domainName이 제공된 경우에만 수행
		if (hasDomainName && allTermEntries.length > 0) {
			const uniquenessError = validateTermUniqueness(
				termName.trim(),
				columnName.trim(),
				domainName.trim(),
				allTermEntries
			);
			if (uniquenessError) {
				return json(
					{
						success: false,
						error: uniquenessError,
						message: 'Duplicate term'
					} as ApiResponse,
					{ status: 409 }
				);
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
