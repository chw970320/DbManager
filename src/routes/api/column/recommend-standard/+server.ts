import { json, type RequestEvent } from '@sveltejs/kit';
import { loadData } from '$lib/registry/data-registry';
import { resolveRelatedFilenames } from '$lib/registry/mapping-registry';
import type { DbDesignApiResponse } from '$lib/types/database-design.js';
import type { DomainData } from '$lib/types/domain.js';
import type { TermData } from '$lib/types/term.js';
import type { ColumnStandardRecommendationPreview } from '$lib/types/column-standard-recommendation.js';
import {
	buildColumnStandardRecommendationMaps,
	createColumnStandardRecommendation
} from '$lib/utils/column-standard-recommendation.js';

type RecommendStandardRequest = {
	columnFilename?: string;
	termFilename?: string;
	domainFilename?: string;
	entry?: Partial<ColumnEntry>;
};

type ColumnEntry = import('$lib/types/database-design.js').ColumnEntry;

export async function POST({ request }: RequestEvent) {
	try {
		const {
			columnFilename,
			termFilename,
			domainFilename,
			entry
		}: RecommendStandardRequest = await request.json();

		const columnFile = columnFilename || 'column.json';
		let relatedFiles = new Map<string, string>();
		try {
			relatedFiles = await resolveRelatedFilenames('column', columnFile);
		} catch (error) {
			console.warn('컬럼 표준 추천용 연결 파일 해석 실패:', error);
		}

		const termFile = termFilename || relatedFiles.get('term') || 'term.json';
		const domFile = domainFilename || relatedFiles.get('domain') || 'domain.json';

		const termData = (await loadData('term', termFile)) as TermData;
		const domainData = (await loadData('domain', domFile)) as DomainData;
		const maps = buildColumnStandardRecommendationMaps(termData.entries, domainData.entries);
		const recommendation = createColumnStandardRecommendation(entry || {}, maps);
		const preview: ColumnStandardRecommendationPreview = {
			files: {
				column: columnFile,
				term: termFile,
				domain: domFile
			},
			...recommendation
		};

		return json(
			{
				success: true,
				data: preview,
				message: '컬럼 표준 추천을 계산했습니다.'
			} as DbDesignApiResponse<ColumnStandardRecommendationPreview>,
			{ status: 200 }
		);
	} catch (error) {
		console.error('컬럼 표준 추천 계산 오류:', error);
		return json(
			{
				success: false,
				error: '컬럼 표준 추천 계산 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}
