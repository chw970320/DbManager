// vocabulary 기준으로 주석 정리

import type { VocabularyEntry } from '../types/vocabulary';

/**
 * 단어 데이터에서 중복된 항목의 ID를 찾아 반환하는 유틸리티 함수 (하위 호환성)
 * standardName, abbreviation, englishName을 기준으로 중복을 검사합니다.
 *
 * @param entries - 검사할 단어 데이터 배열
 * @returns 중복된 항목들의 ID Set
 */
export function getDuplicateIds(entries: VocabularyEntry[]): Set<string> {
	const duplicateDetails = getDuplicateDetails(entries);
	return new Set(duplicateDetails.keys());
}

/**
 * 단어 데이터에서 중복된 항목의 세부 정보를 반환하는 유틸리티 함수
 * standardName, abbreviation, englishName을 기준으로 중복을 검사하고,
 * 각 ID별로 어떤 필드가 중복되는지에 대한 상세 정보를 제공합니다.
 *
 * @param entries - 검사할 단어 데이터 배열
 * @returns 각 ID별 중복 필드 정보를 담은 Map
 */
export function getDuplicateDetails(
	entries: VocabularyEntry[]
): Map<string, { standardName: boolean; abbreviation: boolean; englishName: boolean }> {
	const duplicateDetails = new Map<
		string,
		{ standardName: boolean; abbreviation: boolean; englishName: boolean }
	>();

	// 각 필드별로 중복을 검사하고 세부 정보를 기록
	const checkField = (field: keyof VocabularyEntry) => {
		const fieldValues: Record<string, VocabularyEntry[]> = {};

		// 같은 값을 가진 항목들을 그룹화
		for (const entry of entries) {
			const value = (entry[field] as string).toLowerCase();
			if (!fieldValues[value]) {
				fieldValues[value] = [];
			}
			fieldValues[value].push(entry);
		}

		// 중복된 값(2개 이상의 항목)을 가진 그룹 처리
		for (const [_, entriesWithSameValue] of Object.entries(fieldValues)) {
			if (entriesWithSameValue.length > 1) {
				for (const entry of entriesWithSameValue) {
					if (!duplicateDetails.has(entry.id)) {
						duplicateDetails.set(entry.id, {
							standardName: false,
							abbreviation: false,
							englishName: false
						});
					}

					const details = duplicateDetails.get(entry.id)!;
					(details as { [key: string]: boolean })[field] = true;
				}
			}
		}
	};

	// 모든 필드에 대해 중복 검사 수행
	checkField('standardName');
	checkField('abbreviation');
	checkField('englishName');

	return duplicateDetails;
}

/**
 * 단어 데이터에서 중복된 그룹을 반환하는 함수
 * 기존 duplicates API에서 사용하기 위한 함수
 *
 * @param entries - 검사할 단어 데이터 배열
 * @returns 중복된 그룹들의 배열
 */
export function getDuplicateGroups(entries: VocabularyEntry[]): VocabularyEntry[][] {
	const duplicates: Record<string, VocabularyEntry[]> = {};
	const seen: Record<string, Record<string, VocabularyEntry>> = {
		standardName: {},
		abbreviation: {},
		englishName: {}
	};

	const checkAndAddDuplicate = (field: keyof VocabularyEntry, entry: VocabularyEntry) => {
		const value = (entry[field] as string).toLowerCase();
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
	return Object.values(duplicates).filter((group) => group.length > 1);
}
