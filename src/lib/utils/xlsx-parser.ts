import XLSX from 'xlsx-js-style';
import { v4 as uuidv4 } from 'uuid';
import type { DomainEntry } from '../types/domain.js';
import { validateVocabularyEntry } from './validation.js';
import type { VocabularyEntry, VocabularyData } from '../types/vocabulary.js';
import type { TermEntry } from '../types/term.js';

// ============================================================================
// 공통 유틸리티 함수
// ============================================================================

/**
 * xlsx 파일 버퍼를 2D 배열로 파싱 (공통)
 * @param fileBuffer - xlsx 파일의 Buffer 데이터
 * @returns 2D 문자열 배열 (첫 번째 행은 헤더)
 */
export function parseWorkbookToArray(fileBuffer: Buffer): string[][] {
	const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

	const firstSheetName = workbook.SheetNames[0];
	if (!firstSheetName) {
		throw new Error('Excel 파일에 시트가 없습니다.');
	}

	const worksheet = workbook.Sheets[firstSheetName];
	const rawData: string[][] = XLSX.utils.sheet_to_json(worksheet, {
		header: 1,
		defval: ''
	});

	if (rawData.length < 2) {
		throw new Error('Excel 파일에 데이터가 충분하지 않습니다. (헤더 + 최소 1행 필요)');
	}

	return rawData;
}

/**
 * 배열 필드 파싱 헬퍼 함수 (이음동의어, 금칙어 등)
 */
