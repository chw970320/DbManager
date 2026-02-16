import { json, type RequestEvent } from '@sveltejs/kit';
import { loadData, saveData } from '$lib/registry/data-registry';
import {
	resolveRelatedFilenames,
	getMappingsFor,
	updateMapping,
	addMapping
} from '$lib/registry/mapping-registry';
import type { DataType } from '$lib/types/base';
import type { AttributeData, DbDesignApiResponse } from '$lib/types/database-design';

type AttributeFileMapping = {
	entity: string;
	column: string;
};

type AttributeDataWithMapping = AttributeData & {
	mapping?: Partial<AttributeFileMapping>;
};

function readMappingOverride(mapping?: Partial<AttributeFileMapping>): Partial<Record<DataType, string>> {
	const override: Partial<Record<DataType, string>> = {};
	if (mapping?.entity) override.entity = mapping.entity;
	if (mapping?.column) override.column = mapping.column;
	return override;
}

function isValidMapping(mapping: unknown): mapping is AttributeFileMapping {
	if (!mapping || typeof mapping !== 'object') return false;
	const candidate = mapping as Partial<AttributeFileMapping>;
	return (
		typeof candidate.entity === 'string' &&
		candidate.entity.trim() !== '' &&
		typeof candidate.column === 'string' &&
		candidate.column.trim() !== ''
	);
}

export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'attribute.json';
		const attributeData = (await loadData('attribute', filename)) as AttributeDataWithMapping;
		const relatedFiles = await resolveRelatedFilenames(
			'attribute',
			filename,
			readMappingOverride(attributeData.mapping)
		);

		return json(
			{
				success: true,
				data: {
					mapping: {
						entity: relatedFiles.get('entity') || 'entity.json',
						column: relatedFiles.get('column') || 'column.json'
					}
				},
				message: 'Attribute mapping retrieved successfully'
			} satisfies DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 조회 중 오류가 발생했습니다.',
				message: 'Failed to retrieve attribute mapping'
			} satisfies DbDesignApiResponse,
			{ status: 500 }
		);
	}
}

export async function PUT({ request }: RequestEvent) {
	try {
		const body = (await request.json()) as {
			filename?: string;
			mapping?: unknown;
		};
		const { filename, mapping } = body;

		if (!filename || filename.trim() === '') {
			return json(
				{
					success: false,
					error: '파일명이 제공되지 않았습니다.',
					message: 'Filename is required'
				} satisfies DbDesignApiResponse,
				{ status: 400 }
			);
		}

		if (!isValidMapping(mapping)) {
			return json(
				{
					success: false,
					error: '매핑 정보가 올바르지 않습니다. entity와 column이 필요합니다.',
					message: 'Invalid mapping data'
				} satisfies DbDesignApiResponse,
				{ status: 400 }
			);
		}

		const attributeData = (await loadData('attribute', filename)) as AttributeDataWithMapping;
		attributeData.mapping = {
			entity: mapping.entity.trim(),
			column: mapping.column.trim()
		};
		await saveData('attribute', attributeData as AttributeData, filename);

		try {
			const existingMappings = await getMappingsFor('attribute', filename);
			const targets: Array<{
				targetType: 'entity' | 'column';
				targetFilename: string;
				mappingKey: string;
				cardinality: 'N:1' | '1:1';
				description: string;
			}> = [
				{
					targetType: 'entity',
					targetFilename: mapping.entity.trim(),
					mappingKey: 'schemaName+entityName',
					cardinality: 'N:1',
					description: '속성 → 엔터티 매핑'
				},
				{
					targetType: 'column',
					targetFilename: mapping.column.trim(),
					mappingKey: 'schemaName+entityName+attributeName',
					cardinality: '1:1',
					description: '속성 → 컬럼 매핑'
				}
			];

			for (const target of targets) {
				const existing = existingMappings.find((candidate) => candidate.relatedType === target.targetType);
				if (existing) {
					if (existing.role === 'source') {
						await updateMapping(existing.relation.id, { targetFilename: target.targetFilename });
					} else {
						await updateMapping(existing.relation.id, { sourceFilename: target.targetFilename });
					}
					continue;
				}

				await addMapping({
					sourceType: 'attribute',
					sourceFilename: filename,
					targetType: target.targetType,
					targetFilename: target.targetFilename,
					mappingKey: target.mappingKey,
					cardinality: target.cardinality,
					description: target.description
				});
			}
		} catch (registryError) {
			console.warn('[듀얼 라이트] 레지스트리 갱신 실패 (파일 저장은 완료):', registryError);
		}

		return json(
			{
				success: true,
				data: {
					mapping: attributeData.mapping
				},
				message: 'Attribute mapping saved successfully'
			} satisfies DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 저장 중 오류가 발생했습니다.',
				message: 'Failed to save attribute mapping'
			} satisfies DbDesignApiResponse,
			{ status: 500 }
		);
	}
}
