import { json, type RequestEvent } from '@sveltejs/kit';
import { getDataSourceEntry } from '$lib/registry/data-source-registry';
import { testDataSourceConnection } from '$lib/utils/data-source-connection';
import type { DataSourceInput, PostgreSqlConnectionConfig } from '$lib/types/data-source.js';

type TestPayload = Partial<DataSourceInput> & {
	id?: string;
	config?: Partial<PostgreSqlConnectionConfig>;
};

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function buildInput(
	payload: TestPayload,
	options?: { fallback?: DataSourceInput }
): DataSourceInput | null {
	const fallback = options?.fallback;
	const payloadConfig = isObject(payload.config) ? payload.config : null;
	const fallbackConfig = fallback?.config;
	const portCandidate = payloadConfig?.port ?? fallbackConfig?.port;
	const timeoutCandidate =
		payloadConfig?.connectionTimeoutSeconds ?? fallbackConfig?.connectionTimeoutSeconds ?? 5;

	return {
		name: isNonEmptyString(payload.name) ? payload.name.trim() : (fallback?.name ?? ''),
		type: payload.type === 'postgresql' ? 'postgresql' : (fallback?.type ?? 'postgresql'),
		description: isNonEmptyString(payload.description)
			? payload.description.trim()
			: fallback?.description,
		config: {
			host: isNonEmptyString(payloadConfig?.host)
				? payloadConfig.host.trim()
				: (fallbackConfig?.host ?? ''),
			port: typeof portCandidate === 'number' ? portCandidate : Number.NaN,
			database: isNonEmptyString(payloadConfig?.database)
				? payloadConfig.database.trim()
				: (fallbackConfig?.database ?? ''),
			schema: isNonEmptyString(payloadConfig?.schema)
				? payloadConfig.schema.trim()
				: fallbackConfig?.schema,
			username: isNonEmptyString(payloadConfig?.username)
				? payloadConfig.username.trim()
				: (fallbackConfig?.username ?? ''),
			password: isNonEmptyString(payloadConfig?.password)
				? payloadConfig.password
				: (fallbackConfig?.password ?? ''),
			ssl:
				typeof payloadConfig?.ssl === 'boolean'
					? payloadConfig.ssl
					: (fallbackConfig?.ssl ?? false),
			connectionTimeoutSeconds: typeof timeoutCandidate === 'number' ? timeoutCandidate : Number.NaN
		}
	};
}

function validateDirectPayload(input: DataSourceInput | null): string | null {
	if (!input) {
		return '필수 입력이 누락되었습니다.';
	}

	if (input.type !== 'postgresql') {
		return '필수 입력(type)이 올바르지 않습니다.';
	}

	if (!isNonEmptyString(input.config.host)) {
		return '필수 입력(host)이 누락되었습니다.';
	}

	if (!Number.isInteger(input.config.port) || input.config.port < 1) {
		return '필수 입력(port)이 누락되었습니다.';
	}

	if (!isNonEmptyString(input.config.database)) {
		return '필수 입력(database)이 누락되었습니다.';
	}

	if (!isNonEmptyString(input.config.username)) {
		return '필수 입력(username)이 누락되었습니다.';
	}

	if (typeof input.config.ssl !== 'boolean') {
		return '필수 입력(ssl)이 누락되었습니다.';
	}

	if (
		!Number.isInteger(input.config.connectionTimeoutSeconds) ||
		input.config.connectionTimeoutSeconds < 1
	) {
		return '연결 타임아웃은 1 이상의 정수여야 합니다.';
	}

	return null;
}

export async function POST({ request }: RequestEvent) {
	const payload = (await request.json()) as TestPayload;

	if (isNonEmptyString(payload?.id)) {
		const stored = await getDataSourceEntry(payload.id);
		if (!stored) {
			return json({ success: false, error: '데이터 소스를 찾을 수 없습니다.' }, { status: 404 });
		}

		const target =
			payload.config || payload.type ? buildInput(payload, { fallback: stored }) : stored;
		const error = validateDirectPayload(target);
		if (error || !target) {
			return json(
				{ success: false, error: error || '필수 입력이 누락되었습니다.' },
				{ status: 400 }
			);
		}

		const result = await testDataSourceConnection(target);
		return json({ success: true, data: result }, { status: 200 });
	}

	const directInput = buildInput(payload);
	const error = validateDirectPayload(directInput);
	if (error || !directInput) {
		return json({ success: false, error: error || '필수 입력이 누락되었습니다.' }, { status: 400 });
	}

	const result = await testDataSourceConnection(directInput);
	return json({ success: true, data: result }, { status: 200 });
}
