import { DEFAULT_FILENAMES, type DataType, type SharedDataFileMapping } from '$lib/types/base.js';
import type {
	EditorSaveImpactConflict,
	EditorSaveImpactFileSummary,
	EditorSaveImpactPreview,
	EditorSaveImpactSample,
	VocabularyImpactPreview
} from '$lib/types/change-impact.js';
import type { DomainData, DomainEntry } from '$lib/types/domain.js';
import type { TermData, TermEntry } from '$lib/types/term.js';
import type { VocabularyData, VocabularyEntry } from '$lib/types/vocabulary.js';
import { loadDomainData, loadTermData, loadVocabularyData } from '$lib/registry/data-registry.js';
import { loadDomainDataTypeMappingData } from '$lib/registry/domain-data-type-mapping-registry.js';
import { resolveRelatedFilenames } from '$lib/registry/mapping-registry.js';
import {
	applyVocabularyDomainMapping,
	buildFieldChanges,
	cloneJson,
	getDomainEntryLabel,
	getLastUnderscoreToken,
	getTermEntryLabel,
	getVocabularyEntryLabel,
	recalculateTermMapping,
	recommendDomainNamesForSuffix,
	replaceExactUnderscoreToken
} from '$lib/utils/cascade-update-rules.js';
import { generateStandardDomainName } from '$lib/utils/validation.js';
import { normalizeKey } from '$lib/utils/mapping-key.js';

type CascadeSourceType = 'vocabulary' | 'domain' | 'term';

type ImpactConflict = {
	code: string;
	type: 'vocabulary' | 'term';
	id: string;
	name: string;
	reason: string;
	suggestions: string[];
};

type ChangeValue = string | boolean | undefined;

type CascadeChangeEntry = {
	type: CascadeSourceType;
	id: string;
	name: string;
	fieldChanges: Array<{
		field: string;
		before: ChangeValue;
		after: ChangeValue;
	}>;
};

type VocabularyDatasetPlan = {
	type: 'vocabulary';
	filename: string;
	currentData: VocabularyData;
	nextData: VocabularyData;
	changedEntries: CascadeChangeEntry[];
};

type DomainDatasetPlan = {
	type: 'domain';
	filename: string;
	currentData: DomainData;
	nextData: DomainData;
	changedEntries: CascadeChangeEntry[];
};

type TermDatasetPlan = {
	type: 'term';
	filename: string;
	currentData: TermData;
	nextData: TermData;
	changedEntries: CascadeChangeEntry[];
};

export type CascadePlannedDataset = VocabularyDatasetPlan | DomainDatasetPlan | TermDatasetPlan;

export type CascadePlanSummary = {
	vocabularyChangeCount: number;
	domainChangeCount: number;
	termChangeCount: number;
	totalChangeCount: number;
};

export type CascadeUpdatePlan = {
	sourceType: CascadeSourceType;
	mode: 'create' | 'update';
	files: Partial<Record<CascadeSourceType, string>>;
	datasets: CascadePlannedDataset[];
	conflicts: ImpactConflict[];
	canApply: boolean;
	summary: CascadePlanSummary;
};

function buildImpactConflict(conflict: ImpactConflict, filename: string): EditorSaveImpactConflict {
	return {
		type: 'term',
		filename,
		entryId: conflict.id,
		name: conflict.name,
		reason: conflict.reason,
		candidates: conflict.suggestions.length > 0 ? conflict.suggestions : undefined
	};
}

function toImpactSamples(
	entries: CascadeChangeEntry[],
	field: string,
	reason: string
): EditorSaveImpactSample[] {
	return entries
		.filter((entry) => entry.fieldChanges.some((change) => change.field === field))
		.map((entry) => ({
			id: entry.id,
			name: entry.name,
			reason,
			changedFields: entry.fieldChanges
				.filter((change) => change.field === field)
				.map((change) => change.field)
		}));
}

function buildDatasetFileSummary(dataset: CascadePlannedDataset): EditorSaveImpactFileSummary {
	return {
		type: dataset.type,
		filename: dataset.filename,
		role:
			dataset.changedEntries.length > 0
				? dataset.type === dataset.changedEntries[0]?.type
					? 'source'
					: 'related'
				: 'related',
		changedCount: dataset.changedEntries.length,
		samples: dataset.changedEntries.slice(0, 5).map((entry) => ({
			id: entry.id,
			name: entry.name,
			reason: entry.fieldChanges.map((change) => change.field).join(', ') || '변경',
			changedFields: entry.fieldChanges.map((change) => change.field)
		}))
	};
}

function findSourceEntry(plan: CascadeUpdatePlan): VocabularyEntry | DomainEntry | TermEntry {
	const dataset = plan.datasets.find((item) => item.type === plan.sourceType);
	if (!dataset) {
		throw new Error('원본 데이터셋을 찾을 수 없습니다.');
	}

	const changeId = dataset.changedEntries[0]?.id;
	if (changeId) {
		const matched = dataset.nextData.entries.find((entry) => entry.id === changeId);
		if (matched) {
			return matched as VocabularyEntry | DomainEntry | TermEntry;
		}
	}

	const fallback = dataset.nextData.entries[dataset.nextData.entries.length - 1];
	if (!fallback) {
		throw new Error('원본 엔트리를 찾을 수 없습니다.');
	}
	return fallback as VocabularyEntry | DomainEntry | TermEntry;
}

