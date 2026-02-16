import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration: number;
}

const { subscribe, update } = writable<Toast[]>([]);

let counter = 0;

function addToast(message: string, type: ToastType = 'info', duration?: number) {
	const id = `toast-${++counter}`;
	const defaultDuration = type === 'error' ? 5000 : 3000;
	const toast: Toast = { id, message, type, duration: duration ?? defaultDuration };

	update((toasts) => [...toasts, toast]);

	setTimeout(() => {
		removeToast(id);
	}, toast.duration);

	return id;
}

function removeToast(id: string) {
	update((toasts) => toasts.filter((t) => t.id !== id));
}

export const toastStore = { subscribe };
export { addToast, removeToast };
