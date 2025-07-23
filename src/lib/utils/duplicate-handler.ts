import type { TerminologyEntry } from '../types/terminology.js';

/**
 * 용어 데이터에서 중복된 항목의 ID를 찾아 반환하는 유틸리티 함수
 * standardName, abbreviation, englishName을 기준으로 중복을 검사합니다.
 * 
 * @param entries - 검사할 용어 데이터 배열
 * @returns 중복된 항목들의 ID Set
 */
export function getDuplicateIds(entries: TerminologyEntry[]): Set<string> {
    const duplicates: Record<string, TerminologyEntry[]> = {};
    const seen: Record<string, Record<string, TerminologyEntry>> = {
        standardName: {},
        abbreviation: {},
        englishName: {}
    };

    const checkAndAddDuplicate = (
        field: keyof typeof seen,
        entry: TerminologyEntry
    ) => {
        const value = (entry[field as keyof TerminologyEntry] as string).toLowerCase();
        if (seen[field][value]) {
            const key = `${field}:${value}`;
            if (!duplicates[key]) {
                duplicates[key] = [seen[field][value]];
            }
            duplicates[key].push(entry);
        } else {
            seen[field][value] = entry;
        }
    };

    // 모든 항목에 대해 중복 검사 수행
    for (const entry of entries) {
        checkAndAddDuplicate('standardName', entry);
        checkAndAddDuplicate('abbreviation', entry);
        checkAndAddDuplicate('englishName', entry);
    }

    // 중복된 그룹에서 모든 ID를 추출하여 Set으로 반환
    const duplicateIds = new Set<string>();
    const duplicateGroups = Object.values(duplicates).filter(group => group.length > 1);

    for (const group of duplicateGroups) {
        for (const entry of group) {
            duplicateIds.add(entry.id);
        }
    }

    return duplicateIds;
}

/**
 * 용어 데이터에서 중복된 그룹을 반환하는 함수
 * 기존 duplicates API에서 사용하기 위한 함수
 * 
 * @param entries - 검사할 용어 데이터 배열
 * @returns 중복된 그룹들의 배열
 */
export function getDuplicateGroups(entries: TerminologyEntry[]): TerminologyEntry[][] {
    const duplicates: Record<string, TerminologyEntry[]> = {};
    const seen: Record<string, Record<string, TerminologyEntry>> = {
        standardName: {},
        abbreviation: {},
        englishName: {}
    };

    const checkAndAddDuplicate = (
        field: keyof typeof seen,
        entry: TerminologyEntry
    ) => {
        const value = (entry[field as keyof TerminologyEntry] as string).toLowerCase();
        if (seen[field][value]) {
            const key = `${field}:${value}`;
            if (!duplicates[key]) {
                duplicates[key] = [seen[field][value]];
            }
            duplicates[key].push(entry);
        } else {
            seen[field][value] = entry;
        }
    };

    // 모든 항목에 대해 중복 검사 수행
    for (const entry of entries) {
        checkAndAddDuplicate('standardName', entry);
        checkAndAddDuplicate('abbreviation', entry);
        checkAndAddDuplicate('englishName', entry);
    }

    // 중복된 그룹만 필터링하여 반환
    return Object.values(duplicates).filter(group => group.length > 1);
} 