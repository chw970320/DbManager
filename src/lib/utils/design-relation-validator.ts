import type { DataType } from '$lib/types/base.js';
import type {
	DesignRelationCandidate,
	DesignRelationPatch,
	DesignRelationValidationResult,
	RelationIssue,
	RelationSpec,
	RelationValidationSummary
} from '$lib/types/design-relation.js';
import type { MappingContext } from '$lib/types/erd-mapping.js';
import type {
	AttributeEntry,
	ColumnEntry,
	DatabaseEntry,
	EntityEntry,
	TableEntry
} from '$lib/types/database-design.js';
import type { TermEntry } from '$lib/types/term.js';
import type { VocabularyEntry } from '$lib/types/vocabulary.js';
import {
	buildDisplayKey,
	buildRelationKey,
	CANONICAL_DESIGN_RELATION_RULES,
	fkInfoContainsReference,
	isAffirmativeFlag,
	normalizeRelationValue,
	referenceRequiresFk,
	relationCandidateId,
	relationIssueId,
	replaceIdentifierToken,
	splitIdentifierList
} from './design-relation-canon.js';

export const DESIGN_RELATION_SPECS: RelationSpec[] = CANONICAL_DESIGN_RELATION_RULES;

type Entry = { id: string };
type PatchFields = Record<string, string | null>;
type ValidateDesignRelationsOptions = {
	includeStandardReferences?: boolean;
};

function label(entry: Entry, fields: string[]): string {
	for (const field of fields) {
		const value = (entry as unknown as Record<string, unknown>)[field];
		if (typeof value === 'string' && value.trim()) return value;
	}
	return entry.id;
}

function sorted<T extends { id: string }>(entries: T[]): T[] {
	return [...entries].sort((a, b) => a.id.localeCompare(b.id));
}

function by<T extends { id: string }>(entries: T[], keyOf: (entry: T) => string): Map<string, T[]> {
	const map = new Map<string, T[]>();
	for (const entry of entries) {
		const key = keyOf(entry);
		if (!key) continue;
		map.set(key, [...(map.get(key) ?? []), entry]);
	}
	for (const [key, values] of map) map.set(key, sorted(values));
	return map;
}

function get<T>(map: Map<string, T[]>, key: string): T[] {
	return key ? (map.get(key) ?? []) : [];
}

function summary(rule: RelationSpec): RelationValidationSummary {
	return {
		relationId: rule.id,
		relationName: rule.name,
		totalChecked: 0,
		matched: 0,
		unmatched: 0,
		severity: rule.severity,
		mappingKey: rule.mappingKey,
		issues: []
	};
}

function route(type: DataType): string {
	return `/${type}/browse`;
}

function manual(
	type: DataType,
	entry: Entry,
	fields: string[],
	field?: string
): RelationIssue['manualTargets'][number] {
	return {
		targetType: type,
		targetId: entry.id,
		targetLabel: label(entry, fields),
		field,
		route: route(type)
	};
}

function candidate(
	issueId: string,
	index: number,
	targetType: DataType,
	target: Entry,
	fields: string[],
	patchFields: PatchFields,
	reason: string,
	previewText: string,
	autoFixable = true,
	confidence: DesignRelationCandidate['confidence'] = 'medium'
): DesignRelationCandidate {
	const patch: DesignRelationPatch = { targetType, targetId: target.id, fields: patchFields };
	return {
		candidateId: relationCandidateId(issueId, targetType, target.id, index),
		issueId,
		targetType,
		targetId: target.id,
		targetLabel: label(target, fields),
		patch,
		reason,
		confidence,
		previewText,
		autoFixable
	};
}

function guide(rule: RelationSpec, candidates: DesignRelationCandidate[]): string {
	if (candidates.length === 0)
		return '자동 수정 후보가 없습니다. 수정 버튼으로 대상 정의서를 열어 수동 수정하세요.';
	if (rule.autoFixPolicy === 'manual_only')
		return '후보를 참고해 수동 수정하세요. 이 관계는 PK/FK 형식 안정성 때문에 자동 수정하지 않습니다.';
	if (!candidates.some((c) => c.autoFixable))
		return '후보는 참고용입니다. 표준/정의서 값을 함께 확인한 뒤 수동 수정하세요.';
	if (candidates.length === 1) return '단일 후보가 있어 미리보기 후 자동 수정할 수 있습니다.';
	return '후보가 여러 개입니다. 정의서/후보를 선택하면 미리보기와 조치 가이드가 해당 후보 기준으로 변경됩니다.';
}

