import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import DesignRelationEditorHost from './DesignRelationEditorHost.svelte';
import type { DatabaseEntry } from '$lib/types/database-design';
import type { DomainEntry } from '$lib/types/domain';
import type { TermEntry } from '$lib/types/term';
import type { RelationResolutionTarget } from '$lib/types/design-relation';

const { mockShowConfirm } = vi.hoisted(() => ({
	mockShowConfirm: vi.fn()
}));

vi.mock('$lib/stores/confirm-store', () => ({
	showConfirm: mockShowConfirm
}));

function databaseEntry(overrides: Partial<DatabaseEntry>): DatabaseEntry {
	return {
		id: 'db-1',
		organizationName: '기관',
		departmentName: '부서',
		appliedTask: '업무',
		relatedLaw: '법령',
		logicalDbName: '논리DB',
		physicalDbName: '물리DB',
		buildDate: '2024-01-01',
		dbDescription: '설명',
		dbmsInfo: 'PostgreSQL',
		osInfo: 'Linux',
		exclusionReason: '',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		...overrides
	};
}

function termEntry(overrides: Partial<TermEntry> = {}): TermEntry {
	return {
		id: 'term-1',
		termName: '사용자_이름',
		columnName: 'USER_NAME',
		domainName: '사용자분류_VARCHAR(50)',
		isMappedTerm: true,
		isMappedColumn: true,
		isMappedDomain: true,
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		...overrides
	};
}

function domainEntry(overrides: Partial<DomainEntry> = {}): DomainEntry {
	return {
		id: 'domain-1',
		domainGroup: '공통',
		domainCategory: '사용자분류',
		standardDomainName: '사용자분류_VARCHAR(50)',
		physicalDataType: 'VARCHAR',
		dataLength: '50',
		decimalPlaces: '',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		...overrides
	};
}

function termImpactPreview() {
	return {
		sourceType: 'term',
		sourceFilename: 'term.json',
		sourceEntryId: 'term-1',
		sourceEntryName: '사용자_이름',
		mode: 'update',
		summary: {
			sourceChangeCount: 1,
			relatedChangeCount: 0,
			totalChangedFiles: 1,
			conflictCount: 0
		},
		fileSummaries: [
			{
				type: 'term',
				filename: 'term.json',
				role: 'source',
				changedCount: 1,
				samples: [{ id: 'term-1', name: '사용자_이름', reason: '용어 변경사항 저장' }]
			}
		],
		guidance: ['이번 저장은 용어집 원본 항목만 변경합니다.'],
		conflicts: [],
		blocked: false
	};
}

