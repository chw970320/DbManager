import type { ColumnEntry } from '$lib/types/database-design.js';
import type { DomainEntry } from '$lib/types/domain.js';
import type { TermEntry } from '$lib/types/term.js';
import type {
	ColumnStandardRecommendationChange,
	ColumnStandardRecommendationCore,
	ColumnStandardRecommendationField,
	ColumnStandardRecommendationIssue,
	ColumnStandardRecommendationStatus
} from '$lib/types/column-standard-recommendation.js';
import { normalizeKey } from '$lib/utils/mapping-key.js';

type ColumnStandardRecommendationMaps = {
	termMap: Map<string, TermEntry>;
	domainMap: Map<string, DomainEntry>;
};

const FIELD_REASONS: Record<ColumnStandardRecommendationField, string> = {
	columnKoreanName: '매핑된 표준 용어의 용어명으로 컬럼 한글명을 맞춥니다.',
	domainName: '매핑된 표준 용어의 도메인명을 컬럼 도메인으로 맞춥니다.',
	dataType: '매핑된 도메인의 물리 데이터타입을 컬럼 자료타입으로 맞춥니다.',
	dataLength: '매핑된 도메인의 데이터 길이를 컬럼 자료길이로 맞춥니다.',
	dataDecimalLength: '매핑된 도메인의 소수점 자리수를 컬럼 소수점길이로 맞춥니다.'
};

const RECOMMENDATION_FIELDS: ColumnStandardRecommendationField[] = [
	'columnKoreanName',
	'domainName',
	'dataType',
	'dataLength',
	'dataDecimalLength'
];

function trimValue(value?: string | null): string {
	return typeof value === 'string' ? value.trim() : '';
}

export function buildColumnStandardRecommendationMaps(
	termEntries: TermEntry[],
	domainEntries: DomainEntry[]
): ColumnStandardRecommendationMaps {
	const termMap = new Map<string, TermEntry>();
	const domainMap = new Map<string, DomainEntry>();

	for (const entry of termEntries) {
		if (!entry.columnName) {
			continue;
		}

		termMap.set(normalizeKey(entry.columnName), entry);
	}

	for (const entry of domainEntries) {
		if (!entry.standardDomainName) {
			continue;
		}

		domainMap.set(normalizeKey(entry.standardDomainName), entry);
	}

	return { termMap, domainMap };
}

function buildChanges(
	entry: Partial<ColumnEntry>,
	recommendedValues: ColumnStandardRecommendationCore['recommendedValues']
): ColumnStandardRecommendationChange[] {
	const changes: ColumnStandardRecommendationChange[] = [];

	for (const field of RECOMMENDATION_FIELDS) {
		const currentValue = trimValue(entry[field]);
		const recommendedValue = trimValue(recommendedValues[field]);

		if (!recommendedValue || currentValue === recommendedValue) {
			continue;
		}

		changes.push({
			field,
			currentValue,
			recommendedValue,
			reason: FIELD_REASONS[field]
		});
	}

	return changes;
}

