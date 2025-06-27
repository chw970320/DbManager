import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import type { TerminologyEntry, TerminologyData } from '../types/terminology.js';
import { validateTerminologyEntry } from './validation.js';

/**
 * xlsx 파일 버퍼를 파싱하여 용어집 엔트리 배열로 변환
 * @param fileBuffer - xlsx 파일의 Buffer 데이터
 * @returns TerminologyEntry 배열
 */
export function parseXlsxToJson(fileBuffer: Buffer): TerminologyEntry[] {
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
        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,  // 배열 형태로 반환
            defval: ''  // 빈 셀은 빈 문자열로 처리
        });

        if (rawData.length < 2) {
            throw new Error('Excel 파일에 데이터가 충분하지 않습니다. (헤더 + 최소 1행 필요)');
        }

        // 첫 번째 행(헤더) 제외하고 데이터 처리
        const dataRows = rawData.slice(1);
        const entries: TerminologyEntry[] = [];
        const seenCombinations = new Set<string>(); // 중복 체크용

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];

            // 빈 행 건너뛰기
            if (!row || row.length === 0 || !row.some((cell: any) => cell && String(cell).trim())) {
                continue;
            }

            // 컬럼 매핑: A=표준단어명, B=영문약어, C=영문명
            const rawEntry = {
                standardName: row[0] ? String(row[0]).trim() : '',
                abbreviation: row[1] ? String(row[1]).trim() : '',
                englishName: row[2] ? String(row[2]).trim() : ''
            };

            // 유효성 검증
            const validatedEntry = validateTerminologyEntry(rawEntry);
            if (!validatedEntry) {
                console.warn(`Row ${i + 2}: 유효하지 않은 데이터 건너뜀 -`, rawEntry);
                continue;
            }

            // 중복 체크 (표준단어명 + 영문약어 조합)
            const combination = `${validatedEntry.standardName}|${validatedEntry.abbreviation}`;
            if (seenCombinations.has(combination)) {
                console.warn(`Row ${i + 2}: 중복 데이터 건너뜀 -`, validatedEntry);
                continue;
            }
            seenCombinations.add(combination);

            // 최종 엔트리 생성
            const entry: TerminologyEntry = {
                id: uuidv4(),
                standardName: validatedEntry.standardName,
                abbreviation: validatedEntry.abbreviation,
                englishName: validatedEntry.englishName,
                createdAt: new Date().toISOString()
            };

            entries.push(entry);
        }

        if (entries.length === 0) {
            throw new Error('유효한 용어집 데이터를 찾을 수 없습니다.');
        }

        console.log(`성공적으로 ${entries.length}개의 용어를 파싱했습니다.`);
        return entries;

    } catch (error) {
        console.error('xlsx 파싱 중 오류 발생:', error);
        throw new Error(`Excel 파일 파싱 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
}

/**
 * 용어집 엔트리 배열을 TerminologyData 형태로 변환
 * @param entries - TerminologyEntry 배열
 * @returns TerminologyData 객체
 */
export function createTerminologyData(entries: TerminologyEntry[]): TerminologyData {
    return {
        entries,
        lastUpdated: new Date().toISOString(),
        totalCount: entries.length
    };
} 