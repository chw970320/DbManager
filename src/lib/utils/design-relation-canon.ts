import type { DataType } from '$lib/types/base.js';
import type { DesignRelationRuleId, RelationSpec } from '$lib/types/design-relation.js';
import { buildCompositeKey, normalizeKey } from './mapping-key.js';

const EMPTY_LIKE_VALUES = new Set([
	'-',
	'—',
	'–',
	'없음',
	'해당없음',
	'n/a',
	'na',
	'null',
	'undefined'
]);

export const CANONICAL_DESIGN_RELATION_RULES: RelationSpec[] = [
	{
		id: 'DATABASE_ENTITY_LOGICAL_DB',
		name: '데이터베이스 논리DB명 ↔ 엔터티 논리DB명',
		sourceType: 'database',
		targetType: 'entity',
		mappingKey: 'Database.logicalDbName = Entity.logicalDbName',
		cardinality: '1:N',
		severity: 'error',
		description: '엔터티의 논리DB명은 데이터베이스 정의서의 논리DB명에 존재해야 합니다.',
		autoFixPolicy: 'single_or_selected'
	},
	{
		id: 'ENTITY_ATTRIBUTE_PRIMARY',
		name: '엔터티 주식별자 ↔ 속성 PK 속성명',
		sourceType: 'entity',
		targetType: 'attribute',
		mappingKey:
			'Entity.schemaName + entityName + primaryIdentifier = Attribute.schemaName + entityName + attributeName',
		cardinality: '1:N',
		severity: 'error',
		description: '엔터티의 주식별자는 같은 스키마/엔터티의 속성명으로 존재해야 합니다.',
		autoFixPolicy: 'single_or_selected'
	},
	{
		id: 'ENTITY_TABLE_MAPPING',
		name: '엔터티 테이블한글명/엔터티명 ↔ 테이블 관련엔터티명',
		sourceType: 'entity',
		targetType: 'table',
		mappingKey:
			'Entity.schemaName + tableKoreanName + entityName = Table.schemaName + tableKoreanName + relatedEntityName',
		cardinality: '1:1',
		severity: 'error',
		description: '테이블의 스키마/테이블한글명/관련엔터티명은 엔터티 정의서와 일치해야 합니다.',
		autoFixPolicy: 'single_or_selected'
	},
	{
		id: 'TABLE_COLUMN_MAPPING',
		name: '테이블 주제영역/스키마/영문명/엔터티 ↔ 컬럼',
		sourceType: 'table',
		targetType: 'column',
		mappingKey:
			'Table.subjectArea + schemaName + tableEnglishName + relatedEntityName = Column.subjectArea + schemaName + tableEnglishName + relatedEntityName',
		cardinality: '1:N',
		severity: 'error',
		description:
			'컬럼의 주제영역/스키마/테이블영문명/연관엔터티명은 테이블 정의서와 일치해야 합니다.',
		autoFixPolicy: 'single_or_selected'
	},
	{
		id: 'ATTRIBUTE_COLUMN_KEY',
		name: '속성 필수/참조 정보 ↔ 컬럼 PK/FK 정보',
		sourceType: 'attribute',
		targetType: 'column',
		mappingKey:
			'Attribute.attributeName + requiredInput + refEntityName/refAttributeName = Column.columnKoreanName + pkInfo + fkInfo',
		cardinality: '1:1',
		severity: 'warning',
		description:
			'속성명, 필수입력여부, 참조 속성 정보가 컬럼 한글명, PK정보, FK정보와 일관되어야 합니다.',
		autoFixPolicy: 'manual_only'
	},
	{
		id: 'STANDARD_REFERENCES',
		name: '테이블/컬럼 표준 단어·용어·도메인 참조',
		sourceType: 'vocabulary',
		targetType: 'column',
		mappingKey:
			'Table names -> Vocabulary, Column names -> Term, Term.domainName = Column.domainName',
		cardinality: 'N:1',
		severity: 'warning',
		description:
			'테이블 한글/영문명은 단어집에, 컬럼 한글/영문명은 용어집에 있고 용어 도메인은 컬럼 도메인과 일치해야 합니다.',
		autoFixPolicy: 'single_or_selected'
	}
];

