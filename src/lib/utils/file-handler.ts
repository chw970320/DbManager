import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { TerminologyData, TerminologyEntry } from '../types/terminology.js';
import { validateCompleteEntry } from './validation.js';

// 데이터 저장 경로 설정
const DATA_DIR = 'static/data';
const DATA_FILE = 'terminology.json';
const DATA_PATH = join(DATA_DIR, DATA_FILE);

/**
 * 데이터 디렉토리가 존재하는지 확인하고 없으면 생성
 */
export async function ensureDataDirectory(): Promise<void> {
    try {
        if (!existsSync(DATA_DIR)) {
            await mkdir(DATA_DIR, { recursive: true });
            console.log(`데이터 디렉토리 생성: ${DATA_DIR}`);
        }
    } catch (error) {
        console.error('데이터 디렉토리 생성 실패:', error);
        throw new Error(`데이터 디렉토리 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
}

/**
 * 용어집 데이터를 JSON 파일로 저장
 * @param data - 저장할 TerminologyData 객체
 */
export async function saveTerminologyData(data: TerminologyData): Promise<void> {
    try {
        // 데이터 디렉토리 확인 및 생성
        await ensureDataDirectory();

        // 데이터 유효성 검증
        if (!data || !Array.isArray(data.entries)) {
            throw new Error('유효하지 않은 용어집 데이터입니다.');
        }

        // 각 엔트리 유효성 검증
        const validEntries = data.entries.filter(entry => {
            const isValid = validateCompleteEntry(entry);
            if (!isValid) {
                console.warn('유효하지 않은 엔트리 제외:', entry);
            }
            return isValid;
        });

        if (validEntries.length === 0) {
            throw new Error('저장할 유효한 용어집 데이터가 없습니다.');
        }

        // 최종 데이터 객체 구성
        const finalData: TerminologyData = {
            entries: validEntries,
            lastUpdated: new Date().toISOString(),
            totalCount: validEntries.length
        };

        // JSON 파일로 저장 (들여쓰기 포함)
        const jsonString = JSON.stringify(finalData, null, 2);
        await writeFile(DATA_PATH, jsonString, 'utf-8');

        console.log(`용어집 데이터 저장 완료: ${validEntries.length}개 항목, 파일: ${DATA_PATH}`);

    } catch (error) {
        console.error('용어집 데이터 저장 실패:', error);
        throw new Error(`데이터 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
}

/**
 * 저장된 용어집 데이터를 JSON 파일에서 로드
 * @returns 로드된 TerminologyData 객체
 */
export async function loadTerminologyData(): Promise<TerminologyData> {
    try {
        // 파일 존재 확인
        if (!existsSync(DATA_PATH)) {
            console.log('용어집 데이터 파일이 없습니다. 빈 데이터를 반환합니다.');
            return {
                entries: [],
                lastUpdated: new Date().toISOString(),
                totalCount: 0
            };
        }

        // 파일 읽기
        const jsonString = await readFile(DATA_PATH, 'utf-8');

        if (!jsonString.trim()) {
            console.warn('용어집 데이터 파일이 비어있습니다.');
            return {
                entries: [],
                lastUpdated: new Date().toISOString(),
                totalCount: 0
            };
        }

        // JSON 파싱
        const data = JSON.parse(jsonString) as TerminologyData;

        // 데이터 구조 검증
        if (!data || typeof data !== 'object') {
            throw new Error('용어집 데이터 형식이 올바르지 않습니다.');
        }

        if (!Array.isArray(data.entries)) {
            throw new Error('용어집 엔트리 데이터가 배열이 아닙니다.');
        }

        // 각 엔트리 유효성 검증 및 필터링
        const validEntries = data.entries.filter(entry => {
            const isValid = validateCompleteEntry(entry);
            if (!isValid) {
                console.warn('로드 중 유효하지 않은 엔트리 발견:', entry);
            }
            return isValid;
        });

        console.log(`용어집 데이터 로드 완료: ${validEntries.length}개 항목`);

        return {
            entries: validEntries,
            lastUpdated: data.lastUpdated || new Date().toISOString(),
            totalCount: validEntries.length
        };

    } catch (error) {
        console.error('용어집 데이터 로드 실패:', error);

        // JSON 파싱 오류인 경우 더 구체적인 메시지
        if (error instanceof SyntaxError) {
            throw new Error('용어집 데이터 파일 형식이 손상되었습니다. 파일을 다시 업로드해주세요.');
        }

        throw new Error(`데이터 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
}

/**
 * 기존 용어집 데이터에 새로운 엔트리들을 병합
 * @param newEntries - 추가할 새로운 엔트리들
 * @param replaceExisting - 기존 데이터를 교체할지 여부 (기본값: true)
 * @returns 병합된 TerminologyData 객체
 */
export async function mergeTerminologyData(
    newEntries: TerminologyEntry[],
    replaceExisting: boolean = true
): Promise<TerminologyData> {
    try {
        // 기존 데이터 로드
        const existingData = await loadTerminologyData();

        let finalEntries: TerminologyEntry[];

        if (replaceExisting || existingData.entries.length === 0) {
            // 기존 데이터 교체 또는 기존 데이터가 없는 경우
            finalEntries = [...newEntries];
        } else {
            // 기존 데이터와 병합
            const existingMap = new Map<string, TerminologyEntry>();

            // 기존 엔트리들을 Map에 저장 (abbreviation을 키로 사용)
            existingData.entries.forEach(entry => {
                existingMap.set(entry.abbreviation, entry);
            });

            // 새로운 엔트리들 추가 (중복시 새 데이터로 덮어쓰기)
            newEntries.forEach(entry => {
                existingMap.set(entry.abbreviation, entry);
            });

            finalEntries = Array.from(existingMap.values());
        }

        // 최종 데이터 객체 생성
        const mergedData: TerminologyData = {
            entries: finalEntries,
            lastUpdated: new Date().toISOString(),
            totalCount: finalEntries.length
        };

        // 병합된 데이터 저장
        await saveTerminologyData(mergedData);

        console.log(`데이터 병합 완료: ${finalEntries.length}개 항목`);
        return mergedData;

    } catch (error) {
        console.error('데이터 병합 실패:', error);
        throw new Error(`데이터 병합 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
}

/**
 * 데이터 파일의 백업 생성
 * @returns 백업 파일 경로
 */
export async function createBackup(): Promise<string> {
    try {
        if (!existsSync(DATA_PATH)) {
            throw new Error('백업할 데이터 파일이 존재하지 않습니다.');
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `terminology_backup_${timestamp}.json`;
        const backupPath = join(DATA_DIR, backupFileName);

        const originalData = await readFile(DATA_PATH, 'utf-8');
        await writeFile(backupPath, originalData, 'utf-8');

        console.log(`백업 생성 완료: ${backupPath}`);
        return backupPath;

    } catch (error) {
        console.error('백업 생성 실패:', error);
        throw new Error(`백업 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
} 