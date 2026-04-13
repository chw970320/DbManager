import { showConfirm, type ConfirmOptions } from '$lib/stores/confirm-store';

const DEFAULT_DISCARD_CONFIRM_OPTIONS: ConfirmOptions = {
	title: '작성 취소 확인',
	message: '작성 중인 내용이 사라집니다. 닫을까요?',
	confirmText: '닫기',
	cancelText: '계속 작성',
	variant: 'default'
};

function normalizeForComparison(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => normalizeForComparison(item));
	}

	if (value && typeof value === 'object') {
		return Object.keys(value as Record<string, unknown>)
			.sort()
			.reduce<Record<string, unknown>>((acc, key) => {
				const normalizedValue = normalizeForComparison((value as Record<string, unknown>)[key]);
				if (normalizedValue !== undefined) {
					acc[key] = normalizedValue;
				}
				return acc;
			}, {});
	}

	return value;
}

export function isEditorDirty<T>(initialValue: T, currentValue: T): boolean {
	return (
		JSON.stringify(normalizeForComparison(initialValue)) !==
		JSON.stringify(normalizeForComparison(currentValue))
	);
}

interface RequestEditorCloseOptions<T> {
	initialValue: T;
	currentValue: T;
	onClose: () => void;
	isSubmitting?: boolean;
	confirmOptions?: Partial<ConfirmOptions>;
}

export async function requestEditorClose<T>({
	initialValue,
	currentValue,
	onClose,
	isSubmitting = false,
	confirmOptions
}: RequestEditorCloseOptions<T>): Promise<boolean> {
	if (isSubmitting) {
		return false;
	}

	if (!isEditorDirty(initialValue, currentValue)) {
		onClose();
		return true;
	}

	const confirmed = await showConfirm({
		...DEFAULT_DISCARD_CONFIRM_OPTIONS,
		...confirmOptions
	});

	if (!confirmed) {
		return false;
	}

	onClose();
	return true;
}
