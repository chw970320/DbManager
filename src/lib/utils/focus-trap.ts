const FOCUSABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])'
].join(', ');

export function createFocusTrap(container: HTMLElement) {
	let previouslyFocused: HTMLElement | null = null;

	function getFocusableElements(): HTMLElement[] {
		return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key !== 'Tab') return;

		const focusable = getFocusableElements();
		if (focusable.length === 0) return;

		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		if (e.shiftKey) {
			if (document.activeElement === first) {
				e.preventDefault();
				last.focus();
			}
		} else {
			if (document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	function activate() {
		previouslyFocused = document.activeElement as HTMLElement;
		container.addEventListener('keydown', handleKeydown);

		// 첫 번째 포커스 가능 요소에 포커스
		requestAnimationFrame(() => {
			const focusable = getFocusableElements();
			if (focusable.length > 0) {
				focusable[0].focus();
			}
		});
	}

	function deactivate() {
		container.removeEventListener('keydown', handleKeydown);
		if (previouslyFocused && previouslyFocused.focus) {
			previouslyFocused.focus();
		}
	}

	return { activate, deactivate };
}
