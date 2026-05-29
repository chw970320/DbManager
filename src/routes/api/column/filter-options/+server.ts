import type { RequestEvent } from '@sveltejs/kit';
import type { ColumnEntry } from '$lib/types/database-design';
import { loadColumnData } from '$lib/registry/data-registry';
import { handleFilterOptions, type FilterOptionsDescriptor } from '$lib/server/filter-options';

const descriptor = {
	defaultFilename: 'column.json',
	loadData: loadColumnData,
	filterableColumns: [
		'scopeFlag',
		'subjectArea',
		'schemaName',
		'tableEnglishName',
		'columnEnglishName',
		'columnKoreanName',
		'relatedEntityName',
		'domainName',
		'dataType',
		'notNullFlag',
		'pkInfo',
		'fkInfo',
		'akInfo',
		'personalInfoFlag',
		'encryptionFlag',
		'publicFlag'
	],
	nullableColumns: [
		'scopeFlag',
		'subjectArea',
		'schemaName',
		'tableEnglishName',
		'columnEnglishName',
		'columnKoreanName',
		'relatedEntityName',
		'domainName',
		'dataType',
		'notNullFlag',
		'pkInfo',
		'fkInfo',
		'akInfo',
		'personalInfoFlag',
		'encryptionFlag',
		'publicFlag'
	]
} satisfies FilterOptionsDescriptor<ColumnEntry>;

/**
 * 필터 옵션 조회 API
 * GET /api/column/filter-options
 * 각 필터 가능한 컬럼의 고유값만 반환
 */
export async function GET(event: RequestEvent) {
	return handleFilterOptions(event, descriptor);
}
