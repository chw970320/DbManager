import { json, type RequestEvent } from '@sveltejs/kit';
import { loadVocabularyData, loadForbiddenWords } from '$lib/registry/data-registry';
import type { ApiResponse, ForbiddenWord } from '$lib/types/vocabulary';

export async function POST({ request, url }: RequestEvent): Promise<Response> {
	try {
		const body = await request.json();
		const { id: entryId, standardName, abbreviation } = body;

		if (!standardName || !abbreviation) {
			return json(
				{
					success: false,
					error: `필수 필드가 누락되었습니다: ${!standardName ? 'standardName' : ''}${!abbreviation ? 'abbreviation' : ''}`
				} as ApiResponse,
				{ status: 400 }
			);
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
			return json(
				{ success: false, error: `금지된 단어(${forbiddenWord.keyword})가 포함되어 있습니다.` },
				{ status: 400 }
			);
		}

		// 2. 이음동의어 및 중복 검증
		for (const entry of vocabData.entries) {
			if (entry.id === entryId) continue; // 수정 시 자기 자신은 제외

			if (entry.synonyms?.includes(standardName)) {
				return json(
					{
						success: false,
						error: `입력한 표준단어명(${standardName})은/는 이미 [${entry.standardName}]의 이음동의어로 등록되어 있습니다.`
					},
					{ status: 409 }
				);
			}
			if (entry.abbreviation.toLowerCase() === abbreviation.toLowerCase()) {
				return json({ success: false, error: '이미 존재하는 영문약어입니다.' }, { status: 409 });
			}
		}

		return json({ success: true, data: { validation: 'ok' } } as ApiResponse);
	} catch (error) {
		return json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 });
	}
}



