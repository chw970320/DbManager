/**
 * 데이터베이스 설계 XLSX 파서
 * 데이터베이스, 엔터티, 속성, 테이블, 컬럼 정의서 파싱 및 내보내기
 */
import XLSX from 'xlsx-js-style';
import { v4 as uuidv4 } from 'uuid';
import type {
	DatabaseEntry,
	EntityEntry,
	AttributeEntry,
	TableEntry,
	ColumnEntry,
	DATABASE_FIELDS,
	ENTITY_FIELDS,
	ATTRIBUTE_FIELDS,
	TABLE_FIELDS,
	COLUMN_FIELDS
} from '$lib/types/database-design';
import { parseWorkbookToArray, isEmptyRow } from './xlsx-parser';

// ============================================================================
// 공통 유틸리티
// ============================================================================

/**
 * 셀 주소 생성
 */
function getCellAddress(row: number, col: number): string {
	let colName = '';
	let c = col;
	while (c >= 0) {
		colName = String.fromCharCode(65 + (c % 26)) + colName;
		c = Math.floor(c / 26) - 1;
	}
	return `${colName}${row + 1}`;
}

/**
 * 선택적 텍스트 필드 파싱 ("-"는 빈값으로 변환)
 */
function parseOptionalText(value: string | number | undefined): string | undefined {
	if (!value) return undefined;
	const str = String(value).trim();
	return str === '-' || str === '' ? undefined : str;
}

/**
 * 필수 텍스트 필드 파싱
 */
function parseRequiredText(value: string | number | undefined): string {
	if (!value) return '';
	return String(value).trim();
}

/**
 * 스타일이 적용된 헤더 셀 생성
 */
function createHeaderCell(value: string) {
	return {
		v: value,
		t: 's',
		s: {
			font: {
				bold: true,
				color: { rgb: 'FFFFFF' },
				sz: 11
			},
			fill: {
				patternType: 'solid',
				fgColor: { rgb: '4472C4' }
			},
			alignment: {
				horizontal: 'center',
				vertical: 'center',
				wrapText: true
			},
			border: {
				top: { style: 'thin', color: { rgb: '000000' } },
				bottom: { style: 'thin', color: { rgb: '000000' } },
				left: { style: 'thin', color: { rgb: '000000' } },
				right: { style: 'thin', color: { rgb: '000000' } }
			}
		}
	};
}

/**
 * 스타일이 적용된 데이터 셀 생성
 */
function createDataCell(value: string | number, isNumber: boolean = false) {
	return {
		v: value,
		t: isNumber ? 'n' : 's',
		s: {
			alignment: {
				vertical: 'center',
				wrapText: true
			},
			border: {
				top: { style: 'thin', color: { rgb: 'D0D0D0' } },
				bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
				left: { style: 'thin', color: { rgb: 'D0D0D0' } },
				right: { style: 'thin', color: { rgb: 'D0D0D0' } }
			}
		}
	};
}

// ============================================================================
// Database (데이터베이스 정의서)
// ============================================================================

/**
 * 데이터베이스 정의서 XLSX 파싱
 */