function issue(options: {
	rule: RelationSpec;
	targetType?: DataType;
	target: Entry;
	labelFields: string[];
	expectedKey: string;
	actualKey?: string;
	reason: string;
	field?: string;
	suffix?: string;
	manualTargets?: RelationIssue['manualTargets'];
	candidates?: (issueId: string) => DesignRelationCandidate[];
}): RelationIssue {
	const targetType = options.targetType ?? options.rule.targetType;
	const issueId = relationIssueId(
		options.rule.id,
		targetType,
		options.target.id,
		options.suffix ?? options.field
	);
	const candidates = options.candidates?.(issueId) ?? [];
	const manualTargets = options.manualTargets?.length
		? options.manualTargets
		: [manual(targetType, options.target, options.labelFields, options.field)];
	return {
		issueId,
		relationId: options.rule.id,
		relationName: options.rule.name,
		severity: options.rule.severity,
		sourceType: options.rule.sourceType,
		targetType,
		targetId: options.target.id,
		targetLabel: label(options.target, options.labelFields),
		expectedKey: options.expectedKey,
		actualKey: options.actualKey,
		reason: options.reason,
		message: options.reason,
		field: options.field,
		affectedRows: manualTargets,
		manualTargets,
		candidates,
		autoFixable:
			options.rule.autoFixPolicy !== 'manual_only' && candidates.some((c) => c.autoFixable),
		actionGuide: guide(options.rule, candidates)
	};
}

function pass(s: RelationValidationSummary): void {
	s.totalChecked += 1;
	s.matched += 1;
}
function fail(s: RelationValidationSummary, i: RelationIssue): void {
	s.totalChecked += 1;
	s.unmatched += 1;
	s.issues.push(i);
}

function vocabEntries(context: MappingContext): VocabularyEntry[] {
	if (context.vocabularies?.length) return context.vocabularies;
	if (!context.vocabularyMap) return [];
	let index = 0;
	const dedup = new Map<string, VocabularyEntry>();
	for (const value of context.vocabularyMap.values()) {
		const key = `${value.standardName}|${value.abbreviation}|${value.englishName ?? ''}`;
		if (dedup.has(key)) continue;
		dedup.set(key, {
			id: `vocabulary-map-${index++}`,
			standardName: value.standardName,
			abbreviation: value.abbreviation,
			englishName: value.englishName ?? value.abbreviation,
			createdAt: '',
			updatedAt: '',
			domainCategory: value.domainCategory
		});
	}
	return [...dedup.values()];
}

