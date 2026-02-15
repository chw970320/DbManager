import { json, type RequestEvent } from '@sveltejs/kit';
import { loadVocabularyData, loadForbiddenWords } from '$lib/registry/data-registry';
import type { ApiResponse, ForbiddenWord, VocabularyEntry } from '$lib/types/vocabulary';

type ValidationIssue = {
	type: string;
	code: string;
	message: string;
	field?: string;
	priority: number;
};

type ValidationResult = {
	entry: VocabularyEntry;
	errors: ValidationIssue[];
};

const ERROR_PRIORITY: Record<string, number> = {
	REQUIRED_FIELD: 1,
	FORBIDDEN_WORD: 2,
	SYNONYM_CONFLICT: 3,
	ABBREVIATION_DUPLICATE: 4
};

function sortIssues(errors: ValidationIssue[]): ValidationIssue[] {
	return [...errors].sort((a, b) => a.priority - b.priority);
}

export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'vocabulary.json';
		const forbiddenWordsFilename = 'forbidden-words.json';

		const [vocabData, forbiddenWordsData] = await Promise.all([
			loadVocabularyData(filename),
			loadForbiddenWords(forbiddenWordsFilename)
		]);
		const entries = vocabData.entries;
		const forbiddenWords = forbiddenWordsData as ForbiddenWord[];

		const abbreviationCount = new Map<string, number>();
		for (const entry of entries) {
			const key = (entry.abbreviation || '').trim().toLowerCase();
			if (!key) continue;
			abbreviationCount.set(key, (abbreviationCount.get(key) || 0) + 1);
		}

		const failedEntries: ValidationResult[] = [];
		for (const entry of entries) {
			const errors: ValidationIssue[] = [];
			const standardName = (entry.standardName || '').trim();
			const abbreviation = (entry.abbreviation || '').trim();

			if (!standardName) {
				errors.push({
					type: 'REQUIRED_FIELD',
					code: 'REQUIRED_FIELD',
					message: '표준단어명(standardName)은 필수입니다.',
					field: 'standardName',
					priority: ERROR_PRIORITY.REQUIRED_FIELD
				});
			}
			if (!abbreviation) {
				errors.push({
					type: 'REQUIRED_FIELD',
					code: 'REQUIRED_FIELD',
					message: '영문약어(abbreviation)는 필수입니다.',
					field: 'abbreviation',
					priority: ERROR_PRIORITY.REQUIRED_FIELD
				});
			}

			if (standardName || abbreviation) {
				const forbiddenWord = forbiddenWords.find(
					(fw) =>
						(fw.type === 'standardName' && standardName.includes(fw.keyword)) ||
						(fw.type === 'abbreviation' && abbreviation.includes(fw.keyword))
				);
				if (forbiddenWord) {
					errors.push({
						type: 'FORBIDDEN_WORD',
						code: 'FORBIDDEN_WORD',
						message: `금지된 단어(${forbiddenWord.keyword})가 포함되어 있습니다.`,
						field: forbiddenWord.type === 'abbreviation' ? 'abbreviation' : 'standardName',
						priority: ERROR_PRIORITY.FORBIDDEN_WORD
					});
				}
			}

			if (abbreviation) {
				const duplicateCount = abbreviationCount.get(abbreviation.toLowerCase()) || 0;
				if (duplicateCount > 1) {
					errors.push({
						type: 'ABBREVIATION_DUPLICATE',
						code: 'ABBREVIATION_DUPLICATE',
						message: '이미 존재하는 영문약어입니다.',
						field: 'abbreviation',
						priority: ERROR_PRIORITY.ABBREVIATION_DUPLICATE
					});
				}
			}

			if (standardName) {
				const synonymOwner = entries.find(
					(other) => other.id !== entry.id && (other.synonyms || []).includes(standardName)
				);
				if (synonymOwner) {
					errors.push({
						type: 'SYNONYM_CONFLICT',
						code: 'SYNONYM_CONFLICT',
						message: `입력한 표준단어명(${standardName})은/는 이미 [${synonymOwner.standardName}]의 이음동의어로 등록되어 있습니다.`,
						field: 'standardName',
						priority: ERROR_PRIORITY.SYNONYM_CONFLICT
					});
				}
			}

			if (errors.length > 0) {
				failedEntries.push({
					entry,
					errors: sortIssues(errors)
				});
			}
		}

		return json(
			{
				success: true,
				data: {
					totalCount: entries.length,
					failedCount: failedEntries.length,
					passedCount: entries.length - failedEntries.length,
					failedEntries
				},
				message: 'Vocabulary validation completed'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('Vocabulary validate-all 오류:', error);
		return json(
			{
				success: false,
				error: '단어집 유효성 검사 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}
