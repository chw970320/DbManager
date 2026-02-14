import { error, json, type RequestEvent } from '@sveltejs/kit';
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

import { exportTermToXlsxBuffer } from '$lib/utils/xlsx-parser.js';

/**
 * 용어 데이터 다운로드 API
 * GET /api/term/download
 */
export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'term.json';

		// 용어 데이터 로드
		const termData = await loadTermData(filename);

		if (termData.entries.length === 0) {
			return error(404, '다운로드할 용어 데이터가 없습니다.');
		}

		// XLSX 버퍼 생성
		const buffer = exportTermToXlsxBuffer(termData.entries);

		// 파일명 생성 (YYYY-MM-DD 형식, 항상 'term'으로 고정)
		const currentDate = new Date().toISOString().split('T')[0];
		const downloadFilename = `term_${currentDate}.xlsx`;

		// 응답 헤더 설정
		return new Response(buffer, {
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${downloadFilename}"`,
				'Content-Length': buffer.length.toString()
			}
		});
	} catch (err) {
		console.error('용어 다운로드 중 오류:', err);
		return error(500, '용어 데이터 다운로드 중 오류가 발생했습니다.');
	}
}



