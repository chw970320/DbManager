import type { RequestEvent } from '@sveltejs/kit';
import type { AttributeEntry } from '$lib/types/database-design';
import { loadAttributeData } from '$lib/registry/data-registry';
import { handleFilterOptions, type FilterOptionsDescriptor } from '$lib/server/filter-options';

const descriptor = {
	defaultFilename: 'attribute.json',
	loadData: loadAttributeData,
	filterableColumns: [
		'schemaName',
		'entityName',
		'attributeName',
		'attributeType',
		'requiredInput',
		'identifierFlag',
		'refEntityName',
		'refAttributeName'
	],
	nullableColumns: [
		'schemaName',
		'entityName',
		'attributeName',
		'attributeType',
		'identifierFlag',
		'refAttributeName'
	]
} satisfies FilterOptionsDescriptor<AttributeEntry>;

/**
 * 필터 옵션 조회 API
 * GET /api/attribute/filter-options
 * 각 필터 가능한 컬럼의 고유값만 반환
 */
export async function GET(event: RequestEvent) {
	return handleFilterOptions(event, descriptor);
}
