import { describe, expect, it, vi } from 'vitest';
import { normalizeUploadPostProcessMode, runUploadPostProcess } from './upload-postprocess';

function okResponse(body: unknown): Response {
	return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('upload-postprocess', () => {
	it('normalizes mode', () => {
		expect(normalizeUploadPostProcessMode('validate-only')).toBe('validate-only');
		expect(normalizeUploadPostProcessMode('validate-sync')).toBe('validate-sync');
		expect(normalizeUploadPostProcessMode('unknown')).toBe('none');
	});

	it('returns empty steps for none', async () => {
		const fetchMock = vi.fn();
		const result = await runUploadPostProcess({
			fetch: fetchMock,
			dataType: 'column',
			filename: 'column.json',
			mode: 'none'
		});
		expect(result.steps.length).toBe(0);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('runs steps for validate-sync', async () => {
		const fetchMock = vi.fn(async () => okResponse({ success: true }));
		const result = await runUploadPostProcess({
			fetch: fetchMock,
			dataType: 'column',
			filename: 'column.json',
			mode: 'validate-sync'
		});
		expect(result.steps.length).toBe(2);
		expect(result.steps.every((step) => step.success)).toBe(true);
	});
});
