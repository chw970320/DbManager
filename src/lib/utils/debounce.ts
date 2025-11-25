/**
 * 함수 호출을 지연시키는 debounce 유틸리티
 * @param func - 지연시킬 함수
 * @param wait - 지연 시간 (milliseconds)
 * @returns debounced 함수
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
	let timeout: ReturnType<typeof setTimeout> | undefined;

	const debounced = function executedFunction(...args: Parameters<T>) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};

		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};

	debounced.cancel = () => {
		clearTimeout(timeout);
	};

	return debounced;
}

/**
 * 즉시 실행 가능한 debounce 함수 (첫 호출은 즉시 실행)
 * @param func - 지연시킬 함수
 * @param wait - 지연 시간 (milliseconds)
 * @param immediate - 첫 호출 즉시 실행 여부
 * @returns debounced 함수
 */
export function debounceImmediate<T extends (...args: any[]) => any>(
	func: T,
	wait: number,
	immediate = false
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | undefined;

	return function executedFunction(...args: Parameters<T>) {
		const later = () => {
			timeout = undefined;
			if (!immediate) func(...args);
		};

		const callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);

		if (callNow) func(...args);
	};
}
