import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { loadVocabularyData } from '$lib/utils/file-handler';
import type { VocabularyEntry } from '$lib/types/vocabulary';
import type { ApiResponse } from '$lib/types/api';

interface DuplicateGroup {
	abbreviation: string;
	entries: VocabularyEntry[];
	count: number;
}

export async function GET({ url }: RequestEvent): Promise<Response> {
	try {
		const filename = url.searchParams.get('filename') || 'vocabulary.json';
		const data = await loadVocabularyData(filename);

		const abbreviationGroups = new Map<string, VocabularyEntry[]>();

		data.entries.forEach((entry) => {
			const group = abbreviationGroups.get(entry.abbreviation) || [];
			group.push(entry);
			abbreviationGroups.set(entry.abbreviation, group);
		});

		const duplicates: DuplicateGroup[] = [];
		for (const [abbreviation, entries] of abbreviationGroups.entries()) {
			if (entries.length > 1) {
				duplicates.push({
					abbreviation,
					entries,
					count: entries.length
				});
			}
		}

		return json(
			{
				success: true,
				message: '중복 단어 조회가 완료되었습니다.',
				data: duplicates
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: `데이터 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`
			} as ApiResponse,
			{ status: 500 }
		);
	}
}