export function createColumnStandardRecommendation(
	entry: Partial<ColumnEntry>,
	maps: ColumnStandardRecommendationMaps
): ColumnStandardRecommendationCore {
	const columnEnglishName = trimValue(entry.columnEnglishName);
	const currentEntry: ColumnStandardRecommendationCore['entry'] = {
		columnEnglishName,
		columnKoreanName: trimValue(entry.columnKoreanName),
		domainName: trimValue(entry.domainName),
		dataType: trimValue(entry.dataType),
		dataLength: trimValue(entry.dataLength),
		dataDecimalLength: trimValue(entry.dataDecimalLength)
	};

	const issues: ColumnStandardRecommendationIssue[] = [];
	const recommendedValues: ColumnStandardRecommendationCore['recommendedValues'] = {};
	let matchedTerm: ColumnStandardRecommendationCore['matchedTerm'] = null;
	let matchedDomain: ColumnStandardRecommendationCore['matchedDomain'] = null;
	let status: ColumnStandardRecommendationStatus = 'unmatched';
	let domainResolved = false;

	if (!columnEnglishName) {
		issues.push({
			code: 'COLUMN_NAME_EMPTY',
			severity: 'error',
			message: '컬럼영문명을 입력하면 연결된 term/domain 기준으로 표준 추천을 계산합니다.'
		});
	} else {
		const termEntry = maps.termMap.get(normalizeKey(columnEnglishName));

		if (!termEntry) {
			issues.push({
				code: 'TERM_NOT_FOUND',
				severity: 'error',
				message: `columnEnglishName '${columnEnglishName}'과 일치하는 term.columnName을 찾지 못했습니다.`
			});
		} else {
			matchedTerm = {
				id: termEntry.id,
				termName: trimValue(termEntry.termName),
				columnName: trimValue(termEntry.columnName),
				domainName: trimValue(termEntry.domainName)
			};

			if (matchedTerm.termName) {
				recommendedValues.columnKoreanName = matchedTerm.termName;
			}

			if (!matchedTerm.domainName) {
				issues.push({
					code: 'TERM_DOMAIN_EMPTY',
					severity: 'warning',
					message: '매핑된 term 항목에 domainName이 비어 있습니다.'
				});
			} else {
				recommendedValues.domainName = matchedTerm.domainName;

				const domainEntry = maps.domainMap.get(normalizeKey(matchedTerm.domainName));
				if (!domainEntry) {
					issues.push({
						code: 'DOMAIN_NOT_FOUND',
						severity: 'warning',
						message: `도메인 '${matchedTerm.domainName}'을(를) domain 파일에서 찾지 못했습니다.`
					});
				} else {
					matchedDomain = {
						id: domainEntry.id,
						standardDomainName: trimValue(domainEntry.standardDomainName),
						physicalDataType: trimValue(domainEntry.physicalDataType),
						dataLength: trimValue(domainEntry.dataLength),
						decimalPlaces: trimValue(domainEntry.decimalPlaces)
					};
					domainResolved = true;

					if (matchedDomain.physicalDataType) {
						recommendedValues.dataType = matchedDomain.physicalDataType;
					}
					if (matchedDomain.dataLength) {
						recommendedValues.dataLength = matchedDomain.dataLength;
					}
					if (matchedDomain.decimalPlaces) {
						recommendedValues.dataDecimalLength = matchedDomain.decimalPlaces;
					}
				}
			}
		}
	}

	const changes = buildChanges(entry, recommendedValues);

	if (!columnEnglishName || !matchedTerm) {
		status = 'unmatched';
	} else if (changes.length > 0 || issues.length > 0) {
		status = 'recommended';
	} else {
		status = 'aligned';
	}

	const guidance: string[] = [];
	if (!matchedTerm) {
		guidance.push('컬럼영문명과 일치하는 표준 용어를 먼저 등록하거나 컬럼영문명을 조정하세요.');
	} else {
		if (changes.length > 0) {
			guidance.push(`추천값 ${changes.length}건을 적용하면 컬럼 정의를 표준 용어와 바로 맞출 수 있습니다.`);
		}
		if (!domainResolved) {
			guidance.push('매핑된 도메인이 없으면 자료형과 길이 표준을 자동 보정할 수 없습니다.');
		}
		if (changes.length === 0 && issues.length === 0) {
			guidance.push('현재 입력값이 연결된 표준 용어와 도메인 기준에 맞춰 정렬되어 있습니다.');
		}
	}

	return {
		entry: currentEntry,
		matchedTerm,
		matchedDomain,
		recommendedValues,
		changes,
		issues,
		guidance,
		summary: {
			status,
			changeCount: changes.length,
			issueCount: issues.length,
			exactTermMatch: !!matchedTerm,
			domainResolved
		}
	};
}
