export type AutoSyncStep = {
	id: string;
	label: string;
	endpoint: string;
	success: boolean;
	status: number;
	message?: string;
	data?: unknown;
};

export type AutoSyncSummary = {
	success: boolean;
	partialFailure: boolean;
	steps: AutoSyncStep[];
	summary: string;
	retryHint?: string;
};

type ApiResult<T = unknown> = {
	success?: boolean;
	message?: string;
	error?: string;
	data?: T;
};

type AutoSyncStepInput = {
	id: string;
	label: string;
	endpoint: string;
	body?: Record<string, unknown>;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function toMessage(payload: ApiResult | null): string | undefined {
	if (!payload) return undefined;
	return payload.message || payload.error;
}

async function readPayload(response: Response): Promise<ApiResult | null> {
	try {
		return (await response.json()) as ApiResult;
	} catch {
		return null;
	}
}

export async function runAutoSyncStep(
	fetchFn: FetchLike,
	input: AutoSyncStepInput
): Promise<AutoSyncStep> {
	try {
		const response = await fetchFn(input.endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input.body ?? {})
		});
		const payload = await readPayload(response);
		const success = response.ok && payload?.success === true;

		return {
			id: input.id,
			label: input.label,
			endpoint: input.endpoint,
			success,
			status: response.status,
			message: toMessage(payload),
			data: payload?.data
		};
	} catch (error) {
		return {
			id: input.id,
			label: input.label,
			endpoint: input.endpoint,
			success: false,
			status: 500,
			message: error instanceof Error ? error.message : '자동 반영 호출 중 오류가 발생했습니다.'
		};
	}
}

type CreateAutoSyncSummaryInput = {
	steps: AutoSyncStep[];
	successSummary: string;
	failureSummary: string;
	retryHint?: string;
};

export function createAutoSyncSummary(input: CreateAutoSyncSummaryInput): AutoSyncSummary {
	const successCount = input.steps.filter((step) => step.success).length;
	const allSuccess = successCount === input.steps.length;

	return {
		success: allSuccess,
		partialFailure: !allSuccess,
		steps: input.steps,
		summary: allSuccess
			? input.successSummary
			: `${input.failureSummary} (${successCount}/${input.steps.length} 단계 성공)`,
		retryHint: allSuccess
			? undefined
			: (input.retryHint ?? '운영 fallback으로 수동 재실행이 필요합니다.')
	};
}
