import type { RequestEvent } from '@sveltejs/kit';
import type { EntityEntry } from '$lib/types/database-design';
import { loadEntityData } from '$lib/registry/data-registry';
import { handleFilterOptions, type FilterOptionsDescriptor } from '$lib/server/filter-options';

const descriptor = {
	defaultFilename: 'entity.json',
	loadData: loadEntityData,
	filterableColumns: [
		'logicalDbName',
		'schemaName',
		'entityName',
		'primaryIdentifier',
		'superTypeEntityName',
		'tableKoreanName'
	],
	nullableColumns: ['superTypeEntityName']
} satisfies FilterOptionsDescriptor<EntityEntry>;

/**
 * 필터 옵션 조회 API
 * GET /api/entity/filter-options
 * 각 필터 가능한 컬럼의 고유값만 반환
 */
export async function GET(event: RequestEvent) {
	return handleFilterOptions(event, descriptor);
}
