import { describe, expect, it } from 'vitest';
import {
	applyVocabularyDomainMapping,
	recommendDomainNamesForSuffix,
	replaceExactUnderscoreToken
} from './cascade-update-rules.js';
import type { DomainEntry } from '$lib/types/domain.js';
import type { VocabularyEntry } from '$lib/types/vocabulary.js';

const domainEntries: DomainEntry[] = [
	{
		id: 'd1',
		domainGroup: '공통',
		domainCategory: '사용자분류',
		standardDomainName: '사용자분류_VARCHAR(50)',
		physicalDataType: 'VARCHAR',
		dataLength: '50',
		createdAt: '2026-04-09T00:00:00.000Z',
		updatedAt: '2026-04-09T00:00:00.000Z'
	},
	{
		id: 'd2',
		domainGroup: '공통',
		domainCategory: '상태분류',
		standardDomainName: '상태분류_CHAR(1)',
		physicalDataType: 'CHAR',
		dataLength: '1',
		createdAt: '2026-04-09T00:00:00.000Z',
		updatedAt: '2026-04-09T00:00:00.000Z'
	}
];

const vocabularyEntries: VocabularyEntry[] = [
	{
		id: 'v1',
		standardName: '사용자',
		abbreviation: 'USER',
		englishName: 'User',
		domainCategory: '사용자분류',
		domainGroup: '공통',
		isFormalWord: true,
		isDomainCategoryMapped: true,
		createdAt: '2026-04-09T00:00:00.000Z',
		updatedAt: '2026-04-09T00:00:00.000Z'
	},
	{
		id: 'v2',
		standardName: '상태',
		abbreviation: 'STATUS',
		englishName: 'Status',
		domainCategory: '상태분류',
		domainGroup: '공통',
		isFormalWord: true,
		isDomainCategoryMapped: true,
		createdAt: '2026-04-09T00:00:00.000Z',
		updatedAt: '2026-04-09T00:00:00.000Z'
	}
];

describe('cascade-update-rules', () => {
	it('replaces only exact underscore tokens', () => {
		expect(replaceExactUnderscoreToken('사용자_이름', '사용자', '회원')).toEqual({
			value: '회원_이름',
			changed: true
		});
		expect(replaceExactUnderscoreToken('SUPERUSER_NAME', 'USER', 'MEMBER')).toEqual({
			value: 'SUPERUSER_NAME',
			changed: false
		});
	});

	it('maps vocabulary domain info only when formal word is enabled', () => {
		expect(
			applyVocabularyDomainMapping(
				{
					...vocabularyEntries[0],
					isFormalWord: false
				},
				domainEntries
			)
		).toEqual({
			domainGroup: undefined,
			isDomainCategoryMapped: false
		});

		expect(applyVocabularyDomainMapping(vocabularyEntries[0], domainEntries)).toEqual({
			domainGroup: '공통',
			isDomainCategoryMapped: true
		});
	});

	it('recommends domain names from the last suffix token only', () => {
		expect(
			recommendDomainNamesForSuffix('접속_사용자', vocabularyEntries, domainEntries)
		).toEqual(['사용자분류_VARCHAR(50)']);
		expect(
			recommendDomainNamesForSuffix('사용자_상태', vocabularyEntries, domainEntries)
		).toEqual(['상태분류_CHAR(1)']);
		expect(recommendDomainNamesForSuffix('SUPERUSER_NAME', vocabularyEntries, domainEntries)).toEqual(
			[]
		);
	});
});
