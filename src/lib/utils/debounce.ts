/**
 * 함수 호출을 지연시키는 debounce 유틸리티
 * @param func - 지연시킬 함수
 * @param wait - 지연 시간 (milliseconds)
 * @returns debounced 함수
 *
 * async 함수 등 다양한 시그니처를 허용하기 위해 제네릭 함수 시그니처를 사용합니다.
 */
export function debounce<TArgs extends unknown[], TReturn>(
	func: (...args: TArgs) => TReturn,
	wait: number
): ((...args: TArgs) => void) & { cancel: () => void } {
	let timeout: ReturnType<typeof setTimeout> | undefined;

	const debounced = function executedFunction(...args: TArgs) {
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
export function debounceImmediate<TArgs extends unknown[], TReturn>(
	func: (...args: TArgs) => TReturn,
	wait: number,
	immediate = false
): (...args: TArgs) => void {
	let timeout: ReturnType<typeof setTimeout> | undefined;

	return function executedFunction(...args: TArgs) {
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
