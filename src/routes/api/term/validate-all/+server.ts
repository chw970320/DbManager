import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '$lib/types/vocabulary.js';
import type {
	TermEntry,
	ValidationErrorType,
	ValidationError,
	AutoFixSuggestion,
	ValidationResult
} from '$lib/types/term.js';
import type { VocabularyEntry } from '$lib/types/vocabulary.js';
import type { DomainEntry } from '$lib/types/domain.js';
import { loadTermData } from '$lib/utils/file-handler.js';
import {
	validateTermNameSuffix,
	validateTermUniqueness,
	validateTermNameUniqueness,
	validateTermNameMapping,
	validateColumnNameMapping,
	validateDomainNameMapping
} from '$lib/utils/validation.js';
import { getCachedVocabularyData, getCachedDomainData } from '$lib/utils/cache.js';

/**
 * 우선순위에 따라 오류 정렬
 */
const ERROR_PRIORITY: Record<ValidationErrorType, number> = {
	TERM_NAME_LENGTH: 1,
	TERM_NAME_DUPLICATE: 2,
	TERM_UNIQUENESS: 3,
	TERM_NAME_MAPPING: 4,
	COLUMN_NAME_MAPPING: 5,
	TERM_NAME_SUFFIX: 6,
	DOMAIN_NAME_MAPPING: 7
};

function sortErrorsByPriority(errors: ValidationError[]): ValidationError[] {
	return [...errors].sort((a, b) => {
		const priorityA = ERROR_PRIORITY[a.type] || 999;
		const priorityB = ERROR_PRIORITY[b.type] || 999;
		return priorityA - priorityB;
	});
}

/**
 * 동음이의어/금칙어 검색 및 추천
 */
function checkForbiddenWordsAndSynonymsForWord(
	word: string,
	vocabularyEntries: VocabularyEntry[]
): { recommendations: string[]; isForbidden: boolean; isSynonym: boolean } {
	const wordLower = word.trim().toLowerCase();
	const recommendations: string[] = [];
	let isForbidden = false;
	let isSynonym = false;

	// 금칙어 및 이음동의어 확인
	for (const entry of vocabularyEntries) {
		if (!entry.standardName) continue;

		// 금칙어 확인
		if (entry.forbiddenWords && Array.isArray(entry.forbiddenWords)) {
			for (const forbiddenWord of entry.forbiddenWords) {
				if (typeof forbiddenWord === 'string' && forbiddenWord.trim().toLowerCase() === wordLower) {
					isForbidden = true;
					if (!recommendations.includes(entry.standardName)) {
						recommendations.push(entry.standardName);
					}
					break;
				}
			}
		}

		// 이음동의어 확인
		if (entry.synonyms && Array.isArray(entry.synonyms)) {
			for (const synonym of entry.synonyms) {
				if (typeof synonym === 'string' && synonym.trim().toLowerCase() === wordLower) {
					isSynonym = true;
					if (!recommendations.includes(entry.standardName)) {
						recommendations.push(entry.standardName);
					}
					break;
				}
			}
		}
	}

	return { recommendations, isForbidden, isSynonym };
}

/**
 * 접미사 기반 도메인명 검색
 */
function findDomainNamesBySuffix(
	suffix: string,
	vocabularyEntries: VocabularyEntry[],
	domainEntries: DomainEntry[]
): string[] {
	const suffixLower = suffix.trim().toLowerCase();
	const matchedDomainCategories = new Set<string>();

	// 단어집에서 접미사에 해당하는 표준단어명 찾기
	for (const entry of vocabularyEntries) {
		if (!entry.standardName) continue;
		if (entry.standardName.trim().toLowerCase() === suffixLower) {
			if (entry.domainCategory && entry.isDomainCategoryMapped !== false) {
				matchedDomainCategories.add(entry.domainCategory.trim().toLowerCase());
			}
		}
	}

	// 도메인 데이터에서 해당 도메인분류에 매핑된 도메인명 찾기
	const recommendedDomainNames = new Set<string>();
	for (const domainEntry of domainEntries) {
		if (!domainEntry.domainCategory || !domainEntry.standardDomainName) continue;
		const categoryLower = domainEntry.domainCategory.trim().toLowerCase();
		if (matchedDomainCategories.has(categoryLower)) {
			recommendedDomainNames.add(domainEntry.standardDomainName.trim());
		}
	}

	return Array.from(recommendedDomainNames);
}

