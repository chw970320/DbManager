import { writable, get } from 'svelte/store';

export interface ConfirmOptions {
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	variant?: 'default' | 'danger';
}

interface ConfirmState {
	isOpen: boolean;
	options: ConfirmOptions;
	resolve: ((value: boolean) => void) | null;
}

const defaultState: ConfirmState = {
	isOpen: false,
	options: { title: '', message: '' },
	resolve: null
};

export const confirmStore = writable<ConfirmState>(defaultState);

export function showConfirm(options: ConfirmOptions): Promise<boolean> {
	return new Promise((resolve) => {
		// 이미 열린 다이얼로그가 있으면 닫기
		const current = get(confirmStore);
		if (current.resolve) {
			current.resolve(false);
		}

		confirmStore.set({
			isOpen: true,
			options: {
				confirmText: '확인',
				cancelText: '취소',
				variant: 'default',
				...options
			},
			resolve
		});
	});
}

export function closeConfirm(result: boolean) {
	const state = get(confirmStore);
	if (state.resolve) {
		state.resolve(result);
	}
	confirmStore.set(defaultState);
}
