import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import * as fileHandler from '$lib/utils/file-handler';
import type { VocabularyData } from '$lib/types/vocabulary';

vi.mock('$lib/utils/file-handler');
vi.mock('@sveltejs/kit');

const createMockRequest = (searchParams: Record<string, string> = {}): RequestEvent => {
	const url = new URL('http://localhost/api/vocabulary/duplicates');
	for (const [key, value] of Object.entries(searchParams)) {
		url.searchParams.set(key, value);
	}
	return {
		request: new Request(url),
		url
	} as unknown as RequestEvent;
};

describe('GET /api/vocabulary/duplicates', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('중복 단어 조회 성공: 중복된 abbreviation 그룹을 반환한다', async () => {
		const mockData: VocabularyData = {
			entries: [
				{ id: '1', standardName: '사용자', abbreviation: 'USER', englishName: 'User', createdAt: '', updatedAt: '', description: '' },
				{ id: '2', standardName: '유저', abbreviation: 'USER', englishName: 'User', createdAt: '', updatedAt: '', description: '' },
				{ id: '3', standardName: '관리자', abbreviation: 'ADMIN', englishName: 'Admin', createdAt: '', updatedAt: '', description: '' }
			],
			lastUpdated: '',
			totalCount: 3
		};
		vi.mocked(fileHandler.loadVocabularyData).mockResolvedValue(mockData);

		const request = createMockRequest();
		await GET(request);

		expect(json).toHaveBeenCalledWith(
			{
				success: true,
				message: '중복 단어 조회가 완료되었습니다.',
				data: [
					{
						abbreviation: 'USER',
						entries: expect.arrayContaining([
							expect.objectContaining({ id: '1' }),
							expect.objectContaining({ id: '2' })
						]),
						count: 2
					}
				]
			},
			{ status: 200 }
		);
	});

	it('중복 없음: 중복이 없을 때 빈 배열을 반환한다', async () => {
		const mockData: VocabularyData = {
			entries: [
				{ id: '1', standardName: '사용자', abbreviation: 'USER', englishName: 'User', createdAt: '', updatedAt: '', description: '' },
				{ id: '3', standardName: '관리자', abbreviation: 'ADMIN', englishName: 'Admin', createdAt: '', updatedAt: '', description: '' }
			],
			lastUpdated: '',
			totalCount: 2
		};
		vi.mocked(fileHandler.loadVocabularyData).mockResolvedValue(mockData);

		const request = createMockRequest();
		await GET(request);

		expect(json).toHaveBeenCalledWith(
			{
				success: true,
				message: '중복 단어 조회가 완료되었습니다.',
				data: []
			},
			{ status: 200 }
		);
	});

	it('파일명 지정: 특정 파일에서만 중복을 조회한다', async () => {
		const mockData: VocabularyData = {
			entries: [
				{ id: '1', standardName: '사용자', abbreviation: 'USER', englishName: 'User', createdAt: '', updatedAt: '', description: '' },
			],
			lastUpdated: '',
			totalCount: 1
		};
		vi.mocked(fileHandler.loadVocabularyData).mockResolvedValue(mockData);

		const request = createMockRequest({ filename: 'custom.json' });
		await GET(request);

		expect(fileHandler.loadVocabularyData).toHaveBeenCalledWith('custom.json');
		expect(json).toHaveBeenCalledWith(
			{
				success: true,
				message: '중복 단어 조회가 완료되었습니다.',
				data: []
			},
			{ status: 200 }
		);
	});

	it('에러 처리: 데이터 로드 실패 시 500 에러를 반환한다', async () => {
		vi.mocked(fileHandler.loadVocabularyData).mockRejectedValue(new Error('파일을 찾을 수 없습니다'));

		const request = createMockRequest();
		await GET(request);

		expect(json).toHaveBeenCalledWith(
			{
				success: false,
				error: '데이터 처리 중 오류가 발생했습니다: 파일을 찾을 수 없습니다'
			},
			{ status: 500 }
		);
	});
});
