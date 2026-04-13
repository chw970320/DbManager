import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockShowConfirm } = vi.hoisted(() => ({
	mockShowConfirm: vi.fn()
}));

vi.mock('$lib/stores/confirm-store', () => ({
	showConfirm: mockShowConfirm
}));

import { isEditorDirty, requestEditorClose } from './editor-close-guard';

describe('editor-close-guard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockShowConfirm.mockResolvedValue(true);
	});

	it('should detect pristine state for equal values', () => {
		expect(
			isEditorDirty(
				{ name: '테스트', enabled: true, count: 1 },
				{ count: 1, enabled: true, name: '테스트' }
			)
		).toBe(false);
	});

	it('should detect dirty state when a value changes', () => {
		expect(
			isEditorDirty(
				{ name: '테스트', enabled: true, count: 1 },
				{ name: '변경됨', enabled: true, count: 1 }
			)
		).toBe(true);
	});

	it('should close immediately without confirm when pristine', async () => {
		const onClose = vi.fn();

		const closed = await requestEditorClose({
			initialValue: { name: '' },
			currentValue: { name: '' },
			onClose
		});

		expect(closed).toBe(true);
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(mockShowConfirm).not.toHaveBeenCalled();
	});

	it('should ask for confirm when dirty and only close on approval', async () => {
		const onClose = vi.fn();

		mockShowConfirm.mockResolvedValueOnce(false);
		const rejected = await requestEditorClose({
			initialValue: { name: '' },
			currentValue: { name: '변경' },
			onClose
		});

		expect(rejected).toBe(false);
		expect(onClose).not.toHaveBeenCalled();
		expect(mockShowConfirm).toHaveBeenCalledTimes(1);

		mockShowConfirm.mockResolvedValueOnce(true);
		const approved = await requestEditorClose({
			initialValue: { name: '' },
			currentValue: { name: '변경' },
			onClose
		});

		expect(approved).toBe(true);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('should ignore close requests while submitting', async () => {
		const onClose = vi.fn();

		const closed = await requestEditorClose({
			initialValue: { name: '' },
			currentValue: { name: '변경' },
			onClose,
			isSubmitting: true
		});

		expect(closed).toBe(false);
		expect(onClose).not.toHaveBeenCalled();
		expect(mockShowConfirm).not.toHaveBeenCalled();
	});
});
