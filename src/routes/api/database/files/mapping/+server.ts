import { json, type RequestEvent } from '@sveltejs/kit';
import { loadData, saveData } from '$lib/registry/data-registry';
import {
	resolveRelatedFilenames,
	getMappingsFor,
	updateMapping,
	addMapping
} from '$lib/registry/mapping-registry';
import type { DataType } from '$lib/types/base';
import type { DatabaseData, DbDesignApiResponse } from '$lib/types/database-design';

type DatabaseFileMapping = {
	entity: string;
	table: string;
};

type DatabaseDataWithMapping = DatabaseData & {
	mapping?: Partial<DatabaseFileMapping>;
};

function readMappingOverride(mapping?: Partial<DatabaseFileMapping>): Partial<Record<DataType, string>> {
	const override: Partial<Record<DataType, string>> = {};
	if (mapping?.entity) override.entity = mapping.entity;
	if (mapping?.table) override.table = mapping.table;
	return override;
}

function isValidMapping(mapping: unknown): mapping is DatabaseFileMapping {
	if (!mapping || typeof mapping !== 'object') return false;
	const candidate = mapping as Partial<DatabaseFileMapping>;
	return (
		typeof candidate.entity === 'string' &&
		candidate.entity.trim() !== '' &&
		typeof candidate.table === 'string' &&
		candidate.table.trim() !== ''
	);
}

export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'database.json';
		const databaseData = (await loadData('database', filename)) as DatabaseDataWithMapping;
		const relatedFiles = await resolveRelatedFilenames(
			'database',
			filename,
			readMappingOverride(databaseData.mapping)
		);

		return json(
			{
				success: true,
				data: {
					mapping: {
						entity: relatedFiles.get('entity') || 'entity.json',
						table: relatedFiles.get('table') || 'table.json'
					}
				},
				message: 'Database mapping retrieved successfully'
			} satisfies DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 조회 중 오류가 발생했습니다.',
				message: 'Failed to retrieve database mapping'
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
					error: '매핑 정보가 올바르지 않습니다. entity와 table이 필요합니다.',
					message: 'Invalid mapping data'
				} satisfies DbDesignApiResponse,
				{ status: 400 }
			);
		}

		const databaseData = (await loadData('database', filename)) as DatabaseDataWithMapping;
		databaseData.mapping = {
			entity: mapping.entity.trim(),
			table: mapping.table.trim()
		};
		await saveData('database', databaseData as DatabaseData, filename);

		try {
			const existingMappings = await getMappingsFor('database', filename);
			const targets: Array<{
				targetType: 'entity' | 'table';
				targetFilename: string;
				mappingKey: string;
				cardinality: '1:N';
				description: string;
			}> = [
				{
					targetType: 'entity',
					targetFilename: mapping.entity.trim(),
					mappingKey: 'logicalDbName',
					cardinality: '1:N',
					description: 'DB → 엔터티 매핑'
				},
				{
					targetType: 'table',
					targetFilename: mapping.table.trim(),
					mappingKey: 'physicalDbName',
					cardinality: '1:N',
					description: 'DB → 테이블 매핑'
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
					sourceType: 'database',
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
					mapping: databaseData.mapping
				},
				message: 'Database mapping saved successfully'
			} satisfies DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 저장 중 오류가 발생했습니다.',
				message: 'Failed to save database mapping'
			} satisfies DbDesignApiResponse,
			{ status: 500 }
		);
	}
}
