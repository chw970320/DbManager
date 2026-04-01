import { v4 as uuidv4 } from 'uuid';

export function generateUuid(): string {
	const nativeRandomUUID = globalThis.crypto?.randomUUID;

	if (typeof nativeRandomUUID === 'function') {
		return nativeRandomUUID.call(globalThis.crypto);
	}

	return uuidv4();
}