export function parseArrayField(value: string | number | undefined): string[] {
	if (!value) return [];
	const str = String(value).trim();
	if (str === '-' || str === '') return [];
	return str
		.split(',')
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

/**
 * 빈 행 여부 확인
 */
export function isEmptyRow(row: (string | number | undefined)[] | undefined): boolean {
	if (!row || row.length === 0) return true;
	return !row.some((cell) => cell && String(cell).trim());
}

// ============================================================================
// Vocabulary 파싱
// ============================================================================

/**
 * xlsx 파일 버퍼를 파싱하여 단어집 엔트리 배열로 변환
 * @param fileBuffer - xlsx 파일의 Buffer 데이터
 * @param skipDuplicates - 파일 내 중복 데이터 건너뛰기 여부 (기본값: true)
 * @returns VocabularyEntry 배열
 */
export function parseXlsxToJson(
	fileBuffer: Buffer,
	skipDuplicates: boolean = true
): VocabularyEntry[] {
	try {
		// 공통 워크북 파싱
		const rawData = parseWorkbookToArray(fileBuffer);
		const dataRows = rawData.slice(1);
		const entries: VocabularyEntry[] = [];
		const seenCombinations = skipDuplicates ? new Set<string>() : null;

		for (let i = 0; i < dataRows.length; i++) {
			const row = dataRows[i];

			// 빈 행 건너뛰기
			if (isEmptyRow(row)) {
				continue;
			}

			// 컬럼 매핑: A=번호(무시), B=표준단어명, C=영문약어, D=영문명, E=단어 설명, F=형식단어여부, G=도메인분류명, H=이음동의어 목록, I=금칙어, J=출처
			const rawEntry = {
				standardName: row[1] ? String(row[1]).trim() : '',
				abbreviation: row[2] ? String(row[2]).trim() : '',
				englishName: row[3] ? String(row[3]).trim() : '',
				description: row[4] ? String(row[4]).trim() : '',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			// 유효성 검증
			const validatedEntry = validateVocabularyEntry({
				id: '',
				standardName: rawEntry.standardName ?? '',
				abbreviation: rawEntry.abbreviation ?? '',
				englishName: rawEntry.englishName ?? '',
				description: rawEntry.description ?? '',
				createdAt: '',
				updatedAt: ''
			});
			if (!validatedEntry) {
				console.warn(`Row ${i + 2}: 유효하지 않은 데이터 건너뜀 -`, rawEntry);
				continue;
			}

			// 중복 체크 (표준단어명 + 영문약어 조합) - skipDuplicates가 true일 때만 실행
			if (skipDuplicates && seenCombinations) {
				const combination = `${validatedEntry.standardName}|${validatedEntry.abbreviation}`;
				if (seenCombinations.has(combination)) {
					console.warn(`Row ${i + 2}: 중복 데이터 건너뜀 -`, validatedEntry);
					continue;
				}
				seenCombinations.add(combination);
			}

			// 형식단어여부 변환 (Y/N → boolean)
			const isFormalWord = row[5] ? String(row[5]).trim().toUpperCase() === 'Y' : false;

			// 도메인분류명 처리 ("-"는 빈값)
			const domainCategory =
				row[6] && String(row[6]).trim() !== '-' ? String(row[6]).trim() : undefined;

			// 이음동의어 목록 파싱
			const synonyms = parseArrayField(row[7]);

			// 금칙어 파싱
			const forbiddenWords = parseArrayField(row[8]);

			// 출처 처리
			const source = row[9] ? String(row[9]).trim() : undefined;

			// 최종 엔트리 생성
			const entry: VocabularyEntry = {
				id: uuidv4(),
				standardName: validatedEntry.standardName,
				abbreviation: validatedEntry.abbreviation,
				englishName: validatedEntry.englishName,
				description: rawEntry.description,
				isFormalWord,
				domainCategory,
				synonyms: synonyms.length > 0 ? synonyms : undefined,
				forbiddenWords: forbiddenWords.length > 0 ? forbiddenWords : undefined,
				source,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			entries.push(entry);
		}

		if (entries.length === 0) {
			throw new Error('유효한 단어집 데이터를 찾을 수 없습니다.');
		}

		return entries;
	} catch (error) {
		console.error('xlsx 파싱 중 오류 발생:', error);
		throw new Error(
			`Excel 파일 파싱 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 단어집 엔트리 배열을 VocabularyData 형태로 변환
 * @param entries - VocabularyEntry 배열
 * @returns VocabularyData 객체
 */
export function createVocabularyData(entries: VocabularyEntry[]): VocabularyData {
	return {
		entries,
		lastUpdated: new Date().toISOString(),
		totalCount: entries.length
	};
}

/**
 * 셀 주소를 수동으로 생성하는 헬퍼 함수
 */
function getCellAddress(row: number, col: number): string {
	const colName = String.fromCharCode(65 + col); // A, B, C, D
	return `${colName}${row + 1}`;
}

/**
 * 단어집 엔트리 배열을 XLSX 파일 버퍼로 변환 (xlsx-js-style 사용)
 * @param data - VocabularyEntry 배열
 * @returns XLSX 파일의 Buffer 데이터
 */
export function exportJsonToXlsxBuffer(data: VocabularyEntry[]): Buffer {
	try {
		// 빈 워크시트 생성
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const worksheet: Record<string, any> = {};

		// 헤더 정의 (A=번호, B=표준단어명, C=영문약어, D=영문명, E=설명, F=형식단어여부, G=도메인분류명, H=이음동의어, I=금칙어, J=출처)
		const headers = [
			'번호', // A
			'표준단어명', // B
			'영문약어', // C
			'영문명', // D
			'단어 설명', // E
			'형식단어여부', // F
			'도메인분류명', // G
			'이음동의어', // H
			'금칙어', // I
			'출처' // J
		];

		// 헤더 행 추가 (A1부터 J1까지)
		headers.forEach((header, index) => {
			const cellAddress = getCellAddress(0, index);
			worksheet[cellAddress] = {
				v: header,
				t: 's',
				s: {
					font: {
						bold: true,
						color: { rgb: 'FFFFFF' },
						sz: 12
					},
					fill: {
						patternType: 'solid',
						fgColor: { rgb: '4472C4' }
					},
					alignment: {
						horizontal: 'center',
						vertical: 'center'
					},
					border: {
						top: { style: 'thin', color: { rgb: '000000' } },
						bottom: { style: 'thin', color: { rgb: '000000' } },
						left: { style: 'thin', color: { rgb: '000000' } },
						right: { style: 'thin', color: { rgb: '000000' } }
					}
				}
			};
		});

		// 데이터 행 추가
		data.forEach((entry, rowIndex) => {
			const row = rowIndex + 1; // 헤더 다음 행부터 시작
			const values = [
				rowIndex + 1, // A: 번호
				entry.standardName, // B
				entry.abbreviation, // C
				entry.englishName, // D
				entry.description || '', // E
				entry.isFormalWord ? 'Y' : 'N', // F
				entry.domainCategory || '', // G
				entry.synonyms?.join(', ') || '', // H
				entry.forbiddenWords?.join(', ') || '', // I
				entry.source || '' // J
			];

			values.forEach((value, colIndex) => {
				const cellAddress = getCellAddress(row, colIndex);
				worksheet[cellAddress] = {
					v: value,
					t: colIndex === 0 ? 'n' : 's',
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
			});
		});

		// 워크시트 범위 설정 (A열부터 J열까지)
		const lastRow = data.length;
		const lastCol = headers.length - 1;
		worksheet['!ref'] = `A1:${getCellAddress(lastRow, lastCol)}`;

		// 컬럼 너비 설정 (A~J열)
		worksheet['!cols'] = [
			{ wch: 8 }, // A: 번호
			{ wch: 25 }, // B: 표준단어명
			{ wch: 20 }, // C: 영문약어
			{ wch: 30 }, // D: 영문명
			{ wch: 40 }, // E: 단어 설명
			{ wch: 12 }, // F: 형식단어여부
			{ wch: 20 }, // G: 도메인분류명
			{ wch: 30 }, // H: 이음동의어
			{ wch: 30 }, // I: 금칙어
			{ wch: 25 } // J: 출처
		];

		// 행 높이 설정
		const rowHeights = [];
		for (let i = 0; i <= lastRow; i++) {
			if (i === 0) {
				rowHeights.push({ hpt: 25 }); // 헤더 행 높이
			} else {
				rowHeights.push({ hpt: 20 }); // 데이터 행 높이
			}
		}
		worksheet['!rows'] = rowHeights;

		// 자동 필터 설정
		worksheet['!autofilter'] = { ref: worksheet['!ref'] };

		// 새 워크북 생성
		const workbook = XLSX.utils.book_new();

		// 워크시트를 워크북에 추가
		XLSX.utils.book_append_sheet(workbook, worksheet, '단어집');

		// 워크북을 버퍼로 변환 (스타일 포함)
		const buffer = XLSX.write(workbook, {
			type: 'buffer',
			bookType: 'xlsx',
			compression: true
		});

		return buffer as Buffer;
	} catch (error) {
		console.error('XLSX 생성 중 오류 발생:', error);
		throw new Error(
			`XLSX 파일 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * xlsx 파일 버퍼를 파싱하여 도메인 엔트리 배열로 변환
 * @param fileBuffer - xlsx 파일의 Buffer 데이터
 * @param skipDuplicates - 파일 내 중복 데이터 건너뛰기 여부 (기본값: true)
 * @returns DomainEntry 배열
 */
export function parseDomainXlsxToJson(
	fileBuffer: Buffer,
	skipDuplicates: boolean = true
): DomainEntry[] {
	try {
		// 공통 워크북 파싱
		const rawData = parseWorkbookToArray(fileBuffer);

		// 헤더 검증
		const headerRow = rawData[0];

		// 헤더가 예상과 다른 경우 경고하지만 계속 진행
		if (headerRow.length < 4) {
			throw new Error(
				'Excel 파일의 헤더가 부족합니다. 최소 4개 컬럼(재정차수, 공통표준도메인그룹명, 공통표준도메인분류명, 공통표준도메인명)이 필요합니다.'
			);
		}

		/**
		 * 선택적 텍스트 필드 파싱 헬퍼 함수 ("-"는 undefined로 변환)
		 */
		const parseOptionalText = (value: string | number | undefined): string | undefined => {
			if (!value) return undefined;
			const str = String(value).trim();
			return str === '-' || str === '' ? undefined : str;
		};

		// 첫 번째 행(헤더) 제외하고 데이터 처리
		const dataRows = rawData.slice(1);
		const entries: DomainEntry[] = [];
		const seenCombinations = skipDuplicates ? new Set<string>() : null; // 중복 체크용 (skipDuplicates가 false면 null)

		for (let i = 0; i < dataRows.length; i++) {
			const row = dataRows[i];

			// 빈 행 건너뛰기
			if (
				!row ||
				row.length === 0 ||
				!row.some((cell: string | number | undefined) => cell && String(cell).trim())
			) {
				continue;
			}

			// 컬럼 매핑: A=번호(무시), B=재정차수, C=공통표준도메인그룹명, D=공통표준도메인분류명, E=공통표준도메인명, F=공통표준도메인설명, G=데이터타입, H=데이터길이, I=데이터소수점길이, J=저장 형식, K=표현 형식, L=단위, M=허용값
			const domainGroup = row[2] ? String(row[2]).trim() : '';
			const domainCategory = row[3] ? String(row[3]).trim() : '';
			const standardDomainName = row[4] ? String(row[4]).trim() : '';
			const physicalDataType = row[6] ? String(row[6]).trim() : '';

			// 필수 필드 검증
			if (!domainGroup || !domainCategory || !standardDomainName || !physicalDataType) {
				console.warn(`Row ${i + 2}: 필수 필드가 누락된 데이터 건너뜀 -`, {
					domainGroup,
					domainCategory,
					standardDomainName,
					physicalDataType
				});
				continue;
			}

			// 중복 체크 (도메인그룹 + 표준 도메인명 조합) - skipDuplicates가 true일 때만 실행
			if (skipDuplicates && seenCombinations) {
				const combination = `${domainGroup}|${standardDomainName}`;
				if (seenCombinations.has(combination)) {
					console.warn(`Row ${i + 2}: 중복 데이터 건너뜀 -`, {
						domainGroup,
						standardDomainName
					});
					continue;
				}
				seenCombinations.add(combination);
			}

			// 최종 엔트리 생성
			const entry: DomainEntry = {
				id: uuidv4(),
				domainGroup,
				domainCategory,
				standardDomainName,
				physicalDataType,
				dataLength: parseOptionalText(row[7]),
				decimalPlaces: parseOptionalText(row[8]),
				measurementUnit: parseOptionalText(row[11]),
				revision: parseOptionalText(row[1]),
				description: parseOptionalText(row[5]),
				storageFormat: parseOptionalText(row[9]),
				displayFormat: parseOptionalText(row[10]),
				allowedValues: parseOptionalText(row[12]),
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			entries.push(entry);
		}

		if (entries.length === 0) {
			throw new Error('유효한 도메인 데이터를 찾을 수 없습니다.');
		}

		return entries;
	} catch (error) {
		console.error('도메인 xlsx 파싱 중 오류 발생:', error);
		throw new Error(
			`Excel 파일 파싱 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 도메인 엔트리 배열을 XLSX 파일 버퍼로 변환 (xlsx-js-style 사용)
 * @param data - DomainEntry 배열
 * @returns XLSX 파일의 Buffer 데이터
 */
export function exportDomainToXlsxBuffer(data: DomainEntry[]): Buffer {
	try {
		// 빈 워크시트 생성
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const worksheet: Record<string, any> = {};

		// 헤더 정의 (A열은 번호)
		const headers = [
			'번호',
			'재정차수',
			'공통표준도메인그룹명',
			'공통표준도메인분류명',
			'공통표준도메인명',
			'공통표준도메인설명',
			'데이터타입',
			'데이터길이',
			'데이터소수점길이',
			'저장 형식',
			'표현 형식',
			'단위',
			'허용값'
		];

		// 헤더 행 추가 (A열부터 시작)
		headers.forEach((header, index) => {
			const cellAddress = getCellAddress(0, index); // A열부터 시작
			worksheet[cellAddress] = {
				v: header,
				t: 's',
				s: {
					font: {
						bold: true,
						color: { rgb: 'FFFFFF' },
						sz: 12
					},
					fill: {
						patternType: 'solid',
						fgColor: { rgb: '4472C4' }
					},
					alignment: {
						horizontal: 'center',
						vertical: 'center'
					},
					border: {
						top: { style: 'thin', color: { rgb: '000000' } },
						bottom: { style: 'thin', color: { rgb: '000000' } },
						left: { style: 'thin', color: { rgb: '000000' } },
						right: { style: 'thin', color: { rgb: '000000' } }
					}
				}
			};
		});

		// 데이터 행 추가
		data.forEach((entry, rowIndex) => {
			const row = rowIndex + 1; // 헤더 다음 행부터 시작
			const values = [
				rowIndex + 1, // A열: 번호
				entry.revision || '',
				entry.domainGroup,
				entry.domainCategory,
				entry.standardDomainName,
				entry.description || '',
				entry.physicalDataType,
				entry.dataLength || '',
				entry.decimalPlaces || '',
				entry.storageFormat || '',
				entry.displayFormat || '',
				entry.measurementUnit || '',
				entry.allowedValues || ''
			];

			values.forEach((value, colIndex) => {
				const cellAddress = getCellAddress(row, colIndex);
				worksheet[cellAddress] = {
					v: value,
					t: colIndex === 0 ? 'n' : 's',
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
			});
		});

		// 워크시트 범위 설정 (A열부터 M열까지)
		const lastRow = data.length;
		const lastCol = headers.length - 1; // 0부터 시작
		worksheet['!ref'] = `A1:${getCellAddress(lastRow, lastCol)}`;

		// 컬럼 너비 설정 (A~M열)
		worksheet['!cols'] = [
			{ wch: 8 }, // A: 번호
			{ wch: 10 }, // B: 재정차수
			{ wch: 20 }, // C: 공통표준도메인그룹명
			{ wch: 20 }, // D: 공통표준도메인분류명
			{ wch: 25 }, // E: 공통표준도메인명
			{ wch: 30 }, // F: 공통표준도메인설명
			{ wch: 15 }, // G: 데이터타입
			{ wch: 12 }, // H: 데이터길이
			{ wch: 15 }, // I: 데이터소수점길이
			{ wch: 20 }, // J: 저장 형식
			{ wch: 20 }, // K: 표현 형식
			{ wch: 12 }, // L: 단위
			{ wch: 30 } // M: 허용값
		];

		// 행 높이 설정
		const rowHeights = [];
		for (let i = 0; i <= lastRow; i++) {
			if (i === 0) {
				rowHeights.push({ hpt: 25 }); // 헤더 행 높이
			} else {
				rowHeights.push({ hpt: 20 }); // 데이터 행 높이
			}
		}
		worksheet['!rows'] = rowHeights;

		// 자동 필터 설정
		worksheet['!autofilter'] = { ref: worksheet['!ref'] };

		// 새 워크북 생성
		const workbook = XLSX.utils.book_new();

		// 워크시트를 워크북에 추가
		XLSX.utils.book_append_sheet(workbook, worksheet, '도메인');

		// 워크북을 버퍼로 변환 (스타일 포함)
		const buffer = XLSX.write(workbook, {
			type: 'buffer',
			bookType: 'xlsx',
			compression: true
		});

		return buffer as Buffer;
	} catch (error) {
		console.error('도메인 XLSX 생성 중 오류 발생:', error);
		throw new Error(
			`XLSX 파일 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * xlsx 파일 버퍼를 파싱하여 용어 엔트리 배열로 변환
 * @param fileBuffer - xlsx 파일의 Buffer 데이터
 * @param skipDuplicates - 파일 내 중복 데이터 건너뛰기 여부 (기본값: true)
 * @returns TermEntry 배열 (매핑 여부는 false로 초기화)
 */
export function parseTermXlsxToJson(
	fileBuffer: Buffer,
	skipDuplicates: boolean = true
): Omit<
	TermEntry,
	'id' | 'isMappedTerm' | 'isMappedColumn' | 'isMappedDomain' | 'createdAt' | 'updatedAt'
>[] {
	try {
		// 공통 워크북 파싱
		const rawData = parseWorkbookToArray(fileBuffer);

		// 첫 번째 행(헤더) 제외하고 데이터 처리
		const dataRows = rawData.slice(1);
		const entries: Omit<
			TermEntry,
			'id' | 'isMappedTerm' | 'isMappedColumn' | 'isMappedDomain' | 'createdAt' | 'updatedAt'
		>[] = [];
		const seenCombinations = skipDuplicates ? new Set<string>() : null; // 중복 체크용

		for (let i = 0; i < dataRows.length; i++) {
			const row = dataRows[i];

			// 빈 행 건너뛰기
			if (
				!row ||
				row.length === 0 ||
				!row.some((cell: string | number | undefined) => cell && String(cell).trim())
			) {
				continue;
			}

			// 컬럼 매핑: A=번호(무시), B=용어명, C=칼럼명, D=도메인
			const termName = row[1] ? String(row[1]).trim() : '';
			const columnName = row[2] ? String(row[2]).trim() : '';
			const domainName = row[3] ? String(row[3]).trim() : '';

			// 필수 필드 검증
			if (!termName || !columnName || !domainName) {
				console.warn(`Row ${i + 2}: 필수 필드가 누락된 데이터 건너뜀 -`, {
					termName,
					columnName,
					domainName
				});
				continue;
			}

			// 중복 체크 (용어명 + 칼럼명 + 도메인 조합) - skipDuplicates가 true일 때만 실행
			if (skipDuplicates && seenCombinations) {
				const combination = `${termName}|${columnName}|${domainName}`;
				if (seenCombinations.has(combination)) {
					console.warn(`Row ${i + 2}: 중복 데이터 건너뜀 -`, {
						termName,
						columnName,
						domainName
					});
					continue;
				}
				seenCombinations.add(combination);
			}

			// 엔트리 생성 (매핑 여부는 업로드 API에서 처리)
			entries.push({
				termName,
				columnName,
				domainName
			});
		}

		if (entries.length === 0) {
			throw new Error('유효한 용어 데이터를 찾을 수 없습니다.');
		}

		return entries;
	} catch (error) {
		console.error('용어 xlsx 파싱 중 오류 발생:', error);
		throw new Error(
			`Excel 파일 파싱 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}

/**
 * 용어 엔트리 배열을 XLSX 파일 버퍼로 변환 (xlsx-js-style 사용)
 * @param data - TermEntry 배열
 * @returns XLSX 파일의 Buffer 데이터
 */
export function exportTermToXlsxBuffer(data: TermEntry[]): Buffer {
	try {
		// 새 워크시트 생성
		const worksheet = XLSX.utils.aoa_to_sheet([]);

		// 헤더 정의 (A: 번호, B: 용어명, C: 칼럼명, D: 도메인)
		const headers = ['번호', '용어명', '칼럼명', '도메인'];

		// 셀 주소 생성 헬퍼 함수
		const getCellAddress = (row: number, col: number): string => {
			return XLSX.utils.encode_cell({ r: row, c: col });
		};

		// 헤더 행 추가
		headers.forEach((header, index) => {
			const cellAddress = getCellAddress(0, index);
			worksheet[cellAddress] = {
				v: header,
				t: 's',
				s: {
					font: {
						bold: true,
						color: { rgb: 'FFFFFF' },
						sz: 12
					},
					fill: {
						patternType: 'solid',
						fgColor: { rgb: '4472C4' }
					},
					alignment: {
						horizontal: 'center',
						vertical: 'center'
					},
					border: {
						top: { style: 'thin', color: { rgb: '000000' } },
						bottom: { style: 'thin', color: { rgb: '000000' } },
						left: { style: 'thin', color: { rgb: '000000' } },
						right: { style: 'thin', color: { rgb: '000000' } }
					}
				}
			};
		});

		// 데이터 행 추가
		data.forEach((entry, rowIndex) => {
			const row = rowIndex + 1; // 헤더 다음 행부터 시작
			const values = [
				rowIndex + 1, // A: 번호
				entry.termName, // B: 용어명
				entry.columnName, // C: 칼럼명
				entry.domainName // D: 도메인
			];

			values.forEach((value, colIndex) => {
				const cellAddress = getCellAddress(row, colIndex);
				worksheet[cellAddress] = {
					v: value,
					t: colIndex === 0 ? 'n' : 's',
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
			});
		});

		// 워크시트 범위 설정 (A열부터 D열까지)
		const lastRow = data.length;
		const lastCol = headers.length - 1;
		worksheet['!ref'] = `A1:${getCellAddress(lastRow, lastCol)}`;

		// 컬럼 너비 설정 (A~D열)
		worksheet['!cols'] = [
			{ wch: 8 }, // A: 번호
			{ wch: 30 }, // B: 용어명
			{ wch: 30 }, // C: 칼럼명
			{ wch: 30 } // D: 도메인
		];

		// 행 높이 설정
		const rowHeights = [];
		for (let i = 0; i <= lastRow; i++) {
			if (i === 0) {
				rowHeights.push({ hpt: 25 }); // 헤더 행 높이
			} else {
				rowHeights.push({ hpt: 20 }); // 데이터 행 높이
			}
		}
		worksheet['!rows'] = rowHeights;

		// 자동 필터 설정
		worksheet['!autofilter'] = { ref: worksheet['!ref'] };

		// 새 워크북 생성
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, '용어');

		// 버퍼로 변환
		const buffer = XLSX.write(workbook, {
			type: 'buffer',
			bookType: 'xlsx'
		});

		return buffer as Buffer;
	} catch (error) {
		console.error('용어 XLSX 생성 중 오류 발생:', error);
		throw new Error(
			`XLSX 파일 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
		);
	}
}
