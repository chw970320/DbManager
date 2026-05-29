import type { RequestEvent } from '@sveltejs/kit';
import type { TableEntry } from '$lib/types/database-design';
import { loadTableData } from '$lib/registry/data-registry';
import { handleFilterOptions, type FilterOptionsDescriptor } from '$lib/server/filter-options';

const descriptor = {
	defaultFilename: 'table.json',
	loadData: loadTableData,
	filterableColumns: [
		'physicalDbName',
		'tableOwner',
		'subjectArea',
		'schemaName',
		'tableEnglishName',
		'tableKoreanName',
		'tableType',
		'relatedEntityName',
		'businessClassification',
		'retentionPeriod',
		'publicFlag'
	],
	nullableColumns: [
		'physicalDbName',
		'tableOwner',
		'subjectArea',
		'schemaName',
		'tableEnglishName',
		'tableKoreanName',
		'tableType',
		'relatedEntityName',
		'retentionPeriod',
		'publicFlag'
	]
} satisfies FilterOptionsDescriptor<TableEntry>;

/**
 * 필터 옵션 조회 API
 * GET /api/table/filter-options
 * 각 필터 가능한 컬럼의 고유값만 반환
 */
export async function GET(event: RequestEvent) {
	return handleFilterOptions(event, descriptor);
}
