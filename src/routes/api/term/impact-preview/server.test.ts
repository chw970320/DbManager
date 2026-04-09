import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/utils/change-impact-preview.js', () => ({
	buildScopedTermImpactPreview: vi.fn()
}));

vi.mock('$lib/utils/cascade-update-plan.js', () => ({
	planCascadeUpdate: vi.fn()
}));

import { buildScopedTermImpactPreview } from '$lib/utils/change-impact-preview.js';
import { planCascadeUpdate } from '$lib/utils/cascade-update-plan.js';

function createEvent(body?: unknown): RequestEvent {
	return {
		url: new URL('http://localhost/api/term/impact-preview'),
		request: {
			json: vi.fn().mockResolvedValue(body || {})
		}
	} as unknown as RequestEvent;
}

describe('API: /api/term/impact-preview', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('proposedEntry가 없으면 400을 반환한다', async () => {
		const response = await POST(createEvent({ filename: 'term.json' }));
		const result = await response.json();

		expect(response.status).toBe(400);
		expect(result.success).toBe(false);
	});

	it('full scope에서는 기존 term impact preview를 반환한다', async () => {
		vi.mocked(buildScopedTermImpactPreview).mockResolvedValue({
			files: { term: 'term.json', domain: 'domain.json', column: 'column.json' },
			mode: 'update',
			current: null,
			proposed: {
				id: 't1',
				termName: '사용자_이름',
				columnName: 'USER_NAME',
				domainName: '사용자명_VARCHAR(50)'
			},
			changes: {
				termNameChanged: false,
				columnNameChanged: false,
				domainNameChanged: false
			},
			summary: {
				currentLinkedColumnCount: 0,
				nextLinkedColumnCount: 1,
				columnLinksToBeBroken: 0,
				newColumnLinksDetected: 0,
				affectedColumnStandardizationCount: 0,
				proposedDomainExists: true
			},
			samples: {
				currentLinkedColumns: [],
				nextLinkedColumns: [{ id: 'c1', name: 'USER_NAME' }]
			},
			guidance: ['저장 후 컬럼-용어 동기화를 실행하면 1개 컬럼이 새 용어와 연결될 수 있습니다.']
		});

		const response = await POST(
			createEvent({
				filename: 'term.json',
				proposedEntry: {
					id: 't1',
					termName: '사용자_이름',
					columnName: 'USER_NAME',
					domainName: '사용자명_VARCHAR(50)'
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.summary.nextLinkedColumnCount).toBe(1);
	});

	it('editor-save scope에서는 cascade preview를 반환한다', async () => {
		vi.mocked(planCascadeUpdate).mockResolvedValue({
			blocked: false,
			plan: {} as never,
			sourceEntry: {} as never,
			preview: {
				sourceType: 'term',
				sourceFilename: 'term.json',
				sourceEntryId: 't1',
				sourceEntryName: '사용자_이름',
				mode: 'update',
				summary: {
					sourceChangeCount: 1,
					relatedChangeCount: 0,
					totalChangedFiles: 1,
					conflictCount: 0
				},
				fileSummaries: [],
				guidance: [],
				conflicts: [],
				blocked: false
			}
		} as never);

		const response = await POST(
			createEvent({
				filename: 'term.json',
				scope: 'editor-save',
				currentEntry: { id: 't1' },
				proposedEntry: {
					id: 't1',
					termName: '사용자_이름',
					columnName: 'USER_NAME',
					domainName: '사용자명_VARCHAR(50)'
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.sourceType).toBe('term');
	});
});
