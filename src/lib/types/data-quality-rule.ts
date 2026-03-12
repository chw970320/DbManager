export const QUALITY_RULE_SEVERITIES = ['error', 'warning', 'info'] as const;
export const QUALITY_RULE_SCOPES = ['table', 'column'] as const;
export const QUALITY_RULE_OPERATORS = ['gte', 'lte', 'eq'] as const;
export const QUALITY_RULE_METRICS = [
	'rowCount',
	'nullCount',
	'nullRatio',
	'distinctCount',
	'distinctRatio',
	'minLength',
	'maxLength'
] as const;

export type QualityRuleSeverity = (typeof QUALITY_RULE_SEVERITIES)[number];
export type QualityRuleScope = (typeof QUALITY_RULE_SCOPES)[number];
export type QualityRuleOperator = (typeof QUALITY_RULE_OPERATORS)[number];
export type QualityRuleMetric = (typeof QUALITY_RULE_METRICS)[number];

export const QUALITY_RULE_METRICS_BY_SCOPE: Record<QualityRuleScope, QualityRuleMetric[]> = {
	table: ['rowCount'],
	column: ['nullCount', 'nullRatio', 'distinctCount', 'distinctRatio', 'minLength', 'maxLength']
};

export interface QualityRuleTarget {
	schemaPattern?: string;
	tablePattern?: string;
	columnPattern?: string;
}

export interface QualityRuleEntry {
	id: string;
	name: string;
	description?: string;
	enabled: boolean;
	severity: QualityRuleSeverity;
	scope: QualityRuleScope;
	metric: QualityRuleMetric;
	operator: QualityRuleOperator;
	threshold: number;
	target: QualityRuleTarget;
	createdAt: string;
	updatedAt: string;
}

export interface QualityRuleData {
	entries: QualityRuleEntry[];
	lastUpdated: string;
	totalCount: number;
}

export interface QualityRuleInput {
	name: string;
	description?: string;
	enabled?: boolean;
	severity: QualityRuleSeverity;
	scope: QualityRuleScope;
	metric: QualityRuleMetric;
	operator: QualityRuleOperator;
	threshold: number;
	target?: QualityRuleTarget;
}

export interface QualityRuleViolation {
	ruleId: string;
	ruleName: string;
	severity: QualityRuleSeverity;
	scope: QualityRuleScope;
	target: {
		schema: string;
		table: string;
		column?: string;
	};
	metric: QualityRuleMetric;
	operator: QualityRuleOperator;
	threshold: number;
	actualValue: number;
	message: string;
}

export interface QualityRuleEvaluationSummary {
	totalRules: number;
	matchedRules: number;
	passedRules: number;
	failedRules: number;
	infoCount: number;
	warningCount: number;
	errorCount: number;
}

export interface QualityRuleEvaluationResult {
	evaluatedAt: string;
	summary: QualityRuleEvaluationSummary;
	violations: QualityRuleViolation[];
}
