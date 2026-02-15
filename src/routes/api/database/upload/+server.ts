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

import { validateXlsxFile } from '$lib/utils/validation.js';
import { parseDatabaseXlsxToJson } from '$lib/utils/database-design-xlsx-parser.js';
import {
	getRequiredFile,
	getOptionalString,
	getOptionalBoolean,
	FormDataValidationError
} from '$lib/utils/type-guards.js';
import { normalizeUploadPostProcessMode, runUploadPostProcess } from '$lib/utils/upload-postprocess.js';
import { classifyUploadParseError, noValidDataUploadError } from '$lib/utils/upload-error.js';

/**
 * 데이터베이스 정의서 업로드 정보 조회 API
 * GET /api/database-def/upload
 */
export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'database.json';
		const currentStore = await loadDatabaseData(filename);
		return json({
			success: true,
			data: {
				supportedFormats: ['.xlsx', '.xls'],
				maxFileSize: '10MB',
				requiredColumns: ['기관명', '부서명', '적용업무', '구축일자'],
				optionalColumns: [
					'관련법령',
					'논리DB명',
					'물리DB명',
					'DB설명',
					'DBMS정보',
					'운영체제정보',
					'수집제외사유'
				],
				endpoint: '/api/database-def/upload',
				method: 'POST',
				currentDataCount: currentStore.totalCount,
				lastUpdated: currentStore.lastUpdated
			}
		});
	} catch (error) {
		console.error('업로드 정보 조회 중 오류:', error);
		return json(
			{
				success: false,
				error: '업로드 정보 조회에 실패했습니다.',
				message: 'Failed to retrieve upload info'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 데이터베이스 정의서 파일 업로드 처리 API
 * POST /api/database-def/upload
 */
export async function POST({ request, fetch }: RequestEvent) {
	try {
		const contentType = request.headers.get('content-type');
		if (!contentType?.includes('multipart/form-data')) {
			return json(
				{
					success: false,
					error: '파일 업로드는 multipart/form-data 형식이어야 합니다.',
					message: 'Invalid content type'
				} as DbDesignApiResponse,
				{ status: 400 }
			);
		}

		const formData = await request.formData();
		const file = getRequiredFile(formData, 'file');

		try {
			validateXlsxFile(file);
		} catch (validationError) {
			return json(
				{
					success: false,
					error: validationError instanceof Error ? validationError.message : '파일 검증 실패',
					message: 'File validation failed'
				} as DbDesignApiResponse,
				{ status: 400 }
			);
		}

		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		const replaceExisting = getOptionalBoolean(formData, 'replace');
		const filename = getOptionalString(formData, 'filename', 'database.json');
		const postProcessMode = normalizeUploadPostProcessMode(
			getOptionalString(formData, 'postProcessMode', 'none')
		);

		let parsedEntries: DatabaseEntry[];
		try {
			parsedEntries = parseDatabaseXlsxToJson(buffer, !replaceExisting);
		} catch (parseError) {
			const uploadError = classifyUploadParseError(parseError);
			return json(
				{
					success: false,
					error: uploadError.message,
					data: { errorCode: uploadError.code },
					message: 'Excel parsing failed'
				} as DbDesignApiResponse,
				{ status: 422 }
			);
		}

		if (parsedEntries.length === 0) {
			const uploadError = noValidDataUploadError();
			return json(
				{
					success: false,
					error: uploadError.message,
					data: { errorCode: uploadError.code },
					message: 'No valid data found'
				} as DbDesignApiResponse,
				{ status: 422 }
			);
		}

		let finalData: DatabaseData;
		try {
			finalData = await mergeDatabaseData(parsedEntries, replaceExisting, filename);
		} catch (mergeError) {
			return json(
				{
					success: false,
					error: mergeError instanceof Error ? mergeError.message : '데이터 병합 실패',
					message: 'Data merge failed'
				} as DbDesignApiResponse,
				{ status: 500 }
			);
		}
		const postProcess = await runUploadPostProcess({
			fetch,
			dataType: 'database',
			filename,
			mode: postProcessMode
		});

		return json(
			{
				success: true,
				data: {
					uploadedCount: parsedEntries.length,
					totalCount: finalData.totalCount,
					lastUpdated: finalData.lastUpdated,
					replaceMode: replaceExisting,
					postProcess,
					message: `데이터베이스 정의서 업로드 완료: ${parsedEntries.length}개 항목`
				},
				message: 'Data uploaded successfully'
			} as DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('파일 업로드 중 오류:', error);

		if (error instanceof FormDataValidationError) {
			return json(
				{
					success: false,
					error: error.message,
					message: 'FormData validation failed'
				} as DbDesignApiResponse,
				{ status: 400 }
			);
		}

		return json(
			{
				success: false,
				error: '서버에서 파일 업로드 처리 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}

