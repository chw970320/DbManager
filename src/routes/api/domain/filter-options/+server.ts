import type { RequestEvent } from '@sveltejs/kit';
import type { DomainEntry } from '$lib/types/domain';
import { loadDomainData } from '$lib/registry/data-registry';
import { handleFilterOptions, type FilterOptionsDescriptor } from '$lib/server/filter-options';

const descriptor = {
	defaultFilename: 'domain.json',
	loadData: loadDomainData,
	filterableColumns: [
		'domainGroup',
		'domainCategory',
		'standardDomainName',
		'physicalDataType',
		'revision'
	],
	nullableColumns: ['revision']
} satisfies FilterOptionsDescriptor<DomainEntry>;

/**
 * 필터 옵션 조회 API
 * GET /api/domain/filter-options
 * 각 필터 가능한 컬럼의 고유값만 반환
 */
export async function GET(event: RequestEvent) {
	return handleFilterOptions(event, descriptor);
}
