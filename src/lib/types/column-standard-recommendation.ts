import type { ColumnEntry } from './database-design.js';
import type { DomainEntry } from './domain.js';
import type { TermEntry } from './term.js';

export type ColumnStandardRecommendationField =
	| 'columnKoreanName'
	| 'domainName'
	| 'dataType'
	| 'dataLength'
	| 'dataDecimalLength';

export type ColumnStandardRecommendationStatus = 'aligned' | 'recommended' | 'unmatched';

export type ColumnStandardRecommendationIssueCode =
	| 'COLUMN_NAME_EMPTY'
	| 'TERM_NOT_FOUND'
	| 'TERM_DOMAIN_EMPTY'
	| 'DOMAIN_NOT_FOUND';

export type ColumnStandardRecommendationIssue = {
	code: ColumnStandardRecommendationIssueCode;
	severity: 'error' | 'warning';
	message: string;
};

export type ColumnStandardRecommendationChange = {
	field: ColumnStandardRecommendationField;
	currentValue: string;
	recommendedValue: string;
	reason: string;
};

export type ColumnStandardRecommendationCore = {
	entry: Pick<
		ColumnEntry,
		| 'columnEnglishName'
		| 'columnKoreanName'
		| 'domainName'
		| 'dataType'
		| 'dataLength'
		| 'dataDecimalLength'
	>;
	matchedTerm: Pick<TermEntry, 'id' | 'termName' | 'columnName' | 'domainName'> | null;
	matchedDomain: Pick<
		DomainEntry,
		'id' | 'standardDomainName' | 'physicalDataType' | 'dataLength' | 'decimalPlaces'
	> | null;
	recommendedValues: Partial<
		Pick<
			ColumnEntry,
			| 'columnKoreanName'
			| 'domainName'
			| 'dataType'
			| 'dataLength'
			| 'dataDecimalLength'
		>
	>;
	changes: ColumnStandardRecommendationChange[];
	issues: ColumnStandardRecommendationIssue[];
	guidance: string[];
	summary: {
		status: ColumnStandardRecommendationStatus;
		changeCount: number;
		issueCount: number;
		exactTermMatch: boolean;
		domainResolved: boolean;
	};
};

export type ColumnStandardRecommendationPreview = ColumnStandardRecommendationCore & {
	files: {
		column: string;
		term: string;
		domain: string;
	};
};