export function normalizeRelationValue(value: string | number | undefined | null): string {
	const normalized = normalizeKey(value, { emptyLikeDash: true });
	if (!normalized) return '';
	return EMPTY_LIKE_VALUES.has(normalized) ? '' : normalized;
}

export function buildRelationKey(parts: Array<string | number | undefined | null>): string {
	const normalized = parts.map((part) => normalizeRelationValue(part));
	if (normalized.some((part) => part === '')) return '';
	return normalized.join('|');
}

export function buildDisplayKey(parts: Array<string | number | undefined | null>): string {
	return parts.map((part) => String(part ?? '').trim()).join('.');
}

export function splitIdentifierList(value: string | undefined | null): string[] {
	if (!value) return [];
	return value
		.split(/[,+/;|\n\r]+/)
		.map((part) => part.trim())
		.filter((part) => normalizeRelationValue(part) !== '');
}

const AFFIRMATIVE_VALUES = new Set([
	'y',
	'yes',
	'true',
	'1',
	'예',
	'필수',
	'pk',
	'primary',
	'primary key',
	'기본키'
]);

export function isAffirmativeFlag(value: string | undefined | null): boolean {
	const normalized = normalizeRelationValue(value);
	if (!normalized) return false;
	if (AFFIRMATIVE_VALUES.has(normalized)) return true;
	return /\bpk\b|primary\s*key|기본키/.test(normalized);
}

export function referenceRequiresFk(
	refEntityName: string | undefined | null,
	refAttributeName: string | undefined | null
): boolean {
	return (
		normalizeRelationValue(refEntityName) !== '' || normalizeRelationValue(refAttributeName) !== ''
	);
}

export function fkInfoContainsReference(
	fkInfo: string | undefined | null,
	refEntityName: string | undefined | null,
	refAttributeName: string | undefined | null
): boolean {
	if (!referenceRequiresFk(refEntityName, refAttributeName)) return true;
	const normalizedFk = normalizeRelationValue(fkInfo);
	if (!normalizedFk) return false;
	const entity = normalizeRelationValue(refEntityName);
	const attribute = normalizeRelationValue(refAttributeName);
	return (
		(!entity || normalizedFk.includes(entity)) && (!attribute || normalizedFk.includes(attribute))
	);
}

export function relationIssueId(
	relationId: DesignRelationRuleId,
	targetType: DataType,
	targetId: string,
	suffix?: string
): string {
	return [relationId, targetType, targetId, suffix]
		.filter((part): part is string => Boolean(part))
		.map((part) =>
			part
				.toLowerCase()
				.replace(/[^a-z0-9가-힣]+/g, '-')
				.replace(/^-+|-+$/g, '')
		)
		.join(':');
}

export function relationCandidateId(
	issueId: string,
	targetType: DataType,
	targetId: string,
	index: number
): string {
	const suffix = `${targetType}-${targetId}-${index + 1}`
		.toLowerCase()
		.replace(/[^a-z0-9가-힣]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return `${issueId}:candidate:${suffix}`;
}

export function replaceIdentifierToken(
	currentValue: string | undefined | null,
	missingToken: string,
	replacement: string
): string {
	const currentTokens = splitIdentifierList(currentValue);
	if (currentTokens.length === 0) return replacement;
	const missingKey = normalizeRelationValue(missingToken);
	return currentTokens
		.map((token) => (normalizeRelationValue(token) === missingKey ? replacement : token))
		.join(', ');
}

export function isSameRelationKey(
	left: string | undefined | null,
	right: string | undefined | null
): boolean {
	return normalizeRelationValue(left) === normalizeRelationValue(right);
}

export { buildCompositeKey };
