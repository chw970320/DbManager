import type { RequestEvent } from '@sveltejs/kit';
import type { TermEntry } from '$lib/types/term';
import { loadTermData } from '$lib/registry/data-registry';
import { handleFilterOptions, type FilterOptionsDescriptor } from '$lib/server/filter-options';

const descriptor = {
	defaultFilename: 'term.json',
	loadData: loadTermData,
	filterableColumns: ['termName', 'columnName', 'domainName'],
	nullableColumns: []
} satisfies FilterOptionsDescriptor<TermEntry>;

/**
 * 필터 옵션 조회 API
 * GET /api/term/filter-options
 * 각 필터 가능한 컬럼의 고유값만 반환
 */
export async function GET(event: RequestEvent) {
	return handleFilterOptions(event, descriptor);
}
