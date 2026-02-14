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

import { json, type RequestEvent } from '@sveltejs/kit';
import {
	setShowVocabularySystemFiles,
	setShowDomainSystemFiles,
	setShowTermSystemFiles,
	setShowDatabaseSystemFiles,
	setShowEntitySystemFiles,
	setShowAttributeSystemFiles,
	setShowTableSystemFiles,
	setShowColumnSystemFiles,
	getAllSettings,
	setAllSettings
} from '$lib/utils/settings.js';

/**
 * 설정 조회 API
 * GET /api/settings
 */
export async function GET() {
	try {
		const allSettings = await getAllSettings();

		return json({
			success: true,
			data: allSettings
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '설정 조회 중 오류가 발생했습니다.'
			},
			{ status: 500 }
		);
	}
}

/**
 * 설정 저장 API
 * POST /api/settings
 */
export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();

		// 단어집 설정 업데이트
		if (typeof body.showVocabularySystemFiles === 'boolean') {
			await setShowVocabularySystemFiles(body.showVocabularySystemFiles);
		}

		// 도메인 설정 업데이트
		if (typeof body.showDomainSystemFiles === 'boolean') {
			await setShowDomainSystemFiles(body.showDomainSystemFiles);
		}

		// 용어 설정 업데이트
		if (typeof body.showTermSystemFiles === 'boolean') {
			await setShowTermSystemFiles(body.showTermSystemFiles);
		}

		// 데이터베이스 설정 업데이트
		if (typeof body.showDatabaseSystemFiles === 'boolean') {
			await setShowDatabaseSystemFiles(body.showDatabaseSystemFiles);
		}

		// 엔터티 설정 업데이트
		if (typeof body.showEntitySystemFiles === 'boolean') {
			await setShowEntitySystemFiles(body.showEntitySystemFiles);
		}

		// 속성 설정 업데이트
		if (typeof body.showAttributeSystemFiles === 'boolean') {
			await setShowAttributeSystemFiles(body.showAttributeSystemFiles);
		}

		// 테이블 설정 업데이트
		if (typeof body.showTableSystemFiles === 'boolean') {
			await setShowTableSystemFiles(body.showTableSystemFiles);
		}

		// 컬럼 설정 업데이트
		if (typeof body.showColumnSystemFiles === 'boolean') {
			await setShowColumnSystemFiles(body.showColumnSystemFiles);
		}

		// 전체 설정 객체인 경우 (모든 개별 필드가 undefined일 때)
		const hasIndividualSettings =
			typeof body.showVocabularySystemFiles === 'boolean' ||
			typeof body.showDomainSystemFiles === 'boolean' ||
			typeof body.showTermSystemFiles === 'boolean' ||
			typeof body.showDatabaseSystemFiles === 'boolean' ||
			typeof body.showEntitySystemFiles === 'boolean' ||
			typeof body.showAttributeSystemFiles === 'boolean' ||
			typeof body.showTableSystemFiles === 'boolean' ||
			typeof body.showColumnSystemFiles === 'boolean';

		if (!hasIndividualSettings && Object.keys(body).length > 0) {
			await setAllSettings(body);
		}

		return json({
			success: true,
			message: '설정이 저장되었습니다.'
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '설정 저장 중 오류가 발생했습니다.'
			},
			{ status: 500 }
		);
	}
}
