import type { DomainEntry } from '$lib/types/domain.js';
import type { TermEntry } from '$lib/types/term.js';
import type { VocabularyEntry } from '$lib/types/vocabulary.js';
import { normalizeKey } from '$lib/utils/mapping-key.js';

export type PlannedFieldChange = {
	field: string;
	before: string | boolean | undefined;
	after: string | boolean | undefined;
};

export function splitUnderscoreTokens(value: string): string[] {
	return value
		.split('_')
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
}

export function getLastUnderscoreToken(value: string): string {
	const parts = splitUnderscoreTokens(value);
	return parts.length > 0 ? parts[parts.length - 1] : '';
}

export function replaceExactUnderscoreToken(
	value: string,
	currentToken: string,
	nextToken: string
): { value: string; changed: boolean } {
	if (!value.trim()) {
		return { value, changed: false };
	}

	const currentKey = normalizeKey(currentToken);
	if (!currentKey || currentKey === normalizeKey(nextToken)) {
		return { value, changed: false };
	}

	const nextValue = splitUnderscoreTokens(value).map((token) =>
		normalizeKey(token) === currentKey ? nextToken : token
	);
	const joined = nextValue.join('_');
	return {
		value: joined,
		changed: joined !== value
	};
}

export function buildDomainCategoryMap(domainEntries: DomainEntry[]): Map<string, string> {
	const map = new Map<string, string>();
	for (const entry of domainEntries) {
		const categoryKey = normalizeKey(entry.domainCategory);
		const groupValue = entry.domainGroup?.trim();
		if (!categoryKey || !groupValue) continue;
		map.set(categoryKey, groupValue);
	}
	return map;
}

export function getDomainGroupCandidates(
	domainCategory: string | undefined,
	domainEntries: DomainEntry[]
): string[] {
	const categoryKey = normalizeKey(domainCategory);
	if (!categoryKey) {
		return [];
	}

	return Array.from(
		new Set(
			domainEntries
				.filter((entry) => normalizeKey(entry.domainCategory) === categoryKey)
				.map((entry) => entry.domainGroup?.trim())
				.filter((value): value is string => !!value)
		)
	);
}

export function applyVocabularyDomainMapping(
	entry: VocabularyEntry,
	domainEntries: DomainEntry[]
): Pick<VocabularyEntry, 'domainGroup' | 'isDomainCategoryMapped'> {
	if (entry.isFormalWord !== true) {
		return {
			domainGroup: undefined,
			isDomainCategoryMapped: false
		};
	}

	const categoryKey = normalizeKey(entry.domainCategory);
	if (!categoryKey) {
		return {
			domainGroup: undefined,
			isDomainCategoryMapped: false
		};
	}

	const domainGroups = getDomainGroupCandidates(entry.domainCategory, domainEntries);
	const domainGroup = domainGroups.length === 1 ? domainGroups[0] : undefined;
	return {
		domainGroup,
		isDomainCategoryMapped: !!domainGroup
	};
}

export function getEditorSaveTypeLabel(type: 'vocabulary' | 'domain' | 'term'): string {
	if (type === 'vocabulary') return '단어집';
	if (type === 'domain') return '도메인';
	return '용어집';
}

export function getVocabularyEntryLabel(entry: Pick<VocabularyEntry, 'standardName'>): string {
	return entry.standardName?.trim() || '(이름 없음)';
}

export function getDomainEntryLabel(entry: Pick<DomainEntry, 'standardDomainName'>): string {
	return entry.standardDomainName?.trim() || '(도메인명 없음)';
}

export function getTermEntryLabel(entry: Pick<TermEntry, 'termName'>): string {
	return entry.termName?.trim() || '(용어명 없음)';
}

export function buildVocabularyMap(
	vocabularyEntries: VocabularyEntry[]
): Map<string, { standardName: string; abbreviation: string }> {
	const map = new Map<string, { standardName: string; abbreviation: string }>();
	for (const entry of vocabularyEntries) {
		const standardName = entry.standardName?.trim();
		const abbreviation = entry.abbreviation?.trim();
		if (!standardName || !abbreviation) continue;
		map.set(normalizeKey(standardName), { standardName, abbreviation });
		map.set(normalizeKey(abbreviation), { standardName, abbreviation });
	}
	return map;
}