function getSourceEntryLabel(
	type: CascadeSourceType,
	entry: VocabularyEntry | DomainEntry | TermEntry
): string {
	if (type === 'vocabulary') {
		return getVocabularyEntryLabel(entry as VocabularyEntry);
	}
	if (type === 'domain') {
		return getDomainEntryLabel(entry as DomainEntry);
	}
	return getTermEntryLabel(entry as TermEntry);
}

export function buildEditorSaveImpactPreview(plan: CascadeUpdatePlan): EditorSaveImpactPreview {
	const sourceEntry = findSourceEntry(plan);
	const sourceFilename = plan.files[plan.sourceType] || DEFAULT_FILENAMES[plan.sourceType];
	const relatedChangeCount =
		plan.summary.totalChangeCount -
		(plan.datasets.find((dataset) => dataset.type === plan.sourceType)?.changedEntries.length || 0);
	const termFilename = plan.files.term || DEFAULT_FILENAMES.term;

	return {
		sourceType: plan.sourceType,
		sourceFilename,
		sourceEntryId: sourceEntry.id,
		sourceEntryName: getSourceEntryLabel(plan.sourceType, sourceEntry),
		mode: plan.mode,
		summary: {
			sourceChangeCount:
				plan.datasets.find((dataset) => dataset.type === plan.sourceType)?.changedEntries.length ||
				0,
			relatedChangeCount,
			totalChangedFiles: plan.datasets.filter((dataset) => dataset.changedEntries.length > 0)
				.length,
			conflictCount: plan.conflicts.length
		},
		fileSummaries: plan.datasets
			.filter((dataset) => dataset.changedEntries.length > 0)
			.map((dataset) => ({
				...buildDatasetFileSummary(dataset),
				role: dataset.type === plan.sourceType ? 'source' : 'related'
			})),
		guidance:
			plan.conflicts.length > 0
				? ['충돌이 있어 자동 반영을 확정할 수 없으므로 저장이 차단됩니다.']
				: [],
		conflicts: plan.conflicts.map((conflict) => buildImpactConflict(conflict, termFilename)),
		blocked: !plan.canApply
	};
}

type VocabularyPlanParams = {
	filename?: string;
	currentEntry?: Partial<VocabularyEntry> | null;
	proposedEntry: Partial<VocabularyEntry>;
};

type DomainPlanParams = {
	filename?: string;
	currentEntry?: Partial<DomainEntry> | null;
	proposedEntry: Partial<DomainEntry>;
};

type TermPlanParams = {
	filename?: string;
	currentEntry?: Partial<TermEntry> | null;
	proposedEntry: Partial<TermEntry>;
};

function buildMappingOverride(
	mapping?: SharedDataFileMapping
): Partial<Record<DataType, string>> | undefined {
	return mapping ? ({ ...mapping } as Partial<Record<DataType, string>>) : undefined;
}

function summarizePlan(datasets: CascadePlannedDataset[]): CascadePlanSummary {
	const summary: CascadePlanSummary = {
		vocabularyChangeCount: 0,
		domainChangeCount: 0,
		termChangeCount: 0,
		totalChangeCount: 0
	};

	for (const dataset of datasets) {
		if (dataset.type === 'vocabulary') {
			summary.vocabularyChangeCount += dataset.changedEntries.length;
		} else if (dataset.type === 'domain') {
			summary.domainChangeCount += dataset.changedEntries.length;
		} else {
			summary.termChangeCount += dataset.changedEntries.length;
		}
	}

	summary.totalChangeCount =
		summary.vocabularyChangeCount + summary.domainChangeCount + summary.termChangeCount;
	return summary;
}

function buildVocabularyChangeEntry(
	before: VocabularyEntry,
	after: VocabularyEntry
): CascadeChangeEntry | null {
	const fieldChanges = buildFieldChanges(
		{
			standardName: before.standardName,
			abbreviation: before.abbreviation,
			englishName: before.englishName,
			domainCategory: before.domainCategory,
			domainGroup: before.domainGroup,
			isFormalWord: before.isFormalWord,
			isDomainCategoryMapped: before.isDomainCategoryMapped,
			description: before.description
		},
		{
			standardName: after.standardName,
			abbreviation: after.abbreviation,
			englishName: after.englishName,
			domainCategory: after.domainCategory,
			domainGroup: after.domainGroup,
			isFormalWord: after.isFormalWord,
			isDomainCategoryMapped: after.isDomainCategoryMapped,
			description: after.description
		}
	);

	if (fieldChanges.length === 0) {
		return null;
	}

	return {
		type: 'vocabulary',
		id: after.id,
		name: after.standardName,
		fieldChanges
	};
}

