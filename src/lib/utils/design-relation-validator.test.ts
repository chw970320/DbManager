import { describe, expect, it } from 'vitest';
import { DESIGN_RELATION_SPECS, validateDesignRelations } from './design-relation-validator.js';
import { buildDisplayKey, buildRelationKey } from './design-relation-canon.js';
import type { MappingContext } from '$lib/types/erd-mapping.js';

const ts = '2026-01-01T00:00:00.000Z';

function context(): MappingContext {
	return {
		databases: [
			{
				id: 'db-1',
				organizationName: '기관',
				departmentName: '부서',
				appliedTask: '업무',
				relatedLaw: '법령',
				buildDate: '2026-01-01',
				osInfo: 'Linux',
				exclusionReason: '-',
				logicalDbName: 'LDB_MAIN',
				physicalDbName: 'PDB_MAIN',
				createdAt: ts,
				updatedAt: ts
			}
		],
		entities: [
			{
				id: 'entity-user',
				logicalDbName: 'LDB_MAIN',
				schemaName: 'BKSP',
				entityName: '사용자',
				primaryIdentifier: '사용자ID',
				tableKoreanName: '사용자',
				createdAt: ts,
				updatedAt: ts
			}
		],
		attributes: [
			{
				id: 'attr-user-id',
				requiredInput: 'Y',
				refEntityName: '-',
				schemaName: 'BKSP',
				entityName: '사용자',
				attributeName: '사용자ID',
				createdAt: ts,
				updatedAt: ts
			},
			{
				id: 'attr-user-name',
				requiredInput: 'N',
				refEntityName: '-',
				schemaName: 'BKSP',
				entityName: '사용자',
				attributeName: '이름',
				createdAt: ts,
				updatedAt: ts
			}
		],
		tables: [
			{
				id: 'table-user',
				businessClassification: '업무',
				tableVolume: '1',
				nonPublicReason: '-',
				openDataList: '-',
				subjectArea: '공통',
				schemaName: 'BKSP',
				tableEnglishName: 'USER',
				tableKoreanName: '사용자',
				relatedEntityName: '사용자',
				createdAt: ts,
				updatedAt: ts
			}
		],
		columns: [
			{
				id: 'col-user-id',
				dataLength: '20',
				dataDecimalLength: '0',
				dataFormat: '-',
				pkInfo: 'Y',
				indexName: '',
				indexOrder: '',
				akInfo: '',
				constraint: '',
				subjectArea: '공통',
				schemaName: 'BKSP',
				tableEnglishName: 'USER',
				columnEnglishName: 'USER_ID',
				columnKoreanName: '사용자ID',
				relatedEntityName: '사용자',
				domainName: 'ID',
				createdAt: ts,
				updatedAt: ts
			},
			{
				id: 'col-user-name',
				dataLength: '100',
				dataDecimalLength: '0',
				dataFormat: '-',
				pkInfo: '',
				indexName: '',
				indexOrder: '',
				akInfo: '',
				constraint: '',
				subjectArea: '공통',
				schemaName: 'BKSP',
				tableEnglishName: 'USER',
				columnEnglishName: 'USER_NM',
				columnKoreanName: '이름',
				relatedEntityName: '사용자',
				domainName: 'NAME',
				createdAt: ts,
				updatedAt: ts
			}
		],
		domains: [
			{
				id: 'domain-id',
				domainGroup: '공통',
				domainCategory: 'ID',
				standardDomainName: 'ID',
				physicalDataType: 'varchar',
				createdAt: ts,
				updatedAt: ts
			},
			{
				id: 'domain-name',
				domainGroup: '공통',
				domainCategory: 'NAME',
				standardDomainName: 'NAME',
				physicalDataType: 'varchar',
				createdAt: ts,
				updatedAt: ts
			}
		],
		vocabularies: [
			{
				id: 'v-user',
				standardName: '사용자',
				abbreviation: 'USR',
				englishName: 'USER',
				createdAt: ts,
				updatedAt: ts
			}
		],
		terms: [
			{
				id: 'term-user-id',
				termName: '사용자ID',
				columnName: 'USER_ID',
				domainName: 'ID',
				isMappedTerm: true,
				isMappedColumn: true,
				isMappedDomain: true,
				createdAt: ts,
				updatedAt: ts
			},
			{
				id: 'term-user-name',
				termName: '이름',
				columnName: 'USER_NM',
				domainName: 'NAME',
				isMappedTerm: true,
				isMappedColumn: true,
				isMappedDomain: true,
				createdAt: ts,
				updatedAt: ts
			}
		]
	};
}

