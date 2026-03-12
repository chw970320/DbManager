import { json, type RequestEvent } from '@sveltejs/kit';
import { getDataSourceEntry } from '$lib/registry/data-source-registry';
import { loadQualityRuleData } from '$lib/registry/data-quality-rule-registry';
import { profileDataSourceTable } from '$lib/utils/data-source-profiling';
import { evaluateQualityRules } from '$lib/utils/data-quality-rule-evaluator';

type ProfileRunPayload = {
	dataSourceId?: string;
	schema?: string;
	table?: string;
};

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function getErrorMessage(error: unknown, fallback: string): string {
	return error instanceof Error && error.message ? error.message : fallback;
}

function getErrorStatus(message: string): number {
	if (message.includes('찾을 수 없습니다.')) {
		return 404;
	}

	return 500;
}

export async function POST({ request }: RequestEvent) {
	const payload = (await request.json()) as ProfileRunPayload;

	if (!isNonEmptyString(payload.dataSourceId)) {
		return json(
			{ success: false, error: '필수 입력(dataSourceId)이 누락되었습니다.' },
			{ status: 400 }
		);
	}

	if (!isNonEmptyString(payload.schema)) {
		return json({ success: false, error: '필수 입력(schema)이 누락되었습니다.' }, { status: 400 });
	}

	if (!isNonEmptyString(payload.table)) {
		return json({ success: false, error: '필수 입력(table)이 누락되었습니다.' }, { status: 400 });
	}

	const entry = await getDataSourceEntry(payload.dataSourceId.trim());
	if (!entry) {
		return json({ success: false, error: '데이터 소스를 찾을 수 없습니다.' }, { status: 404 });
	}

	try {
		const data = await profileDataSourceTable(entry, {
			schema: payload.schema.trim(),
			table: payload.table.trim()
		});
		const ruleData = await loadQualityRuleData();
		const enabledRules = ruleData.entries.filter((rule) => rule.enabled);
		const qualityRuleEvaluation = evaluateQualityRules(data, enabledRules);

		return json(
			{
				success: true,
				data: {
					...data,
					qualityRuleEvaluation
				}
			},
			{ status: 200 }
		);
	} catch (error) {
		const message = getErrorMessage(error, '테이블 프로파일링 중 오류가 발생했습니다.');
		return json({ success: false, error: message }, { status: getErrorStatus(message) });
	}
}