/**
 * 중복 항목 찾기
 */
function findDuplicateEntries(
	entry: TermEntry,
	errorType: 'TERM_NAME_DUPLICATE' | 'TERM_UNIQUENESS',
	allEntries: TermEntry[]
): TermEntry[] {
	if (errorType === 'TERM_NAME_DUPLICATE') {
		const termNameLower = entry.termName.trim().toLowerCase();
		return allEntries.filter(
			(e) => e.id !== entry.id && e.termName.trim().toLowerCase() === termNameLower
		);
	} else if (errorType === 'TERM_UNIQUENESS') {
		const termNameLower = entry.termName.trim().toLowerCase();
		const columnNameLower = entry.columnName.trim().toLowerCase();
		const domainNameLower = entry.domainName.trim().toLowerCase();
		return allEntries.filter(
			(e) =>
				e.id !== entry.id &&
				e.termName.trim().toLowerCase() === termNameLower &&
				e.columnName.trim().toLowerCase() === columnNameLower &&
				e.domainName.trim().toLowerCase() === domainNameLower
		);
	}
	return [];
}

/**
 * 수정 제안 생성 (자동 수정 메타데이터 포함)
 */
function generateAutoFixSuggestions(
	entry: TermEntry,
	errors: ValidationError[],
	vocabularyEntries: VocabularyEntry[],
	domainEntries: DomainEntry[],
	allEntries: TermEntry[],
	mapping: { vocabulary: string; domain: string }
): AutoFixSuggestion | undefined {
	const suggestions: AutoFixSuggestion = {
		metadata: {}
	};
	const recommendationParts: string[] = [];

	// 단어집 맵 생성
	const vocabularyMap = new Map<string, { standardName: string; abbreviation: string }>();
	vocabularyEntries.forEach((vocabEntry) => {
		const standardNameKey = vocabEntry.standardName.trim().toLowerCase();
		const abbreviationKey = vocabEntry.abbreviation.trim().toLowerCase();
		vocabularyMap.set(standardNameKey, {
			standardName: vocabEntry.standardName,
			abbreviation: vocabEntry.abbreviation
		});
		vocabularyMap.set(abbreviationKey, {
			standardName: vocabEntry.standardName,
			abbreviation: vocabEntry.abbreviation
		});
	});

	// 우선순위에 따라 오류 처리
	const sortedErrors = sortErrorsByPriority(errors);

	for (const error of sortedErrors) {
		// 이미 actionType이 설정되어 있으면 더 낮은 우선순위 오류는 건너뛰기
		if (suggestions.actionType) {
			break;
		}

		switch (error.type) {
			case 'TERM_NAME_LENGTH':
				recommendationParts.push(
					`용어명 '${entry.termName}'은(는) 2단어 이상의 조합이어야 합니다. 현재 단일 단어로 등록되어 잘못된 등록으로 판별됩니다. 해당 항목을 삭제해주세요.`
				);
				suggestions.actionType = 'DELETE_TERM';
				break;

			case 'TERM_NAME_DUPLICATE': {
				const duplicates = findDuplicateEntries(entry, 'TERM_NAME_DUPLICATE', allEntries);
				if (duplicates.length > 0) {
					const duplicateIds = duplicates.map((d) => d.id).join(', ');
					recommendationParts.push(
						`용어명 '${entry.termName}'은(는) 현재 파일 내에서 중복되어 사용되고 있습니다. 중복된 항목 ID: ${duplicateIds}. 중복 항목 중 하나를 삭제해주세요.`
					);
					suggestions.actionType = 'DELETE_DUPLICATE';
					if (!suggestions.metadata) suggestions.metadata = {};
					suggestions.metadata.duplicateEntryIds = [entry.id, ...duplicates.map((d) => d.id)];
				}
				break;
			}

			case 'TERM_UNIQUENESS': {
				const duplicates = findDuplicateEntries(entry, 'TERM_UNIQUENESS', allEntries);
				if (duplicates.length > 0) {
					const duplicateIds = duplicates.map((d) => d.id).join(', ');
					recommendationParts.push(
						`용어명 '${entry.termName}', 컬럼명 '${entry.columnName}', 도메인명 '${entry.domainName}' 조합이 현재 파일 내에서 중복되어 사용되고 있습니다. 중복된 항목 ID: ${duplicateIds}. 중복 항목 중 하나를 삭제해주세요.`
					);
					suggestions.actionType = 'DELETE_DUPLICATE';
					if (!suggestions.metadata) suggestions.metadata = {};
					suggestions.metadata.duplicateEntryIds = [entry.id, ...duplicates.map((d) => d.id)];
				}
				break;
			}

			case 'TERM_NAME_MAPPING': {
				const termParts = entry.termName
					.split('_')
					.map((p) => p.trim())
					.filter((p) => p.length > 0);
				const columnParts = entry.columnName
					.split('_')
					.map((p) => p.trim())
					.filter((p) => p.length > 0);
				const unmappedParts: string[] = [];
				const recommendationsByPart: Map<string, string[]> = new Map();

				for (const part of termParts) {
					const partLower = part.toLowerCase();
					let found = false;

					// 단어집에서 찾기
					for (const [key] of vocabularyMap.entries()) {
						if (key === partLower) {
							found = true;
							break;
						}
					}

					if (!found) {
						unmappedParts.push(part);
						// 동음이의어/금칙어 검색
						const synonymResult = checkForbiddenWordsAndSynonymsForWord(part, vocabularyEntries);
						if (synonymResult.recommendations.length > 0) {
							recommendationsByPart.set(part, synonymResult.recommendations);
						}
					}
				}

				if (unmappedParts.length > 0) {
					const partsWithRecommendations: Array<{ part: string; recommendations: string[] }> = [];
					const partsWithoutRecommendations: string[] = [];

					for (const part of unmappedParts) {
						const recommendations = recommendationsByPart.get(part);
						if (recommendations && recommendations.length > 0) {
							partsWithRecommendations.push({ part, recommendations });
							recommendationParts.push(
								`'${part}' → 표준단어명 '${recommendations.join("' 또는 '")}'로 수정 권장`
							);
						} else {
							partsWithoutRecommendations.push(part);
						}
					}

					if (partsWithRecommendations.length > 0) {
						recommendationParts.push(
							`용어명의 다음 단어들이 단어집에 등록되지 않았습니다. ${partsWithRecommendations.map((p) => `'${p.part}' → 표준단어명 '${p.recommendations.join("' 또는 '")}'로 수정 권장`).join(', ')}.`
						);
						// 동음이의어가 있으면 선택 팝업
						suggestions.actionType = 'SELECT_SYNONYM';
						if (!suggestions.metadata) suggestions.metadata = {};
						suggestions.metadata.unmappedParts = partsWithRecommendations;
					}
					if (partsWithoutRecommendations.length > 0) {
						recommendationParts.push(
							`용어명의 다음 단어들을 단어집에 표준단어명으로 추가해주세요: ${partsWithoutRecommendations.join(', ')}.`
						);
						// 동음이의어가 없으면 단어 추가 팝업
						if (!suggestions.actionType) {
							suggestions.actionType = 'ADD_VOCABULARY';
							if (!suggestions.metadata) suggestions.metadata = {};
							suggestions.metadata.vocabularyFilename = mapping.vocabulary;
							// 컬럼명에서 영문약어 추출
							suggestions.metadata.vocabularyToAdd = partsWithoutRecommendations.map(
								(part, idx) => {
									// 용어명에서 해당 단어의 인덱스 찾기
									const partIndex = termParts.findIndex((p) => p === part);
									const abbreviation =
										partIndex >= 0 && partIndex < columnParts.length
											? columnParts[partIndex]
											: part.toUpperCase().replace(/[^A-Z0-9]/g, '');
									return {
										standardName: part,
										abbreviation: abbreviation
									};
								}
							);
						}
					}
				}
				break;
			}

			case 'COLUMN_NAME_MAPPING': {
				const termParts = entry.termName
					.split('_')
					.map((p) => p.trim())
					.filter((p) => p.length > 0);
				const columnParts = entry.columnName
					.split('_')
					.map((p) => p.trim())
					.filter((p) => p.length > 0);

				// 용어명 매핑 성공 여부 확인
				const termMappingError = errors.find((e) => e.type === 'TERM_NAME_MAPPING');
				const isTermMappingSuccess = !termMappingError;

				if (termParts.length !== columnParts.length) {
					recommendationParts.push(
						`용어명 '${entry.termName}'(${termParts.length}개 단어)과 컬럼명 '${entry.columnName}'(${columnParts.length}개 단어)의 단어 개수가 일치하지 않습니다. 용어명의 각 단어에 대응하는 영문약어로 컬럼명을 구성해야 합니다.`
					);
				} else if (isTermMappingSuccess) {
					// 용어명 매핑 성공 시, 매핑 실패한 컬럼명 부분의 순번과 동일한 위치의 용어명 부분에 해당하는 영문약어 추천
					const unmappedColumnIndices: number[] = [];
					for (let i = 0; i < columnParts.length; i++) {
						const columnPart = columnParts[i].toLowerCase();
						if (!vocabularyMap.has(columnPart)) {
							unmappedColumnIndices.push(i);
						}
					}

					if (unmappedColumnIndices.length > 0) {
						const recommendations: string[] = [];
						const columnNameFixes: Array<{ index: number; oldValue: string; newValue: string }> =
							[];
						for (const idx of unmappedColumnIndices) {
							const termPart = termParts[idx];
							const termPartLower = termPart.toLowerCase();
							const vocabEntry = vocabularyMap.get(termPartLower);
							if (vocabEntry) {
								recommendations.push(
									`컬럼명의 ${idx + 1}번째 단어 '${columnParts[idx]}' → 용어명의 ${idx + 1}번째 단어 '${termPart}'에 해당하는 영문약어 '${vocabEntry.abbreviation}'로 수정 권장`
								);
								columnNameFixes.push({
									index: idx,
									oldValue: columnParts[idx],
									newValue: vocabEntry.abbreviation
								});
							}
						}
						if (recommendations.length > 0) {
							recommendationParts.push(recommendations.join(', '));
							suggestions.actionType = 'FIX_COLUMN_NAME';
							if (!suggestions.metadata) suggestions.metadata = {};
							suggestions.metadata.columnNameFixes = columnNameFixes;
							// 수정된 컬럼명 생성
							const newColumnParts = [...columnParts];
							for (const fix of columnNameFixes) {
								newColumnParts[fix.index] = fix.newValue;
							}
							suggestions.columnName = newColumnParts.join('_');
						}
					}
				} else {
					// 용어명 매핑도 실패한 경우
					const unmappedColumnParts: string[] = [];
					for (let i = 0; i < columnParts.length; i++) {
						const columnPart = columnParts[i].toLowerCase();
						if (!vocabularyMap.has(columnPart)) {
							unmappedColumnParts.push(columnParts[i]);
						}
					}
					if (unmappedColumnParts.length > 0) {
						recommendationParts.push(
							`컬럼명의 다음 단어들을 단어집에 영문약어로 추가해주세요: ${unmappedColumnParts.join(', ')}.`
						);
					}
				}
				break;
			}

			case 'TERM_NAME_SUFFIX': {
				const termParts = entry.termName
					.split('_')
					.map((p) => p.trim())
					.filter((p) => p.length > 0);
				const suffix = termParts[termParts.length - 1];

				// 접미사 단어 찾기
				const suffixWordEntry = vocabularyEntries.find(
					(v) => v.standardName.trim().toLowerCase() === suffix.toLowerCase()
				);

				if (suffixWordEntry) {
					// 용어명 매핑과 컬럼명 매핑이 성공했는지 확인
					const termMappingError = errors.find((e) => e.type === 'TERM_NAME_MAPPING');
					const columnMappingError = errors.find((e) => e.type === 'COLUMN_NAME_MAPPING');
					const isTermMappingSuccess = !termMappingError;
					const isColumnMappingSuccess = !columnMappingError;

					if (isTermMappingSuccess && isColumnMappingSuccess) {
						// 용어명 매핑과 컬럼명 매핑이 성공한 경우, 접미사는 단어집에 등록되어 있음
						// 따라서 형식단어여부가 N인 경우만 발생함
						recommendationParts.push(
							`용어명의 접미사 '${suffix}'은(는) 단어집에 등록되어 있으며, 용어명 매핑과 컬럼명 매핑 검증을 통과했습니다. 그러나 형식단어여부가 N으로 설정되어 있어 접미사로 사용할 수 없습니다. 형식단어여부를 Y로 변경해주세요.`
						);
					} else {
						recommendationParts.push(
							`용어명의 접미사 '${suffix}'은(는) 형식단어여부가 N으로 설정되어 있어 사용할 수 없습니다. 형식단어여부를 Y로 변경해주세요.`
						);
					}

					suggestions.actionType = 'FIX_VOCABULARY_SUFFIX';
					if (!suggestions.metadata) suggestions.metadata = {};
					suggestions.metadata.suffixWord = suffix;
					suggestions.metadata.vocabularyFilename = mapping.vocabulary;
					suggestions.metadata.vocabularyEntryId = suffixWordEntry.id;
					// 이미 찾은 단어 정보를 metadata에 포함 (클라이언트에서 다시 찾을 필요 없음)
					suggestions.metadata.vocabularyEntry = {
						id: suffixWordEntry.id,
						standardName: suffixWordEntry.standardName,
						abbreviation: suffixWordEntry.abbreviation,
						englishName: suffixWordEntry.englishName,
						description: suffixWordEntry.description || '',
						domainCategory: suffixWordEntry.domainCategory,
						isFormalWord: suffixWordEntry.isFormalWord,
						synonyms: suffixWordEntry.synonyms,
						forbiddenWords: suffixWordEntry.forbiddenWords
					};
				}
				break;
			}

			case 'DOMAIN_NAME_MAPPING': {
				const termParts = entry.termName
					.split('_')
					.map((p) => p.trim())
					.filter((p) => p.length > 0);
				const suffix = termParts[termParts.length - 1];

				// 접미사 단어 찾기
				const suffixWordEntry = vocabularyEntries.find(
					(v) => v.standardName.trim().toLowerCase() === suffix.toLowerCase()
				);

				if (suffixWordEntry) {
					const recommendedDomainNames = findDomainNamesBySuffix(
						suffix,
						vocabularyEntries,
						domainEntries
					);

					if (recommendedDomainNames.length > 0) {
						recommendationParts.push(
							`용어명 접미사 '${suffix}'와(과) 매핑된 도메인명을 찾지 못했습니다. 혹은 도메인명 '${entry.domainName}'이(가) 존재하지 않습니다. ${recommendedDomainNames.join(', ')} 중 하나로 수정해주세요.`
						);
					} else {
						recommendationParts.push(
							`용어명 접미사 '${suffix}'와(과) 매핑된 도메인명을 찾지 못했습니다. 혹은 도메인명 '${entry.domainName}'이(가) 존재하지 않습니다. 올바른 도메인명으로 수정해주세요.`
						);
					}

					// 도메인명 매핑 오류는 용어 수정 팝업을 열어서 도메인명을 수정하도록 함
					suggestions.actionType = 'AUTO_FIX_TERM_EDITOR';
					if (!suggestions.metadata) suggestions.metadata = {};
					suggestions.metadata.suffixWord = suffix;
					if (recommendedDomainNames.length > 0) {
						suggestions.metadata.recommendedDomainNames = recommendedDomainNames;
						// 추천 도메인명이 있으면 첫 번째 것을 기본값으로 설정
						suggestions.domainName = recommendedDomainNames[0];
					}
				}
				break;
			}
		}
	}

	if (recommendationParts.length > 0) {
		suggestions.reason = recommendationParts.join('\n');
		return suggestions;
	}

	return undefined;
}

