const UUID_BYTE_LENGTH = 16;
const BYTE_TO_HEX = Array.from({ length: 256 }, (_, index) => index.toString(16).padStart(2, '0'));

export function generateUuid(): string {
	const bytes = new Uint8Array(UUID_BYTE_LENGTH);
	fillRandomBytes(bytes);

	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;

	return [
		bytesToHex(bytes, 0, 4),
		bytesToHex(bytes, 4, 6),
		bytesToHex(bytes, 6, 8),
		bytesToHex(bytes, 8, 10),
		bytesToHex(bytes, 10, 16)
	].join('-');
}

function fillRandomBytes(bytes: Uint8Array) {
	const getRandomValues = globalThis.crypto?.getRandomValues;
	if (typeof getRandomValues === 'function') {
		getRandomValues.call(globalThis.crypto, bytes);
		return;
	}

	for (let index = 0; index < bytes.length; index += 1) {
		bytes[index] = Math.floor(Math.random() * 256);
	}
}

function bytesToHex(bytes: Uint8Array, start: number, end: number): string {
	let value = '';
	for (let index = start; index < end; index += 1) {
		value += BYTE_TO_HEX[bytes[index]];
	}
	return value;
}
