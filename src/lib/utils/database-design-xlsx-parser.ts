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
	ColumnEntry
} from '$lib/types/database-design';
import { isEmptyRow } from './xlsx-parser';

// ============================================================================
// 공통 유틸리티
// ============================================================================

type SheetRow = Array<string | number | undefined>;

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
 * 헤더 비교용 정규화 (공백/개행/대소문자 차이 무시)
 */
function normalizeHeaderText(value: string | number | undefined): string {
	if (value === undefined || value === null) return '';
	return String(value)
		.replace(/[\s\u00A0]+/g, '')
		.trim()
		.toLowerCase();
}

function createHeaderIndexMap(headerRow: SheetRow): Map<string, number> {
	const headerIndexMap = new Map<string, number>();
	headerRow.forEach((header, index) => {
		const normalized = normalizeHeaderText(header);
		if (normalized && !headerIndexMap.has(normalized)) {
			headerIndexMap.set(normalized, index);
		}
	});
	return headerIndexMap;
}

function getHeaderMappedValue(
	row: SheetRow,
	headerIndexMap: Map<string, number>,
	aliases: string[]
): string | number | undefined {
	for (const alias of aliases) {
		const index = headerIndexMap.get(normalizeHeaderText(alias));
		if (index !== undefined) {
			return row[index];
		}
	}
	return undefined;
}

type WorkbookHeaderSelectionOptions = {
	preferredSheetNames?: string[];
	preferredHeaders?: string[];
};

type RequiredHeaderSpec = string | string[];

const DB_DESIGN_SHEET_POLICIES = {
	database: {
		preferredSheetNames: ['데이터베이스', '데이터베이스정의서']
	},
	entity: {
		preferredSheetNames: ['엔터티', '엔터티정의서']
	},
	attribute: {
		preferredSheetNames: ['속성', '속성정의서']
	},
	table: {
		preferredSheetNames: ['테이블', '테이블정의서']
	},
	column: {
		preferredSheetNames: ['컬럼', '컬럼정의서'],
		preferredHeaders: ['도메인명', '자료타입', 'NOTNULL여부']
	}
} satisfies Record<string, WorkbookHeaderSelectionOptions>;

function isBackupSheetName(sheetName: string): boolean {
	const normalized = sheetName.trim().toLowerCase();
	return (
		/(?:^|[_\-\s])(?:old|backup)(?:$|[_\-\s\d])/.test(normalized) ||
		/(?:^|[_\-\s])백업\d*$/.test(normalized)
	);
}

function scoreHeaderCandidate(
	sheetName: string,
	headerIndexMap: Map<string, number>,
	options: WorkbookHeaderSelectionOptions
): number {
	const normalizedSheetName = normalizeHeaderText(sheetName);
	const preferredSheetNames =
		options.preferredSheetNames?.map((name) => normalizeHeaderText(name)) ?? [];
	const preferredHeaders =
		options.preferredHeaders?.map((header) => normalizeHeaderText(header)) ?? [];

	let score = 0;
	if (preferredSheetNames.includes(normalizedSheetName)) {
		score += 1_000;
	}

	if (!isBackupSheetName(sheetName)) {
		score += 100;
	}

	for (const header of preferredHeaders) {
		if (headerIndexMap.has(header)) {
			score += 10;
		}
	}

	return score;
}

function getRequiredHeaderAliases(requiredHeader: RequiredHeaderSpec): string[] {
	return Array.isArray(requiredHeader) ? requiredHeader : [requiredHeader];
}

function getRequiredHeaderLabel(requiredHeader: RequiredHeaderSpec): string {
	return getRequiredHeaderAliases(requiredHeader)[0];
}

/**
 * 여러 시트 중 필수 헤더를 포함한 시트를 선택해 2D 배열로 반환
 */
