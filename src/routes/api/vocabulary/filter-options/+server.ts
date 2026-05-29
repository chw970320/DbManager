import type { RequestEvent } from '@sveltejs/kit';
import type { VocabularyEntry } from '$lib/types/vocabulary';
import { loadVocabularyData } from '$lib/registry/data-registry';
import { handleFilterOptions, type FilterOptionsDescriptor } from '$lib/server/filter-options';

const descriptor = {
	defaultFilename: 'vocabulary.json',
	loadData: loadVocabularyData,
	filterableColumns: [
		'standardName',
		'abbreviation',
		'englishName',
		'domainGroup',
		'domainCategory',
		'isFormalWord',
		'source'
	],
	nullableColumns: ['domainCategory', 'source'],

	transformValue: (value, _entry, columnKey) => {
		if (columnKey !== 'isFormalWord') {
			return value;
		}

		if (value === null || value === undefined || value === '') {
			return value;
		}

		return value ? 'Y' : 'N';
	}
} satisfies FilterOptionsDescriptor<VocabularyEntry>;

/**
 * 필터 옵션 조회 API
 * GET /api/vocabulary/filter-options
 * 각 필터 가능한 컬럼의 고유값만 반환
 */
export async function GET(event: RequestEvent) {
	return handleFilterOptions(event, descriptor);
}
