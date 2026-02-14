import { json, type RequestEvent } from '@sveltejs/kit';
import {
	loadData,
	saveData,
	mergeData,
	listFiles,
	createFile,
	renameFile,
	deleteFile,
	loadVocabularyData,
	saveVocabularyData,
	mergeVocabularyData,
	listVocabularyFiles,
	createVocabularyFile,
	renameVocabularyFile,
	deleteVocabularyFile,
	loadDomainData,
	saveDomainData,
	mergeDomainData,
	listDomainFiles,
	createDomainFile,
	renameDomainFile,
	deleteDomainFile,
	loadTermData,
	saveTermData,
	mergeTermData,
	listTermFiles,
	createTermFile,
	renameTermFile,
	deleteTermFile,
	loadDatabaseData,
	saveDatabaseData,
	mergeDatabaseData,
	listDatabaseFiles,
	createDatabaseFile,
	renameDatabaseFile,
	deleteDatabaseFile,
	loadEntityData,
	saveEntityData,
	mergeEntityData,
	listEntityFiles,
	createEntityFile,
	renameEntityFile,
	deleteEntityFile,
	loadAttributeData,
	saveAttributeData,
	mergeAttributeData,
	listAttributeFiles,
	createAttributeFile,
	renameAttributeFile,
	deleteAttributeFile,
	loadTableData,
	saveTableData,
	mergeTableData,
	listTableFiles,
	createTableFile,
	renameTableFile,
	deleteTableFile,
	loadColumnData,
	saveColumnData,
	mergeColumnData,
	listColumnFiles,
	createColumnFile,
	renameColumnFile,
	deleteColumnFile,
	loadForbiddenWords
} from '$lib/registry/data-registry';
import {
	getCachedData,
	getCachedVocabularyData,
	getCachedDomainData,
	getCachedTermData,
	invalidateCache,
	invalidateDataCache,
	invalidateAllCaches
} from '$lib/registry/cache-registry';


/**
 * 도메인 파일 목록 조회 API
 * GET /api/domain/files
 */
export async function GET() {
	try {
		const files = await listDomainFiles();
		return json(
			{
				success: true,
				data: files,
				message: 'Domain files retrieved successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : '도메인 파일 목록 조회 중 오류가 발생했습니다.',
				message: 'Failed to retrieve domain files'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 도메인 파일 생성 API
 * POST /api/domain/files
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

		await createDomainFile(filename);

		return json(
			{
				success: true,
				message: 'Domain file created successfully'
			} as ApiResponse,
			{ status: 201 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '도메인 파일 생성 중 오류가 발생했습니다.',
				message: 'Failed to create domain file'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 도메인 파일 이름 변경 API
 * PUT /api/domain/files
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

		await renameDomainFile(oldFilename, newFilename);

		return json(
			{
				success: true,
				message: 'Domain file renamed successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : '도메인 파일 이름 변경 중 오류가 발생했습니다.',
				message: 'Failed to rename domain file'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 도메인 파일 삭제 API
 * DELETE /api/domain/files
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

		await deleteDomainFile(filename);

		return json(
			{
				success: true,
				message: 'Domain file deleted successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '도메인 파일 삭제 중 오류가 발생했습니다.',
				message: 'Failed to delete domain file'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}