export function parseDatabaseXlsxToJson(
	fileBuffer: Buffer,
	skipDuplicates: boolean = true
): DatabaseEntry[] {
	try {
		const rawData = parseWorkbookToArray(fileBuffer);
		const dataRows = rawData.slice(1);
		const entries: DatabaseEntry[] = [];
		const seenKeys = skipDuplicates ? new Set<string>() : null;

		for (let i = 0; i < dataRows.length; i++) {
			const row = dataRows[i];
			if (isEmptyRow(row)) continue;

			// 컬럼 매핑: A=번호(무시), B=기관명, C=부서명, D=적용업무, E=관련법령, F=논리DB명, G=물리DB명, H=구축일자, I=DB설명, J=DBMS정보, K=운영체제정보, L=수집제외사유
			const organizationName = parseRequiredText(row[1]);
			const departmentName = parseRequiredText(row[2]);
			const appliedTask = parseRequiredText(row[3]);
			const relatedLaw = parseRequiredText(row[4]);
			const logicalDbName = parseOptionalText(row[5]);
			const physicalDbName = parseOptionalText(row[6]);
			const buildDate = parseRequiredText(row[7]);
			const dbDescription = parseOptionalText(row[8]);
			const dbmsInfo = parseOptionalText(row[9]);
			const osInfo = parseRequiredText(row[10]);
			const exclusionReason = parseRequiredText(row[11]);

			// 중복 체크
			if (skipDuplicates && seenKeys) {
				const key = `${organizationName}|${logicalDbName || ''}`;
				if (seenKeys.has(key)) {
					console.warn(`Row ${i + 2}: 중복 데이터 건너뜀`);
					continue;
				}
				seenKeys.add(key);
			}

			entries.push({
				id: uuidv4(),
				organizationName,
				departmentName,
				appliedTask,
				relatedLaw,
				logicalDbName,
				physicalDbName,
				buildDate,
				dbDescription,
				dbmsInfo,
				osInfo,
				exclusionReason,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
		}

		if (entries.length === 0) {
			throw new Error('유효한 데이터베이스 정의서 데이터를 찾을 수 없습니다.');
		}

		return entries;
	} catch (error) {
		console.error('데이터베이스 정의서 xlsx 파싱 중 오류:', error);
		throw new Error(
			`Excel 파일 파싱 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 데이터베이스 정의서 XLSX 내보내기
 */
export function exportDatabaseToXlsxBuffer(data: DatabaseEntry[]): Buffer {
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const worksheet: Record<string, any> = {};

		const headers = [
			'번호',
			'기관명',
			'부서명',
			'적용업무',
			'관련법령',
			'논리DB명',
			'물리DB명',
			'구축일자',
			'DB설명',
			'DBMS정보',
			'운영체제정보',
			'수집제외사유'
		];

		headers.forEach((header, index) => {
			worksheet[getCellAddress(0, index)] = createHeaderCell(header);
		});

		data.forEach((entry, rowIndex) => {
			const row = rowIndex + 1;
			const values = [
				rowIndex + 1,
				entry.organizationName,
				entry.departmentName,
				entry.appliedTask,
				entry.relatedLaw,
				entry.logicalDbName || '',
				entry.physicalDbName || '',
				entry.buildDate,
				entry.dbDescription || '',
				entry.dbmsInfo || '',
				entry.osInfo,
				entry.exclusionReason
			];

			values.forEach((value, colIndex) => {
				worksheet[getCellAddress(row, colIndex)] = createDataCell(value, colIndex === 0);
			});
		});

		const lastRow = data.length;
		worksheet['!ref'] = `A1:${getCellAddress(lastRow, headers.length - 1)}`;
		worksheet['!cols'] = headers.map(() => ({ wch: 15 }));
		worksheet['!autofilter'] = { ref: worksheet['!ref'] };

		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, '데이터베이스정의서');

		return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', compression: true }) as Buffer;
	} catch (error) {
		console.error('데이터베이스 정의서 XLSX 생성 중 오류:', error);
		throw new Error(
			`XLSX 파일 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

// ============================================================================
// Entity (엔터티 정의서)
// ============================================================================

/**
 * 엔터티 정의서 XLSX 파싱
 */
export function parseEntityXlsxToJson(
	fileBuffer: Buffer,
	skipDuplicates: boolean = true
): EntityEntry[] {
	try {
		const rawData = parseWorkbookToArray(fileBuffer);
		const dataRows = rawData.slice(1);
		const entries: EntityEntry[] = [];
		const seenKeys = skipDuplicates ? new Set<string>() : null;

		for (let i = 0; i < dataRows.length; i++) {
			const row = dataRows[i];
			if (isEmptyRow(row)) continue;

			// 컬럼 매핑: A=번호(무시), B=논리DB명, C=스키마명, D=엔터티명, E=엔터티설명, F=주식별자, G=수퍼타입엔터티명, H=테이블한글명
			const logicalDbName = parseOptionalText(row[1]);
			const schemaName = parseOptionalText(row[2]);
			const entityName = parseOptionalText(row[3]);
			const entityDescription = parseOptionalText(row[4]);
			const primaryIdentifier = parseOptionalText(row[5]);
			const superTypeEntityName = parseRequiredText(row[6]);
			const tableKoreanName = parseOptionalText(row[7]);

			// 중복 체크
			if (skipDuplicates && seenKeys) {
				const key = `${schemaName || ''}|${entityName || ''}`;
				if (seenKeys.has(key)) {
					console.warn(`Row ${i + 2}: 중복 데이터 건너뜀`);
					continue;
				}
				seenKeys.add(key);
			}

			entries.push({
				id: uuidv4(),
				logicalDbName,
				schemaName,
				entityName,
				entityDescription,
				primaryIdentifier,
				superTypeEntityName,
				tableKoreanName,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
		}

		if (entries.length === 0) {
			throw new Error('유효한 엔터티 정의서 데이터를 찾을 수 없습니다.');
		}

		return entries;
	} catch (error) {
		console.error('엔터티 정의서 xlsx 파싱 중 오류:', error);
		throw new Error(
			`Excel 파일 파싱 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 엔터티 정의서 XLSX 내보내기
 */
export function exportEntityToXlsxBuffer(data: EntityEntry[]): Buffer {
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const worksheet: Record<string, any> = {};

		const headers = [
			'번호',
			'논리DB명',
			'스키마명',
			'엔터티명',
			'엔터티설명',
			'주식별자',
			'수퍼타입엔터티명',
			'테이블한글명'
		];

		headers.forEach((header, index) => {
			worksheet[getCellAddress(0, index)] = createHeaderCell(header);
		});

		data.forEach((entry, rowIndex) => {
			const row = rowIndex + 1;
			const values = [
				rowIndex + 1,
				entry.logicalDbName || '',
				entry.schemaName || '',
				entry.entityName || '',
				entry.entityDescription || '',
				entry.primaryIdentifier || '',
				entry.superTypeEntityName,
				entry.tableKoreanName || ''
			];

			values.forEach((value, colIndex) => {
				worksheet[getCellAddress(row, colIndex)] = createDataCell(value, colIndex === 0);
			});
		});

		const lastRow = data.length;
		worksheet['!ref'] = `A1:${getCellAddress(lastRow, headers.length - 1)}`;
		worksheet['!cols'] = headers.map(() => ({ wch: 18 }));
		worksheet['!autofilter'] = { ref: worksheet['!ref'] };

		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, '엔터티정의서');

		return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', compression: true }) as Buffer;
	} catch (error) {
		console.error('엔터티 정의서 XLSX 생성 중 오류:', error);
		throw new Error(
			`XLSX 파일 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

// ============================================================================
// Attribute (속성 정의서)
// ============================================================================

/**
 * 속성 정의서 XLSX 파싱
 */
export function parseAttributeXlsxToJson(
	fileBuffer: Buffer,
	skipDuplicates: boolean = true
): AttributeEntry[] {
	try {
		const rawData = parseWorkbookToArray(fileBuffer);
		const dataRows = rawData.slice(1);
		const entries: AttributeEntry[] = [];
		const seenKeys = skipDuplicates ? new Set<string>() : null;

		for (let i = 0; i < dataRows.length; i++) {
			const row = dataRows[i];
			if (isEmptyRow(row)) continue;

			// 컬럼 매핑: A=번호(무시), B=스키마명, C=엔터티명, D=속성명, E=속성유형, F=필수입력여부, G=식별자여부, H=참조엔터티명, I=참조속성명, J=속성설명
			const schemaName = parseOptionalText(row[1]);
			const entityName = parseOptionalText(row[2]);
			const attributeName = parseOptionalText(row[3]);
			const attributeType = parseOptionalText(row[4]);
			const requiredInput = parseRequiredText(row[5]);
			const identifierFlag = parseOptionalText(row[6]);
			const refEntityName = parseRequiredText(row[7]);
			const refAttributeName = parseOptionalText(row[8]);
			const attributeDescription = parseOptionalText(row[9]);

			// 중복 체크
			if (skipDuplicates && seenKeys) {
				const key = `${schemaName || ''}|${entityName || ''}|${attributeName || ''}`;
				if (seenKeys.has(key)) {
					console.warn(`Row ${i + 2}: 중복 데이터 건너뜀`);
					continue;
				}
				seenKeys.add(key);
			}

			entries.push({
				id: uuidv4(),
				schemaName,
				entityName,
				attributeName,
				attributeType,
				requiredInput,
				identifierFlag,
				refEntityName,
				refAttributeName,
				attributeDescription,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
		}

		if (entries.length === 0) {
			throw new Error('유효한 속성 정의서 데이터를 찾을 수 없습니다.');
		}

		return entries;
	} catch (error) {
		console.error('속성 정의서 xlsx 파싱 중 오류:', error);
		throw new Error(
			`Excel 파일 파싱 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 속성 정의서 XLSX 내보내기
 */
export function exportAttributeToXlsxBuffer(data: AttributeEntry[]): Buffer {
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const worksheet: Record<string, any> = {};

		const headers = [
			'번호',
			'스키마명',
			'엔터티명',
			'속성명',
			'속성유형',
			'필수입력여부',
			'식별자여부',
			'참조엔터티명',
			'참조속성명',
			'속성설명'
		];

		headers.forEach((header, index) => {
			worksheet[getCellAddress(0, index)] = createHeaderCell(header);
		});

		data.forEach((entry, rowIndex) => {
			const row = rowIndex + 1;
			const values = [
				rowIndex + 1,
				entry.schemaName || '',
				entry.entityName || '',
				entry.attributeName || '',
				entry.attributeType || '',
				entry.requiredInput,
				entry.identifierFlag || '',
				entry.refEntityName,
				entry.refAttributeName || '',
				entry.attributeDescription || ''
			];

			values.forEach((value, colIndex) => {
				worksheet[getCellAddress(row, colIndex)] = createDataCell(value, colIndex === 0);
			});
		});

		const lastRow = data.length;
		worksheet['!ref'] = `A1:${getCellAddress(lastRow, headers.length - 1)}`;
		worksheet['!cols'] = headers.map(() => ({ wch: 15 }));
		worksheet['!autofilter'] = { ref: worksheet['!ref'] };

		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, '속성정의서');

		return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', compression: true }) as Buffer;
	} catch (error) {
		console.error('속성 정의서 XLSX 생성 중 오류:', error);
		throw new Error(
			`XLSX 파일 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

// ============================================================================
// Table (테이블 정의서)
// ============================================================================

/**
 * 테이블 정의서 XLSX 파싱
 */
export function parseTableXlsxToJson(
	fileBuffer: Buffer,
	skipDuplicates: boolean = true
): TableEntry[] {
	try {
		const rawData = parseWorkbookToArray(fileBuffer);
		const dataRows = rawData.slice(1);
		const entries: TableEntry[] = [];
		const seenKeys = skipDuplicates ? new Set<string>() : null;

		for (let i = 0; i < dataRows.length; i++) {
			const row = dataRows[i];
			if (isEmptyRow(row)) continue;

			// 컬럼 매핑: A=번호(무시), B=물리DB명, C=테이블소유자, D=주제영역, E=스키마명, F=테이블영문명, G=테이블한글명,
			// H=테이블유형, I=관련엔터티명, J=테이블설명, K=업무분류체계, L=보존기간, M=테이블볼륨,
			// N=발생주기, O=공개/비공개여부, P=비공개사유, Q=개방데이터목록
			const physicalDbName = parseOptionalText(row[1]);
			const tableOwner = parseOptionalText(row[2]);
			const subjectArea = parseOptionalText(row[3]);
			const schemaName = parseOptionalText(row[4]);
			const tableEnglishName = parseOptionalText(row[5]);
			const tableKoreanName = parseOptionalText(row[6]);
			const tableType = parseOptionalText(row[7]);
			const relatedEntityName = parseOptionalText(row[8]);
			const tableDescription = parseOptionalText(row[9]);
			const businessClassification = parseRequiredText(row[10]);
			const retentionPeriod = parseOptionalText(row[11]);
			const tableVolume = parseRequiredText(row[12]);
			const occurrenceCycle = parseOptionalText(row[13]);
			const publicFlag = parseOptionalText(row[14]);
			const nonPublicReason = parseRequiredText(row[15]);
			const openDataList = parseRequiredText(row[16]);

			// 중복 체크
			if (skipDuplicates && seenKeys) {
				const key = `${schemaName || ''}|${tableEnglishName || ''}`;
				if (seenKeys.has(key)) {
					console.warn(`Row ${i + 2}: 중복 데이터 건너뜀`);
					continue;
				}
				seenKeys.add(key);
			}

			entries.push({
				id: uuidv4(),
				physicalDbName,
				tableOwner,
				subjectArea,
				schemaName,
				tableEnglishName,
				tableKoreanName,
				tableType,
				relatedEntityName,
				tableDescription,
				businessClassification,
				retentionPeriod,
				tableVolume,
				occurrenceCycle,
				publicFlag,
				nonPublicReason,
				openDataList,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
		}

		if (entries.length === 0) {
			throw new Error('유효한 테이블 정의서 데이터를 찾을 수 없습니다.');
		}

		return entries;
	} catch (error) {
		console.error('테이블 정의서 xlsx 파싱 중 오류:', error);
		throw new Error(
			`Excel 파일 파싱 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 테이블 정의서 XLSX 내보내기
 */
export function exportTableToXlsxBuffer(data: TableEntry[]): Buffer {
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const worksheet: Record<string, any> = {};

		const headers = [
			'번호',
			'물리DB명',
			'테이블소유자',
			'주제영역',
			'스키마명',
			'테이블영문명',
			'테이블한글명',
			'테이블유형',
			'관련엔터티명',
			'테이블설명',
			'업무분류체계',
			'보존기간',
			'테이블볼륨',
			'발생주기',
			'공개/비공개여부',
			'비공개사유',
			'개방데이터목록'
		];

		headers.forEach((header, index) => {
			worksheet[getCellAddress(0, index)] = createHeaderCell(header);
		});

		data.forEach((entry, rowIndex) => {
			const row = rowIndex + 1;
			const values = [
				rowIndex + 1,
				entry.physicalDbName || '',
				entry.tableOwner || '',
				entry.subjectArea || '',
				entry.schemaName || '',
				entry.tableEnglishName || '',
				entry.tableKoreanName || '',
				entry.tableType || '',
				entry.relatedEntityName || '',
				entry.tableDescription || '',
				entry.businessClassification,
				entry.retentionPeriod || '',
				entry.tableVolume,
				entry.occurrenceCycle || '',
				entry.publicFlag || '',
				entry.nonPublicReason,
				entry.openDataList
			];

			values.forEach((value, colIndex) => {
				worksheet[getCellAddress(row, colIndex)] = createDataCell(value, colIndex === 0);
			});
		});

		const lastRow = data.length;
		worksheet['!ref'] = `A1:${getCellAddress(lastRow, headers.length - 1)}`;
		worksheet['!cols'] = headers.map(() => ({ wch: 14 }));
		worksheet['!autofilter'] = { ref: worksheet['!ref'] };

		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, '테이블정의서');

		return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', compression: true }) as Buffer;
	} catch (error) {
		console.error('테이블 정의서 XLSX 생성 중 오류:', error);
		throw new Error(
			`XLSX 파일 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

// ============================================================================
// Column (컬럼 정의서)
// ============================================================================

/**
 * 컬럼 정의서 XLSX 파싱
 */
export function parseColumnXlsxToJson(
	fileBuffer: Buffer,
	skipDuplicates: boolean = true
): ColumnEntry[] {
	try {
		const rawData = parseWorkbookToArray(fileBuffer);
		const dataRows = rawData.slice(1);
		const entries: ColumnEntry[] = [];
		const seenKeys = skipDuplicates ? new Set<string>() : null;

		for (let i = 0; i < dataRows.length; i++) {
			const row = dataRows[i];
			if (isEmptyRow(row)) continue;

			// 컬럼 매핑 (23개 컬럼)
			// A=번호, B=사업범위여부, C=주제영역, D=스키마명, E=테이블영문명, F=컬럼영문명, G=컬럼한글명,
			// H=컬럼설명, I=연관엔터티명, J=자료타입, K=자료길이, L=자료소수점길이, M=자료형식,
			// N=NOTNULL여부, O=PK정보, P=FK정보, Q=인덱스명, R=인덱스순번, S=AK정보, T=제약조건,
			// U=개인정보여부, V=암호화여부, W=공개/비공개여부
			const scopeFlag = parseOptionalText(row[1]);
			const subjectArea = parseOptionalText(row[2]);
			const schemaName = parseOptionalText(row[3]);
			const tableEnglishName = parseOptionalText(row[4]);
			const columnEnglishName = parseOptionalText(row[5]);
			const columnKoreanName = parseOptionalText(row[6]);
			const columnDescription = parseOptionalText(row[7]);
			const relatedEntityName = parseOptionalText(row[8]);
			const dataType = parseOptionalText(row[9]);
			const dataLength = parseRequiredText(row[10]);
			const dataDecimalLength = parseRequiredText(row[11]);
			const dataFormat = parseRequiredText(row[12]);
			const notNullFlag = parseOptionalText(row[13]);
			const pkInfo = parseRequiredText(row[14]);
			const fkInfo = parseOptionalText(row[15]);
			const indexName = parseRequiredText(row[16]);
			const indexOrder = parseRequiredText(row[17]);
			const akInfo = parseRequiredText(row[18]);
			const constraint = parseRequiredText(row[19]);
			const personalInfoFlag = parseOptionalText(row[20]);
			const encryptionFlag = parseOptionalText(row[21]);
			const publicFlag = parseOptionalText(row[22]);

			// 중복 체크
			if (skipDuplicates && seenKeys) {
				const key = `${schemaName || ''}|${tableEnglishName || ''}|${columnEnglishName || ''}`;
				if (seenKeys.has(key)) {
					console.warn(`Row ${i + 2}: 중복 데이터 건너뜀`);
					continue;
				}
				seenKeys.add(key);
			}

			entries.push({
				id: uuidv4(),
				scopeFlag,
				subjectArea,
				schemaName,
				tableEnglishName,
				columnEnglishName,
				columnKoreanName,
				columnDescription,
				relatedEntityName,
				dataType,
				dataLength,
				dataDecimalLength,
				dataFormat,
				notNullFlag,
				pkInfo,
				fkInfo,
				indexName,
				indexOrder,
				akInfo,
				constraint,
				personalInfoFlag,
				encryptionFlag,
				publicFlag,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			});
		}

		if (entries.length === 0) {
			throw new Error('유효한 컬럼 정의서 데이터를 찾을 수 없습니다.');
		}

		return entries;
	} catch (error) {
		console.error('컬럼 정의서 xlsx 파싱 중 오류:', error);
		throw new Error(
			`Excel 파일 파싱 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 컬럼 정의서 XLSX 내보내기
 */
export function exportColumnToXlsxBuffer(data: ColumnEntry[]): Buffer {
	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const worksheet: Record<string, any> = {};

		const headers = [
			'번호',
			'사업범위여부',
			'주제영역',
			'스키마명',
			'테이블영문명',
			'컬럼영문명',
			'컬럼한글명',
			'컬럼설명',
			'연관엔터티명',
			'자료타입',
			'자료길이',
			'자료소수점길이',
			'자료형식',
			'NOTNULL여부',
			'PK정보',
			'FK정보',
			'인덱스명',
			'인덱스순번',
			'AK정보',
			'제약조건',
			'개인정보여부',
			'암호화여부',
			'공개/비공개여부'
		];

		headers.forEach((header, index) => {
			worksheet[getCellAddress(0, index)] = createHeaderCell(header);
		});

		data.forEach((entry, rowIndex) => {
			const row = rowIndex + 1;
			const values = [
				rowIndex + 1,
				entry.scopeFlag || '',
				entry.subjectArea || '',
				entry.schemaName || '',
				entry.tableEnglishName || '',
				entry.columnEnglishName || '',
				entry.columnKoreanName || '',
				entry.columnDescription || '',
				entry.relatedEntityName || '',
				entry.dataType || '',
				entry.dataLength,
				entry.dataDecimalLength,
				entry.dataFormat,
				entry.notNullFlag || '',
				entry.pkInfo,
				entry.fkInfo || '',
				entry.indexName,
				entry.indexOrder,
				entry.akInfo,
				entry.constraint,
				entry.personalInfoFlag || '',
				entry.encryptionFlag || '',
				entry.publicFlag || ''
			];

			values.forEach((value, colIndex) => {
				worksheet[getCellAddress(row, colIndex)] = createDataCell(value, colIndex === 0);
			});
		});

		const lastRow = data.length;
		worksheet['!ref'] = `A1:${getCellAddress(lastRow, headers.length - 1)}`;
		worksheet['!cols'] = headers.map(() => ({ wch: 12 }));
		worksheet['!autofilter'] = { ref: worksheet['!ref'] };

		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, '컬럼정의서');

		return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', compression: true }) as Buffer;
	} catch (error) {
		console.error('컬럼 정의서 XLSX 생성 중 오류:', error);
		throw new Error(
			`XLSX 파일 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

