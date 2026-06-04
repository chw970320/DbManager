import { json, type RequestEvent } from '@sveltejs/kit';
import type { DataType } from '$lib/types/base.js';
import {
	relationApiErrorStatus,
	runDesignRelationValidation,
	type DesignRelationValidationRequest
} from '$lib/utils/design-relation-service.js';

function fileParam(url: URL, type: DataType): string | undefined {
	const value = url.searchParams.get(`${type}File`);
	return value && value.trim() ? value.trim() : undefined;
}

function requestFromUrl(url: URL): DesignRelationValidationRequest {
	return {
		vocabularyFile: fileParam(url, 'vocabulary'),
		domainFile: fileParam(url, 'domain'),
		termFile: fileParam(url, 'term'),
		databaseFile: fileParam(url, 'database'),
		entityFile: fileParam(url, 'entity'),
		attributeFile: fileParam(url, 'attribute'),
		tableFile: fileParam(url, 'table'),
		columnFile: fileParam(url, 'column'),
		scopeType: (url.searchParams.get('scopeType') || undefined) as DataType | undefined,
		scopeFile: url.searchParams.get('scopeFile') || undefined,
		requireStandardReferences: true
	};
}

export async function GET({ url }: RequestEvent) {
	try {
		const result = await runDesignRelationValidation(requestFromUrl(url), {
			requireStandardReferences: true
		});
		return json(
			{
				success: true,
				data: result,
				message: '정의서 관계 유효성 검사 완료'
			} as DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		const status = relationApiErrorStatus(error);
		return json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: '정의서 관계 유효성 검사 중 오류가 발생했습니다.',
				message:
					status === 400 ? 'Missing or invalid relation validation input' : 'Internal server error'
			} as DbDesignApiResponse,
			{ status }
		);
	}
}
