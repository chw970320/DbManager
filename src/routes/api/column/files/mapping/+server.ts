import { json, type RequestEvent } from '@sveltejs/kit';
import { loadData, saveData } from '$lib/registry/data-registry';
import {
	resolveRelatedFilenames,
	getMappingsFor,
	updateMapping,
	addMapping
} from '$lib/registry/mapping-registry';
import type { DataType } from '$lib/types/base';
import type { ColumnData, DbDesignApiResponse } from '$lib/types/database-design';

type ColumnFileMapping = {
	table: string;
	term: string;
	domain: string;
};

type ColumnDataWithMapping = ColumnData & {
	mapping?: Partial<ColumnFileMapping>;
};

function readMappingOverride(mapping?: Partial<ColumnFileMapping>): Partial<Record<DataType, string>> {
	const override: Partial<Record<DataType, string>> = {};
	if (mapping?.table) override.table = mapping.table;
	if (mapping?.term) override.term = mapping.term;
	if (mapping?.domain) override.domain = mapping.domain;
	return override;
}

function isValidMapping(mapping: unknown): mapping is ColumnFileMapping {
	if (!mapping || typeof mapping !== 'object') return false;
	const candidate = mapping as Partial<ColumnFileMapping>;
	return (
		typeof candidate.table === 'string' &&
		candidate.table.trim() !== '' &&
		typeof candidate.term === 'string' &&
		candidate.term.trim() !== '' &&
		typeof candidate.domain === 'string' &&
		candidate.domain.trim() !== ''
	);
}

export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'column.json';
		const columnData = (await loadData('column', filename)) as ColumnDataWithMapping;
		const relatedFiles = await resolveRelatedFilenames(
			'column',
			filename,
			readMappingOverride(columnData.mapping)
		);

		return json(
			{
				success: true,
				data: {
					mapping: {
						table: relatedFiles.get('table') || 'table.json',
						term: relatedFiles.get('term') || 'term.json',
						domain: relatedFiles.get('domain') || 'domain.json'
					}
				},
				message: 'Column mapping retrieved successfully'
			} satisfies DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 조회 중 오류가 발생했습니다.',
				message: 'Failed to retrieve column mapping'
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
					error: '매핑 정보가 올바르지 않습니다. table, term, domain이 필요합니다.',
					message: 'Invalid mapping data'
				} satisfies DbDesignApiResponse,
				{ status: 400 }
			);
		}

		const columnData = (await loadData('column', filename)) as ColumnDataWithMapping;
		columnData.mapping = {
			table: mapping.table.trim(),
			term: mapping.term.trim(),
			domain: mapping.domain.trim()
		};
		await saveData('column', columnData as ColumnData, filename);

		try {
			const existingMappings = await getMappingsFor('column', filename);
			const targets: Array<{
				targetType: 'table' | 'term' | 'domain';
				targetFilename: string;
				mappingKey: string;
				cardinality: 'N:1';
				description: string;
			}> = [
				{
					targetType: 'table',
					targetFilename: mapping.table.trim(),
					mappingKey: 'schemaName+tableEnglishName',
					cardinality: 'N:1',
					description: '컬럼 → 테이블 매핑'
				},
				{
					targetType: 'term',
					targetFilename: mapping.term.trim(),
					mappingKey: 'columnEnglishName→columnName',
					cardinality: 'N:1',
					description: '컬럼 → 용어 매핑'
				},
				{
					targetType: 'domain',
					targetFilename: mapping.domain.trim(),
					mappingKey: 'domainName→standardDomainName',
					cardinality: 'N:1',
					description: '컬럼 → 도메인 매핑'
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
					sourceType: 'column',
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
					mapping: columnData.mapping
				},
				message: 'Column mapping saved successfully'
			} satisfies DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 저장 중 오류가 발생했습니다.',
				message: 'Failed to save column mapping'
			} satisfies DbDesignApiResponse,
			{ status: 500 }
		);
	}
}
