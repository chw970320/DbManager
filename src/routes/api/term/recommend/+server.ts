import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '$lib/types/vocabulary.js';
import type { VocabularyData } from '$lib/types/vocabulary.js';
import type { DomainData } from '$lib/types/domain.js';
import { loadTermData, loadVocabularyData, loadDomainData } from '$lib/utils/file-handler.js';

type RecommendRequest = {
	filename?: string; // term 파일명
	termName: string;
};

function getLastSegment(termName: string): string {
	if (!termName || !termName.trim()) return '';
	const parts = termName
		.split('_')
		.map((p) => p.trim())
		.filter((p) => p.length > 0);
	return parts.length > 0 ? parts[parts.length - 1] : '';
}

export async function POST({ request }: RequestEvent) {
	try {
		const { filename = 'term.json', termName }: RecommendRequest = await request.json();

		if (!termName || !termName.trim()) {
			return json(
				{
					success: true,
					data: {
						lastSegment: '',
						matchedStandardNames: [],
						matchedDomainCategories: [],
						recommendations: []
					}
				} as ApiResponse,
				{ status: 200 }
			);
		}

		const lastSegment = getLastSegment(termName);
		if (!lastSegment) {
			return json(
				{
					success: true,
					data: {
						lastSegment: '',
						matchedStandardNames: [],
						matchedDomainCategories: [],
						recommendations: []
					}
				} as ApiResponse,
				{ status: 200 }
			);
		}

		// 용어 데이터 로드 및 매핑 정보 확인
		const termData = await loadTermData(filename);
		const mapping = termData.mapping || {
			vocabulary: 'vocabulary.json',
			domain: 'domain.json'
		};

		// 단어집, 도메인 데이터 로드
		const vocabularyData: VocabularyData = await loadVocabularyData(mapping.vocabulary);
		const domainData: DomainData = await loadDomainData(mapping.domain);

		const lastSegmentLower = lastSegment.trim().toLowerCase();

		// 1) 단어집에서 표준단어명 일치 항목 찾기
		const matchedStandardNames: string[] = [];
		const matchedDomainCategoriesSet = new Set<string>();

		for (const entry of vocabularyData.entries) {
			if (!entry.standardName) continue;
			const standardName = entry.standardName.trim();
			if (!standardName) continue;

			if (standardName.toLowerCase() === lastSegmentLower) {
				matchedStandardNames.push(standardName);
				if (entry.domainCategory && entry.isDomainCategoryMapped !== false) {
					matchedDomainCategoriesSet.add(entry.domainCategory.trim());
				}
			}
		}

		if (matchedStandardNames.length === 0 || matchedDomainCategoriesSet.size === 0) {
			return json(
				{
					success: true,
					data: {
						lastSegment,
						matchedStandardNames,
						matchedDomainCategories: Array.from(matchedDomainCategoriesSet),
						recommendations: []
					}
				} as ApiResponse,
				{ status: 200 }
			);
		}

		// 2) 도메인 데이터에서 해당 도메인분류에 매핑된 도메인명 찾기
		const matchedDomainCategories = Array.from(matchedDomainCategoriesSet);
		const categorySetLower = new Set(
			matchedDomainCategories.map((c) => c.trim().toLowerCase()).filter((c) => c.length > 0)
		);

		const recommendedDomainNames = new Set<string>();

		for (const domainEntry of domainData.entries) {
			if (!domainEntry.domainCategory || !domainEntry.standardDomainName) continue;

			const categoryLower = domainEntry.domainCategory.trim().toLowerCase();
			if (!categorySetLower.has(categoryLower)) continue;

			const domainName = domainEntry.standardDomainName.trim();
			if (domainName) {
				recommendedDomainNames.add(domainName);
			}
		}

		return json(
			{
				success: true,
				data: {
					lastSegment,
					matchedStandardNames,
					matchedDomainCategories,
					recommendations: Array.from(recommendedDomainNames)
				}
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('용어 도메인 추천 중 오류:', error);
		return json(
			{
				success: false,
				error: '용어 도메인 추천 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}
