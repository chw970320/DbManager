import { json, type RequestEvent } from '@sveltejs/kit';
import {
	createQualityRule,
	deleteQualityRule,
	loadQualityRuleData,
	updateQualityRule
} from '$lib/registry/data-quality-rule-registry';
import type { QualityRuleInput } from '$lib/types/data-quality-rule.js';

function trimString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function normalizeThreshold(value: unknown): number {
	if (typeof value === 'number') {
		return value;
	}

	if (typeof value === 'string' && value.trim()) {
		return Number(value);
	}

	return Number.NaN;
}

function buildInput(body: Record<string, unknown>): QualityRuleInput {
	return {
		name: trimString(body.name),
		description: trimString(body.description),
		enabled: typeof body.enabled === 'boolean' ? body.enabled : true,
		severity: trimString(body.severity) as QualityRuleInput['severity'],
		scope: trimString(body.scope) as QualityRuleInput['scope'],
		metric: trimString(body.metric) as QualityRuleInput['metric'],
		operator: trimString(body.operator) as QualityRuleInput['operator'],
		threshold: normalizeThreshold(body.threshold),
		target:
			body.target && typeof body.target === 'object'
				? {
						schemaPattern: trimString((body.target as Record<string, unknown>).schemaPattern),
						tablePattern: trimString((body.target as Record<string, unknown>).tablePattern),
						columnPattern: trimString((body.target as Record<string, unknown>).columnPattern)
					}
				: undefined
	};
}

function hasMissingRequiredFields(input: QualityRuleInput): boolean {
	return (
		!input.name ||
		!input.severity ||
		!input.scope ||
		!input.metric ||
		!input.operator ||
		!Number.isFinite(input.threshold)
	);
}

function resolveErrorStatus(error: unknown): number {
	if (!(error instanceof Error)) {
		return 500;
	}

	if (error.message.includes('찾을 수 없습니다.')) {
		return 404;
	}

	if (error.message.includes('이미 존재')) {
		return 409;
	}

	if (
		error.message.includes('필수') ||
		error.message.includes('기준값') ||
		error.message.includes('메트릭') ||
		error.message.includes('범위') ||
		error.message.includes('연산자')
	) {
		return 400;
	}

	return 500;
}

export async function GET() {
	try {
		const data = await loadQualityRuleData();
		return json(
			{
				success: true,
				data,
				message: '품질 규칙 목록을 조회했습니다.'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('품질 규칙 조회 중 오류:', error);
		return json(
			{
				success: false,
				error: '품질 규칙 목록 조회 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const input = buildInput(body);

		if (hasMissingRequiredFields(input)) {
			return json(
				{
					success: false,
					error: '규칙 이름, 심각도, 범위, 메트릭, 연산자, 기준값은 필수입니다.',
					message: 'Missing required fields'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		const result = await createQualityRule(input);
		return json(
			{
				success: true,
				data: result,
				message: '품질 규칙이 등록되었습니다.'
			} as ApiResponse,
			{ status: 201 }
		);
	} catch (error) {
		console.error('품질 규칙 등록 중 오류:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '품질 규칙 등록 중 오류가 발생했습니다.',
				message: 'Create failed'
			} as ApiResponse,
			{ status: resolveErrorStatus(error) }
		);
	}
}

export async function PUT({ request }: RequestEvent) {
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const id = trimString(body.id);
		if (!id) {
			return json(
				{
					success: false,
					error: '수정할 품질 규칙 ID가 필요합니다.',
					message: 'Missing quality rule id'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		const input = buildInput(body);
		if (hasMissingRequiredFields(input)) {
			return json(
				{
					success: false,
					error: '규칙 이름, 심각도, 범위, 메트릭, 연산자, 기준값은 필수입니다.',
					message: 'Missing required fields'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		const result = await updateQualityRule(id, input);
		return json(
			{
				success: true,
				data: result,
				message: '품질 규칙이 수정되었습니다.'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('품질 규칙 수정 중 오류:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '품질 규칙 수정 중 오류가 발생했습니다.',
				message: 'Update failed'
			} as ApiResponse,
			{ status: resolveErrorStatus(error) }
		);
	}
}

export async function DELETE({ request }: RequestEvent) {
	try {
		const body = (await request.json()) as { id?: string };
		const id = trimString(body.id);
		if (!id) {
			return json(
				{
					success: false,
					error: '삭제할 품질 규칙 ID가 필요합니다.',
					message: 'Missing quality rule id'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		const result = await deleteQualityRule(id);
		return json(
			{
				success: true,
				data: result,
				message: '품질 규칙이 삭제되었습니다.'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('품질 규칙 삭제 중 오류:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '품질 규칙 삭제 중 오류가 발생했습니다.',
				message: 'Delete failed'
			} as ApiResponse,
			{ status: resolveErrorStatus(error) }
		);
	}
}
