import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '$lib/types/vocabulary';
import { loadVocabularyData, saveVocabularyData } from '$lib/utils/file-handler';

/**
 * 단어집 파일 매핑 정보 조회 API
 * GET /api/vocabulary/files/mapping?filename=vocabulary.json
 */
export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'vocabulary.json';

		const vocabularyData = await loadVocabularyData(filename);

		return json(
			{
				success: true,
				data: {
					mapping: vocabularyData.mapping || {
						domain: vocabularyData.mappedDomainFile || 'domain.json'
					}
				},
				message: 'Vocabulary mapping retrieved successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 조회 중 오류가 발생했습니다.',
				message: 'Failed to retrieve vocabulary mapping'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 단어집 파일 매핑 정보 저장 API
 * PUT /api/vocabulary/files/mapping
 */
export async function PUT({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const { filename, mapping } = body;

		if (!filename) {
			return json(
				{
					success: false,
					error: '파일명이 제공되지 않았습니다.',
					message: 'Filename is required'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		if (!mapping || !mapping.domain) {
			return json(
				{
					success: false,
					error: '매핑 정보가 올바르지 않습니다. domain이 필요합니다.',
					message: 'Invalid mapping data'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 기존 데이터 로드
		const vocabularyData = await loadVocabularyData(filename);

		// 매핑 정보 업데이트
		vocabularyData.mapping = {
			domain: mapping.domain
		};
		// 하위 호환성을 위해 mappedDomainFile도 업데이트
		vocabularyData.mappedDomainFile = mapping.domain;

		// 저장
		await saveVocabularyData(vocabularyData, filename);

		return json(
			{
				success: true,
				data: {
					mapping: vocabularyData.mapping
				},
				message: 'Vocabulary mapping saved successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 저장 중 오류가 발생했습니다.',
				message: 'Failed to save vocabulary mapping'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