/**
 * 전체 용어 validation 체크 API
 * GET /api/term/validate-all
 */
export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'term.json';

		// 용어 데이터 로드
		let termData;
		try {
			termData = await loadTermData(filename);
		} catch (loadError) {
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

		// 단어집 및 도메인 데이터 로드
		const vocabularyData = await getCachedVocabularyData(mapping.vocabulary);
		const domainData = await getCachedDomainData(mapping.domain);

		// 현재 파일의 항목들만 사용 (같은 파일 내에서만 중복 검사)
		// 참고: 전체 파일 간 중복 검사는 필요시 별도로 구현
		const currentFileEntries = termData.entries;

		// 각 항목에 대해 validation 수행
		const validationResults: ValidationResult[] = [];
		const totalCount = termData.entries.length;
		let passedCount = 0;
		let failedCount = 0;

		for (const entry of termData.entries) {
			const errors: ValidationError[] = [];

			// 1. 용어명이 2단어 이상인지 확인
			const termParts = entry.termName
				.trim()
				.split('_')
				.map((p) => p.trim())
				.filter((p) => p.length > 0);
			if (termParts.length < 2) {
				errors.push({
					type: 'TERM_NAME_LENGTH',
					message: '용어명은 2단어 이상의 조합이어야 합니다.',
					field: 'termName'
				});
			}

			// 2. 용어명 접미사 validation
			if (termParts.length >= 2) {
				const suffixError = validateTermNameSuffix(entry.termName.trim(), vocabularyData.entries);
				if (suffixError) {
					errors.push({
						type: 'TERM_NAME_SUFFIX',
						message: suffixError,
						field: 'termName'
					});
				}
			}

			// 3. 용어명 중복 검사 (현재 파일 내에서만)
			if (termParts.length >= 2) {
				const uniquenessError = validateTermNameUniqueness(
					entry.termName.trim(),
					currentFileEntries,
					entry.id
				);
				if (uniquenessError) {
					errors.push({
						type: 'TERM_NAME_DUPLICATE',
						message: uniquenessError,
						field: 'termName'
					});
				}
			}

			// 4. 용어 유일성 validation (현재 파일 내에서만)
			if (entry.termName && entry.columnName && entry.domainName) {
				const termUniquenessError = validateTermUniqueness(
					entry.termName.trim(),
					entry.columnName.trim(),
					entry.domainName.trim(),
					currentFileEntries,
					entry.id
				);
				if (termUniquenessError) {
					errors.push({
						type: 'TERM_UNIQUENESS',
						message: termUniquenessError,
						field: 'termName'
					});
				}
			}

			// 5. 용어명 매핑 validation
			if (termParts.length >= 2) {
				const termMappingError = validateTermNameMapping(
					entry.termName.trim(),
					vocabularyData.entries
				);
				if (termMappingError) {
					errors.push({
						type: 'TERM_NAME_MAPPING',
						message: termMappingError,
						field: 'termName'
					});
				}
			}

			// 6. 컬럼명 매핑 validation
			if (entry.columnName) {
				const columnMappingError = validateColumnNameMapping(
					entry.columnName.trim(),
					vocabularyData.entries
				);
				if (columnMappingError) {
					errors.push({
						type: 'COLUMN_NAME_MAPPING',
						message: columnMappingError,
						field: 'columnName'
					});
				}
			}

			// 7. 도메인명 매핑 validation
			if (entry.domainName) {
				const domainMappingError = validateDomainNameMapping(
					entry.domainName.trim(),
					domainData.entries
				);
				if (domainMappingError) {
					errors.push({
						type: 'DOMAIN_NAME_MAPPING',
						message: domainMappingError,
						field: 'domainName'
					});
				}
			}

			// 오류가 있으면 결과에 추가
			if (errors.length > 0) {
				failedCount++;
				// 오류를 우선순위대로 정렬
				const sortedErrors = sortErrorsByPriority(errors);
				const suggestions = generateAutoFixSuggestions(
					entry,
					sortedErrors,
					vocabularyData.entries,
					domainData.entries,
					currentFileEntries,
					mapping
				);
				validationResults.push({
					entry,
					errors: sortedErrors,
					suggestions
				});
			} else {
				passedCount++;
			}
		}

		return json(
			{
				success: true,
				data: {
					totalCount,
					failedCount,
					passedCount,
					failedEntries: validationResults
				},
				message: 'Validation completed'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('전체 validation 체크 중 오류:', error);
		return json(
			{
				success: false,
				error: 'Validation 체크 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}
