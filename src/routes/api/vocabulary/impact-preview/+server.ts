import { json, type RequestEvent } from '@sveltejs/kit';
import { planCascadeUpdate } from '$lib/utils/cascade-update-plan.js';
import type { VocabularyEntry } from '$lib/types/vocabulary.js';

type VocabularyImpactPreviewRequest = {
	filename?: string;
	currentEntry?: Partial<VocabularyEntry>;
	proposedEntry?: Partial<VocabularyEntry>;
};

export async function POST({ request, url }: RequestEvent) {
	try {
		const body = (await request.json().catch(() => ({}))) as VocabularyImpactPreviewRequest;
		const filename = body.filename || url.searchParams.get('filename') || 'vocabulary.json';

		if (!body.proposedEntry) {
			return json(
				{
					success: false,
					error: 'proposedEntry가 필요합니다.'
				},
				{ status: 400 }
			);
		}

		const plan = await planCascadeUpdate({
			type: 'vocabulary',
			filename,
			currentEntry: body.currentEntry,
			proposedEntry: body.proposedEntry
		});

		return json(
			{
				success: true,
				data: plan.preview,
				message: '단어집 저장 영향도 미리보기를 생성했습니다.'
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('단어집 영향도 미리보리 오류:', error);
		return json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : '단어집 영향도 미리보기 중 오류가 발생했습니다.'
			},
			{ status: 500 }
		);
	}
}
