import { json, type RequestEvent } from '@sveltejs/kit';
import { loadData, saveData } from '$lib/registry/data-registry';
import {
	resolveRelatedFilenames,
	getMappingsFor,
	updateMapping,
	addMapping
} from '$lib/registry/mapping-registry';
import type { DataType } from '$lib/types/base';
import type { EntityData, DbDesignApiResponse } from '$lib/types/database-design';

type EntityFileMapping = {
	database: string;
	attribute: string;
};

type EntityDataWithMapping = EntityData & {
	mapping?: Partial<EntityFileMapping>;
};

function readMappingOverride(mapping?: Partial<EntityFileMapping>): Partial<Record<DataType, string>> {
	const override: Partial<Record<DataType, string>> = {};
	if (mapping?.database) override.database = mapping.database;
	if (mapping?.attribute) override.attribute = mapping.attribute;
	return override;
}

function isValidMapping(mapping: unknown): mapping is EntityFileMapping {
	if (!mapping || typeof mapping !== 'object') return false;
	const candidate = mapping as Partial<EntityFileMapping>;
	return (
		typeof candidate.database === 'string' &&
		candidate.database.trim() !== '' &&
		typeof candidate.attribute === 'string' &&
		candidate.attribute.trim() !== ''
	);
}

export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'entity.json';
		const entityData = (await loadData('entity', filename)) as EntityDataWithMapping;
		const relatedFiles = await resolveRelatedFilenames(
			'entity',
			filename,
			readMappingOverride(entityData.mapping)
		);

		return json(
			{
				success: true,
				data: {
					mapping: {
						database: relatedFiles.get('database') || 'database.json',
						attribute: relatedFiles.get('attribute') || 'attribute.json'
					}
				},
				message: 'Entity mapping retrieved successfully'
			} satisfies DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 조회 중 오류가 발생했습니다.',
				message: 'Failed to retrieve entity mapping'
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
					error: '매핑 정보가 올바르지 않습니다. database와 attribute가 필요합니다.',
					message: 'Invalid mapping data'
				} satisfies DbDesignApiResponse,
				{ status: 400 }
			);
		}

		const entityData = (await loadData('entity', filename)) as EntityDataWithMapping;
		entityData.mapping = {
			database: mapping.database.trim(),
			attribute: mapping.attribute.trim()
		};
		await saveData('entity', entityData as EntityData, filename);

		try {
			const existingMappings = await getMappingsFor('entity', filename);
			const targets: Array<{
				targetType: 'database' | 'attribute';
				targetFilename: string;
				mappingKey: string;
				cardinality: 'N:1' | '1:N';
				description: string;
			}> = [
				{
					targetType: 'database',
					targetFilename: mapping.database.trim(),
					mappingKey: 'logicalDbName',
					cardinality: 'N:1',
					description: '엔터티 → DB 매핑'
				},
				{
					targetType: 'attribute',
					targetFilename: mapping.attribute.trim(),
					mappingKey: 'schemaName+entityName',
					cardinality: '1:N',
					description: '엔터티 → 속성 매핑'
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
					sourceType: 'entity',
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
					mapping: entityData.mapping
				},
				message: 'Entity mapping saved successfully'
			} satisfies DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 저장 중 오류가 발생했습니다.',
				message: 'Failed to save entity mapping'
			} satisfies DbDesignApiResponse,
			{ status: 500 }
		);
	}
}