export function buildDomainNameMap(domainEntries: DomainEntry[]): Map<string, string> {
	const map = new Map<string, string>();
	for (const entry of domainEntries) {
		const standardDomainName = entry.standardDomainName?.trim();
		if (!standardDomainName) continue;
		map.set(normalizeKey(standardDomainName), standardDomainName);
	}
	return map;
}

export function recalculateTermMapping(
	entry: TermEntry,
	vocabularyEntries: VocabularyEntry[],
	domainEntries: DomainEntry[]
): Pick<
	TermEntry,
	'isMappedTerm' | 'isMappedColumn' | 'isMappedDomain' | 'unmappedTermParts' | 'unmappedColumnParts'
> {
	const vocabularyMap = buildVocabularyMap(vocabularyEntries);
	const domainMap = buildDomainNameMap(domainEntries);

	const termParts = splitUnderscoreTokens(entry.termName);
	const unmappedTermParts = termParts.filter((part) => !vocabularyMap.has(normalizeKey(part)));
	const columnParts = splitUnderscoreTokens(entry.columnName);
	const unmappedColumnParts = columnParts.filter((part) => !vocabularyMap.has(normalizeKey(part)));

	return {
		isMappedTerm: termParts.length > 0 && unmappedTermParts.length === 0,
		isMappedColumn: columnParts.length > 0 && unmappedColumnParts.length === 0,
		isMappedDomain: domainMap.has(normalizeKey(entry.domainName)),
		unmappedTermParts: unmappedTermParts.length > 0 ? unmappedTermParts : undefined,
		unmappedColumnParts: unmappedColumnParts.length > 0 ? unmappedColumnParts : undefined
	};
}

export function evaluateTermMapping(
	termName: string,
	columnName: string,
	domainName: string,
	vocabularyEntries: VocabularyEntry[],
	domainEntries: DomainEntry[]
) {
	return recalculateTermMapping(
		{
			id: '',
			termName,
			columnName,
			domainName,
			isMappedTerm: false,
			isMappedColumn: false,
			isMappedDomain: false,
			createdAt: '',
			updatedAt: ''
		},
		vocabularyEntries,
		domainEntries
	);
}

export function recommendDomainNamesForSuffix(
	termName: string,
	vocabularyEntries: VocabularyEntry[],
	domainEntries: DomainEntry[]
): string[] {
	const suffix = getLastUnderscoreToken(termName);
	const suffixKey = normalizeKey(suffix);
	if (!suffixKey) {
		return [];
	}

	const matchedCategories = new Set<string>();
	for (const entry of vocabularyEntries) {
		if (normalizeKey(entry.standardName) !== suffixKey) continue;
		if (entry.isFormalWord !== true) continue;
		if (!entry.domainCategory || entry.isDomainCategoryMapped === false) continue;
		matchedCategories.add(normalizeKey(entry.domainCategory));
	}

	if (matchedCategories.size === 0) {
		return [];
	}

	const recommendations = new Set<string>();
	for (const entry of domainEntries) {
		if (!entry.domainCategory || !entry.standardDomainName) continue;
		if (!matchedCategories.has(normalizeKey(entry.domainCategory))) continue;
		recommendations.add(entry.standardDomainName.trim());
	}

	return Array.from(recommendations);
}

export function findRecommendedDomainNamesForTerm(
	termName: string,
	vocabularyEntries: VocabularyEntry[],
	domainEntries: DomainEntry[]
): string[] {
	return recommendDomainNamesForSuffix(termName, vocabularyEntries, domainEntries);
}

export function getLastTermSegment(termName: string): string {
	return getLastUnderscoreToken(termName);
}

export function buildFieldChanges(
	before: Record<string, string | boolean | undefined>,
	after: Record<string, string | boolean | undefined>
): PlannedFieldChange[] {
	const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
	const changes: PlannedFieldChange[] = [];
	for (const key of keys) {
		if (before[key] === after[key]) continue;
		changes.push({
			field: key,
			before: before[key],
			after: after[key]
		});
	}
	return changes;
}

export function cloneJson<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}
