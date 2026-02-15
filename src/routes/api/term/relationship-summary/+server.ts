import { json, type RequestEvent } from '@sveltejs/kit';
import { loadData } from '$lib/registry/data-registry';
import { resolveRelatedFilenames } from '$lib/registry/mapping-registry';
import { normalizeKey } from '$lib/utils/mapping-key';
import type { TermEntry } from '$lib/types/term';
import type { VocabularyEntry } from '$lib/types/vocabulary';
import type { DomainEntry } from '$lib/types/domain';

function splitParts(value: string): string[] {
	return value
		.split('_')
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
}

export async function GET({ url }: RequestEvent) {
	try {
		const termFilename = url.searchParams.get('termFilename') || 'term.json';
		const relatedFiles = await resolveRelatedFilenames('term', termFilename);
		const vocabularyFilename = url.searchParams.get('vocabularyFilename') || relatedFiles.get('vocabulary') || 'vocabulary.json';
		const domainFilename = url.searchParams.get('domainFilename') || relatedFiles.get('domain') || 'domain.json';

		const [termData, vocabularyData, domainData] = await Promise.all([
			loadData('term', termFilename),
			loadData('vocabulary', vocabularyFilename),
			loadData('domain', domainFilename)
		]);

		const termEntries = termData.entries as TermEntry[];
		const vocabularyEntries = vocabularyData.entries as VocabularyEntry[];
		const domainEntries = domainData.entries as DomainEntry[];

		const standardNames = new Set(vocabularyEntries.map((entry) => normalizeKey(entry.standardName)));
		const abbreviations = new Set(vocabularyEntries.map((entry) => normalizeKey(entry.abbreviation)));
		const domainNames = new Set(domainEntries.map((entry) => normalizeKey(entry.standardDomainName)));
		const domainCategories = new Set(domainEntries.map((entry) => normalizeKey(entry.domainCategory)));

		let termNameMappedCount = 0;
		let columnNameMappedCount = 0;
		let termDomainMappedCount = 0;
		const missingTermParts: Array<{ id: string; termName: string; part: string }> = [];
		const missingColumnParts: Array<{ id: string; columnName: string; part: string }> = [];
		const missingDomains: Array<{ id: string; domainName: string }> = [];

		for (const entry of termEntries) {
			const termParts = splitParts(entry.termName);
			const columnParts = splitParts(entry.columnName);

			const termMapped = termParts.length > 0 && termParts.every((part) => standardNames.has(normalizeKey(part)));
			const columnMapped = columnParts.length > 0 && columnParts.every((part) => abbreviations.has(normalizeKey(part)));
			const domainMapped = domainNames.has(normalizeKey(entry.domainName));

			if (termMapped) {
				termNameMappedCount += 1;
			} else {
				for (const part of termParts) {
					if (!standardNames.has(normalizeKey(part))) {
						missingTermParts.push({ id: entry.id, termName: entry.termName, part });
					}
				}
			}

			if (columnMapped) {
				columnNameMappedCount += 1;
			} else {
				for (const part of columnParts) {
					if (!abbreviations.has(normalizeKey(part))) {
						missingColumnParts.push({ id: entry.id, columnName: entry.columnName, part });
					}
				}
			}

			if (domainMapped) {
				termDomainMappedCount += 1;
			} else {
				missingDomains.push({ id: entry.id, domainName: entry.domainName });
			}
		}

		const vocabularyDomainMappedCount = vocabularyEntries.filter(
			(entry) => entry.domainCategory && domainCategories.has(normalizeKey(entry.domainCategory))
		).length;

		const referencedDomainSet = new Set(termEntries.map((entry) => normalizeKey(entry.domainName)));
		const orphanDomains = domainEntries
			.filter((entry) => !referencedDomainSet.has(normalizeKey(entry.standardDomainName)))
			.slice(0, 20)
			.map((entry) => ({
				id: entry.id,
				standardDomainName: entry.standardDomainName
			}));

		return json(
			{
				success: true,
				data: {
					files: {
						term: termFilename,
						vocabulary: vocabularyFilename,
						domain: domainFilename
					},
					summary: {
						termTotalCount: termEntries.length,
						vocabularyTotalCount: vocabularyEntries.length,
						domainTotalCount: domainEntries.length,
						termNameMappedCount,
						columnNameMappedCount,
						termDomainMappedCount,
						vocabularyDomainMappedCount,
						missingTermPartCount: missingTermParts.length,
						missingColumnPartCount: missingColumnParts.length,
						missingDomainCount: missingDomains.length,
						orphanDomainCount: orphanDomains.length
					},
					samples: {
						missingTermParts: missingTermParts.slice(0, 20),
						missingColumnParts: missingColumnParts.slice(0, 20),
						missingDomains: missingDomains.slice(0, 20),
						orphanDomains
					}
				},
				message: '용어계 관계 진단 요약 생성 완료'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('용어계 관계 진단 요약 오류:', error);
		return json(
			{
				success: false,
				error: '용어계 관계 진단 요약 생성 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}