function summaryById(result = validateDesignRelations(context())) {
	return new Map(result.summaries.map((s) => [s.relationId, s]));
}

describe('design-relation-validator canonical relation contract', () => {
	it('keeps internal relation keys separate from display keys', () => {
		expect(buildRelationKey([' BKSP ', '사용자', '사용자ID'])).toBe('bksp|사용자|사용자id');
		expect(buildDisplayKey([' BKSP ', '사용자', '사용자ID'])).toBe('BKSP.사용자.사용자ID');
	});

	it('uses the six canonical rule ids and drops legacy physical DB_TABLE success', () => {
		expect(DESIGN_RELATION_SPECS.map((s) => s.id)).toEqual([
			'DATABASE_ENTITY_LOGICAL_DB',
			'ENTITY_ATTRIBUTE_PRIMARY',
			'ENTITY_TABLE_MAPPING',
			'TABLE_COLUMN_MAPPING',
			'ATTRIBUTE_COLUMN_KEY',
			'STANDARD_REFERENCES'
		]);
		const ids: string[] = DESIGN_RELATION_SPECS.map((s) => s.id);
		expect(ids.includes('DB_TABLE')).toBe(false);
	});

	it('passes coherent database/entity/attribute/table/column and standard-reference data', () => {
		const result = validateDesignRelations(context());
		expect(result.specs).toHaveLength(6);
		expect(result.rules).toHaveLength(6);
		expect(result.issues).toHaveLength(0);
		expect(result.totals.unmatched).toBe(0);
		expect(result.totals.matched).toBeGreaterThan(0);

		const byId = summaryById(result);
		expect(byId.get('DATABASE_ENTITY_LOGICAL_DB')).toMatchObject({ matched: 1, unmatched: 0 });
		expect(byId.get('ENTITY_ATTRIBUTE_PRIMARY')).toMatchObject({ matched: 1, unmatched: 0 });
		expect(byId.get('ENTITY_TABLE_MAPPING')).toMatchObject({ matched: 1, unmatched: 0 });
		expect(byId.get('TABLE_COLUMN_MAPPING')).toMatchObject({ matched: 2, unmatched: 0 });
	});

	it('emits deterministic no/single/multiple candidate states', () => {
		const noCandidate = context();
		noCandidate.databases = [];
		noCandidate.entities[0] = { ...noCandidate.entities[0], logicalDbName: 'LDB_MISSING' };
		const noCandidateIssue = validateDesignRelations(noCandidate).issues.find(
			(i) => i.relationId === 'DATABASE_ENTITY_LOGICAL_DB'
		);
		expect(noCandidateIssue?.candidates).toEqual([]);
		expect(noCandidateIssue?.autoFixable).toBe(false);

		const singleCandidate = context();
		singleCandidate.entities[0] = { ...singleCandidate.entities[0], logicalDbName: 'LDB_MISSING' };
		const singleIssue = validateDesignRelations(singleCandidate).issues.find(
			(i) => i.relationId === 'DATABASE_ENTITY_LOGICAL_DB'
		);
		expect(singleIssue?.candidates).toHaveLength(1);
		expect(singleIssue?.candidates[0]?.patch).toMatchObject({
			targetType: 'entity',
			fields: { logicalDbName: 'LDB_MAIN' }
		});
		expect(singleIssue?.autoFixable).toBe(true);

		const multipleCandidate = context();
		multipleCandidate.entities[0] = {
			...multipleCandidate.entities[0],
			primaryIdentifier: '없는ID'
		};
		const multiIssue = validateDesignRelations(multipleCandidate).issues.find(
			(i) => i.relationId === 'ENTITY_ATTRIBUTE_PRIMARY'
		);
		expect(multiIssue?.candidates).toHaveLength(2);
		expect(multiIssue?.actionGuide).toContain('후보가 여러 개');
		expect(
			validateDesignRelations(multipleCandidate)
				.issues.find((i) => i.issueId === multiIssue?.issueId)
				?.candidates.map((c) => c.candidateId)
		).toEqual(multiIssue?.candidates.map((c) => c.candidateId));
	});

	it('adds participant metadata and create target for a missing logical DB', () => {
		const ctx = context();
		ctx.databases = [];
		ctx.entities[0] = { ...ctx.entities[0], logicalDbName: 'LDB_MISSING' };

		const dbIssue = validateDesignRelations(ctx).issues.find(
			(i) => i.relationId === 'DATABASE_ENTITY_LOGICAL_DB'
		);

		expect(dbIssue?.involvedTypes).toEqual(expect.arrayContaining(['database', 'entity']));
		expect(dbIssue?.participants).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: 'database', role: 'source', label: 'LDB_MISSING' }),
				expect.objectContaining({ type: 'entity', role: 'target', id: 'entity-user' })
			])
		);
		expect(dbIssue?.resolutionTargets).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					targetType: 'database',
					mode: 'create',
					autoFixable: false,
					prefill: expect.objectContaining({ logicalDbName: 'LDB_MISSING' })
				})
			])
		);
	});

	it('attaches resolved file names to participants and resolution targets when provided', () => {
		const ctx = context();
		ctx.databases = [];
		ctx.entities[0] = { ...ctx.entities[0], logicalDbName: 'LDB_MISSING' };

		const dbIssue = validateDesignRelations(ctx, {
			files: {
				database: 'database-a.json',
				entity: 'entity-a.json'
			}
		}).issues.find((i) => i.relationId === 'DATABASE_ENTITY_LOGICAL_DB');

		expect(dbIssue?.participants).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: 'database', file: 'database-a.json' }),
				expect.objectContaining({ type: 'entity', file: 'entity-a.json' })
			])
		);
		expect(dbIssue?.manualTargets).toEqual(
			expect.arrayContaining([expect.objectContaining({ targetType: 'entity', file: 'entity-a.json' })])
		);
		expect(dbIssue?.resolutionTargets).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ targetType: 'entity', file: 'entity-a.json' }),
				expect.objectContaining({ targetType: 'database', file: 'database-a.json' })
			])
		);
	});

	it('adds create targets for missing attributes and standard reference rows', () => {
		const missingAttribute = context();
		missingAttribute.entities[0] = {
			...missingAttribute.entities[0],
			primaryIdentifier: '없는ID'
		};
		const attributeIssue = validateDesignRelations(missingAttribute).issues.find(
			(i) => i.relationId === 'ENTITY_ATTRIBUTE_PRIMARY'
		);
		expect(attributeIssue?.resolutionTargets).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					targetType: 'attribute',
					mode: 'create',
					prefill: expect.objectContaining({
						schemaName: 'BKSP',
						entityName: '사용자',
						attributeName: '없는ID',
						requiredInput: 'Y'
					})
				})
			])
		);

		const missingRefs = context();
		missingRefs.vocabularies = [];
		missingRefs.terms = [];
		const result = validateDesignRelations(missingRefs);
		const vocabularyIssue = result.issues.find(
			(i) => i.relationId === 'STANDARD_REFERENCES' && i.field === 'tableKoreanName'
		);
		const termIssue = result.issues.find(
			(i) => i.relationId === 'STANDARD_REFERENCES' && i.field === 'columnKoreanName'
		);

		expect(vocabularyIssue?.participants).toEqual(
			expect.arrayContaining([expect.objectContaining({ type: 'vocabulary', role: 'reference' })])
		);
		expect(vocabularyIssue?.resolutionTargets).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					targetType: 'vocabulary',
					mode: 'create',
					prefill: expect.objectContaining({ standardName: '사용자', abbreviation: 'USER' })
				})
			])
		);
		expect(termIssue?.participants).toEqual(
			expect.arrayContaining([expect.objectContaining({ type: 'term', role: 'reference' })])
		);
		expect(termIssue?.resolutionTargets).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					targetType: 'term',
					mode: 'create',
					prefill: expect.objectContaining({ termName: '사용자ID', columnName: 'USER_ID' })
				})
			])
		);
	});

	it('does not prefill FK info from display-only reference keys', () => {
		const ctx = context();
		ctx.attributes[1] = {
			...ctx.attributes[1],
			refEntityName: '부서',
			refAttributeName: '부서ID'
		};
		ctx.columns = ctx.columns.filter((column) => column.id !== 'col-user-name');

		const issue = validateDesignRelations(ctx).issues.find(
			(i) => i.relationId === 'ATTRIBUTE_COLUMN_KEY' && i.targetId === 'attr-user-name'
		);

		expect(issue?.expectedKey).toBe('BKSP.사용자.이름');
		expect(issue?.resolutionTargets).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					targetType: 'column',
					mode: 'create',
					prefill: expect.objectContaining({
						columnKoreanName: '이름',
						fkInfo: null
					})
				})
			])
		);
	});

	it('keeps ATTRIBUTE_COLUMN_KEY candidates manual-only for PK/FK ambiguity', () => {
		const ctx = context();
		ctx.columns[0] = { ...ctx.columns[0], pkInfo: '' };
		const keyIssue = validateDesignRelations(ctx).issues.find(
			(i) => i.relationId === 'ATTRIBUTE_COLUMN_KEY' && i.field === 'pkInfo'
		);
		expect(keyIssue?.severity).toBe('warning');
		expect(keyIssue?.autoFixable).toBe(false);
		expect(keyIssue?.candidates[0]).toMatchObject({ autoFixable: false, patch: { fields: {} } });
	});

	it('validates STANDARD_REFERENCES field comparisons and suggests deterministic domain correction', () => {
		const ctx = context();
		ctx.columns[0] = { ...ctx.columns[0], domainName: 'WRONG_DOMAIN' };
		const result = validateDesignRelations(ctx);
		const standard = summaryById(result).get('STANDARD_REFERENCES');
		expect(standard?.issues).toHaveLength(1);
		expect(standard?.issues[0]).toMatchObject({
			field: 'domainName',
			expectedKey: 'ID',
			actualKey: 'WRONG_DOMAIN',
			autoFixable: true
		});
		expect(standard?.issues[0]?.candidates[0]?.patch.fields).toEqual({ domainName: 'ID' });
	});

	it('surfaces term-domain mismatches even when the matched term domain is not in domain refs', () => {
		const ctx = context();
		ctx.terms![0] = { ...ctx.terms![0], domainName: 'MISSING_STANDARD_DOMAIN' };
		ctx.columns[0] = { ...ctx.columns[0], domainName: 'WRONG_DOMAIN' };

		const issue = validateDesignRelations(ctx).issues.find(
			(i) =>
				i.relationId === 'STANDARD_REFERENCES' &&
				i.targetId === 'col-user-id' &&
				i.field === 'domainName'
		);

		expect(issue).toMatchObject({
			expectedKey: 'MISSING_STANDARD_DOMAIN',
			actualKey: 'WRONG_DOMAIN',
			autoFixable: false
		});
		expect(issue?.reason).toContain('도메인 정의서에 없습니다');
		expect(issue?.candidates[0]).toMatchObject({
			autoFixable: false,
			patch: { fields: {} }
		});
		expect(issue?.actionGuide).toContain('수동 수정');
		expect(issue?.involvedTypes).toEqual(expect.arrayContaining(['column', 'term', 'domain']));
		expect(issue?.resolutionTargets).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ targetType: 'term', mode: 'edit', autoFixable: false }),
				expect.objectContaining({
					targetType: 'domain',
					mode: 'create',
					prefill: expect.objectContaining({
						standardDomainName: 'MISSING_STANDARD_DOMAIN'
					})
				})
			])
		);
	});

	it('treats an empty loaded domain reference set as no valid term domains', () => {
		const ctx = context();
		ctx.domains = [];
		ctx.terms![0] = { ...ctx.terms![0], domainName: 'MISSING_STANDARD_DOMAIN' };
		ctx.columns[0] = { ...ctx.columns[0], domainName: 'MISSING_STANDARD_DOMAIN' };

		const issue = validateDesignRelations(ctx).issues.find(
			(i) =>
				i.relationId === 'STANDARD_REFERENCES' &&
				i.targetId === 'col-user-id' &&
				i.field === 'domainName'
		);

		expect(issue).toMatchObject({
			expectedKey: 'MISSING_STANDARD_DOMAIN',
			actualKey: 'MISSING_STANDARD_DOMAIN',
			autoFixable: false
		});
	});

	it('does not auto-patch domainName from name candidates when the term domain is absent from domain refs', () => {
		const ctx = context();
		ctx.terms![0] = { ...ctx.terms![0], domainName: 'MISSING_STANDARD_DOMAIN' };
		ctx.columns[0] = { ...ctx.columns[0], columnKoreanName: '틀린ID', domainName: 'WRONG_DOMAIN' };

		const issue = validateDesignRelations(ctx).issues.find(
			(i) =>
				i.relationId === 'STANDARD_REFERENCES' &&
				i.targetId === 'col-user-id' &&
				i.field === 'columnKoreanName'
		);

		expect(issue?.candidates[0]).toMatchObject({
			autoFixable: true,
			patch: { fields: { columnKoreanName: '사용자ID' } }
		});
		expect(issue?.candidates[0]?.patch.fields).not.toHaveProperty('domainName');
	});

	it('can skip STANDARD_REFERENCES for legacy 5-definition compatibility callers', () => {
		const ctx = context();
		ctx.vocabularies = [];
		ctx.terms = [];
		ctx.domains = [];

		const result = validateDesignRelations(ctx, { includeStandardReferences: false });

		expect(result.specs.map((spec) => spec.id)).not.toContain('STANDARD_REFERENCES');
		expect(result.issues.some((issue) => issue.relationId === 'STANDARD_REFERENCES')).toBe(false);
		expect(result.totals.unmatched).toBe(0);
	});
});