function buildDomainChangeEntry(
	before: DomainEntry,
	after: DomainEntry
): CascadeChangeEntry | null {
	const fieldChanges = buildFieldChanges(
		{
			domainGroup: before.domainGroup,
			domainCategory: before.domainCategory,
			standardDomainName: before.standardDomainName,
			physicalDataType: before.physicalDataType,
			dataLength: before.dataLength,
			decimalPlaces: before.decimalPlaces,
			description: before.description
		},
		{
			domainGroup: after.domainGroup,
			domainCategory: after.domainCategory,
			standardDomainName: after.standardDomainName,
			physicalDataType: after.physicalDataType,
			dataLength: after.dataLength,
			decimalPlaces: after.decimalPlaces,
			description: after.description
		}
	);

	if (fieldChanges.length === 0) {
		return null;
	}

	return {
		type: 'domain',
		id: after.id,
		name: after.standardDomainName,
		fieldChanges
	};
}

function buildTermChangeEntry(before: TermEntry, after: TermEntry): CascadeChangeEntry | null {
	const fieldChanges = buildFieldChanges(
		{
			termName: before.termName,
			columnName: before.columnName,
			domainName: before.domainName,
			isMappedTerm: before.isMappedTerm,
			isMappedColumn: before.isMappedColumn,
			isMappedDomain: before.isMappedDomain
		},
		{
			termName: after.termName,
			columnName: after.columnName,
			domainName: after.domainName,
			isMappedTerm: after.isMappedTerm,
			isMappedColumn: after.isMappedColumn,
			isMappedDomain: after.isMappedDomain
		}
	);

	if (fieldChanges.length === 0) {
		return null;
	}

	return {
		type: 'term',
		id: after.id,
		name: after.termName,
		fieldChanges
	};
}

function pickVocabularyEntry(entry: Partial<VocabularyEntry> | null | undefined) {
	if (!entry) return null;
	return {
		id: entry.id || '',
		standardName: entry.standardName?.trim() || '',
		abbreviation: entry.abbreviation?.trim() || '',
		englishName: entry.englishName?.trim() || '',
		description: entry.description?.trim() || '',
		domainCategory: entry.domainCategory?.trim() || undefined,
		domainGroup: entry.domainGroup?.trim() || undefined,
		isFormalWord: entry.isFormalWord ?? false,
		isDomainCategoryMapped: entry.isDomainCategoryMapped ?? false,
		synonyms: entry.synonyms || undefined,
		forbiddenWords: entry.forbiddenWords || undefined,
		createdAt: entry.createdAt || '',
		updatedAt: entry.updatedAt || ''
	};
}

function pickDomainEntry(entry: Partial<DomainEntry> | null | undefined) {
	if (!entry) return null;
	return {
		id: entry.id || '',
		domainGroup: entry.domainGroup?.trim() || '',
		domainCategory: entry.domainCategory?.trim() || '',
		standardDomainName: entry.standardDomainName?.trim() || '',
		physicalDataType: entry.physicalDataType?.trim() || '',
		dataLength: entry.dataLength?.trim() || undefined,
		decimalPlaces: entry.decimalPlaces?.trim() || undefined,
		measurementUnit: entry.measurementUnit?.trim() || undefined,
		revision: entry.revision?.trim() || undefined,
		description: entry.description?.trim() || undefined,
		storageFormat: entry.storageFormat?.trim() || undefined,
		displayFormat: entry.displayFormat?.trim() || undefined,
		allowedValues: entry.allowedValues?.trim() || undefined,
		createdAt: entry.createdAt || '',
		updatedAt: entry.updatedAt || ''
	};
}

function pickTermEntry(entry: Partial<TermEntry> | null | undefined) {
	if (!entry) return null;
	return {
		id: entry.id || '',
		termName: entry.termName?.trim() || '',
		columnName: entry.columnName?.trim() || '',
		domainName: entry.domainName?.trim() || '',
		isMappedTerm: entry.isMappedTerm ?? false,
		isMappedColumn: entry.isMappedColumn ?? false,
		isMappedDomain: entry.isMappedDomain ?? false,
		unmappedTermParts: entry.unmappedTermParts || undefined,
		unmappedColumnParts: entry.unmappedColumnParts || undefined,
		createdAt: entry.createdAt || '',
		updatedAt: entry.updatedAt || ''
	};
}

function ensureVocabularyEntry(
	proposed: Partial<VocabularyEntry>,
	current: VocabularyEntry | null,
	now: string
): VocabularyEntry {
	const base = current ? pickVocabularyEntry(current) : null;
	return {
		id: proposed.id || base?.id || crypto.randomUUID(),
		standardName: proposed.standardName?.trim() || base?.standardName || '',
		abbreviation: proposed.abbreviation?.trim() || base?.abbreviation || '',
		englishName: proposed.englishName?.trim() || base?.englishName || '',
		description: proposed.description?.trim() || base?.description || '',
		domainCategory: proposed.domainCategory?.trim() || base?.domainCategory || undefined,
		domainGroup: proposed.domainGroup?.trim() || base?.domainGroup || undefined,
		isFormalWord: proposed.isFormalWord ?? base?.isFormalWord ?? false,
		isDomainCategoryMapped:
			proposed.isDomainCategoryMapped ?? base?.isDomainCategoryMapped ?? false,
		synonyms: proposed.synonyms || base?.synonyms || undefined,
		forbiddenWords: proposed.forbiddenWords || base?.forbiddenWords || undefined,
		createdAt: base?.createdAt || proposed.createdAt || now,
		updatedAt: now
	};
}

