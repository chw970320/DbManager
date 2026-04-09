import { json, type RequestEvent } from '@sveltejs/kit';
import { buildScopedDomainImpactPreview } from '$lib/utils/change-impact-preview.js';
import { planCascadeUpdate } from '$lib/utils/cascade-update-plan.js';
import type { DomainEntry } from '$lib/types/domain.js';

type DomainImpactPreviewRequest = {
	filename?: string;
	mode?: 'create' | 'update' | 'delete';
	scope?: 'full' | 'editor-save';
	currentEntry?: Partial<DomainEntry>;
	proposedEntry?: Partial<DomainEntry>;
};

export async function POST({ request, url }: RequestEvent) {
	try {
		const body = (await request.json().catch(() => ({}))) as DomainImpactPreviewRequest;
		const filename = body.filename || url.searchParams.get('filename') || 'domain.json';
		const scope =
			body.scope ||
			(url.searchParams.get('scope') as DomainImpactPreviewRequest['scope']) ||
			'full';

		if (scope === 'editor-save') {
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
				type: 'domain',
				filename,
				currentEntry: body.currentEntry,
				proposedEntry: body.proposedEntry
			});

			return json(
				{
					success: true,
					data: plan.preview,
					message: '도메인 저장 영향도 미리보기를 생성했습니다.'
				},
				{ status: 200 }
			);
		}

		const result = await buildScopedDomainImpactPreview(
			{
				filename,
				mode: body.mode,
				currentEntry: body.currentEntry,
				proposedEntry: body.proposedEntry
			},
			'full'
		);

		return json(
			{
				success: true,
				data: result,
				message: '도메인 변경 영향도 미리보기를 생성했습니다.'
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('도메인 영향도 미리보기 오류:', error);
		return json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : '도메인 영향도 미리보기 중 오류가 발생했습니다.'
			},
			{ status: 500 }
		);
	}
}
