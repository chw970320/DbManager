import { json, type RequestEvent } from '@sveltejs/kit';
import { loadData, saveData } from '$lib/registry/data-registry.js';
import type { ColumnData, TableData } from '$lib/types/database-design.js';
import {
	loadDesignRelationContext,
	pickDefinitionFileFromUrl,
	toDefinitionFileSelection
} from '$lib/utils/design-relation-context.js';
import { buildDesignRelationSyncPlan } from '$lib/utils/design-relation-sync.js';
import { validateDesignRelations } from '$lib/utils/design-relation-validator.js';

type RelationSyncRequest = {
	apply?: boolean;
	databaseFile?: string;
	entityFile?: string;
	attributeFile?: string;
	tableFile?: string;
	columnFile?: string;
};

type RelationSyncParams = {
	apply: boolean;
	databaseFile?: string;
	entityFile?: string;
	attributeFile?: string;
	tableFile?: string;
	columnFile?: string;
};

function applyTablePatches(
	tableData: TableData,
	updates: Map<string, { relatedEntityName?: string }>,
	now: string
): { data: TableData; updatedCount: number } {
	let updatedCount = 0;
	const nextEntries = tableData.entries.map((entry) => {
		const patch = updates.get(entry.id);
		if (!patch) return entry;

		updatedCount += 1;
		return {
			...entry,
			...patch,
			updatedAt: now
		};
	});

	return {
		data: {
			...tableData,
			entries: nextEntries,
			lastUpdated: now,
			totalCount: nextEntries.length
		},
		updatedCount
	};
}

function applyColumnPatches(
	columnData: ColumnData,
	updates: Map<string, { schemaName?: string; tableEnglishName?: string; relatedEntityName?: string }>,
	now: string
): { data: ColumnData; updatedCount: number } {
	let updatedCount = 0;
	const nextEntries = columnData.entries.map((entry) => {
		const patch = updates.get(entry.id);
		if (!patch) return entry;

		updatedCount += 1;
		return {
			...entry,
			...patch,
			updatedAt: now
		};
	});

	return {
		data: {
			...columnData,
			entries: nextEntries,
			lastUpdated: now,
			totalCount: nextEntries.length
		},
		updatedCount
	};
}

async function runRelationSync(params: RelationSyncParams) {
	const { context, files } = await loadDesignRelationContext({
		databaseFile: params.databaseFile,
		entityFile: params.entityFile,
		attributeFile: params.attributeFile,
		tableFile: params.tableFile,
		columnFile: params.columnFile,
		includeDomain: false,
		includeVocabularyMap: false,
		fallbackToFirstWhenMissing: true
	});

	const validationBefore = validateDesignRelations(context);
	const syncPlan = buildDesignRelationSyncPlan(context);

	let updatedTableEntries = context.tables;
	let updatedColumnEntries = context.columns;
	let appliedTableUpdates = 0;
	let appliedColumnUpdates = 0;

	if (params.apply) {
		const now = new Date().toISOString();

		if (files.table && syncPlan.tableUpdates.length > 0) {
			const tableData = (await loadData('table', files.table)) as TableData;
			const updateMap = new Map(syncPlan.tableUpdates.map((update) => [update.id, update.patch]));
			const { data: updatedTableData, updatedCount } = applyTablePatches(tableData, updateMap, now);
			if (updatedCount > 0) {
				await saveData('table', updatedTableData, files.table);
				appliedTableUpdates = updatedCount;
			}
			updatedTableEntries = updatedTableData.entries;
		}

		if (files.column && syncPlan.columnUpdates.length > 0) {
			const columnData = (await loadData('column', files.column)) as ColumnData;
			const updateMap = new Map(syncPlan.columnUpdates.map((update) => [update.id, update.patch]));
			const { data: updatedColumnData, updatedCount } = applyColumnPatches(columnData, updateMap, now);
			if (updatedCount > 0) {
				await saveData('column', updatedColumnData, files.column);
				appliedColumnUpdates = updatedCount;
			}
			updatedColumnEntries = updatedColumnData.entries;
		}
	}

	const validationAfter = validateDesignRelations({
		...context,
		tables: updatedTableEntries,
		columns: updatedColumnEntries
	});

	return {
		mode: params.apply ? 'apply' : 'preview',
		files: toDefinitionFileSelection(files),
		counts: {
			...syncPlan.preview.counts,
			appliedTableUpdates,
			appliedColumnUpdates,
			appliedTotalUpdates: appliedTableUpdates + appliedColumnUpdates
		},
		changes: syncPlan.preview.changes.slice(0, 200),
		suggestions: syncPlan.preview.suggestions.slice(0, 100),
		validationBefore,
		validationAfter
	};
}

function paramsFromUrl(url: URL): RelationSyncParams {
	return {
		apply: url.searchParams.get('apply') === 'true',
		databaseFile: pickDefinitionFileFromUrl(url, 'databaseFile'),
		entityFile: pickDefinitionFileFromUrl(url, 'entityFile'),
		attributeFile: pickDefinitionFileFromUrl(url, 'attributeFile'),
		tableFile: pickDefinitionFileFromUrl(url, 'tableFile'),
		columnFile: pickDefinitionFileFromUrl(url, 'columnFile')
	};
}

export async function GET({ url }: RequestEvent) {
	try {
		const result = await runRelationSync(paramsFromUrl(url));
		return json(
			{
				success: true,
				data: result,
				message:
					result.mode === 'apply'
						? '5개 정의서 관계 동기화가 완료되었습니다.'
						: '5개 정의서 관계 동기화 미리보기를 생성했습니다.'
			} as DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('5개 정의서 관계 동기화 오류:', error);
		return json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: '5개 정의서 관계 동기화 중 오류가 발생했습니다.'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const body = (await request.json()) as RelationSyncRequest;
		const params: RelationSyncParams = {
			apply: body.apply === true,
			databaseFile: body.databaseFile,
			entityFile: body.entityFile,
			attributeFile: body.attributeFile,
			tableFile: body.tableFile,
			columnFile: body.columnFile
		};

		const result = await runRelationSync(params);
		return json(
			{
				success: true,
				data: result,
				message:
					result.mode === 'apply'
						? '5개 정의서 관계 동기화가 완료되었습니다.'
						: '5개 정의서 관계 동기화 미리보기를 생성했습니다.'
			} as DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('5개 정의서 관계 동기화 오류:', error);
		return json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: '5개 정의서 관계 동기화 중 오류가 발생했습니다.'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}