function ensureTermEntry(
	proposed: Partial<TermEntry>,
	current: TermEntry | null,
	now: string
): TermEntry {
	const base = current ? pickTermEntry(current) : null;
	return {
		id: proposed.id || base?.id || crypto.randomUUID(),
		termName: proposed.termName?.trim() || base?.termName || '',
		columnName: proposed.columnName?.trim() || base?.columnName || '',
		domainName: proposed.domainName?.trim() || base?.domainName || '',
		isMappedTerm: base?.isMappedTerm ?? false,
		isMappedColumn: base?.isMappedColumn ?? false,
		isMappedDomain: base?.isMappedDomain ?? false,
		unmappedTermParts: base?.unmappedTermParts || undefined,
		unmappedColumnParts: base?.unmappedColumnParts || undefined,
		createdAt: base?.createdAt || proposed.createdAt || now,
		updatedAt: now
	};
}

function buildConflict(
	id: string,
	name: string,
	reason: string,
	suggestions: string[] = []
): ImpactConflict {
	return {
		code: 'AMBIGUOUS_DOMAIN_NAME',
		type: 'term',
		id,
		name,
		reason,
		suggestions
	};
}

export async function planVocabularyCascadeUpdate({
	filename,
	currentEntry,
	proposedEntry
}: VocabularyPlanParams): Promise<{
	plan: CascadeUpdatePlan;
	preview: VocabularyImpactPreview;
}> {
	const vocabularyFilename = filename || DEFAULT_FILENAMES.vocabulary;
	const vocabularyData = await loadVocabularyData(vocabularyFilename);
	const relatedFiles = await resolveRelatedFilenames(
		'vocabulary',
		vocabularyFilename,
		buildMappingOverride(vocabularyData.mapping)
	);
	const domainFilename = relatedFiles.get('domain') || DEFAULT_FILENAMES.domain;
	const termFilename = relatedFiles.get('term') || DEFAULT_FILENAMES.term;
	const [domainData, termData] = await Promise.all([
		loadDomainData(domainFilename),
		loadTermData(termFilename)
	]);

	const now = new Date().toISOString();
	const mode = currentEntry?.id ? 'update' : 'create';
	const current = currentEntry?.id
		? vocabularyData.entries.find((entry) => entry.id === currentEntry.id) || null
		: null;
	const nextVocabularyData = cloneJson(vocabularyData);
	const nextTermData = cloneJson(termData);
	const conflicts: ImpactConflict[] = [];

	const normalizedCurrent = pickVocabularyEntry(current);
	const nextEntry = ensureVocabularyEntry(proposedEntry, current, now);
	const mappedState = applyVocabularyDomainMapping(nextEntry, domainData.entries);
	nextEntry.domainGroup = mappedState.domainGroup;
	nextEntry.isDomainCategoryMapped = mappedState.isDomainCategoryMapped;

	if (mode === 'create') {
		nextVocabularyData.entries.push(nextEntry);
		nextVocabularyData.totalCount = nextVocabularyData.entries.length;
	} else if (current) {
		const index = nextVocabularyData.entries.findIndex((entry) => entry.id === current.id);
		nextVocabularyData.entries[index] = nextEntry;
	}
	nextVocabularyData.lastUpdated = now;

	const standardNameChanged =
		normalizeKey(normalizedCurrent?.standardName) !== normalizeKey(nextEntry.standardName);
	const abbreviationChanged =
		normalizeKey(normalizedCurrent?.abbreviation) !== normalizeKey(nextEntry.abbreviation);
	const englishNameChanged =
		normalizeKey(normalizedCurrent?.englishName) !== normalizeKey(nextEntry.englishName);
	const domainCategoryChanged =
		normalizeKey(normalizedCurrent?.domainCategory) !== normalizeKey(nextEntry.domainCategory);
	const isFormalWordChanged =
		(normalizedCurrent?.isFormalWord ?? false) !== (nextEntry.isFormalWord ?? false);

	const oldStandardName = normalizedCurrent?.standardName || '';
	const oldAbbreviation = normalizedCurrent?.abbreviation || '';
	const nextVocabularyEntries = nextVocabularyData.entries;

	for (let index = 0; index < nextTermData.entries.length; index += 1) {
		const currentTerm = termData.entries[index];
		const nextTerm = cloneJson(currentTerm);

		if (standardNameChanged && oldStandardName) {
			const replacement = replaceExactUnderscoreToken(
				nextTerm.termName,
				oldStandardName,
				nextEntry.standardName
			);
			nextTerm.termName = replacement.value;
		}

		if (abbreviationChanged && oldAbbreviation) {
			const replacement = replaceExactUnderscoreToken(
				nextTerm.columnName,
				oldAbbreviation,
				nextEntry.abbreviation
			);
			nextTerm.columnName = replacement.value;
		}

		const suffixMatchesUpdatedEntry =
			normalizeKey(getLastUnderscoreToken(nextTerm.termName)) ===
			normalizeKey(nextEntry.standardName);
		const shouldRecalculateDomain =
			suffixMatchesUpdatedEntry &&
			(mode === 'create' || standardNameChanged || domainCategoryChanged || isFormalWordChanged);

		if (shouldRecalculateDomain) {
			const recommendations = recommendDomainNamesForSuffix(
				nextTerm.termName,
				nextVocabularyEntries,
				domainData.entries
			);

			if (recommendations.length === 1) {
				nextTerm.domainName = recommendations[0];
			} else if (recommendations.length !== 1) {
				conflicts.push(
					buildConflict(
						currentTerm.id,
						currentTerm.termName,
						`접미사 '${getLastUnderscoreToken(nextTerm.termName)}'에 대한 도메인 후보가 ${recommendations.length}개입니다.`,
						recommendations
					)
				);
			}
		}

		const mapping = recalculateTermMapping(nextTerm, nextVocabularyEntries, domainData.entries);
		nextTerm.isMappedTerm = mapping.isMappedTerm;
		nextTerm.isMappedColumn = mapping.isMappedColumn;
		nextTerm.isMappedDomain = mapping.isMappedDomain;
		nextTerm.unmappedTermParts = mapping.unmappedTermParts;
		nextTerm.unmappedColumnParts = mapping.unmappedColumnParts;

		const changeEntry = buildTermChangeEntry(currentTerm, nextTerm);
		if (changeEntry) {
			nextTerm.updatedAt = now;
			nextTermData.entries[index] = nextTerm;
		}
	}

	const vocabularyChanges: CascadeChangeEntry[] = [];
	if (mode === 'create') {
		vocabularyChanges.push({
			type: 'vocabulary',
			id: nextEntry.id,
			name: nextEntry.standardName,
			fieldChanges: buildFieldChanges(
				{},
				{
					standardName: nextEntry.standardName,
					abbreviation: nextEntry.abbreviation,
					englishName: nextEntry.englishName
				}
			)
		});
	} else if (current) {
		const changeEntry = buildVocabularyChangeEntry(current, nextEntry);
		if (changeEntry) {
			vocabularyChanges.push(changeEntry);
		}
	}

	const termChanges = nextTermData.entries
		.map((entry, index) => buildTermChangeEntry(termData.entries[index], entry))
		.filter((entry): entry is CascadeChangeEntry => entry !== null);

	nextTermData.lastUpdated = termChanges.length > 0 ? now : termData.lastUpdated;
	nextTermData.totalCount = nextTermData.entries.length;

	const datasets: CascadePlannedDataset[] = [
		{
			type: 'vocabulary',
			filename: vocabularyFilename,
			currentData: vocabularyData,
			nextData: nextVocabularyData,
			changedEntries: vocabularyChanges
		}
	];

	if (termChanges.length > 0) {
		datasets.push({
			type: 'term',
			filename: termFilename,
			currentData: termData,
			nextData: nextTermData,
			changedEntries: termChanges
		});
	}

	const plan: CascadeUpdatePlan = {
		sourceType: 'vocabulary',
		mode,
		files: {
			vocabulary: vocabularyFilename,
			domain: domainFilename,
			term: termFilename
		},
		datasets,
		conflicts,
		canApply: conflicts.length === 0,
		summary: summarizePlan(datasets)
	};

	const termNameUpdates = termChanges.filter((entry) =>
		entry.fieldChanges.some((change) => change.field === 'termName')
	);
	const columnNameUpdates = termChanges.filter((entry) =>
		entry.fieldChanges.some((change) => change.field === 'columnName')
	);
	const domainNameUpdates = termChanges.filter((entry) =>
		entry.fieldChanges.some((change) => change.field === 'domainName')
	);

	const guidance: string[] = [];
	if (termChanges.length === 0) {
		guidance.push('연관 용어 자동 반영은 없고, 현재 단어집 항목만 저장됩니다.');
	} else {
		if (termNameUpdates.length > 0) {
			guidance.push(`용어명 토큰 치환 대상 ${termNameUpdates.length}건이 함께 갱신됩니다.`);
		}
		if (columnNameUpdates.length > 0) {
			guidance.push(`컬럼명 토큰 치환 대상 ${columnNameUpdates.length}건이 함께 갱신됩니다.`);
		}
		if (domainNameUpdates.length > 0) {
			guidance.push(
				`접미사 규칙에 따라 도메인명이 바뀌는 용어 ${domainNameUpdates.length}건이 있습니다.`
			);
		}
	}
	if (conflicts.length > 0) {
		guidance.push('충돌이 있어 자동 반영을 확정할 수 없으므로 저장이 차단됩니다.');
	}

	const editorSaveImpact = buildEditorSaveImpactPreview(plan);
	const preview: VocabularyImpactPreview = {
		files: {
			vocabulary: vocabularyFilename,
			domain: domainFilename,
			term: termFilename
		},
		mode,
		current: normalizedCurrent,
		proposed: pickVocabularyEntry(nextEntry)!,
		changes: {
			standardNameChanged,
			abbreviationChanged,
			englishNameChanged,
			domainCategoryChanged,
			isFormalWordChanged,
			synonymsChanged:
				JSON.stringify(normalizedCurrent?.synonyms || []) !==
				JSON.stringify(nextEntry.synonyms || []),
			forbiddenWordsChanged:
				JSON.stringify(normalizedCurrent?.forbiddenWords || []) !==
				JSON.stringify(nextEntry.forbiddenWords || []),
			descriptionChanged: normalizedCurrent?.description !== nextEntry.description
		},
		summary: {
			affectedTermNameCount: termNameUpdates.length,
			affectedColumnNameCount: columnNameUpdates.length,
			affectedDomainNameCount: domainNameUpdates.length,
			totalAffectedTermCount: termChanges.length,
			conflictCount: conflicts.length
		},
		samples: {
			termNameUpdates: toImpactSamples(termChanges, 'termName', '표준단어명 토큰 치환').slice(0, 5),
			columnNameUpdates: toImpactSamples(termChanges, 'columnName', '영문약어 토큰 치환').slice(
				0,
				5
			),
			domainNameUpdates: toImpactSamples(
				termChanges,
				'domainName',
				'접미사 기반 domainName 재계산'
			).slice(0, 5)
		},
		conflicts: conflicts.map((conflict) => buildImpactConflict(conflict, termFilename)),
		guidance,
		editorSaveImpact
	};

	return { plan, preview };
}

