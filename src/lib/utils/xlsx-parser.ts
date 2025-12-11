import XLSX from 'xlsx-js-style';
import { v4 as uuidv4 } from 'uuid';
import type { DomainEntry, RawDomainData } from '../types/domain.js';
import { validateVocabularyEntry } from './validation.js';
import type { VocabularyEntry, VocabularyData } from '../types/vocabulary.js';

/**
 * xlsx 파일 버퍼를 파싱하여 단어집 엔트리 배열로 변환
 * @param fileBuffer - xlsx 파일의 Buffer 데이터
 * @param skipDuplicates - 파일 내 중복 데이터 건너뛰기 여부 (기본값: true)
 * @returns VocabularyEntry 배열
 */
export function parseXlsxToJson(fileBuffer: Buffer, skipDuplicates: boolean = true): VocabularyEntry[] {
	try {
		// xlsx 파일을 워크북으로 읽기
		const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

		// 첫 번째 시트 가져오기
		const firstSheetName = workbook.SheetNames[0];
		if (!firstSheetName) {
			throw new Error('Excel 파일에 시트가 없습니다.');
		}

		const worksheet = workbook.Sheets[firstSheetName];

		// 시트를 JSON으로 변환 (헤더 포함)
		const rawData: string[][] = XLSX.utils.sheet_to_json(worksheet, {
			header: 1, // 배열 형태로 반환
			defval: '' // 빈 셀은 빈 문자열로 처리
		});

		if (rawData.length < 2) {
			throw new Error('Excel 파일에 데이터가 충분하지 않습니다. (헤더 + 최소 1행 필요)');
		}

		// 첫 번째 행(헤더) 제외하고 데이터 처리
		const dataRows = rawData.slice(1);
		const entries: VocabularyEntry[] = [];
		const seenCombinations = skipDuplicates ? new Set<string>() : null; // 중복 체크용 (skipDuplicates가 false면 null)

		/**
		 * 배열 필드 파싱 헬퍼 함수 (이음동의어, 금칙어)
		 */
		const parseArrayField = (value: string | number | undefined): string[] => {
			if (!value) return [];
			const str = String(value).trim();
			if (str === '-' || str === '') return [];
			return str.split(',').map((item) => item.trim()).filter((item) => item.length > 0);
		};

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
			const isFormalWord = row[5]
				? String(row[5]).trim().toUpperCase() === 'Y'
				: false;

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

		// 헤더 정의
		const headers = ['표준단어명', '영문약어', '영문명', '설명'];

		// 헤더 행 추가 (A1, B1, C1, D1)
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
				entry.standardName,
				entry.abbreviation,
				entry.englishName,
				entry.description || ''
			];

			values.forEach((value, colIndex) => {
				const cellAddress = getCellAddress(row, colIndex);
				worksheet[cellAddress] = {
					v: value,
					t: 's',
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

		// 워크시트 범위 설정
		const lastRow = data.length;
		const lastCol = headers.length - 1;
		worksheet['!ref'] = `A1:${getCellAddress(lastRow, lastCol)}`;

		// 컬럼 너비 설정
		worksheet['!cols'] = [
			{ wch: 25 }, // 표준단어명
			{ wch: 20 }, // 영문약어
			{ wch: 30 }, // 영문명
			{ wch: 40 } // 설명
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
export function parseDomainXlsxToJson(fileBuffer: Buffer, skipDuplicates: boolean = true): DomainEntry[] {
	try {
		// xlsx 파일을 워크북으로 읽기
		const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

		// 첫 번째 시트 가져오기
		const firstSheetName = workbook.SheetNames[0];
		if (!firstSheetName) {
			throw new Error('Excel 파일에 시트가 없습니다.');
		}

		const worksheet = workbook.Sheets[firstSheetName];

		// 시트를 JSON으로 변환 (헤더 포함)
		const rawData: string[][] = XLSX.utils.sheet_to_json(worksheet, {
			header: 1, // 배열 형태로 반환
			defval: '' // 빈 셀은 빈 문자열로 처리
		});

		if (rawData.length < 2) {
			throw new Error('Excel 파일에 데이터가 충분하지 않습니다. (헤더 + 최소 1행 필요)');
		}

		// 헤더 검증
		const headerRow = rawData[0];

		// 헤더가 예상과 다른 경우 경고하지만 계속 진행
		if (headerRow.length < 5) {
			throw new Error(
				'Excel 파일의 헤더가 부족합니다. 최소 5개 컬럼(도메인그룹, 도메인 분류명, 표준 도메인명, 논리 데이터타입, 물리 데이터타입)이 필요합니다.'
			);
		}

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

			// 컬럼 매핑: A=도메인그룹, B=도메인 분류명, C=표준 도메인명, D=논리 데이터타입, E=물리 데이터타입, F=데이터 길이, G=소수점자리수, H=데이터값, I=측정단위, J=비고
			const rawEntry: RawDomainData = {
				도메인그룹: row[0] ? String(row[0]).trim() : '',
				'도메인 분류명': row[1] ? String(row[1]).trim() : '',
				'표준 도메인명': row[2] ? String(row[2]).trim() : '',
				'논리 데이터타입': row[3] ? String(row[3]).trim() : '',
				'물리 데이터타입': row[4] ? String(row[4]).trim() : '',
				'데이터 길이': row[5] ? row[5] : undefined,
				소수점자리수: row[6] ? row[6] : undefined,
				데이터값: row[7] ? String(row[7]).trim() : undefined,
				측정단위: row[8] ? String(row[8]).trim() : undefined,
				비고: row[9] ? String(row[9]).trim() : undefined
			};

			// 필수 필드 검증
			if (
				!rawEntry.도메인그룹 ||
				!rawEntry['도메인 분류명'] ||
				!rawEntry['표준 도메인명'] ||
				!rawEntry['논리 데이터타입'] ||
				!rawEntry['물리 데이터타입']
			) {
				console.warn(`Row ${i + 2}: 필수 필드가 누락된 데이터 건너뜀 -`, rawEntry);
				continue;
			}

			// 중복 체크 (도메인그룹 + 표준 도메인명 조합) - skipDuplicates가 true일 때만 실행
			if (skipDuplicates && seenCombinations) {
				const combination = `${rawEntry.도메인그룹}|${rawEntry['표준 도메인명']}`;
				if (seenCombinations.has(combination)) {
					console.warn(`Row ${i + 2}: 중복 데이터 건너뜀 -`, rawEntry);
					continue;
				}
				seenCombinations.add(combination);
			}

			// 데이터 타입 변환
			let dataLength: number | undefined;
			let decimalPlaces: number | undefined;

			if (rawEntry['데이터 길이'] !== undefined && rawEntry['데이터 길이'] !== '') {
				const lengthNum = Number(rawEntry['데이터 길이']);
				if (!isNaN(lengthNum) && lengthNum > 0) {
					dataLength = lengthNum;
				}
			}

			if (rawEntry.소수점자리수 !== undefined && rawEntry.소수점자리수 !== '') {
				const decimalNum = Number(rawEntry.소수점자리수);
				if (!isNaN(decimalNum) && decimalNum >= 0) {
					decimalPlaces = decimalNum;
				}
			}

			// 최종 엔트리 생성
			const entry: DomainEntry = {
				id: uuidv4(),
				domainGroup: rawEntry.도메인그룹,
				domainCategory: rawEntry['도메인 분류명'],
				standardDomainName: rawEntry['표준 도메인명'],
				logicalDataType: rawEntry['논리 데이터타입'],
				physicalDataType: rawEntry['물리 데이터타입'],
				dataLength,
				decimalPlaces,
				dataValue: rawEntry.데이터값 || undefined,
				measurementUnit: rawEntry.측정단위 || undefined,
				remarks: rawEntry.비고 || undefined,
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

		// 헤더 정의
		const headers = [
			'도메인그룹',
			'도메인 분류명',
			'표준 도메인명',
			'논리 데이터타입',
			'물리 데이터타입',
			'데이터 길이',
			'소수점자리수',
			'데이터값',
			'측정단위',
			'비고'
		];

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
				entry.domainGroup,
				entry.domainCategory,
				entry.standardDomainName,
				entry.logicalDataType,
				entry.physicalDataType,
				entry.dataLength?.toString() || '',
				entry.decimalPlaces?.toString() || '',
				entry.dataValue || '',
				entry.measurementUnit || '',
				entry.remarks || ''
			];

			values.forEach((value, colIndex) => {
				const cellAddress = getCellAddress(row, colIndex);
				worksheet[cellAddress] = {
					v: value,
					t: 's',
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

		// 워크시트 범위 설정
		const lastRow = data.length;
		const lastCol = headers.length - 1;
		worksheet['!ref'] = `A1:${getCellAddress(lastRow, lastCol)}`;

		// 컬럼 너비 설정
		worksheet['!cols'] = [
			{ wch: 15 }, // 도메인그룹
			{ wch: 20 }, // 도메인 분류명
			{ wch: 25 }, // 표준 도메인명
			{ wch: 15 }, // 데이터타입
			{ wch: 12 }, // 데이터길이
			{ wch: 12 }, // 소수점자리
			{ wch: 20 }, // 데이터 값
			{ wch: 30 } // 비고
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
