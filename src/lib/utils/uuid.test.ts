import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateUuid } from './uuid';

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generateUuid', () => {
	const originalCrypto = globalThis.crypto;

	afterEach(() => {
		Object.defineProperty(globalThis, 'crypto', {
			configurable: true,
			value: originalCrypto
		});
		vi.restoreAllMocks();
	});

	it('generates a v4 uuid with crypto.getRandomValues when available', () => {
		const getRandomValues = vi.fn((bytes: Uint8Array) => {
			for (let index = 0; index < bytes.length; index += 1) {
				bytes[index] = index;
			}
			return bytes;
		});
		Object.defineProperty(globalThis, 'crypto', {
			configurable: true,
			value: { getRandomValues }
		});

		expect(generateUuid()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
		expect(getRandomValues).toHaveBeenCalledTimes(1);
	});

	it('does not require crypto.randomUUID in non-secure browser contexts', () => {
		Object.defineProperty(globalThis, 'crypto', {
			configurable: true,
			value: {}
		});
		vi.spyOn(Math, 'random').mockReturnValue(0);

		expect(generateUuid()).toBe('00000000-0000-4000-8000-000000000000');
		expect(generateUuid()).toMatch(UUID_V4_PATTERN);
	});
});