function tableKoreanCandidates(
	issueId: string,
	table: TableEntry,
	vocabs: VocabularyEntry[]
): DesignRelationCandidate[] {
	const english = normalizeRelationValue(table.tableEnglishName);
	return sorted(vocabs)
		.filter(
			(v) =>
				english &&
				[v.abbreviation, v.englishName].some((x) => normalizeRelationValue(x) === english)
		)
		.map((v, index) =>
			candidate(
				issueId,
				index,
				'table',
				table as Entry,
				['tableEnglishName', 'tableKoreanName'],
				{ tableKoreanName: v.standardName },
				`단어집 '${v.standardName}/${v.abbreviation}' 기준 후보입니다.`,
				`tableKoreanName: '${table.tableKoreanName ?? ''}' → '${v.standardName}'`,
				true,
				'high'
			)
		);
}
function tableEnglishCandidates(
	issueId: string,
	table: TableEntry,
	vocabs: VocabularyEntry[]
): DesignRelationCandidate[] {
	const korean = normalizeRelationValue(table.tableKoreanName);
	return sorted(vocabs)
		.filter((v) => korean && normalizeRelationValue(v.standardName) === korean)
		.map((v, index) =>
			candidate(
				issueId,
				index,
				'table',
				table as Entry,
				['tableEnglishName', 'tableKoreanName'],
				{ tableEnglishName: v.abbreviation },
				`단어집 '${v.standardName}/${v.abbreviation}' 기준 후보입니다.`,
				`tableEnglishName: '${table.tableEnglishName ?? ''}' → '${v.abbreviation}'`,
				true,
				'high'
			)
		);
}
function columnKoreanCandidates(
	issueId: string,
	column: ColumnEntry,
	terms: TermEntry[],
	validDomains: Set<string>
): DesignRelationCandidate[] {
	const english = normalizeRelationValue(column.columnEnglishName);
	return sorted(terms)
		.filter((t) => english && normalizeRelationValue(t.columnName) === english)
		.map((t, index) => {
			const domainIsValid = validDomains.has(normalizeRelationValue(t.domainName));
			const patchFields: PatchFields = domainIsValid
				? { columnKoreanName: t.termName, domainName: t.domainName }
				: { columnKoreanName: t.termName };
			return candidate(
				issueId,
				index,
				'column',
				column as Entry,
				['columnEnglishName', 'columnKoreanName'],
				patchFields,
				domainIsValid
					? `용어집 '${t.termName}/${t.columnName}' 기준 후보입니다.`
					: `용어집 '${t.termName}/${t.columnName}' 기준 후보입니다. 용어 도메인 '${t.domainName}'은 도메인 정의서에 없어 도메인명은 수동 확인해야 합니다.`,
				domainIsValid
					? `columnKoreanName/domainName → '${t.termName}'/'${t.domainName}'`
					: `columnKoreanName: '${column.columnKoreanName ?? ''}' → '${t.termName}'. domainName은 수동 확인`,
				true,
				domainIsValid ? 'high' : 'medium'
			);
		});
}
function columnEnglishCandidates(
	issueId: string,
	column: ColumnEntry,
	terms: TermEntry[],
	validDomains: Set<string>
): DesignRelationCandidate[] {
	const korean = normalizeRelationValue(column.columnKoreanName);
	return sorted(terms)
		.filter((t) => korean && normalizeRelationValue(t.termName) === korean)
		.map((t, index) => {
			const domainIsValid = validDomains.has(normalizeRelationValue(t.domainName));
			const patchFields: PatchFields = domainIsValid
				? { columnEnglishName: t.columnName, domainName: t.domainName }
				: { columnEnglishName: t.columnName };
			return candidate(
				issueId,
				index,
				'column',
				column as Entry,
				['columnEnglishName', 'columnKoreanName'],
				patchFields,
				domainIsValid
					? `용어집 '${t.termName}/${t.columnName}' 기준 후보입니다.`
					: `용어집 '${t.termName}/${t.columnName}' 기준 후보입니다. 용어 도메인 '${t.domainName}'은 도메인 정의서에 없어 도메인명은 수동 확인해야 합니다.`,
				domainIsValid
					? `columnEnglishName/domainName → '${t.columnName}'/'${t.domainName}'`
					: `columnEnglishName: '${column.columnEnglishName ?? ''}' → '${t.columnName}'. domainName은 수동 확인`,
				true,
				domainIsValid ? 'high' : 'medium'
			);
		});
}

