import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import * as fileHandler from '$lib/registry/data-registry';
import type { VocabularyData, VocabularyEntry, ForbiddenWord } from '$lib/types/vocabulary';

vi.mock('$lib/registry/data-registry');
vi.mock('@sveltejs/kit');

const createMockRequest = async (
	body: { standardName?: string; abbreviation?: string; id?: string },
	searchParams?: Record<string, string>
): Promise<RequestEvent> => {
	const url = new URL('http://localhost/api/vocabulary/validate');
	if (searchParams) {
		Object.entries(searchParams).forEach(([key, value]) => {
			url.searchParams.set(key, value);
		});
	}
	return {
		request: {
			json: async () => body
		},
		url
	} as unknown as RequestEvent;
};

describe('POST /api/vocabulary/validate', () => {
	const mockVocabData: VocabularyData = {
		entries: [
			{
				id: '1',
				abbreviation: 'USER',
				standardName: '사용자',
				englishName: 'User',
				description: '',
				createdAt: '',
				updatedAt: '',
				synonyms: ['고객']
			},
			{
				id: '2',
				abbreviation: 'ADMIN',
				standardName: '관리자',
				englishName: 'Admin',
				description: '',
				createdAt: '',
				updatedAt: ''
			}
		],
		lastUpdated: '',
		totalCount: 2
	};

	const mockForbiddenWords: ForbiddenWord[] = [
		{
			id: 'fw1',
			keyword: '금칙어',
			type: 'standardName',
			createdAt: ''
		},
		{
			id: 'fw2',
			keyword: 'FORBIDDEN',
			type: 'abbreviation',
			createdAt: ''
		}
	];

	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(fileHandler.loadVocabularyData).mockResolvedValue(mockVocabData);
		vi.mocked(fileHandler.loadForbiddenWords).mockResolvedValue(mockForbiddenWords);
	});

	it('금칙어 검증 성공: 금칙어가 아닌 단어 입력 시 success를 반환한다', async () => {
		const request = await createMockRequest({ standardName: '유효한단어', abbreviation: 'VALID' });
		await POST(request);
		expect(json).toHaveBeenCalledWith({ success: true, data: { validation: 'ok' } });
	});

	it('금칙어 검증 실패: 금칙어가 포함된 standardName 입력 시 에러를 반환한다', async () => {
		const request = await createMockRequest({
			standardName: '이것은금칙어',
			abbreviation: 'TEST'
		});
		await POST(request);
		expect(json).toHaveBeenCalledWith(
			expect.objectContaining({
				success: false,
				error: expect.stringContaining('금지된 단어')
			}),
			{ status: 400 }
		);
	});

	it('이음동의어 검증: 이음동의어로 등록된 단어 입력 시 경고를 반환한다', async () => {
		const request = await createMockRequest({ standardName: '고객', abbreviation: 'CUST' });
		await POST(request);
		expect(json).toHaveBeenCalledWith(
			expect.objectContaining({
				success: false,
				error: expect.stringContaining('이미 [사용자]의 이음동의어로 등록')
			}),
			{ status: 409 }
		);
	});

	it('영문약어 중복 검사 (신규): 이미 존재하는 abbreviation 입력 시 에러를 반환한다', async () => {
		const request = await createMockRequest({ standardName: '새단어', abbreviation: 'USER' });
		await POST(request);
		expect(json).toHaveBeenCalledWith(
			{ success: false, error: '이미 존재하는 영문약어입니다.' },
			{ status: 409 }
		);
	});

	it('영문약어 중복 검사 (수정): 자기 자신을 제외하고 중복 검사를 통과한다', async () => {
		const request = await createMockRequest({
			id: '1',
			standardName: '사용자수정',
			abbreviation: 'USER'
		});
		await POST(request);
		expect(json).toHaveBeenCalledWith({ success: true, data: { validation: 'ok' } });
	});

	it('필수 파라미터 누락: standardName이 누락된 경우 400 에러를 반환한다', async () => {
		const request = await createMockRequest({ abbreviation: 'TEST' });
		await POST(request);
		expect(json).toHaveBeenCalledWith(
			expect.objectContaining({
				success: false,
				error: '필수 필드가 누락되었습니다: standardName'
			}),
			{ status: 400 }
		);
	});

	it('should use specified filename parameter', async () => {
		const request = {
			request: {
				json: async () => ({ standardName: '유효한단어', abbreviation: 'VALID' })
			},
			url: new URL('http://localhost/api/vocabulary/validate?filename=custom-vocabulary.json')
		} as unknown as RequestEvent;

		await POST(request);

		expect(fileHandler.loadVocabularyData).toHaveBeenCalledWith('custom-vocabulary.json');
	});

	it('should use default filename when not specified', async () => {
		const request = await createMockRequest({ standardName: '유효한단어', abbreviation: 'VALID' });
		await POST(request);

		expect(fileHandler.loadVocabularyData).toHaveBeenCalledWith('vocabulary.json');
	});
});

