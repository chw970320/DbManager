import { json, type RequestEvent } from '@sveltejs/kit';
import { buildTermImpactPreview } from '$lib/utils/change-impact-preview.js';
import type { TermEntry } from '$lib/types/term.js';

type TermImpactPreviewRequest = {
	filename?: string;
	currentEntry?: Partial<TermEntry>;
	proposedEntry?: Partial<TermEntry>;
};

export async function POST({ request, url }: RequestEvent) {
	try {
		const body = (await request.json().catch(() => ({}))) as TermImpactPreviewRequest;
		const filename = body.filename || url.searchParams.get('filename') || 'term.json';
		const proposedEntry = body.proposedEntry;

		if (!proposedEntry) {
			return json(
				{
					success: false,
					error: 'proposedEntry가 필요합니다.'
				},
				{ status: 400 }
			);
		}

		const result = await buildTermImpactPreview({
			filename,
			currentEntry: body.currentEntry,
			proposedEntry
		});

		return json(
			{
				success: true,
				data: result,
				message: '용어 변경 영향도 미리보기를 생성했습니다.'
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('용어 영향도 미리보기 오류:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '용어 영향도 미리보기 중 오류가 발생했습니다.'
			},
			{ status: 500 }
		);
	}
}
