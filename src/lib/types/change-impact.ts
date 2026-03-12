import type { DataType } from './base.js';
import type { DomainEntry } from './domain.js';
import type { TermEntry } from './term.js';

export type ImpactReferenceSummary = {
	type: DataType;
	filename: string;
	count: number;
	entries: Array<{
		id: string;
		name: string;
	}>;
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
	current: Pick<DomainEntry, 'id' | 'domainCategory' | 'standardDomainName' | 'physicalDataType' | 'dataLength' | 'decimalPlaces'> | null;
	proposed: Pick<DomainEntry, 'id' | 'domainCategory' | 'standardDomainName' | 'physicalDataType' | 'dataLength' | 'decimalPlaces'> | null;
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
