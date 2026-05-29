import { describe, expect, it } from 'vitest';
import { getEditorSaveImpactStatus } from './editor-save-impact-status.js';

const basePreview = {
	blocked: false,
	summary: {
		sourceChangeCount: 0,
		relatedChangeCount: 0,
		totalChangedFiles: 0,
		conflictCount: 0
	}
};

describe('editor-save-impact-status', () => {
	it('returns fail-closed blocked presentation without implementation terms', () => {
		const status = getEditorSaveImpactStatus({
			...basePreview,
			summary: {
				...basePreview.summary,
				conflictCount: 1
			}
		});

		expect(status.kind).toBe('blocked');
		expect(status.label).toBe('저장 차단');
		expect(status.dialogDescription).toContain('자동 반영 충돌');
		expect(status.dialogDescription).not.toContain('blocked');
		expect(status.dialogDescription).not.toContain('conflictCount');
	});

	it('keeps shared labels for related, source, and neutral states', () => {
		expect(
			getEditorSaveImpactStatus({
				...basePreview,
				summary: { ...basePreview.summary, relatedChangeCount: 1 }
			}).label
		).toBe('검토 필요');
		expect(
			getEditorSaveImpactStatus({
				...basePreview,
				summary: { ...basePreview.summary, sourceChangeCount: 1 }
			}).label
		).toBe('원본 변경');
		expect(getEditorSaveImpactStatus(basePreview).label).toBe('영향 없음');
	});
});
