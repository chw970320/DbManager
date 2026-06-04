import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	exportAttributeToXlsxBuffer,
	exportColumnToXlsxBuffer,
	exportDatabaseToXlsxBuffer,
	exportEntityToXlsxBuffer,
	exportTableToXlsxBuffer,
	parseAttributeXlsxToJson,
	parseColumnXlsxToJson,
	parseDatabaseXlsxToJson,
	parseEntityXlsxToJson,
	parseTableXlsxToJson
} from './database-design-xlsx-parser';

function sampleBuffer(filename: string): Buffer {
	return readFileSync(resolve(process.cwd(), 'sample', filename));
}

const sampleFiles = {
	database: 'BKSP-25-SD-07_데이터베이스설계서_v1.1_01_데이터베이스정의서.xlsx',
	entity: 'BKSP-25-SD-07_데이터베이스설계서_v1.1_02_엔터티정의서.xlsx',
	attribute: 'BKSP-25-SD-07_데이터베이스설계서_v1.1_03_속성정의서.xlsx',
	table: 'BKSP-25-SD-07_데이터베이스설계서_v1.1_04_테이블정의서.xlsx',
	column: 'BKSP-25-SD-07_데이터베이스설계서_v1.1_05_컬럼정의서.xlsx'
} as const;

function parseSamples() {
	return {
		databaseEntries: parseDatabaseXlsxToJson(sampleBuffer(sampleFiles.database), false),
		entityEntries: parseEntityXlsxToJson(sampleBuffer(sampleFiles.entity), false),
		attributeEntries: parseAttributeXlsxToJson(sampleBuffer(sampleFiles.attribute), false),
		tableEntries: parseTableXlsxToJson(sampleBuffer(sampleFiles.table), false),
		columnEntries: parseColumnXlsxToJson(sampleBuffer(sampleFiles.column), false)
	};
}

let parsedSamples: ReturnType<typeof parseSamples> | undefined;

function getParsedSamples(): ReturnType<typeof parseSamples> {
	parsedSamples ??= parseSamples();
	return parsedSamples;
}

describe('database-design-xlsx-parser sample compatibility', () => {
	it('sample 폴더의 DB 설계 정의서 5종을 기대 행 수로 파싱한다', () => {
		const { databaseEntries, entityEntries, attributeEntries, tableEntries, columnEntries } =
			getParsedSamples();

		expect(databaseEntries).toHaveLength(1);
		expect(entityEntries).toHaveLength(167);
		expect(attributeEntries).toHaveLength(1462);
		expect(tableEntries).toHaveLength(167);
		expect(columnEntries).toHaveLength(1463);

		expect(databaseEntries[0]).toMatchObject({
			organizationName: '국립생태원',
			logicalDbName: '생태모방지식 서비스 플랫폼',
			physicalDbName: 'biomimicry'
		});
		expect(entityEntries[0]).toMatchObject({
			schemaName: 'bksp',
			entityName: '생물종_기본',
			primaryIdentifier: 'EOL_아이디'
		});
		expect(attributeEntries[0]).toMatchObject({
			schemaName: 'bksp',
			entityName: '생물종_기본',
			attributeName: 'EOL_아이디',
			requiredInput: '필수'
		});
		expect(tableEntries[0]).toMatchObject({
			schemaName: 'bksp',
			tableEnglishName: 'TBL_BIOSPC_BSC',
			tableKoreanName: '생물종_기본'
		});
	}, 90_000);

	it('컬럼 sample은 컬럼_old가 먼저 있어도 최신 컬럼 시트를 선택해 매핑한다', () => {
		const { columnEntries } = getParsedSamples();

		expect(columnEntries[0]).toMatchObject({
			tableEnglishName: 'TBL_BIOSPC_BSC',
			columnEnglishName: 'EOL_ID',
			columnKoreanName: 'EOL_아이디',
			domainName: '명V20',
			dataType: 'VARCHAR',
			dataLength: '20',
			pkInfo: 'PK01'
		});
	}, 90_000);

	it('앱에서 내보낸 DB 설계 정의서 XLSX를 다시 파싱할 수 있다', () => {
		const { databaseEntries, entityEntries, attributeEntries, tableEntries, columnEntries } =
			getParsedSamples();
		const databaseEntry = databaseEntries[0];
		const entityEntry = entityEntries[0];
		const attributeEntry = attributeEntries[0];
		const tableEntry = tableEntries[0];
		const columnEntry = columnEntries[0];

		expect(
			parseDatabaseXlsxToJson(exportDatabaseToXlsxBuffer([databaseEntry]), false)[0]
		).toMatchObject({
			organizationName: databaseEntry.organizationName,
			logicalDbName: databaseEntry.logicalDbName,
			physicalDbName: databaseEntry.physicalDbName
		});
		expect(parseEntityXlsxToJson(exportEntityToXlsxBuffer([entityEntry]), false)[0]).toMatchObject({
			schemaName: entityEntry.schemaName,
			entityName: entityEntry.entityName,
			primaryIdentifier: entityEntry.primaryIdentifier
		});
		expect(
			parseAttributeXlsxToJson(exportAttributeToXlsxBuffer([attributeEntry]), false)[0]
		).toMatchObject({
			schemaName: attributeEntry.schemaName,
			entityName: attributeEntry.entityName,
			attributeName: attributeEntry.attributeName
		});
		expect(parseTableXlsxToJson(exportTableToXlsxBuffer([tableEntry]), false)[0]).toMatchObject({
			schemaName: tableEntry.schemaName,
			tableEnglishName: tableEntry.tableEnglishName,
			tableKoreanName: tableEntry.tableKoreanName
		});
		expect(parseColumnXlsxToJson(exportColumnToXlsxBuffer([columnEntry]), false)[0]).toMatchObject({
			scopeFlag: columnEntry.scopeFlag,
			tableEnglishName: columnEntry.tableEnglishName,
			columnEnglishName: columnEntry.columnEnglishName,
			domainName: columnEntry.domainName,
			dataType: columnEntry.dataType,
			dataLength: columnEntry.dataLength,
			pkInfo: columnEntry.pkInfo
		});
	}, 90_000);
});
