import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/utils/change-impact-preview.js', () => ({
	buildScopedDomainImpactPreview: vi.fn()
}));

vi.mock('$lib/utils/cascade-update-plan.js', () => ({
	planCascadeUpdate: vi.fn()
}));

import { buildScopedDomainImpactPreview } from '$lib/utils/change-impact-preview.js';
import { planCascadeUpdate } from '$lib/utils/cascade-update-plan.js';

function createEvent(body?: unknown): RequestEvent {
	return {
		url: new URL('http://localhost/api/domain/impact-preview'),
		request: {
			json: vi.fn().mockResolvedValue(body || {})
		}
	} as unknown as RequestEvent;
}

describe('API: /api/domain/impact-preview', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('full scope에서는 도메인 영향도 preview를 반환한다', async () => {
		vi.mocked(buildScopedDomainImpactPreview).mockResolvedValue({
			files: {
				domain: 'domain.json',
				vocabulary: 'vocabulary.json',
				term: 'term.json',
				column: 'column.json'
			},
			mode: 'delete',
			current: {
				id: 'd1',
				domainCategory: '사용자명',
				standardDomainName: '사용자명_VARCHAR(50)',
				physicalDataType: 'VARCHAR',
				dataLength: '50',
				decimalPlaces: ''
			},
			proposed: null,
			changes: {
				referenceKeyChanged: false,
				syncSpecChanged: false
			},
			summary: {
				vocabularyReferenceCount: 1,
				termReferenceCount: 2,
				columnReferenceCount: 3,
				totalReferenceCount: 6,
				downstreamBreakCount: 6,
				affectedColumnSyncCount: 0
			},
			references: [],
			guidance: ['삭제 시 총 6건이 미참조 또는 매핑 누락 상태가 될 수 있습니다.']
		});

		const response = await POST(createEvent({ mode: 'delete', currentEntry: { id: 'd1' } }));
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.summary.totalReferenceCount).toBe(6);
	});

	it('editor-save scope에서는 cascade preview를 반환한다', async () => {
		vi.mocked(planCascadeUpdate).mockResolvedValue({
			blocked: false,
			plan: {} as never,
			sourceEntry: {} as never,
			preview: {
				sourceType: 'domain',
				sourceFilename: 'domain.json',
				sourceEntryId: 'd1',
				sourceEntryName: '사용자명_VARCHAR(50)',
				mode: 'update',
				summary: {
					sourceChangeCount: 1,
					relatedChangeCount: 2,
					totalChangedFiles: 3,
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
				scope: 'editor-save',
				currentEntry: { id: 'd1' },
				proposedEntry: {
					id: 'd1',
					domainGroup: '공통',
					domainCategory: '사용자명',
					standardDomainName: '사용자명_VARCHAR(50)',
					physicalDataType: 'VARCHAR'
				}
			})
		);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.success).toBe(true);
		expect(result.data.sourceType).toBe('domain');
	});
});
