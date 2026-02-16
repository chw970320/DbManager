import { json, type RequestEvent } from '@sveltejs/kit';
import { loadData, saveData } from '$lib/registry/data-registry';
import {
	resolveRelatedFilenames,
	getMappingsFor,
	updateMapping,
	addMapping
} from '$lib/registry/mapping-registry';
import type { DataType } from '$lib/types/base';
import type { TableData, DbDesignApiResponse } from '$lib/types/database-design';

type TableFileMapping = {
	database: string;
	column: string;
	entity: string;
};

type TableDataWithMapping = TableData & {
	mapping?: Partial<TableFileMapping>;
};

function readMappingOverride(mapping?: Partial<TableFileMapping>): Partial<Record<DataType, string>> {
	const override: Partial<Record<DataType, string>> = {};
	if (mapping?.database) override.database = mapping.database;
	if (mapping?.column) override.column = mapping.column;
	if (mapping?.entity) override.entity = mapping.entity;
	return override;
}

function isValidMapping(mapping: unknown): mapping is TableFileMapping {
	if (!mapping || typeof mapping !== 'object') return false;
	const candidate = mapping as Partial<TableFileMapping>;
	return (
		typeof candidate.database === 'string' &&
		candidate.database.trim() !== '' &&
		typeof candidate.column === 'string' &&
		candidate.column.trim() !== '' &&
		typeof candidate.entity === 'string' &&
		candidate.entity.trim() !== ''
	);
}

export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'table.json';
		const tableData = (await loadData('table', filename)) as TableDataWithMapping;
		const relatedFiles = await resolveRelatedFilenames(
			'table',
			filename,
			readMappingOverride(tableData.mapping)
		);

		return json(
			{
				success: true,
				data: {
					mapping: {
						database: relatedFiles.get('database') || 'database.json',
						column: relatedFiles.get('column') || 'column.json',
						entity: relatedFiles.get('entity') || 'entity.json'
					}
				},
				message: 'Table mapping retrieved successfully'
			} satisfies DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 조회 중 오류가 발생했습니다.',
				message: 'Failed to retrieve table mapping'
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
					error: '매핑 정보가 올바르지 않습니다. database, column, entity가 필요합니다.',
					message: 'Invalid mapping data'
				} satisfies DbDesignApiResponse,
				{ status: 400 }
			);
		}

		const tableData = (await loadData('table', filename)) as TableDataWithMapping;
		tableData.mapping = {
			database: mapping.database.trim(),
			column: mapping.column.trim(),
			entity: mapping.entity.trim()
		};
		await saveData('table', tableData as TableData, filename);

		try {
			const existingMappings = await getMappingsFor('table', filename);
			const targets: Array<{
				targetType: 'database' | 'column' | 'entity';
				targetFilename: string;
				mappingKey: string;
				cardinality: 'N:1' | '1:N';
				description: string;
			}> = [
				{
					targetType: 'database',
					targetFilename: mapping.database.trim(),
					mappingKey: 'physicalDbName',
					cardinality: 'N:1',
					description: '테이블 → DB 매핑'
				},
				{
					targetType: 'column',
					targetFilename: mapping.column.trim(),
					mappingKey: 'schemaName+tableEnglishName',
					cardinality: '1:N',
					description: '테이블 → 컬럼 매핑'
				},
				{
					targetType: 'entity',
					targetFilename: mapping.entity.trim(),
					mappingKey: 'relatedEntityName→entityName',
					cardinality: 'N:1',
					description: '테이블 → 엔터티 매핑'
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
					sourceType: 'table',
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
					mapping: tableData.mapping
				},
				message: 'Table mapping saved successfully'
			} satisfies DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 저장 중 오류가 발생했습니다.',
				message: 'Failed to save table mapping'
			} satisfies DbDesignApiResponse,
			{ status: 500 }
		);
	}
}
