import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '$lib/types/vocabulary.js';
import {
	listVocabularyFiles,
	createVocabularyFile,
	renameVocabularyFile
} from '$lib/utils/file-handler.js';

/**
 * 사용 가능한 단어집 파일 목록 조회 API
 * GET /api/vocabulary/files
 */
export async function GET({}: RequestEvent) {
	try {
		const files = await listVocabularyFiles();

		return json(
			{
				success: true,
				data: files,
				message: 'Vocabulary files retrieved successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('단어집 파일 목록 조회 중 오류:', error);

		return json(
			{
				success: false,
				error: '서버에서 파일 목록 조회 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 단어집 파일 생성 API
 * POST /api/vocabulary/files
 */
export async function POST({ request }: RequestEvent) {
	try {
		const { filename } = await request.json();

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

		await createVocabularyFile(filename);

		return json(
			{
				success: true,
				message: 'Vocabulary file created successfully'
			} as ApiResponse,
			{ status: 201 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '파일 생성 중 오류가 발생했습니다.',
				message: 'Failed to create file'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 단어집 파일 이름 변경 API
 * PUT /api/vocabulary/files
 */
export async function PUT({ request }: RequestEvent) {
	try {
		const { oldFilename, newFilename } = await request.json();

		if (!oldFilename || !newFilename) {
			return json(
				{
					success: false,
					error: '기존 파일명과 새 파일명이 모두 필요합니다.',
					message: 'Both oldFilename and newFilename are required'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		await renameVocabularyFile(oldFilename, newFilename);

		return json(
			{
				success: true,
				message: 'Vocabulary file renamed successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '파일 이름 변경 중 오류가 발생했습니다.',
				message: 'Failed to rename file'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}
