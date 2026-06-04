import { json, type RequestEvent } from '@sveltejs/kit';
import {
	relationApiErrorStatus,
	runDesignRelationApply,
	type DesignRelationValidationRequest
} from '$lib/utils/design-relation-service.js';

type ApplyBody = DesignRelationValidationRequest & {
	issueId?: string;
	candidateId?: string | null;
};

export async function POST({ request }: RequestEvent) {
	try {
		const body = (await request.json()) as ApplyBody;
		if (!body.issueId) {
			return json({ success: false, error: 'issueId가 필요합니다.' } as DbDesignApiResponse, {
				status: 400
			});
		}
		const result = await runDesignRelationApply({ ...body, issueId: body.issueId });
		return json(
			{ success: true, data: result, message: '정의서 관계 자동 수정 완료' } as DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		const status = relationApiErrorStatus(error);
		return json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : '정의서 관계 자동 수정 중 오류가 발생했습니다.',
				message:
					status === 400 ? 'Invalid relation correction apply input' : 'Internal server error'
			} as DbDesignApiResponse,
			{ status }
		);
	}
}