export async function planDomainCascadeUpdate({
	filename,
	currentEntry,
	proposedEntry
}: DomainPlanParams): Promise<CascadeUpdatePlan> {
	const domainFilename = filename || DEFAULT_FILENAMES.domain;
	const domainData = await loadDomainData(domainFilename);
	const relatedFiles = await resolveRelatedFilenames(
		'domain',
		domainFilename,
		buildMappingOverride(domainData.mapping)
	);
	const vocabularyFilename = relatedFiles.get('vocabulary') || DEFAULT_FILENAMES.vocabulary;
	const termFilename = relatedFiles.get('term') || DEFAULT_FILENAMES.term;
	const [vocabularyData, termData, dataTypeMappingData] = await Promise.all([
		loadVocabularyData(vocabularyFilename),
		loadTermData(termFilename),
		loadDomainDataTypeMappingData()
	]);

	const current = currentEntry?.id
		? domainData.entries.find((entry) => entry.id === currentEntry.id) || null
		: null;
	const now = new Date().toISOString();
	const nextDomainData = cloneJson(domainData);
	const nextVocabularyData = cloneJson(vocabularyData);
	const nextTermData = cloneJson(termData);
	const conflicts: ImpactConflict[] = [];

	const base = pickDomainEntry(current);
	const nextEntry: DomainEntry = {
		id: proposedEntry.id || base?.id || '',
		domainGroup: proposedEntry.domainGroup?.trim() || base?.domainGroup || '',
		domainCategory: proposedEntry.domainCategory?.trim() || base?.domainCategory || '',
		standardDomainName: base?.standardDomainName || '',
		physicalDataType: proposedEntry.physicalDataType?.trim() || base?.physicalDataType || '',
		dataLength: proposedEntry.dataLength?.trim() || base?.dataLength || undefined,
		decimalPlaces: proposedEntry.decimalPlaces?.trim() || base?.decimalPlaces || undefined,
		measurementUnit: proposedEntry.measurementUnit?.trim() || base?.measurementUnit || undefined,
		revision: proposedEntry.revision?.trim() || base?.revision || undefined,
		description: proposedEntry.description?.trim() || base?.description || undefined,
		storageFormat: proposedEntry.storageFormat?.trim() || base?.storageFormat || undefined,
		displayFormat: proposedEntry.displayFormat?.trim() || base?.displayFormat || undefined,
		allowedValues: proposedEntry.allowedValues?.trim() || base?.allowedValues || undefined,
		createdAt: base?.createdAt || proposedEntry.createdAt || now,
		updatedAt: now
	};
	const generatedDomainName = generateStandardDomainName(
		nextEntry.domainCategory,
		nextEntry.physicalDataType,
		nextEntry.dataLength,
		nextEntry.decimalPlaces,
		dataTypeMappingData.entries
	);
	nextEntry.standardDomainName = generatedDomainName;

	const entryIndex = nextDomainData.entries.findIndex((entry) => entry.id === nextEntry.id);
	nextDomainData.entries[entryIndex] = nextEntry as DomainEntry;
	nextDomainData.lastUpdated = now;

	const oldCategoryKey = normalizeKey(base?.domainCategory);
	const nextCategoryKey = normalizeKey(nextEntry.domainCategory);
	const oldCategoryStillUsedByAnotherDomain =
		oldCategoryKey &&
		oldCategoryKey !== nextCategoryKey &&
		domainData.entries.some(
			(entry) => entry.id !== nextEntry.id && normalizeKey(entry.domainCategory) === oldCategoryKey
		);
	for (let index = 0; index < nextVocabularyData.entries.length; index += 1) {
		const currentVocabulary = vocabularyData.entries[index];
		const nextVocabulary = cloneJson(currentVocabulary);

		if (
			oldCategoryKey &&
			nextCategoryKey &&
			oldCategoryKey !== nextCategoryKey &&
			currentVocabulary.isDomainCategoryMapped !== false &&
			normalizeKey(currentVocabulary.domainCategory) === oldCategoryKey
		) {
			if (oldCategoryStillUsedByAnotherDomain) {
				conflicts.push({
					code: 'DOMAIN_CATEGORY_STILL_REFERENCED',
					type: 'vocabulary',
					id: currentVocabulary.id,
					name: currentVocabulary.standardName,
					reason: `도메인분류명 '${base?.domainCategory || ''}'를 사용하는 다른 도메인이 있어 단어집 자동 반영 대상을 확정할 수 없습니다.`,
					suggestions: []
				});
				continue;
			}
			nextVocabulary.domainCategory = nextEntry.domainCategory;
		}

		const mappedState = applyVocabularyDomainMapping(nextVocabulary, nextDomainData.entries);
		nextVocabulary.domainGroup = mappedState.domainGroup;
		nextVocabulary.isDomainCategoryMapped = mappedState.isDomainCategoryMapped;

		const changeEntry = buildVocabularyChangeEntry(currentVocabulary, nextVocabulary);
		if (changeEntry) {
			nextVocabulary.updatedAt = now;
			nextVocabularyData.entries[index] = nextVocabulary;
		}
	}
	nextVocabularyData.lastUpdated = now;

	const oldDomainNameKey = normalizeKey(base?.standardDomainName);
	const nextDomainNameKey = normalizeKey(nextEntry.standardDomainName);
	for (let index = 0; index < nextTermData.entries.length; index += 1) {
		const currentTerm = termData.entries[index];
		const nextTerm = cloneJson(currentTerm);
		if (
			oldDomainNameKey &&
			oldDomainNameKey !== nextDomainNameKey &&
			normalizeKey(currentTerm.domainName) === oldDomainNameKey
		) {
			nextTerm.domainName = nextEntry.standardDomainName;
		}

		const mapping = recalculateTermMapping(
			nextTerm,
			nextVocabularyData.entries,
			nextDomainData.entries
		);
		nextTerm.isMappedTerm = mapping.isMappedTerm;
		nextTerm.isMappedColumn = mapping.isMappedColumn;
		nextTerm.isMappedDomain = mapping.isMappedDomain;
		nextTerm.unmappedTermParts = mapping.unmappedTermParts;
		nextTerm.unmappedColumnParts = mapping.unmappedColumnParts;

		const changeEntry = buildTermChangeEntry(currentTerm, nextTerm);
		if (changeEntry) {
			nextTerm.updatedAt = now;
			nextTermData.entries[index] = nextTerm;
		}
	}
	nextTermData.lastUpdated = now;

	const domainChange = current
		? buildDomainChangeEntry(current, nextEntry as DomainEntry)
		: ({
				type: 'domain',
				id: nextEntry.id,
				name: nextEntry.standardDomainName,
				fieldChanges: buildFieldChanges(
					{},
					{
						domainGroup: nextEntry.domainGroup,
						domainCategory: nextEntry.domainCategory,
						standardDomainName: nextEntry.standardDomainName,
						physicalDataType: nextEntry.physicalDataType,
						dataLength: nextEntry.dataLength,
						decimalPlaces: nextEntry.decimalPlaces,
						description: nextEntry.description
					}
				)
			} as CascadeChangeEntry);
	const vocabularyChanges = nextVocabularyData.entries
		.map((entry, index) => buildVocabularyChangeEntry(vocabularyData.entries[index], entry))
		.filter((entry): entry is CascadeChangeEntry => entry !== null);
	const termChanges = nextTermData.entries
		.map((entry, index) => buildTermChangeEntry(termData.entries[index], entry))
		.filter((entry): entry is CascadeChangeEntry => entry !== null);

	const datasets: CascadePlannedDataset[] = [
		{
			type: 'domain',
			filename: domainFilename,
			currentData: domainData,
			nextData: nextDomainData,
			changedEntries: domainChange ? [domainChange] : []
		}
	];
	if (vocabularyChanges.length > 0) {
		datasets.push({
			type: 'vocabulary',
			filename: vocabularyFilename,
			currentData: vocabularyData,
			nextData: nextVocabularyData,
			changedEntries: vocabularyChanges
		});
	}
	if (termChanges.length > 0) {
		datasets.push({
			type: 'term',
			filename: termFilename,
			currentData: termData,
			nextData: nextTermData,
			changedEntries: termChanges
		});
	}

	return {
		sourceType: 'domain',
		mode: 'update',
		files: {
			domain: domainFilename,
			vocabulary: vocabularyFilename,
			term: termFilename
		},
		datasets,
		conflicts,
		canApply: conflicts.length === 0,
		summary: summarizePlan(datasets)
	};
}

