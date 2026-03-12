import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDomainImpactPreview, buildTermImpactPreview } from './change-impact-preview';

vi.mock('$lib/registry/mapping-registry.js', () => ({
	resolveRelatedFilenames: vi.fn(),
	checkEntryReferences: vi.fn()
}));

vi.mock('$lib/registry/data-registry.js', () => ({
	loadData: vi.fn()
}));

import { resolveRelatedFilenames, checkEntryReferences } from '$lib/registry/mapping-registry.js';
import { loadData } from '$lib/registry/data-registry.js';

describe('change-impact-preview', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(resolveRelatedFilenames).mockImplementation(async (type: string) => {
			if (type === 'term') {
				return new Map([
					['domain', 'domain-linked.json'],
					['column', 'column-linked.json']
				]);
			}
			return new Map([
				['vocabulary', 'vocabulary-linked.json'],
				['term', 'term-linked.json'],
				['column', 'column-linked.json']
			]);
		});
	});

	it('용어 columnName 변경 시 기존 연결과 신규 연결을 분리해서 계산한다', async () => {
		vi.mocked(checkEntryReferences)
			.mockResolvedValueOnce({
				canDelete: false,
				references: [
					{
						type: 'column',
						filename: 'column-linked.json',
						count: 2,
						entries: [
							{ id: 'c1', name: 'USER_NAME' },
							{ id: 'c2', name: 'USER_NAME_HIST' }
						]
					}
				]
			})
			.mockResolvedValueOnce({
				canDelete: false,
				references: [
					{
						type: 'column',
						filename: 'column-linked.json',
						count: 1,
						entries: [{ id: 'c3', name: 'MEMBER_NAME' }]
					}
				]
			});
		vi.mocked(loadData).mockResolvedValue({
			entries: [
				{
					id: 'd1',
					domainGroup: '공통',
					domainCategory: '회원명',
					standardDomainName: '회원명_VARCHAR(100)',
					physicalDataType: 'VARCHAR',
					createdAt: '',
					updatedAt: ''
				}
			],
			lastUpdated: '',
			totalCount: 1
		});

		const result = await buildTermImpactPreview({
			filename: 'term.json',
			currentEntry: {
				id: 't1',
				termName: '사용자_이름',
				columnName: 'USER_NAME',
				domainName: '사용자명_VARCHAR(100)'
			},
			proposedEntry: {
				id: 't1',
				termName: '회원_이름',
				columnName: 'MEMBER_NAME',
				domainName: '회원명_VARCHAR(100)'
			}
		});

		expect(result.files.column).toBe('column-linked.json');
		expect(result.summary.currentLinkedColumnCount).toBe(2);
		expect(result.summary.nextLinkedColumnCount).toBe(1);
		expect(result.summary.columnLinksToBeBroken).toBe(2);
		expect(result.summary.newColumnLinksDetected).toBe(1);
		expect(result.summary.proposedDomainExists).toBe(true);
		expect(result.guidance.join(' ')).toContain('기존 columnName과 연결된 2개 컬럼');
	});

	it('용어 domainName 변경 시 같은 컬럼 연결을 유지하면서 표준화 영향도를 계산한다', async () => {
		vi.mocked(checkEntryReferences)
			.mockResolvedValueOnce({
				canDelete: false,
				references: [
					{
						type: 'column',
						filename: 'column-linked.json',
						count: 3,
						entries: [{ id: 'c1', name: 'USER_NAME' }]
					}
				]
			})
			.mockResolvedValueOnce({
				canDelete: false,
				references: [
					{
						type: 'column',
						filename: 'column-linked.json',
						count: 3,
						entries: [{ id: 'c1', name: 'USER_NAME' }]
					}
				]
			});
		vi.mocked(loadData).mockResolvedValue({
			entries: [
				{
					id: 'd1',
					domainGroup: '공통',
					domainCategory: '회원명',
					standardDomainName: '회원명_VARCHAR(100)',
					physicalDataType: 'VARCHAR',
					createdAt: '',
					updatedAt: ''
				}
			],
			lastUpdated: '',
			totalCount: 1
		});

		const result = await buildTermImpactPreview({
			currentEntry: {
				id: 't1',
				termName: '사용자_이름',
				columnName: 'USER_NAME',
				domainName: '사용자명_VARCHAR(100)'
			},
			proposedEntry: {
				id: 't1',
				termName: '사용자_이름',
				columnName: 'USER_NAME',
				domainName: '회원명_VARCHAR(100)'
			}
		});

		expect(result.summary.currentLinkedColumnCount).toBe(3);
		expect(result.summary.nextLinkedColumnCount).toBe(3);
		expect(result.summary.affectedColumnStandardizationCount).toBe(3);
		expect(result.changes.domainNameChanged).toBe(true);
		expect(result.guidance.join(' ')).toContain('도메인/자료형');
	});

	it('도메인 삭제 시 참조 건수와 삭제 영향도를 함께 계산한다', async () => {
		vi.mocked(checkEntryReferences).mockResolvedValue({
			canDelete: false,
			references: [
				{
					type: 'vocabulary',
					filename: 'vocabulary-linked.json',
					count: 2,
					entries: [{ id: 'v1', name: '이름' }]
				},
				{
					type: 'term',
					filename: 'term-linked.json',
					count: 4,
					entries: [{ id: 't1', name: '사용자_이름' }]
				},
				{
					type: 'column',
					filename: 'column-linked.json',
					count: 3,
					entries: [{ id: 'c1', name: 'USER_NAME' }]
				}
			]
		});

		const result = await buildDomainImpactPreview({
			mode: 'delete',
			currentEntry: {
				id: 'd1',
				domainCategory: '사용자명',
				standardDomainName: '사용자명_VARCHAR(100)',
				physicalDataType: 'VARCHAR',
				dataLength: '100'
			}
		});

		expect(result.summary.vocabularyReferenceCount).toBe(2);
		expect(result.summary.termReferenceCount).toBe(4);
		expect(result.summary.columnReferenceCount).toBe(3);
		expect(result.summary.totalReferenceCount).toBe(9);
		expect(result.summary.downstreamBreakCount).toBe(9);
		expect(result.guidance.join(' ')).toContain('삭제 시 총 9건');
	});
});
