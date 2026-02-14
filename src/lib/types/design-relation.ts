import type { DataType } from './base.js';

export type DesignRelationId =
	| 'DB_ENTITY'
	| 'DB_TABLE'
	| 'ENTITY_ATTRIBUTE'
	| 'ENTITY_TABLE'
	| 'TABLE_COLUMN'
	| 'ATTRIBUTE_COLUMN';

export type RelationSeverity = 'error' | 'warning';

export interface RelationSpec {
	id: DesignRelationId;
	name: string;
	sourceType: DataType;
	targetType: DataType;
	mappingKey: string;
	cardinality: '1:1' | '1:N' | 'N:1' | 'N:N';
	severity: RelationSeverity;
	description: string;
}

export interface RelationIssue {
	relationId: DesignRelationId;
	severity: RelationSeverity;
	sourceType: DataType;
	targetType: DataType;
	targetId: string;
	targetLabel: string;
	expectedKey: string;
	reason: string;
}

export interface RelationValidationSummary {
	relationId: DesignRelationId;
	relationName: string;
	totalChecked: number;
	matched: number;
	unmatched: number;
	severity: RelationSeverity;
	mappingKey: string;
	issues: RelationIssue[];
}

export interface DesignRelationValidationResult {
	specs: RelationSpec[];
	summaries: RelationValidationSummary[];
	totals: {
		totalChecked: number;
		matched: number;
		unmatched: number;
		errorCount: number;
		warningCount: number;
	};
}

export interface RelationSyncChange {
	targetType: 'table' | 'column';
	targetId: string;
	targetLabel: string;
	field: 'relatedEntityName' | 'schemaName' | 'tableEnglishName';
	before: string;
	after: string;
	reason: string;
}

export interface RelationSyncSuggestionCandidate {
	columnId: string;
	columnLabel: string;
	schemaName?: string;
	tableEnglishName?: string;
	relatedEntityName?: string;
}

export interface RelationSyncSuggestion {
	attributeId: string;
	attributeName: string;
	schemaName: string;
	entityName: string;
	candidates: RelationSyncSuggestionCandidate[];
}

export interface DesignRelationSyncPreview {
	counts: {
		tableCandidates: number;
		columnCandidates: number;
		totalCandidates: number;
		fieldChanges: number;
		attributeColumnSuggestions: number;
	};
	changes: RelationSyncChange[];
	suggestions: RelationSyncSuggestion[];
}
