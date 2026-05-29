import type { RequestEvent } from '@sveltejs/kit';
import type { DatabaseEntry } from '$lib/types/database-design';
import { loadDatabaseData } from '$lib/registry/data-registry';
import { handleFilterOptions, type FilterOptionsDescriptor } from '$lib/server/filter-options';

const descriptor = {
	defaultFilename: 'database.json',
	loadData: loadDatabaseData,
	filterableColumns: [
		'organizationName',
		'departmentName',
		'appliedTask',
		'relatedLaw',
		'logicalDbName',
		'physicalDbName',
		'buildDate',
		'dbmsInfo',
		'osInfo'
	],
	nullableColumns: ['logicalDbName', 'physicalDbName', 'dbmsInfo']
} satisfies FilterOptionsDescriptor<DatabaseEntry>;

/**
 * 필터 옵션 조회 API
 * GET /api/database/filter-options
 * 각 필터 가능한 컬럼의 고유값만 반환
 */
export async function GET(event: RequestEvent) {
	return handleFilterOptions(event, descriptor);
}
