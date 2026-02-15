import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseColumnXlsxToJson } from './database-design-xlsx-parser';

vi.mock('xlsx-js-style', () => ({
	default: {
		read: vi.fn(),
		utils: {
			sheet_to_json: vi.fn()
		}
	}
}));

vi.mock('uuid', () => ({
	v4: vi.fn(() => 'column-test-id')
}));

import XLSX from 'xlsx-js-style';

describe('database-design-xlsx-parser', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('컬럼 정의서를 필수 헤더가 있는 시트에서 파싱한다 (sheet1 무시)', () => {
		const sheet1 = { __sheet: 'sheet1' };
		const sheet2 = { __sheet: 'sheet2' };

		vi.mocked(XLSX.read).mockReturnValue({
			SheetNames: ['sheet1', 'sheet2'],
			Sheets: {
				sheet1,
				sheet2
			}
		} as ReturnType<typeof XLSX.read>);

		vi.mocked(XLSX.utils.sheet_to_json).mockImplementation((worksheet) => {
			if (worksheet === sheet1) {
				return [
					['표준용어명', '영문약어'],
					['고객', 'CUST']
				] as string[][];
			}

			return [
				[
					'사업범위여부',
					'주제영역',
					'스키마명',
					'테이블영문명',
					'컬럼영문명',
					'컬럼한글명',
					'컬럼설명',
					'연관엔터티명',
					'자료타입',
					'자료길이',
					'자료소수점길이',
					'자료형식',
					'NOTNULL여부',
					'PK정보'
				],
				['Y', '회원', 'main', 'tb_user', 'user_id', '사용자ID', '설명', '사용자', 'VARCHAR', '20', '0', '', 'Y', 'PK']
			] as string[][];
		});

		const result = parseColumnXlsxToJson(Buffer.from('mock-xlsx'));

		expect(result).toHaveLength(1);
		expect(result[0].columnEnglishName).toBe('user_id');
		expect(result[0].dataType).toBe('VARCHAR');
		expect(result[0].domainName).toBeUndefined();
	});

	it('필수 헤더를 포함한 시트가 없으면 오류를 반환한다', () => {
		vi.mocked(XLSX.read).mockReturnValue({
			SheetNames: ['sheet1'],
			Sheets: {
				sheet1: { __sheet: 'sheet1' }
			}
		} as ReturnType<typeof XLSX.read>);

		vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
			['표준용어명', '영문약어'],
			['고객', 'CUST']
		] as string[][]);

		expect(() => parseColumnXlsxToJson(Buffer.from('mock-xlsx'))).toThrow(
			'필수 헤더(컬럼영문명, 자료길이, PK정보)를 포함한 시트를 찾을 수 없습니다.'
		);
	});

	it('헤더 공백/개행 차이와 헤더 행 위치가 달라도 컬럼 정의서를 파싱한다', () => {
		const sheet = { __sheet: 'sheet1' };

		vi.mocked(XLSX.read).mockReturnValue({
			SheetNames: ['sheet1'],
			Sheets: {
				sheet1: sheet
			}
		} as ReturnType<typeof XLSX.read>);

		vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
			['컬럼 정의서'],
			[
				'사업범위\r\n여부',
				'주제영역',
				'schema',
				'테이블 영문명',
				'컬럼 영문명',
				'컬럼 한글명',
				'컬럼 설명',
				'연관 엔터티명',
				'도메인 명',
				'자료 타입',
				'자료 길이',
				'자료소수점길이',
				'자료 형식',
				'NOT NULL 여부',
				'PK정보'
			],
			[
				'N',
				'생물종',
				'bksp',
				'TBL_BIOSPC_BSC',
				'EOL_ID',
				'EOL_아이디',
				'EOL_아이디',
				'생물종_기본',
				'명V20',
				'VARCHAR',
				'20',
				'-',
				'20자리 이내 문자',
				'true',
				'PK01'
			]
		] as string[][]);

		const result = parseColumnXlsxToJson(Buffer.from('mock-xlsx'));

		expect(result).toHaveLength(1);
		expect(result[0].columnEnglishName).toBe('EOL_ID');
		expect(result[0].dataLength).toBe('20');
		expect(result[0].pkInfo).toBe('PK01');
		expect(result[0].domainName).toBe('명V20');
	});
});
