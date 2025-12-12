import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '$lib/types/vocabulary';
import { listTermFiles, createTermFile, renameTermFile, deleteTermFile } from '$lib/utils/file-handler';

/**
 * 용어 파일 목록 조회 API
 * GET /api/term/files
 */
export async function GET() {
	try {
		const files = await listTermFiles();
		return json(
			{
				success: true,
				data: files,
				message: 'Term files retrieved successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '용어 파일 목록 조회 중 오류가 발생했습니다.',
				message: 'Failed to retrieve term files'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 용어 파일 생성 API
 * POST /api/term/files
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

		await createTermFile(filename);

		return json(
			{
				success: true,
				message: 'Term file created successfully'
			} as ApiResponse,
			{ status: 201 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '용어 파일 생성 중 오류가 발생했습니다.',
				message: 'Failed to create term file'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 용어 파일 이름 변경 API
 * PUT /api/term/files
 */
export async function PUT({ request }: RequestEvent) {
	try {
		const { oldFilename, newFilename } = await request.json();

		if (!oldFilename || !newFilename) {
			return json(
				{
					success: false,
					error: '기존 파일명과 새 파일명이 모두 필요합니다.',
					message: 'Both old and new filenames are required'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		await renameTermFile(oldFilename, newFilename);

		return json(
			{
				success: true,
				message: 'Term file renamed successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '용어 파일 이름 변경 중 오류가 발생했습니다.',
				message: 'Failed to rename term file'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 용어 파일 삭제 API
 * DELETE /api/term/files
 */
export async function DELETE({ request }: RequestEvent) {
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

		await deleteTermFile(filename);

		return json(
			{
				success: true,
				message: 'Term file deleted successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '용어 파일 삭제 중 오류가 발생했습니다.',
				message: 'Failed to delete term file'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

