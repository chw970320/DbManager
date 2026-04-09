import type { DataType } from './base.js';
import type { DomainEntry } from './domain.js';
import type { TermEntry } from './term.js';
import type { VocabularyEntry } from './vocabulary.js';

export type EditorSaveImpactType = 'vocabulary' | 'domain' | 'term';

export type EditorSaveImpactSample = {
	id: string;
	name: string;
	reason: string;
	changedFields?: string[];
};

export type EditorSaveImpactFileSummary = {
	type: EditorSaveImpactType;
	filename: string;
	role: 'source' | 'related';
	changedCount: number;
	samples: EditorSaveImpactSample[];
};

export type EditorSaveImpactConflict = {
	type: EditorSaveImpactType;
	filename: string;
	entryId: string;
	name: string;
	reason: string;
	candidates?: string[];
};

export type EditorSaveImpactPreview = {
	sourceType: EditorSaveImpactType;
	sourceFilename: string;
	sourceEntryId: string;
	sourceEntryName: string;
	mode: 'create' | 'update';
	summary: {
		sourceChangeCount: number;
		relatedChangeCount: number;
		totalChangedFiles: number;
		conflictCount: number;
	};
	fileSummaries: EditorSaveImpactFileSummary[];
	guidance: string[];
	conflicts: EditorSaveImpactConflict[];
	blocked: boolean;
};

export type ImpactReferenceSummary = {
	type: DataType;
	filename: string;
	count: number;
	entries: Array<{
		id: string;
		name: string;
	}>;
};

export type ImpactConflict = {
	code: string;
	type: DataType;
	id: string;
	name: string;
	reason: string;
	suggestions?: string[];
};

export type VocabularyImpactPreview = {
	files: {
		vocabulary: string;
		term: string;
		domain: string;
	};
	mode: 'create' | 'update';
	current: Pick<
		VocabularyEntry,
		| 'id'
		| 'standardName'
		| 'abbreviation'
		| 'englishName'
		| 'domainCategory'
		| 'domainGroup'
		| 'isFormalWord'
		| 'isDomainCategoryMapped'
	> | null;
	proposed: Pick<
		VocabularyEntry,
		| 'id'
		| 'standardName'
		| 'abbreviation'
		| 'englishName'
		| 'domainCategory'
		| 'domainGroup'
		| 'isFormalWord'
		| 'isDomainCategoryMapped'
	>;
	changes: {
		standardNameChanged: boolean;
		abbreviationChanged: boolean;
		englishNameChanged: boolean;
		domainCategoryChanged: boolean;
		isFormalWordChanged: boolean;
		synonymsChanged: boolean;
		forbiddenWordsChanged: boolean;
		descriptionChanged: boolean;
	};
	summary: {
		affectedTermNameCount: number;
		affectedColumnNameCount: number;
		affectedDomainNameCount: number;
		totalAffectedTermCount: number;
		conflictCount: number;
	};
	samples: {
		termNameUpdates: EditorSaveImpactSample[];
		columnNameUpdates: EditorSaveImpactSample[];
		domainNameUpdates: EditorSaveImpactSample[];
	};
	guidance: string[];
	conflicts: EditorSaveImpactConflict[];
	editorSaveImpact: EditorSaveImpactPreview;
};

export type TermImpactPreview = {
	files: {
		term: string;
		domain: string;
		column: string;
	};
	mode: 'create' | 'update';
	current: Pick<TermEntry, 'id' | 'termName' | 'columnName' | 'domainName'> | null;
	proposed: Pick<TermEntry, 'id' | 'termName' | 'columnName' | 'domainName'>;
	changes: {
		termNameChanged: boolean;
		columnNameChanged: boolean;
		domainNameChanged: boolean;
	};
	summary: {
		currentLinkedColumnCount: number;
		nextLinkedColumnCount: number;
		columnLinksToBeBroken: number;
		newColumnLinksDetected: number;
		affectedColumnStandardizationCount: number;
		proposedDomainExists: boolean;
	};
	samples: {
		currentLinkedColumns: Array<{
			id: string;
			name: string;
		}>;
		nextLinkedColumns: Array<{
			id: string;
			name: string;
		}>;
	};
	guidance: string[];
};

export type DomainImpactPreview = {
	files: {
		domain: string;
		vocabulary: string;
		term: string;
		column: string;
	};
	mode: 'create' | 'update' | 'delete';
	current: Pick<
		DomainEntry,
		| 'id'
		| 'domainCategory'
		| 'standardDomainName'
		| 'physicalDataType'
		| 'dataLength'
		| 'decimalPlaces'
	> | null;
	proposed: Pick<
		DomainEntry,
		| 'id'
		| 'domainCategory'
		| 'standardDomainName'
		| 'physicalDataType'
		| 'dataLength'
		| 'decimalPlaces'
	> | null;
	changes: {
		referenceKeyChanged: boolean;
		syncSpecChanged: boolean;
	};
	summary: {
		vocabularyReferenceCount: number;
		termReferenceCount: number;
		columnReferenceCount: number;
		totalReferenceCount: number;
		downstreamBreakCount: number;
		affectedColumnSyncCount: number;
	};
	references: ImpactReferenceSummary[];
	guidance: string[];
};
