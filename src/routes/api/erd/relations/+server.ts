import { json, type RequestEvent } from '@sveltejs/kit';
import { validateDesignRelations } from '$lib/utils/design-relation-validator.js';
import {
	loadDesignRelationContext,
	toDefinitionFileSelection
} from '$lib/utils/design-relation-context.js';

export async function GET({ url }: RequestEvent) {
	try {
		const databaseFile = url.searchParams.get('databaseFile');
		const entityFile = url.searchParams.get('entityFile');
		const attributeFile = url.searchParams.get('attributeFile');
		const tableFile = url.searchParams.get('tableFile');
		const columnFile = url.searchParams.get('columnFile');

		const { context, files } = await loadDesignRelationContext({
			databaseFile,
			entityFile,
			attributeFile,
			tableFile,
			columnFile,
			includeDomain: false,
			includeVocabularyMap: false,
			fallbackToFirstWhenMissing: true
		});

		const validation = validateDesignRelations(context);

		return json(
			{
				success: true,
				data: {
					files: toDefinitionFileSelection(files),
					validation
				},
				message: '5개 정의서 연관관계 정합성 검증 완료'
			} as DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('5개 정의서 연관관계 검증 오류:', error);
		return json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: '5개 정의서 연관관계 검증 중 오류가 발생했습니다.'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}