export async function planTermCascadeUpdate({
	filename,
	currentEntry,
	proposedEntry
}: TermPlanParams): Promise<CascadeUpdatePlan> {
	const termFilename = filename || DEFAULT_FILENAMES.term;
	const termData = await loadTermData(termFilename);
	const relatedFiles = await resolveRelatedFilenames(
		'term',
		termFilename,
		buildMappingOverride(termData.mapping)
	);
	const vocabularyFilename = relatedFiles.get('vocabulary') || DEFAULT_FILENAMES.vocabulary;
	const domainFilename = relatedFiles.get('domain') || DEFAULT_FILENAMES.domain;
	const [vocabularyData, domainData] = await Promise.all([
		loadVocabularyData(vocabularyFilename),
		loadDomainData(domainFilename)
	]);

	const current = currentEntry?.id
		? termData.entries.find((entry) => entry.id === currentEntry.id) || null
		: null;
	const now = new Date().toISOString();
	const nextTermData = cloneJson(termData);
	const nextEntry = ensureTermEntry(proposedEntry, current, now);
	const mapping = recalculateTermMapping(nextEntry, vocabularyData.entries, domainData.entries);
	nextEntry.isMappedTerm = mapping.isMappedTerm;
	nextEntry.isMappedColumn = mapping.isMappedColumn;
	nextEntry.isMappedDomain = mapping.isMappedDomain;
	nextEntry.unmappedTermParts = mapping.unmappedTermParts;
	nextEntry.unmappedColumnParts = mapping.unmappedColumnParts;

	if (current) {
		const index = nextTermData.entries.findIndex((entry) => entry.id === current.id);
		nextTermData.entries[index] = nextEntry;
	} else {
		nextTermData.entries.push(nextEntry);
		nextTermData.totalCount = nextTermData.entries.length;
	}
	nextTermData.lastUpdated = now;

	const termChanges = current
		? [buildTermChangeEntry(current, nextEntry)].filter(
				(entry): entry is CascadeChangeEntry => entry !== null
			)
		: [
				{
					type: 'term' as const,
					id: nextEntry.id,
					name: nextEntry.termName,
					fieldChanges: buildFieldChanges(
						{},
						{
							termName: nextEntry.termName,
							columnName: nextEntry.columnName,
							domainName: nextEntry.domainName
						}
					)
				}
			];

	const datasets: CascadePlannedDataset[] = [
		{
			type: 'term',
			filename: termFilename,
			currentData: termData,
			nextData: nextTermData,
			changedEntries: termChanges
		}
	];

	return {
		sourceType: 'term',
		mode: current ? 'update' : 'create',
		files: {
			term: termFilename,
			vocabulary: vocabularyFilename,
			domain: domainFilename
		},
		datasets,
		conflicts: [],
		canApply: true,
		summary: summarizePlan(datasets)
	};
}

