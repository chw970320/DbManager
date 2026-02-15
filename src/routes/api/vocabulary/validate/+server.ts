import { json, type RequestEvent } from '@sveltejs/kit';
import { loadVocabularyData, loadForbiddenWords } from '$lib/registry/data-registry';
import type { ApiResponse, ForbiddenWord } from '$lib/types/vocabulary';

type ValidationIssue = {
	type: string;
	code: string;
	message: string;
	field?: string;
	priority: number;
};

const ERROR_PRIORITY: Record<string, number> = {
	REQUIRED_FIELD: 1,
	FORBIDDEN_WORD: 2,
	SYNONYM_CONFLICT: 3,
	ABBREVIATION_DUPLICATE: 4
};

function sortByPriority(errors: ValidationIssue[]): ValidationIssue[] {
	return [...errors].sort((a, b) => a.priority - b.priority);
}

function buildFailResponse(errors: ValidationIssue[], status: number): Response {
	const sorted = sortByPriority(errors);
	const primaryError = sorted[0];
	return json(
		{
			success: false,
			error: primaryError?.message || 'Validation failed',
			message: `Validation failed: ${primaryError?.type || 'UNKNOWN'}`,
			data: {
				errors: sorted,
				errorCount: sorted.length
			}
		} as ApiResponse,
		{ status }
	);
}

export async function POST({ request, url }: RequestEvent): Promise<Response> {
	try {
		const body = await request.json();
		const { id: entryId, entryId: bodyEntryId, standardName, abbreviation } = body as {
			id?: string;
			entryId?: string;
			standardName?: string;
			abbreviation?: string;
		};
		const effectiveEntryId = entryId || bodyEntryId;

		if (!standardName || !abbreviation) {
			const errors: ValidationIssue[] = [];
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
			return buildFailResponse(errors, 400);
		}

		const filename = url.searchParams.get('filename') || 'vocabulary.json';
		const forbiddenWordsFilename = 'forbidden-words.json';

		const [vocabData, forbiddenWordsData] = await Promise.all([
			loadVocabularyData(filename),
			loadForbiddenWords(forbiddenWordsFilename)
		]);
		const forbiddenWords = forbiddenWordsData as ForbiddenWord[];

		// 1. 금칙어 검증
		const forbiddenWord = forbiddenWords.find(
			(fw) =>
				(fw.type === 'standardName' && standardName.includes(fw.keyword)) ||
				(fw.type === 'abbreviation' && abbreviation.includes(fw.keyword))
		);
		if (forbiddenWord) {
			return buildFailResponse(
				[
					{
						type: 'FORBIDDEN_WORD',
						code: 'FORBIDDEN_WORD',
						message: `금지된 단어(${forbiddenWord.keyword})가 포함되어 있습니다.`,
						field: fwField(forbiddenWord.type),
						priority: ERROR_PRIORITY.FORBIDDEN_WORD
					}
				],
				400
			);
		}

		// 2. 이음동의어 및 중복 검증
		for (const entry of vocabData.entries) {
			if (entry.id === effectiveEntryId) continue; // 수정 시 자기 자신은 제외

			if (entry.synonyms?.includes(standardName)) {
				return buildFailResponse(
					[
						{
							type: 'SYNONYM_CONFLICT',
							code: 'SYNONYM_CONFLICT',
							message: `입력한 표준단어명(${standardName})은/는 이미 [${entry.standardName}]의 이음동의어로 등록되어 있습니다.`,
							field: 'standardName',
							priority: ERROR_PRIORITY.SYNONYM_CONFLICT
						}
					],
					409
				);
			}
			if (entry.abbreviation.toLowerCase() === abbreviation.toLowerCase()) {
				return buildFailResponse(
					[
						{
							type: 'ABBREVIATION_DUPLICATE',
							code: 'ABBREVIATION_DUPLICATE',
							message: '이미 존재하는 영문약어입니다.',
							field: 'abbreviation',
							priority: ERROR_PRIORITY.ABBREVIATION_DUPLICATE
						}
					],
					409
				);
			}
		}

		return json(
			{
				success: true,
				message: 'Validation passed',
				data: {
					validation: 'ok',
					errors: [],
					errorCount: 0
				}
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
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

function fwField(type: ForbiddenWord['type']): 'standardName' | 'abbreviation' {
	return type === 'abbreviation' ? 'abbreviation' : 'standardName';
}