export function validateDesignRelations(
	context: MappingContext,
	options: ValidateDesignRelationsOptions = {}
): DesignRelationValidationResult {
	const includeStandardReferences = options.includeStandardReferences ?? true;
	const rules = DESIGN_RELATION_SPECS.filter(
		(rule) => includeStandardReferences || rule.id !== 'STANDARD_REFERENCES'
	);
	const rule = new Map(rules.map((r) => [r.id, r]));
	const sm = new Map(rules.map((r) => [r.id, summary(r)]));
	const databases = context.databases ?? [];
	const entities = context.entities ?? [];
	const attributes = context.attributes ?? [];
	const tables = context.tables ?? [];
	const columns = context.columns ?? [];
	const terms = context.terms ?? [];
	const vocabs = vocabEntries(context);

	const dbByLogical = by(databases, (d) => normalizeRelationValue(d.logicalDbName));
	const attrByFull = by(attributes, (a) =>
		buildRelationKey([a.schemaName, a.entityName, a.attributeName])
	);
	const attrByEntity = by(attributes, (a) => buildRelationKey([a.schemaName, a.entityName]));
	const entityByTable = by(entities, (e) =>
		buildRelationKey([e.schemaName, e.tableKoreanName, e.entityName])
	);
	const entityBySchemaKorean = by(entities, (e) =>
		buildRelationKey([e.schemaName, e.tableKoreanName])
	);
	const entityBySchema = by(entities, (e) => buildRelationKey([e.schemaName]));
	const tableByFull = by(tables, (t) =>
		buildRelationKey([t.subjectArea, t.schemaName, t.tableEnglishName, t.relatedEntityName])
	);
	const tableBySchemaEnglish = by(tables, (t) =>
		buildRelationKey([t.schemaName, t.tableEnglishName])
	);
	const tableByEntity = by(tables, (t) => buildRelationKey([t.relatedEntityName]));
	const columnByAttr = by(columns, (c) =>
		buildRelationKey([c.schemaName, c.relatedEntityName, c.columnKoreanName])
	);
	const columnByKorean = by(columns, (c) => normalizeRelationValue(c.columnKoreanName));
	const vocabByStandard = by(vocabs, (v) => normalizeRelationValue(v.standardName));
	const vocabByEnglish = by(
		vocabs.flatMap((v) => [
			{ ...v, key: v.abbreviation },
			{ ...v, key: v.englishName }
		]),
		(v) => normalizeRelationValue(v.key)
	);
	const termByName = by(terms, (t) => normalizeRelationValue(t.termName));
	const termByColumn = by(terms, (t) => normalizeRelationValue(t.columnName));
	const validDomains = new Set(
		(context.domains ?? []).map((d) => normalizeRelationValue(d.standardDomainName)).filter(Boolean)
	);

	{
		const r = rule.get('DATABASE_ENTITY_LOGICAL_DB')!;
		const s = sm.get(r.id)!;
		for (const e of entities) {
			const key = normalizeRelationValue(e.logicalDbName);
			if (!key) continue;
			if (get(dbByLogical, key).length) pass(s);
			else
				fail(
					s,
					issue({
						rule: r,
						target: e as Entry,
						labelFields: ['entityName', 'tableKoreanName'],
						expectedKey: e.logicalDbName ?? '',
						actualKey: '미매칭',
						field: 'logicalDbName',
						reason: '엔터티의 논리DB명이 데이터베이스 정의서에 없습니다.',
						candidates: (id) =>
							sorted(databases)
								.filter((d) => normalizeRelationValue(d.logicalDbName))
								.map((d, i) =>
									candidate(
										id,
										i,
										'entity',
										e as Entry,
										['entityName', 'tableKoreanName'],
										{ logicalDbName: d.logicalDbName ?? null },
										`데이터베이스 '${d.logicalDbName}' 기준 후보입니다.`,
										`logicalDbName: '${e.logicalDbName ?? ''}' → '${d.logicalDbName ?? ''}'`
									)
								)
					})
				);
		}
	}

	{
		const r = rule.get('ENTITY_ATTRIBUTE_PRIMARY')!;
		const s = sm.get(r.id)!;
		for (const e of entities) {
			const tokens = splitIdentifierList(e.primaryIdentifier);
			const sameEntityAttrs = get(attrByEntity, buildRelationKey([e.schemaName, e.entityName]));
			for (const token of tokens) {
				const key = buildRelationKey([e.schemaName, e.entityName, token]);
				if (get(attrByFull, key).length) pass(s);
				else
					fail(
						s,
						issue({
							rule: r,
							targetType: 'entity',
							target: e as Entry,
							labelFields: ['entityName', 'tableKoreanName'],
							expectedKey: buildDisplayKey([e.schemaName, e.entityName, token]),
							actualKey: '미매칭',
							field: 'primaryIdentifier',
							suffix: token,
							reason: `엔터티 주식별자 '${token}'에 대응하는 속성이 없습니다.`,
							candidates: (id) =>
								sorted(sameEntityAttrs)
									.filter((a) => normalizeRelationValue(a.attributeName))
									.map((a, i) =>
										candidate(
											id,
											i,
											'entity',
											e as Entry,
											['entityName', 'tableKoreanName'],
											{
												primaryIdentifier: replaceIdentifierToken(
													e.primaryIdentifier,
													token,
													a.attributeName ?? ''
												)
											},
											`속성 '${a.attributeName}' 기준 후보입니다.`,
											`primaryIdentifier: '${e.primaryIdentifier ?? ''}' → '${replaceIdentifierToken(e.primaryIdentifier, token, a.attributeName ?? '')}'`,
											true,
											sameEntityAttrs.length === 1 ? 'high' : 'medium'
										)
									)
						})
					);
			}
		}
	}

	{
		const r = rule.get('ENTITY_TABLE_MAPPING')!;
		const s = sm.get(r.id)!;
		for (const t of tables) {
			const key = buildRelationKey([t.schemaName, t.tableKoreanName, t.relatedEntityName]);
			if (!key) continue;
			if (get(entityByTable, key).length) pass(s);
			else {
				let cs = get(entityBySchemaKorean, buildRelationKey([t.schemaName, t.tableKoreanName]));
				if (!cs.length) cs = get(entityBySchema, buildRelationKey([t.schemaName]));
				fail(
					s,
					issue({
						rule: r,
						target: t as Entry,
						labelFields: ['tableEnglishName', 'tableKoreanName'],
						expectedKey: buildDisplayKey([t.schemaName, t.tableKoreanName, t.relatedEntityName]),
						actualKey: '미매칭',
						field: 'relatedEntityName',
						reason:
							'테이블의 스키마/테이블한글명/관련엔터티명이 엔터티 정의서와 일치하지 않습니다.',
						candidates: (id) =>
							sorted(cs)
								.filter((e) => normalizeRelationValue(e.entityName))
								.map((e, i) =>
									candidate(
										id,
										i,
										'table',
										t as Entry,
										['tableEnglishName', 'tableKoreanName'],
										{
											schemaName: e.schemaName ?? null,
											tableKoreanName: e.tableKoreanName ?? null,
											relatedEntityName: e.entityName ?? null
										},
										`엔터티 '${label(e as Entry, ['entityName', 'tableKoreanName'])}' 기준 후보입니다.`,
										`relatedEntityName: '${t.relatedEntityName ?? ''}' → '${e.entityName ?? ''}'`,
										true,
										normalizeRelationValue(t.tableKoreanName) ===
											normalizeRelationValue(e.tableKoreanName)
											? 'high'
											: 'medium'
									)
								)
					})
				);
			}
		}
	}

	{
		const r = rule.get('TABLE_COLUMN_MAPPING')!;
		const s = sm.get(r.id)!;
		for (const c of columns) {
			const key = buildRelationKey([
				c.subjectArea,
				c.schemaName,
				c.tableEnglishName,
				c.relatedEntityName
			]);
			if (!key) continue;
			if (get(tableByFull, key).length) pass(s);
			else {
				let cs = get(tableBySchemaEnglish, buildRelationKey([c.schemaName, c.tableEnglishName]));
				if (!cs.length) cs = get(tableByEntity, buildRelationKey([c.relatedEntityName]));
				fail(
					s,
					issue({
						rule: r,
						target: c as Entry,
						labelFields: ['columnEnglishName', 'columnKoreanName'],
						expectedKey: buildDisplayKey([
							c.subjectArea,
							c.schemaName,
							c.tableEnglishName,
							c.relatedEntityName
						]),
						actualKey: '미매칭',
						field: 'tableEnglishName',
						reason:
							'컬럼의 주제영역/스키마/테이블영문명/연관엔터티명이 테이블 정의서와 일치하지 않습니다.',
						candidates: (id) =>
							sorted(cs).map((t, i) =>
								candidate(
									id,
									i,
									'column',
									c as Entry,
									['columnEnglishName', 'columnKoreanName'],
									{
										subjectArea: t.subjectArea ?? null,
										schemaName: t.schemaName ?? null,
										tableEnglishName: t.tableEnglishName ?? null,
										relatedEntityName: t.relatedEntityName ?? null
									},
									`테이블 '${label(t as Entry, ['tableEnglishName', 'tableKoreanName'])}' 기준 후보입니다.`,
									`tableEnglishName/relatedEntityName → '${t.tableEnglishName ?? ''}'/'${t.relatedEntityName ?? ''}'`,
									true,
									normalizeRelationValue(c.tableEnglishName) ===
										normalizeRelationValue(t.tableEnglishName)
										? 'high'
										: 'medium'
								)
							)
					})
				);
			}
		}
	}

	{
		const r = rule.get('ATTRIBUTE_COLUMN_KEY')!;
		const s = sm.get(r.id)!;
		for (const a of attributes) {
			const key = buildRelationKey([a.schemaName, a.entityName, a.attributeName]);
			if (!key) continue;
			const cols = get(columnByAttr, key);
			const loose = get(columnByKorean, normalizeRelationValue(a.attributeName));
			const manualCandidates = (id: string, rows: ColumnEntry[], field: string) =>
				sorted(rows).map((c, i) =>
					candidate(
						id,
						i,
						'column',
						c as Entry,
						['columnEnglishName', 'columnKoreanName'],
						{},
						`속성 '${a.attributeName}'과 연결 가능한 컬럼 후보입니다.`,
						`컬럼 '${label(c as Entry, ['columnEnglishName', 'columnKoreanName'])}'의 ${field} 값을 수동 확인하세요.`,
						false,
						'low'
					)
				);
			if (!cols.length) {
				fail(
					s,
					issue({
						rule: r,
						targetType: 'attribute',
						target: a as Entry,
						labelFields: ['attributeName'],
						expectedKey: buildDisplayKey([a.schemaName, a.entityName, a.attributeName]),
						actualKey: '컬럼 미매칭',
						field: 'attributeName',
						reason: '속성명과 엔터티 기준으로 연결되는 컬럼을 찾지 못했습니다.',
						candidates: (id) => manualCandidates(id, loose, 'columnKoreanName')
					})
				);
				continue;
			}
			const pkExpected = isAffirmativeFlag(a.requiredInput);
			if (!pkExpected || cols.some((c) => isAffirmativeFlag(c.pkInfo))) pass(s);
			else
				fail(
					s,
					issue({
						rule: r,
						targetType: 'attribute',
						target: a as Entry,
						labelFields: ['attributeName'],
						expectedKey: `requiredInput=${a.requiredInput}; pkInfo=Y`,
						actualKey: cols.map((c) => c.pkInfo || '').join(', '),
						field: 'pkInfo',
						reason: '필수입력 속성에 대응하는 컬럼 PK정보를 확인해야 합니다.',
						candidates: (id) => manualCandidates(id, cols, 'pkInfo')
					})
				);
			if (!referenceRequiresFk(a.refEntityName, a.refAttributeName)) continue;
			if (cols.some((c) => fkInfoContainsReference(c.fkInfo, a.refEntityName, a.refAttributeName)))
				pass(s);
			else
				fail(
					s,
					issue({
						rule: r,
						targetType: 'attribute',
						target: a as Entry,
						labelFields: ['attributeName'],
						expectedKey: buildDisplayKey([a.refEntityName, a.refAttributeName]),
						actualKey: cols.map((c) => c.fkInfo || '').join(', '),
						field: 'fkInfo',
						reason: '참조 엔터티/속성 정보에 대응하는 컬럼 FK정보를 확인해야 합니다.',
						candidates: (id) => manualCandidates(id, cols, 'fkInfo')
					})
				);
		}
	}

	if (includeStandardReferences) {
		const r = rule.get('STANDARD_REFERENCES')!;
		const s = sm.get(r.id)!;
		for (const t of tables) {
			const korean = normalizeRelationValue(t.tableKoreanName);
			if (korean) {
				if (get(vocabByStandard, korean).length) pass(s);
				else
					fail(
						s,
						issue({
							rule: r,
							targetType: 'table',
							target: t as Entry,
							labelFields: ['tableEnglishName', 'tableKoreanName'],
							expectedKey: t.tableKoreanName ?? '',
							actualKey: '단어집 표준단어명 미매칭',
							field: 'tableKoreanName',
							suffix: 'tableKoreanName',
							reason: '테이블한글명이 단어집 표준단어명에 없습니다.',
							candidates: (id) => tableKoreanCandidates(id, t, vocabs)
						})
					);
			}
			const english = normalizeRelationValue(t.tableEnglishName);
			if (english) {
				if (get(vocabByEnglish, english).length) pass(s);
				else
					fail(
						s,
						issue({
							rule: r,
							targetType: 'table',
							target: t as Entry,
							labelFields: ['tableEnglishName', 'tableKoreanName'],
							expectedKey: t.tableEnglishName ?? '',
							actualKey: '단어집 영문약어/영문명 미매칭',
							field: 'tableEnglishName',
							suffix: 'tableEnglishName',
							reason: '테이블영문명이 단어집 영문약어 또는 영문명에 없습니다.',
							candidates: (id) => tableEnglishCandidates(id, t, vocabs)
						})
					);
			}
		}
		for (const c of columns) {
			const korean = normalizeRelationValue(c.columnKoreanName);
			const english = normalizeRelationValue(c.columnEnglishName);
			const termsByName = korean ? get(termByName, korean) : [];
			const termsByCol = english ? get(termByColumn, english) : [];
			if (korean) {
				if (termsByName.length) pass(s);
				else
					fail(
						s,
						issue({
							rule: r,
							targetType: 'column',
							target: c as Entry,
							labelFields: ['columnEnglishName', 'columnKoreanName'],
							expectedKey: c.columnKoreanName ?? '',
							actualKey: '용어집 용어명 미매칭',
							field: 'columnKoreanName',
							suffix: 'columnKoreanName',
							reason: '컬럼한글명이 용어집 용어명에 없습니다.',
							candidates: (id) => columnKoreanCandidates(id, c, terms, validDomains)
						})
					);
			}
			if (english) {
				if (termsByCol.length) pass(s);
				else
					fail(
						s,
						issue({
							rule: r,
							targetType: 'column',
							target: c as Entry,
							labelFields: ['columnEnglishName', 'columnKoreanName'],
							expectedKey: c.columnEnglishName ?? '',
							actualKey: '용어집 컬럼명 미매칭',
							field: 'columnEnglishName',
							suffix: 'columnEnglishName',
							reason: '컬럼영문명이 용어집 컬럼명에 없습니다.',
							candidates: (id) => columnEnglishCandidates(id, c, terms, validDomains)
						})
					);
			}
			const term =
				termsByName.length === 1
					? termsByName[0]
					: termsByCol.length === 1
						? termsByCol[0]
						: undefined;
			if (!term?.domainName) continue;
			const termDomainKey = normalizeRelationValue(term.domainName);
			const termDomainIsValid = validDomains.has(termDomainKey);
			if (normalizeRelationValue(c.domainName) === termDomainKey && termDomainIsValid) pass(s);
			else
				fail(
					s,
					issue({
						rule: r,
						targetType: 'column',
						target: c as Entry,
						labelFields: ['columnEnglishName', 'columnKoreanName'],
						expectedKey: term.domainName,
						actualKey: c.domainName ?? '',
						field: 'domainName',
						suffix: 'domainName',
						reason: termDomainIsValid
							? '매칭된 용어의 도메인명이 컬럼 정의서의 도메인명과 다릅니다.'
							: '매칭된 용어의 도메인명이 도메인 정의서에 없습니다. 용어/도메인/컬럼 정의서를 함께 확인해야 합니다.',
						candidates: (id) => [
							candidate(
								id,
								0,
								'column',
								c as Entry,
								['columnEnglishName', 'columnKoreanName'],
								termDomainIsValid ? { domainName: term.domainName } : {},
								termDomainIsValid
									? `매칭된 용어 '${term.termName}'의 도메인명 기준 후보입니다.`
									: `용어 '${term.termName}'의 도메인명 '${term.domainName}'이 도메인 정의서에 없어 수동 확인해야 합니다.`,
								termDomainIsValid
									? `domainName: '${c.domainName ?? ''}' → '${term.domainName}'`
									: `domainName '${c.domainName ?? ''}'와 용어 도메인 '${term.domainName}' 및 도메인 정의서를 함께 확인하세요.`,
								termDomainIsValid,
								termDomainIsValid ? 'high' : 'low'
							)
						]
					})
				);
		}
	}

	const summaries = rules.map((r) => sm.get(r.id)!);
	const issues = summaries.flatMap((x) => x.issues);
	const base = summaries.reduce(
		(acc, x) => {
			acc.totalChecked += x.totalChecked;
			acc.matched += x.matched;
			acc.unmatched += x.unmatched;
			if (x.severity === 'error') acc.errorCount += x.unmatched;
			else acc.warningCount += x.unmatched;
			return acc;
		},
		{ totalChecked: 0, matched: 0, unmatched: 0, errorCount: 0, warningCount: 0 }
	);
	return {
		specs: rules,
		rules,
		summaries,
		issues,
		totals: {
			...base,
			failedCount: base.unmatched,
			passedCount: base.matched,
			totalIssues: issues.length,
			autoFixableCount: issues.filter((i) => i.autoFixable).length
		}
	};
}
