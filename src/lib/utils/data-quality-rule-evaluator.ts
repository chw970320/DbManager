import type {
	DataSourceColumnProfile,
	DataSourceTableProfileResult
} from '$lib/types/data-profiling.js';
import type {
	QualityRuleEntry,
	QualityRuleEvaluationResult,
	QualityRuleMetric,
	QualityRuleOperator,
	QualityRuleViolation
} from '$lib/types/data-quality-rule.js';

function escapeForRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildPatternRegex(pattern?: string): RegExp {
	const normalized = pattern?.trim() || '*';
	const source = normalized
		.split('*')
		.map((segment) => escapeForRegex(segment))
		.join('.*');

	return new RegExp(`^${source}$`, 'i');
}

function matchesPattern(pattern: string | undefined, value: string): boolean {
	return buildPatternRegex(pattern).test(value);
}

function compareMetricValue(
	actualValue: number,
	threshold: number,
	operator: QualityRuleOperator
): boolean {
	if (operator === 'gte') {
		return actualValue >= threshold;
	}

	if (operator === 'lte') {
		return actualValue <= threshold;
	}

	return actualValue === threshold;
}

function formatOperator(operator: QualityRuleOperator): string {
	if (operator === 'gte') {
		return '이상';
	}

	if (operator === 'lte') {
		return '이하';
	}

	return '같음';
}

function getColumnMetricValue(
	column: DataSourceColumnProfile,
	metric: QualityRuleMetric
): number | undefined {
	if (metric === 'nullCount') {
		return column.nullCount;
	}

	if (metric === 'nullRatio') {
		return column.nullRatio;
	}

	if (metric === 'distinctCount') {
		return column.distinctCount;
	}

	if (metric === 'distinctRatio') {
		return column.distinctRatio;
	}

	if (metric === 'minLength') {
		return column.minLength;
	}

	if (metric === 'maxLength') {
		return column.maxLength;
	}

	return undefined;
}

function buildViolation(
	rule: QualityRuleEntry,
	profile: DataSourceTableProfileResult,
	actualValue: number,
	column?: DataSourceColumnProfile
): QualityRuleViolation {
	const targetLabel = column
		? `${profile.schema}.${profile.table}.${column.columnName}`
		: `${profile.schema}.${profile.table}`;

	return {
		ruleId: rule.id,
		ruleName: rule.name,
		severity: rule.severity,
		scope: rule.scope,
		target: {
			schema: profile.schema,
			table: profile.table,
			column: column?.columnName
		},
		metric: rule.metric,
		operator: rule.operator,
		threshold: rule.threshold,
		actualValue,
		message: `${targetLabel}의 ${rule.metric} 값 ${actualValue}이(가) 기준 ${rule.threshold} ${formatOperator(rule.operator)} 조건을 만족하지 않습니다.`
	};
}

export function evaluateQualityRules(
	profile: DataSourceTableProfileResult,
	rules: QualityRuleEntry[]
): QualityRuleEvaluationResult {
	const violations: QualityRuleViolation[] = [];
	let matchedRules = 0;
	let passedRules = 0;
	let failedRules = 0;

	for (const rule of rules) {
		if (!rule.enabled) {
			continue;
		}

		if (
			!matchesPattern(rule.target.schemaPattern, profile.schema) ||
			!matchesPattern(rule.target.tablePattern, profile.table)
		) {
			continue;
		}

		if (rule.scope === 'table') {
			matchedRules += 1;
			const actualValue = profile.rowCount;
			if (compareMetricValue(actualValue, rule.threshold, rule.operator)) {
				passedRules += 1;
			} else {
				failedRules += 1;
				violations.push(buildViolation(rule, profile, actualValue));
			}
			continue;
		}

		const matchedColumns = profile.columns.filter((column) =>
			matchesPattern(rule.target.columnPattern, column.columnName)
		);

		if (matchedColumns.length === 0) {
			continue;
		}

		matchedRules += 1;
		let hasViolation = false;

		for (const column of matchedColumns) {
			const actualValue = getColumnMetricValue(column, rule.metric);
			if (actualValue === undefined) {
				continue;
			}

			if (compareMetricValue(actualValue, rule.threshold, rule.operator)) {
				continue;
			}

			hasViolation = true;
			violations.push(buildViolation(rule, profile, actualValue, column));
		}

		if (hasViolation) {
			failedRules += 1;
		} else {
			passedRules += 1;
		}
	}

	return {
		evaluatedAt: new Date().toISOString(),
		summary: {
			totalRules: rules.filter((rule) => rule.enabled).length,
			matchedRules,
			passedRules,
			failedRules,
			infoCount: violations.filter((violation) => violation.severity === 'info').length,
			warningCount: violations.filter((violation) => violation.severity === 'warning').length,
			errorCount: violations.filter((violation) => violation.severity === 'error').length
		},
		violations
	};
}