function parseWorkbookToArrayByRequiredHeaders(
	fileBuffer: Buffer,
	requiredHeaders: RequiredHeaderSpec[],
	options: WorkbookHeaderSelectionOptions = {}
): SheetRow[] {
	const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
	const normalizedRequiredHeaders = requiredHeaders.map((requiredHeader) =>
		getRequiredHeaderAliases(requiredHeader).map((header) => normalizeHeaderText(header))
	);
	const normalizedPreferredSheetNames =
		options.preferredSheetNames?.map((name) => normalizeHeaderText(name)) ?? [];
	const normalizedPreferredHeaders =
		options.preferredHeaders?.map((header) => normalizeHeaderText(header)) ?? [];
	let bestCandidate: {
		data: SheetRow[];
		score: number;
		sheetIndex: number;
		headerRowIndex: number;
	} | null = null;

	for (let sheetIndex = 0; sheetIndex < workbook.SheetNames.length; sheetIndex++) {
		const sheetName = workbook.SheetNames[sheetIndex];
		const worksheet = workbook.Sheets[sheetName];
		if (!worksheet) continue;
		const rawData: SheetRow[] = XLSX.utils.sheet_to_json(worksheet, {
			header: 1,
			defval: '',
			blankrows: false
		});
		if (rawData.length < 2) continue;

		for (let rowIndex = 0; rowIndex < rawData.length; rowIndex++) {
			const candidateHeaderRow = rawData[rowIndex] || [];
			if (candidateHeaderRow.length === 0) continue;

			const headerIndexMap = createHeaderIndexMap(candidateHeaderRow);
			const matched = normalizedRequiredHeaders.every((aliases) =>
				aliases.some((header) => headerIndexMap.has(header))
			);

			if (!matched) continue;

			const dataFromHeader = rawData.slice(rowIndex);
			if (dataFromHeader.length < 2) continue;
			const isExactPreferredSheet = normalizedPreferredSheetNames.includes(
				normalizeHeaderText(sheetName)
			);
			const hasAllPreferredHeaders = normalizedPreferredHeaders.every((header) =>
				headerIndexMap.has(header)
			);

			if (isExactPreferredSheet && hasAllPreferredHeaders) {
				return dataFromHeader;
			}

			const score = scoreHeaderCandidate(sheetName, headerIndexMap, options);

			if (
				!bestCandidate ||
				score > bestCandidate.score ||
				(score === bestCandidate.score &&
					(sheetIndex < bestCandidate.sheetIndex ||
						(sheetIndex === bestCandidate.sheetIndex && rowIndex < bestCandidate.headerRowIndex)))
			) {
				bestCandidate = { data: dataFromHeader, score, sheetIndex, headerRowIndex: rowIndex };
			}
		}
	}

	if (bestCandidate) {
		return bestCandidate.data;
	}

	throw new Error(
		`필수 헤더(${requiredHeaders.map(getRequiredHeaderLabel).join(', ')})를 포함한 시트를 찾을 수 없습니다.`
	);
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
		const rawData = parseWorkbookToArrayByRequiredHeaders(
			fileBuffer,
			['기관명', '부서명', '적용업무'],
			DB_DESIGN_SHEET_POLICIES.database
		);
		const headerIndexMap = createHeaderIndexMap(rawData[0] || []);
		const dataRows = rawData.slice(1);
		const entries: DatabaseEntry[] = [];
		const seenKeys = skipDuplicates ? new Set<string>() : null;

		for (let i = 0; i < dataRows.length; i++) {
			const row = dataRows[i];
			if (isEmptyRow(row)) continue;

			const organizationName = parseRequiredText(
				getHeaderMappedValue(row, headerIndexMap, ['기관명'])
			);
			const departmentName = parseRequiredText(
				getHeaderMappedValue(row, headerIndexMap, ['부서명'])
			);
			const appliedTask = parseRequiredText(
				getHeaderMappedValue(row, headerIndexMap, ['적용업무'])
			);
			const relatedLaw = parseRequiredText(getHeaderMappedValue(row, headerIndexMap, ['관련법령']));
			const logicalDbName = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['논리DB명'])
			);
			const physicalDbName = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['물리DB명'])
			);
			const buildDate = parseRequiredText(getHeaderMappedValue(row, headerIndexMap, ['구축일자']));
			const dbDescription = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['DB설명'])
			);
			const dbmsInfo = parseOptionalText(getHeaderMappedValue(row, headerIndexMap, ['DBMS정보']));
			const osInfo = parseRequiredText(getHeaderMappedValue(row, headerIndexMap, ['운영체제정보']));
			const exclusionReason = parseRequiredText(
				getHeaderMappedValue(row, headerIndexMap, ['수집제외사유'])
			);

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
				entry.logicalDbName ?? '',
				entry.physicalDbName ?? '',
				entry.buildDate,
				entry.dbDescription ?? '',
				entry.dbmsInfo ?? '',
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
		const rawData = parseWorkbookToArrayByRequiredHeaders(
			fileBuffer,
			['논리DB명', ['스키마명', 'schema'], '엔터티명'],
			DB_DESIGN_SHEET_POLICIES.entity
		);
		const headerIndexMap = createHeaderIndexMap(rawData[0] || []);
		const dataRows = rawData.slice(1);
		const entries: EntityEntry[] = [];
		const seenKeys = skipDuplicates ? new Set<string>() : null;

		for (let i = 0; i < dataRows.length; i++) {
			const row = dataRows[i];
			if (isEmptyRow(row)) continue;

			const logicalDbName = parseRequiredText(
				getHeaderMappedValue(row, headerIndexMap, ['논리DB명'])
			);
			const schemaName = parseRequiredText(
				getHeaderMappedValue(row, headerIndexMap, ['스키마명', 'schema'])
			);
			const entityName = parseRequiredText(getHeaderMappedValue(row, headerIndexMap, ['엔터티명']));
			const entityDescription = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['엔터티설명', '엔터티 설명'])
			);
			const primaryIdentifier = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['주식별자'])
			);
			const superTypeEntityName = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['수퍼타입엔터티명', '수퍼타입 엔터티명'])
			);
			const tableKoreanName = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['테이블한글명', '테이블 한글명'])
			);

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
				entry.logicalDbName ?? '',
				entry.schemaName ?? '',
				entry.entityName ?? '',
				entry.entityDescription ?? '',
				entry.primaryIdentifier ?? '',
				entry.superTypeEntityName ?? '',
				entry.tableKoreanName ?? ''
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
		const rawData = parseWorkbookToArrayByRequiredHeaders(
			fileBuffer,
			[['스키마명', 'schema'], '엔터티명', '속성명'],
			DB_DESIGN_SHEET_POLICIES.attribute
		);
		const headerIndexMap = createHeaderIndexMap(rawData[0] || []);
		const dataRows = rawData.slice(1);
		const entries: AttributeEntry[] = [];
		const seenKeys = skipDuplicates ? new Set<string>() : null;

		for (let i = 0; i < dataRows.length; i++) {
			const row = dataRows[i];
			if (isEmptyRow(row)) continue;

			const schemaName = parseRequiredText(
				getHeaderMappedValue(row, headerIndexMap, ['스키마명', 'schema'])
			);
			const entityName = parseRequiredText(getHeaderMappedValue(row, headerIndexMap, ['엔터티명']));
			const attributeName = parseRequiredText(
				getHeaderMappedValue(row, headerIndexMap, ['속성명'])
			);
			const attributeType = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['속성유형', '속성 유형'])
			);
			const requiredInput =
				parseOptionalText(
					getHeaderMappedValue(row, headerIndexMap, ['필수입력여부', '필수입력 여부'])
				) ?? '';
			const identifierFlag = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['식별자여부', '식별자 여부'])
			);
			const refEntityName =
				parseOptionalText(
					getHeaderMappedValue(row, headerIndexMap, ['참조엔터티명', '참조 엔터티명'])
				) ?? '';
			const refAttributeName = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['참조속성명', '참조 속성명'])
			);
			const attributeDescription = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['속성설명', '속성 설명'])
			);

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
				entry.schemaName ?? '',
				entry.entityName ?? '',
				entry.attributeName ?? '',
				entry.attributeType ?? '',
				entry.requiredInput ?? '',
				entry.identifierFlag ?? '',
				entry.refEntityName ?? '',
				entry.refAttributeName ?? '',
				entry.attributeDescription ?? ''
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
		const rawData = parseWorkbookToArrayByRequiredHeaders(
			fileBuffer,
			[['스키마명', 'schema'], '테이블영문명', '테이블한글명'],
			DB_DESIGN_SHEET_POLICIES.table
		);
		const headerIndexMap = createHeaderIndexMap(rawData[0] || []);
		const dataRows = rawData.slice(1);
		const entries: TableEntry[] = [];
		const seenKeys = skipDuplicates ? new Set<string>() : null;

		for (let i = 0; i < dataRows.length; i++) {
			const row = dataRows[i];
			if (isEmptyRow(row)) continue;

			// 헤더 기반 매핑:
			// - 기존 내보내기 형식: 번호, 물리DB명, 테이블소유자, 주제영역, 스키마명, 테이블영문명...
			// - BKSP 테이블정의서 형식: 순번, 물리DB명, 테이블소유자, 주제영역, schema, 테이블 영문명...
			const physicalDbName = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['물리DB명'])
			);
			const tableOwner = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['테이블소유자'])
			);
			const subjectArea = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['주제영역'])
			);
			const schemaName = parseRequiredText(
				getHeaderMappedValue(row, headerIndexMap, ['스키마명', 'schema'])
			);
			const tableEnglishName = parseRequiredText(
				getHeaderMappedValue(row, headerIndexMap, ['테이블영문명', '테이블 영문명'])
			);
			const tableKoreanName = parseRequiredText(
				getHeaderMappedValue(row, headerIndexMap, ['테이블한글명', '테이블 한글명'])
			);
			const tableType = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['테이블유형', '테이블 유형'])
			);
			const relatedEntityName = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['관련엔터티명', '관련 엔터티명'])
			);
			const tableDescription = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['테이블설명', '테이블 설명'])
			);
			const businessClassification =
				parseOptionalText(getHeaderMappedValue(row, headerIndexMap, ['업무분류체계'])) ?? '';
			const retentionPeriod = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['보존기간', '보존 기간'])
			);
			const tableVolume =
				parseOptionalText(
					getHeaderMappedValue(row, headerIndexMap, ['테이블볼륨', '테이블 볼륨'])
				) ?? '';
			const occurrenceCycle = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['발생주기'])
			);
			const publicFlag = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['공개/비공개여부', '공개/비공개 여부'])
			);
			const nonPublicReason =
				parseOptionalText(
					getHeaderMappedValue(row, headerIndexMap, ['비공개사유', '비공개 사유'])
				) ?? '';
			const openDataList =
				parseOptionalText(getHeaderMappedValue(row, headerIndexMap, ['개방데이터목록'])) ?? '';

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
				entry.physicalDbName ?? '',
				entry.tableOwner ?? '',
				entry.subjectArea ?? '',
				entry.schemaName ?? '',
				entry.tableEnglishName ?? '',
				entry.tableKoreanName ?? '',
				entry.tableType ?? '',
				entry.relatedEntityName ?? '',
				entry.tableDescription ?? '',
				entry.businessClassification,
				entry.retentionPeriod ?? '',
				entry.tableVolume,
				entry.occurrenceCycle ?? '',
				entry.publicFlag ?? '',
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
		const rawData = parseWorkbookToArrayByRequiredHeaders(
			fileBuffer,
			[['스키마명', 'schema'], '컬럼영문명', '자료길이', 'PK정보'],
			DB_DESIGN_SHEET_POLICIES.column
		);
		const headerIndexMap = createHeaderIndexMap(rawData[0] || []);
		const dataRows = rawData.slice(1);
		const entries: ColumnEntry[] = [];
		const seenKeys = skipDuplicates ? new Set<string>() : null;

		for (let i = 0; i < dataRows.length; i++) {
			const row = dataRows[i];
			if (isEmptyRow(row)) continue;

			const scopeFlag = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['사업범위여부', '사업범위 여부'])
			);
			const subjectArea = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['주제영역'])
			);
			const schemaName = parseRequiredText(
				getHeaderMappedValue(row, headerIndexMap, ['스키마명', 'schema'])
			);
			const tableEnglishName = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['테이블영문명', '테이블 영문명'])
			);
			const columnEnglishName = parseRequiredText(
				getHeaderMappedValue(row, headerIndexMap, ['컬럼영문명', '컬럼 영문명'])
			);
			const columnKoreanName = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['컬럼한글명', '컬럼 한글명'])
			);
			const columnDescription = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['컬럼설명', '컬럼 설명'])
			);
			const relatedEntityName = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['연관엔터티명', '연관 엔터티명'])
			);
			const domainName = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['도메인명', '도메인 명'])
			);
			const dataType = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, [
					'자료타입',
					'자료 타입',
					'데이터타입',
					'데이터 타입'
				])
			);
			const dataLength = parseRequiredText(
				getHeaderMappedValue(row, headerIndexMap, [
					'자료길이',
					'자료 길이',
					'데이터길이',
					'데이터 길이'
				])
			);
			const dataDecimalLength =
				parseOptionalText(
					getHeaderMappedValue(row, headerIndexMap, ['자료소수점길이', '자료 소수점 길이'])
				) ?? '';
			const dataFormat =
				parseOptionalText(getHeaderMappedValue(row, headerIndexMap, ['자료형식', '자료 형식'])) ??
				'';
			const notNullFlag = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['NOTNULL여부', 'NOTNULL 여부', 'NOT NULL 여부'])
			);
			const pkInfo = parseRequiredText(
				getHeaderMappedValue(row, headerIndexMap, ['PK정보', 'PK 정보'])
			);
			const fkInfo = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['FK정보', 'FK 정보'])
			);
			const indexName =
				parseOptionalText(getHeaderMappedValue(row, headerIndexMap, ['인덱스명'])) ?? '';
			const indexOrder =
				parseOptionalText(
					getHeaderMappedValue(row, headerIndexMap, ['인덱스순번', '인덱스 순번'])
				) ?? '';
			const akInfo =
				parseOptionalText(getHeaderMappedValue(row, headerIndexMap, ['AK정보', 'AK 정보'])) ?? '';
			const constraint =
				parseOptionalText(getHeaderMappedValue(row, headerIndexMap, ['제약조건'])) ?? '';
			const personalInfoFlag = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['개인정보여부', '개인정보 여부'])
			);
			const encryptionFlag = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['암호화여부', '암호화 여부'])
			);
			const publicFlag = parseOptionalText(
				getHeaderMappedValue(row, headerIndexMap, ['공개/비공개여부', '공개/비공개 여부'])
			);

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
				domainName,
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
			'도메인명',
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
				entry.scopeFlag ?? '',
				entry.subjectArea ?? '',
				entry.schemaName ?? '',
				entry.tableEnglishName ?? '',
				entry.columnEnglishName ?? '',
				entry.columnKoreanName ?? '',
				entry.columnDescription ?? '',
				entry.relatedEntityName ?? '',
				entry.domainName ?? '',
				entry.dataType ?? '',
				entry.dataLength,
				entry.dataDecimalLength,
				entry.dataFormat,
				entry.notNullFlag ?? '',
				entry.pkInfo,
				entry.fkInfo ?? '',
				entry.indexName,
				entry.indexOrder,
				entry.akInfo,
				entry.constraint,
				entry.personalInfoFlag ?? '',
				entry.encryptionFlag ?? '',
				entry.publicFlag ?? ''
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
