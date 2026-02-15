import { describe, expect, it } from 'vitest';
import { classifyUploadParseError, noValidDataUploadError } from './upload-error';

describe('upload-error', () => {
	it('헤더 불일치 메시지를 HEADER_MISMATCH로 분류한다', () => {
		const result = classifyUploadParseError(
			new Error('필수 헤더(컬럼영문명, 자료길이, PK정보)를 포함한 시트를 찾을 수 없습니다.')
		);
		expect(result.code).toBe('HEADER_MISMATCH');
	});

	it('필수 누락 메시지를 REQUIRED_FIELD_MISSING로 분류한다', () => {
		const result = classifyUploadParseError(new Error('필수 필드가 누락된 데이터가 존재합니다.'));
		expect(result.code).toBe('REQUIRED_FIELD_MISSING');
	});

	it('기본 유효 데이터 없음 오류를 NO_VALID_DATA로 반환한다', () => {
		const result = noValidDataUploadError();
		expect(result.code).toBe('NO_VALID_DATA');
		expect(result.message).toContain('유효한 데이터');
	});
});
