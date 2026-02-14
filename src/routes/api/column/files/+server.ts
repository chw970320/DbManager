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
 * 컬럼 정의서 파일 목록 조회 API
 * GET /api/column/files
 */
export async function GET(_event: RequestEvent) {
	try {
		const files = await listColumnFiles();

		return json(
			{
				success: true,
				data: files,
				message: 'Column files retrieved successfully'
			} as DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('컬럼 정의서 파일 목록 조회 중 오류:', error);

		return json(
			{
				success: false,
				error: '서버에서 파일 목록 조회 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 컬럼 정의서 파일 생성 API
 * POST /api/column/files
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
				} as DbDesignApiResponse,
				{ status: 400 }
			);
		}

		await createColumnFile(filename);

		return json(
			{
				success: true,
				message: 'Column file created successfully'
			} as DbDesignApiResponse,
			{ status: 201 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '파일 생성 중 오류가 발생했습니다.',
				message: 'Failed to create file'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 컬럼 정의서 파일 이름 변경 API
 * PUT /api/column/files
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
				} as DbDesignApiResponse,
				{ status: 400 }
			);
		}

		await renameColumnFile(oldFilename, newFilename);

		return json(
			{
				success: true,
				message: 'Column file renamed successfully'
			} as DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '파일 이름 변경 중 오류가 발생했습니다.',
				message: 'Failed to rename file'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 컬럼 정의서 파일 삭제 API
 * DELETE /api/column/files
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
				} as DbDesignApiResponse,
				{ status: 400 }
			);
		}

		await deleteColumnFile(filename);

		return json(
			{
				success: true,
				message: 'Column file deleted successfully'
			} as DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '파일 삭제 중 오류가 발생했습니다.',
				message: 'Failed to delete file'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}



