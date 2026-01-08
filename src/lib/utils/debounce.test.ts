import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, debounceImmediate } from './debounce';

describe('debounce', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should delay function execution', () => {
		const func = vi.fn();
		const debouncedFunc = debounce(func, 500);

		debouncedFunc();
		expect(func).not.toHaveBeenCalled();

		vi.advanceTimersByTime(250);
		expect(func).not.toHaveBeenCalled();

		vi.advanceTimersByTime(250);
		expect(func).toHaveBeenCalledTimes(1);
	});

	it('should reset the timeout if called again', () => {
		const func = vi.fn();
		const debouncedFunc = debounce(func, 500);

		debouncedFunc();
		expect(func).not.toHaveBeenCalled();

		vi.advanceTimersByTime(250);
		debouncedFunc(); // Call again
		expect(func).not.toHaveBeenCalled();

		vi.advanceTimersByTime(250);
		expect(func).not.toHaveBeenCalled(); // 500ms has passed since the first call, but not the second

		vi.advanceTimersByTime(250);
		expect(func).toHaveBeenCalledTimes(1); // 500ms has passed since the second call
	});

	it('should pass arguments to the original function', () => {
		const func = vi.fn();
		const debouncedFunc = debounce(func, 500);

		debouncedFunc(1, 'test');
		vi.advanceTimersByTime(500);

		expect(func).toHaveBeenCalledWith(1, 'test');
	});

	it('should be able to cancel the execution', () => {
		const func = vi.fn();
		const debouncedFunc = debounce(func, 500);

		debouncedFunc();
		debouncedFunc.cancel();
		vi.advanceTimersByTime(500);

		expect(func).not.toHaveBeenCalled();
	});
});

describe('debounceImmediate', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should execute immediately if immediate is true', () => {
		const func = vi.fn();
		const debouncedFunc = debounceImmediate(func, 500, true);

		debouncedFunc();
		expect(func).toHaveBeenCalledTimes(1);
	});

	it('should not execute again within the wait period if immediate is true', () => {
		const func = vi.fn();
		const debouncedFunc = debounceImmediate(func, 500, true);

		debouncedFunc();
		expect(func).toHaveBeenCalledTimes(1);

		debouncedFunc();
		debouncedFunc();
		expect(func).toHaveBeenCalledTimes(1); // Should not be called again

		vi.advanceTimersByTime(500);
		expect(func).toHaveBeenCalledTimes(1);
	});

	it('should execute again after the wait period if immediate is true', () => {
		const func = vi.fn();
		const debouncedFunc = debounceImmediate(func, 500, true);

		debouncedFunc();
		expect(func).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(500);
		debouncedFunc();
		expect(func).toHaveBeenCalledTimes(2);
	});

	it('should behave like normal debounce if immediate is false', () => {
		const func = vi.fn();
		const debouncedFunc = debounceImmediate(func, 500, false);

		debouncedFunc();
		expect(func).not.toHaveBeenCalled();

		vi.advanceTimersByTime(500);
		expect(func).toHaveBeenCalledTimes(1);
	});
});