export async function planCascadeUpdate(params: {
	type: CascadeSourceType;
	filename?: string;
	mode?: 'create' | 'update';
	currentEntry?: Partial<VocabularyEntry | DomainEntry | TermEntry> | null;
	proposedEntry: Partial<VocabularyEntry | DomainEntry | TermEntry>;
}): Promise<
	CascadeUpdatePlan & {
		sourceEntry: VocabularyEntry | DomainEntry | TermEntry;
		preview: EditorSaveImpactPreview;
		blocked: boolean;
	}
> {
	let plan: CascadeUpdatePlan;
	if (params.type === 'vocabulary') {
		const result = await planVocabularyCascadeUpdate({
			filename: params.filename,
			currentEntry: params.currentEntry as Partial<VocabularyEntry> | null | undefined,
			proposedEntry: params.proposedEntry as Partial<VocabularyEntry>
		});
		plan = result.plan;
		return {
			...plan,
			sourceEntry: findSourceEntry(plan),
			preview: result.preview.editorSaveImpact,
			blocked: !plan.canApply
		};
	}
	if (params.type === 'domain') {
		plan = await planDomainCascadeUpdate({
			filename: params.filename,
			currentEntry: params.currentEntry as Partial<DomainEntry> | null | undefined,
			proposedEntry: params.proposedEntry as Partial<DomainEntry>
		});
	} else {
		plan = await planTermCascadeUpdate({
			filename: params.filename,
			currentEntry: params.currentEntry as Partial<TermEntry> | null | undefined,
			proposedEntry: params.proposedEntry as Partial<TermEntry>
		});
	}

	return {
		...plan,
		sourceEntry: findSourceEntry(plan),
		preview: buildEditorSaveImpactPreview(plan),
		blocked: !plan.canApply
	};
}

export async function buildVocabularyImpactPreview(
	params: VocabularyPlanParams
): Promise<VocabularyImpactPreview> {
	const { preview } = await planVocabularyCascadeUpdate(params);
	return preview;
}
