import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '$lib/types/vocabulary';
import { loadTermData, saveTermData } from '$lib/utils/file-handler';

/**
 * 용어 파일 매핑 정보 조회 API
 * GET /api/term/files/mapping?filename=term.json
 */
export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'term.json';

		const termData = await loadTermData(filename);

		return json(
			{
				success: true,
				data: {
					mapping: termData.mapping || {
						vocabulary: 'vocabulary.json',
						domain: 'domain.json'
					}
				},
				message: 'Term mapping retrieved successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 조회 중 오류가 발생했습니다.',
				message: 'Failed to retrieve term mapping'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 용어 파일 매핑 정보 저장 API
 * PUT /api/term/files/mapping
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

		if (!mapping || !mapping.vocabulary || !mapping.domain) {
			return json(
				{
					success: false,
					error: '매핑 정보가 올바르지 않습니다. vocabulary와 domain이 필요합니다.',
					message: 'Invalid mapping data'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 기존 데이터 로드
		const termData = await loadTermData(filename);

		// 매핑 정보 업데이트
		termData.mapping = {
			vocabulary: mapping.vocabulary,
			domain: mapping.domain
		};

		// 저장
		await saveTermData(termData, filename);

		return json(
			{
				success: true,
				data: {
					mapping: termData.mapping
				},
				message: 'Term mapping saved successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '매핑 정보 저장 중 오류가 발생했습니다.',
				message: 'Failed to save term mapping'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}
