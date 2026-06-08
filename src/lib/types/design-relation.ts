import type { DataType } from './base.js';

export type DesignRelationRuleId =
	| 'DATABASE_ENTITY_LOGICAL_DB'
	| 'ENTITY_ATTRIBUTE_PRIMARY'
	| 'ENTITY_TABLE_MAPPING'
	| 'TABLE_COLUMN_MAPPING'
	| 'ATTRIBUTE_COLUMN_KEY'
	| 'STANDARD_REFERENCES';

/**
 * Backward-compatible exported name for callers that previously imported
 * DesignRelationId. The canonical ids now follow the deep-interview contract.
 */
export type DesignRelationId = DesignRelationRuleId;

export type RelationSeverity = 'error' | 'warning';
export type RelationCardinality = '1:1' | '1:N' | 'N:1' | 'N:N';
export type RelationAutoFixPolicy = 'single_or_selected' | 'manual_only';
export type RelationConfidence = 'high' | 'medium' | 'low';

export interface RelationSpec {
	id: DesignRelationRuleId;
	name: string;
	sourceType: DataType;
	targetType: DataType;
	mappingKey: string;
	cardinality: RelationCardinality;
	severity: RelationSeverity;
	description: string;
	autoFixPolicy: RelationAutoFixPolicy;
}

export type DesignRelationRule = RelationSpec;

export interface DesignRelationPatch {
	targetType: DataType;
	targetId: string;
	fields: Record<string, string | null>;
}

export type RelationParticipantRole = 'source' | 'target' | 'reference';

export interface RelationParticipant {
	type: DataType;
	id?: string;
	label: string;
	file?: string | null;
	role: RelationParticipantRole;
}

export type RelationResolutionMode = 'edit' | 'create' | 'auto_patch';

export interface RelationResolutionTarget {
	resolutionTargetId: string;
	targetType: DataType;
	targetId?: string;
	targetLabel: string;
	mode: RelationResolutionMode;
	file?: string | null;
	field?: string;
	candidateId?: string;
	patch?: DesignRelationPatch;
	autoFixable: boolean;
	reason: string;
	previewText: string;
	prefill?: Record<string, string | number | boolean | null>;
	route?: string;
}

export interface DesignRelationManualTarget {
	targetType: DataType;
	targetId: string;
	targetLabel: string;
	field?: string;
	file?: string | null;
	route?: string;
}

export interface DesignRelationCandidate {
	candidateId: string;
	issueId: string;
	targetType: DataType;
	targetId: string;
	targetLabel: string;
	patch: DesignRelationPatch;
	reason: string;
	confidence: RelationConfidence;
	previewText: string;
	autoFixable: boolean;
}

export interface RelationIssue {
	issueId: string;
	relationId: DesignRelationRuleId;
	relationName: string;
	severity: RelationSeverity;
	sourceType: DataType;
	targetType: DataType;
	sourceId?: string;
	sourceLabel?: string;
	targetId: string;
	targetLabel: string;
	expectedKey: string;
	actualKey?: string;
	reason: string;
	message: string;
	field?: string;
	affectedRows: DesignRelationManualTarget[];
	manualTargets: DesignRelationManualTarget[];
	candidates: DesignRelationCandidate[];
	autoFixable: boolean;
	actionGuide: string;
	participants?: RelationParticipant[];
	involvedTypes?: DataType[];
	resolutionTargets?: RelationResolutionTarget[];
}

export type DesignRelationIssue = RelationIssue;

export interface RelationValidationSummary {
	relationId: DesignRelationRuleId;
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
	rules: DesignRelationRule[];
	summaries: RelationValidationSummary[];
	issues: RelationIssue[];
	scope?: {
		scoped: boolean;
		type?: DataType;
		file?: string | null;
	};
	totals: {
		totalChecked: number;
		matched: number;
		unmatched: number;
		errorCount: number;
		warningCount: number;
		failedCount?: number;
		passedCount?: number;
		totalIssues?: number;
		autoFixableCount?: number;
	};
}

export interface DesignRelationCorrectionPreview {
	issueId: string;
	candidateId: string;
	resolutionTargetId?: string;
	patch: DesignRelationPatch;
	previewText: string;
	actionGuide: string;
}

export interface DesignRelationApplyResult {
	issueId: string;
	candidateId: string;
	applied: boolean;
	patch: DesignRelationPatch;
	updatedEntryId: string;
	validation?: DesignRelationValidationResult;
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
