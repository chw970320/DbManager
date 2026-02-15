export type UploadErrorCode =
	| 'HEADER_MISMATCH'
	| 'REQUIRED_FIELD_MISSING'
	| 'REFERENCE_NOT_FOUND'
	| 'NO_VALID_DATA'
	| 'PARSE_FAILED';

export type StandardUploadError = {
	code: UploadErrorCode;
	message: string;
};

function normalizeMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim() !== '') return error.message;
	if (typeof error === 'string' && error.trim() !== '') return error;
	return fallback;
}

export function classifyUploadParseError(
	error: unknown,
	fallbackMessage = 'Excel 파일 파싱 실패'
): StandardUploadError {
	const message = normalizeMessage(error, fallbackMessage);
	const normalized = message.toLowerCase();

	if (normalized.includes('필수 헤더') || normalized.includes('헤더')) {
		return { code: 'HEADER_MISMATCH', message };
	}
	if (normalized.includes('필수') && normalized.includes('누락')) {
		return { code: 'REQUIRED_FIELD_MISSING', message };
	}
	if (normalized.includes('찾을 수 없습니다') && normalized.includes('유효한') === false) {
		return { code: 'REFERENCE_NOT_FOUND', message };
	}

	return { code: 'PARSE_FAILED', message };
}

export function noValidDataUploadError(
	message = '파일에서 유효한 데이터를 찾을 수 없습니다.'
): StandardUploadError {
	return {
		code: 'NO_VALID_DATA',
		message
	};
}
