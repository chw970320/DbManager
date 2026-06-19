import { json } from '@sveltejs/kit';

import { AssistantError, getAssistantBundleList } from '$lib/server/assistant.js';
import type { AssistantBundleListResponse } from '$lib/types/assistant.js';

export async function GET() {
	try {
		return json(
			{
				success: true,
				data: await getAssistantBundleList()
			} satisfies AssistantBundleListResponse,
			{ status: 200 }
		);
	} catch (error) {
		const status = error instanceof AssistantError ? error.status : 500;
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Assistant 번들 목록을 불러오지 못했습니다.'
			} satisfies AssistantBundleListResponse,
			{ status }
		);
	}
}