function domainImpactPreview() {
	return {
		sourceType: 'domain',
		sourceFilename: 'domain.json',
		sourceEntryId: 'domain-1',
		sourceEntryName: '사용자분류_VARCHAR(50)',
		mode: 'update',
		summary: {
			sourceChangeCount: 1,
			relatedChangeCount: 0,
			totalChangedFiles: 1,
			conflictCount: 0
		},
		fileSummaries: [
			{
				type: 'domain',
				filename: 'domain.json',
				role: 'source',
				changedCount: 1,
				samples: [
					{
						id: 'domain-1',
						name: '사용자분류_VARCHAR(50)',
						reason: '도메인 변경사항 저장'
					}
				]
			}
		],
		guidance: ['이번 저장은 도메인 정의서 원본 항목만 변경합니다.'],
		conflicts: [],
		blocked: false
	};
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

describe('DesignRelationEditorHost', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockShowConfirm.mockResolvedValue(true);
		fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('수정 대상 조회 시 API limit 계약을 지키며 다음 페이지에서 대상 행을 찾는다', async () => {
		const target: RelationResolutionTarget = {
			resolutionTargetId: 'edit-db-1',
			targetType: 'database',
			targetId: 'db-2',
			targetLabel: '논리DB2',
			mode: 'edit',
			autoFixable: false,
			reason: '관계 검증 수동 수정 대상',
			previewText: 'DB 정의서를 수정합니다.'
		};

		fetchMock
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						success: true,
						data: {
							entries: [databaseEntry({ id: 'db-1', logicalDbName: '논리DB1' })],
							pagination: { currentPage: 1, totalPages: 2, hasNextPage: true }
						}
					}),
					{ status: 200, headers: { 'Content-Type': 'application/json' } }
				)
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						success: true,
						data: {
							entries: [databaseEntry({ id: 'db-2', logicalDbName: '논리DB2' })],
							pagination: { currentPage: 2, totalPages: 2, hasNextPage: false }
						}
					}),
					{ status: 200, headers: { 'Content-Type': 'application/json' } }
				)
			);

		render(DesignRelationEditorHost, {
			props: {
				target,
				files: { database: 'database.json' }
			}
		});

		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		expect(fetchMock.mock.calls[0][0]).toContain('limit=100');
		expect(fetchMock.mock.calls[0][0]).toContain('page=1');
		expect(fetchMock.mock.calls[1][0]).toContain('limit=100');
		expect(fetchMock.mock.calls[1][0]).toContain('page=2');
		expect(await screen.findByDisplayValue('논리DB2')).toBeInTheDocument();
	});

	it('용어 신규 추가 대상은 term API의 entry wrapper 계약으로 저장한다', async () => {
		const saved = vi.fn();
		const target: RelationResolutionTarget = {
			resolutionTargetId: 'create-term-1',
			targetType: 'term',
			targetLabel: '사용자_이름',
			mode: 'create',
			autoFixable: false,
			reason: '용어집 신규 추가',
			previewText: '용어집에 신규 용어를 추가합니다.',
			prefill: {
				termName: '사용자_이름',
				columnName: 'USER_NAME',
				domainName: '사용자분류_VARCHAR(50)'
			}
		};

		fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url.includes('/api/term/files/mapping')) {
				return Promise.resolve(
					jsonResponse({
						success: true,
						data: { mapping: { vocabulary: 'vocabulary.json', domain: 'domain.json' } }
					})
				);
			}
			if (url.includes('/api/term/recommend')) {
				return Promise.resolve(
					jsonResponse({
						success: true,
						data: {
							lastSegment: '이름',
							matchedStandardNames: ['이름'],
							matchedDomainCategories: ['사용자분류'],
							recommendations: ['사용자분류_VARCHAR(50)']
						}
					})
				);
			}
			if (url.includes('/api/term/impact-preview')) {
				return Promise.resolve(jsonResponse({ success: true, data: termImpactPreview() }));
			}
			if (url.includes('/api/term/validate')) {
				return Promise.resolve(jsonResponse({ success: true }));
			}
			if (url === '/api/term' && init?.method === 'POST') {
				const body = JSON.parse(String(init.body));
				return Promise.resolve(
					jsonResponse({
						success: true,
						data: termEntry({ ...body.entry, id: 'created-term-1' })
					})
				);
			}
			return Promise.resolve(jsonResponse({ success: false, error: 'unexpected request' }, 500));
		});

		render(DesignRelationEditorHost, {
			props: {
				target,
				files: { term: 'term.json' },
				onsaved: saved
			}
		});

		await waitFor(() => expect(screen.getByRole('button', { name: /저장/ })).not.toBeDisabled());
		await fireEvent.click(screen.getByRole('button', { name: /저장/ }));

		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/term',
				expect.objectContaining({
					method: 'POST',
					body: expect.any(String)
				})
			)
		);
		const saveCall = fetchMock.mock.calls.find(
			([url, init]) => String(url) === '/api/term' && init?.method === 'POST'
		);
		expect(JSON.parse(String(saveCall?.[1]?.body))).toEqual(
			expect.objectContaining({
				filename: 'term.json',
				applyCascade: false,
				entry: expect.objectContaining({
					termName: '사용자_이름',
					columnName: 'USER_NAME',
					domainName: '사용자분류_VARCHAR(50)'
				})
			})
		);
		await waitFor(() => expect(saved).toHaveBeenCalled());
	});

	it('용어 수정 대상도 PUT이 아니라 term API POST 계약으로 저장한다', async () => {
		const target: RelationResolutionTarget = {
			resolutionTargetId: 'edit-term-1',
			targetType: 'term',
			targetId: 'term-1',
			targetLabel: '사용자_이름',
			mode: 'edit',
			autoFixable: false,
			reason: '용어집 수정',
			previewText: '용어집 항목을 수정합니다.'
		};

		fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url.startsWith('/api/term?') && !init?.method) {
				return Promise.resolve(
					jsonResponse({
						success: true,
						data: {
							entries: [termEntry()],
							pagination: { currentPage: 1, totalPages: 1, hasNextPage: false }
						}
					})
				);
			}
			if (url.includes('/api/term/files/mapping')) {
				return Promise.resolve(
					jsonResponse({
						success: true,
						data: { mapping: { vocabulary: 'vocabulary.json', domain: 'domain.json' } }
					})
				);
			}
			if (url.includes('/api/term/recommend')) {
				return Promise.resolve(
					jsonResponse({
						success: true,
						data: {
							lastSegment: '이름',
							matchedStandardNames: ['이름'],
							matchedDomainCategories: ['사용자분류'],
							recommendations: ['사용자분류_VARCHAR(50)']
						}
					})
				);
			}
			if (url.includes('/api/term/impact-preview')) {
				return Promise.resolve(jsonResponse({ success: true, data: termImpactPreview() }));
			}
			if (url.includes('/api/term/validate')) {
				return Promise.resolve(jsonResponse({ success: true }));
			}
			if (url === '/api/term' && init?.method === 'POST') {
				const body = JSON.parse(String(init.body));
				return Promise.resolve(jsonResponse({ success: true, data: termEntry(body.entry) }));
			}
			return Promise.resolve(jsonResponse({ success: false, error: 'unexpected request' }, 500));
		});

		render(DesignRelationEditorHost, {
			props: {
				target,
				files: { term: 'term.json' }
			}
		});

		await waitFor(() => expect(screen.getByDisplayValue('사용자_이름')).toBeInTheDocument());
		await waitFor(() => expect(screen.getByRole('button', { name: /저장/ })).not.toBeDisabled());
		await fireEvent.click(screen.getByRole('button', { name: /저장/ }));

		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/term',
				expect.objectContaining({
					method: 'POST',
					body: expect.any(String)
				})
			)
		);
		expect(
			fetchMock.mock.calls.some(
				([url, init]) => String(url).startsWith('/api/term?') && init?.method === 'PUT'
			)
		).toBe(false);
	});

	it('도메인 신규 추가 대상은 relation popup에서 cascade를 자동 실행하지 않는다', async () => {
		const target: RelationResolutionTarget = {
			resolutionTargetId: 'create-domain-1',
			targetType: 'domain',
			targetLabel: '사용자분류_VARCHAR(50)',
			mode: 'create',
			autoFixable: false,
			reason: '도메인 신규 추가',
			previewText: '도메인 정의서에 신규 도메인을 추가합니다.',
			prefill: {
				domainGroup: '공통',
				domainCategory: '사용자분류',
				physicalDataType: 'VARCHAR',
				dataLength: '50'
			}
		};

		fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url.includes('/api/domain/validate')) {
				return Promise.resolve(jsonResponse({ success: true, data: { errors: [] } }));
			}
			if (url.includes('/api/domain/impact-preview')) {
				return Promise.resolve(jsonResponse({ success: true, data: domainImpactPreview() }));
			}
			if (url === '/api/domain?filename=domain.json' && init?.method === 'POST') {
				return Promise.resolve(
					jsonResponse({ success: true, data: domainEntry({ id: 'created-domain-1' }) })
				);
			}
			return Promise.resolve(jsonResponse({ success: false, error: 'unexpected request' }, 500));
		});

		render(DesignRelationEditorHost, {
			props: {
				target,
				files: { domain: 'domain.json' }
			}
		});

		await waitFor(() => expect(screen.getByRole('button', { name: /^저장$/ })).not.toBeDisabled());
		await fireEvent.click(screen.getByRole('button', { name: /^저장$/ }));

		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/domain?filename=domain.json',
				expect.objectContaining({
					method: 'POST',
					body: expect.any(String)
				})
			)
		);
		const saveCall = fetchMock.mock.calls.find(
			([url, init]) =>
				String(url) === '/api/domain?filename=domain.json' && init?.method === 'POST'
		);
		const saveBody = JSON.parse(String(saveCall?.[1]?.body));
		expect(saveBody).toEqual(expect.objectContaining({ applyCascade: false }));
	});

	it('도메인 수정 대상도 relation popup에서 cascade를 자동 실행하지 않는다', async () => {
		const target: RelationResolutionTarget = {
			resolutionTargetId: 'edit-domain-1',
			targetType: 'domain',
			targetId: 'domain-1',
			targetLabel: '사용자분류_VARCHAR(50)',
			mode: 'edit',
			autoFixable: false,
			reason: '도메인 수정',
			previewText: '도메인 정의서 항목을 수정합니다.'
		};

		fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url.startsWith('/api/domain?') && !init?.method) {
				return Promise.resolve(
					jsonResponse({
						success: true,
						data: {
							entries: [domainEntry()],
							pagination: { currentPage: 1, totalPages: 1, hasNextPage: false }
						}
					})
				);
			}
			if (url.includes('/api/domain/validate')) {
				return Promise.resolve(jsonResponse({ success: true, data: { errors: [] } }));
			}
			if (url.includes('/api/domain/impact-preview')) {
				return Promise.resolve(jsonResponse({ success: true, data: domainImpactPreview() }));
			}
			if (url === '/api/domain?filename=domain.json' && init?.method === 'PUT') {
				return Promise.resolve(jsonResponse({ success: true, data: domainEntry() }));
			}
			return Promise.resolve(jsonResponse({ success: false, error: 'unexpected request' }, 500));
		});

		render(DesignRelationEditorHost, {
			props: {
				target,
				files: { domain: 'domain.json' }
			}
		});

		await waitFor(() => expect(screen.getByDisplayValue('공통')).toBeInTheDocument());
		await waitFor(() => expect(screen.getByRole('button', { name: /^수정$/ })).not.toBeDisabled());
		await fireEvent.click(screen.getByRole('button', { name: /^수정$/ }));

		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/domain?filename=domain.json',
				expect.objectContaining({
					method: 'PUT',
					body: expect.any(String)
				})
			)
		);
		const saveCall = fetchMock.mock.calls.find(
			([url, init]) => String(url) === '/api/domain?filename=domain.json' && init?.method === 'PUT'
		);
		expect(JSON.parse(String(saveCall?.[1]?.body))).toEqual(
			expect.objectContaining({ applyCascade: false })
		);
	});
});
