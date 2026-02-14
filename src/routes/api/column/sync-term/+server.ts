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

import { resolveRelatedFilenames } from '$lib/registry/mapping-registry';

type SyncRequest = {
	columnFilename?: string;
	termFilename?: string;
};

type SyncResult = {
	columnFilename: string;
	termFilename: string;
	matched: number;
	unmatched: number;
	updated: number;
	total: number;
	unmatchedColumns: Array<{
		id: string;
		columnEnglishName: string;
		tableEnglishName: string;
	}>;
};

/**
 * 컬럼 정의서와 용어 동기화 API
 * POST /api/column/sync-term
 *
 * 컬럼의 영문명(columnEnglishName)과 용어의 컬럼명(columnName)을 매핑합니다.
 */
export async function POST({ request }: RequestEvent) {
	try {
		const { columnFilename, termFilename }: SyncRequest = await request.json();

		const colFile = columnFilename || 'column.json';

		// termFilename이 명시적으로 전달되지 않으면 레지스트리 기반으로 해석
		const termFile = termFilename || (await resolveRelatedFilenames('column', colFile)).get('term') || 'term.json';

		// 컬럼 데이터 로드
		let columnData: ColumnData;
		try {
			columnData = await loadData('column', colFile) as ColumnData;
		} catch (error) {
			return json(
				{
					success: false,
					error: `컬럼 정의서 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
					message: 'Failed to load column data'
				} as DbDesignApiResponse,
				{ status: 500 }
			);
		}

		// 용어 데이터 로드
		let termEntries: TermEntry[] = [];
		try {
			const termData = await loadData('term', termFile);
			termEntries = termData.entries;
		} catch (error) {
			return json(
				{
					success: false,
					error: `용어 데이터 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
					message: 'Failed to load term data'
				} as DbDesignApiResponse,
				{ status: 500 }
			);
		}

		// 용어 맵 생성 (columnName -> TermEntry)
		const termMap = new Map<string, TermEntry>();
		termEntries.forEach((entry) => {
			if (entry.columnName) {
				// 대소문자 구분 없이 매핑
				termMap.set(entry.columnName.toLowerCase().trim(), entry);
			}
		});

		let matched = 0;
		let unmatched = 0;
		let updated = 0;
		const unmatchedColumns: SyncResult['unmatchedColumns'] = [];
		const now = new Date().toISOString();

		// 컬럼 데이터 동기화
		const syncedEntries: ColumnEntry[] = columnData.entries.map((entry) => {
			// columnEnglishName이 없으면 매핑 불가
			if (!entry.columnEnglishName) {
				unmatched += 1;
				unmatchedColumns.push({
					id: entry.id,
					columnEnglishName: entry.columnEnglishName || '(빈값)',
					tableEnglishName: entry.tableEnglishName || ''
				});
				return entry;
			}

			const key = entry.columnEnglishName.toLowerCase().trim();
			const mappedTerm = termMap.get(key);

			if (mappedTerm) {
				matched += 1;

				// 기존 값과 비교하여 업데이트 필요 여부 확인
				const needsUpdate =
					entry.columnKoreanName !== mappedTerm.termName ||
					entry.dataType !== mappedTerm.domainName;

				if (needsUpdate) {
					updated += 1;
					return {
						...entry,
						// 용어에서 정보 동기화
						columnKoreanName: mappedTerm.termName || entry.columnKoreanName,
						updatedAt: now
					};
				}

				return entry;
			} else {
				unmatched += 1;
				unmatchedColumns.push({
					id: entry.id,
					columnEnglishName: entry.columnEnglishName,
					tableEnglishName: entry.tableEnglishName || ''
				});
				return entry;
			}
		});

		// 변경된 데이터 저장
		if (updated > 0) {
			const finalData: ColumnData = {
				...columnData,
				entries: syncedEntries,
				lastUpdated: now,
				totalCount: syncedEntries.length
			};
			await saveData('column', finalData, colFile);
		}

		const result: SyncResult = {
			columnFilename: colFile,
			termFilename: termFile,
			matched,
			unmatched,
			updated,
			total: columnData.entries.length,
			unmatchedColumns: unmatchedColumns.slice(0, 100) // 최대 100개만 반환
		};

		return json(
			{
				success: true,
				data: result,
				message: `용어 매핑 동기화가 완료되었습니다. 매핑됨: ${matched}, 미매핑: ${unmatched}, 업데이트: ${updated}`
			} as DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('컬럼-용어 동기화 오류:', error);
		return json(
			{
				success: false,
				error: '용어 매핑 동기화 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 컬럼-용어 매핑 상태 조회 API
 * GET /api/column/sync-term?columnFilename=column.json&termFilename=term.json
 */
export async function GET({ url }: RequestEvent) {
	try {
		const colFile = url.searchParams.get('columnFilename') || 'column.json';
		const termFileParam = url.searchParams.get('termFilename');
		const termFile = termFileParam || (await resolveRelatedFilenames('column', colFile)).get('term') || 'term.json';

		// 컬럼 데이터 로드
		const columnData = await loadData('column', colFile) as ColumnData;

		// 용어 데이터 로드
		const termData = await loadData('term', termFile);

		// 용어 맵 생성
		const termMap = new Map<string, TermEntry>();
		termData.entries.forEach((entry) => {
			if (entry.columnName) {
				termMap.set(entry.columnName.toLowerCase().trim(), entry);
			}
		});

		let matched = 0;
		let unmatched = 0;
		const unmatchedColumns: Array<{
			id: string;
			columnEnglishName: string;
			tableEnglishName: string;
		}> = [];

		columnData.entries.forEach((entry) => {
			if (!entry.columnEnglishName) {
				unmatched += 1;
				unmatchedColumns.push({
					id: entry.id,
					columnEnglishName: entry.columnEnglishName || '(빈값)',
					tableEnglishName: entry.tableEnglishName || ''
				});
				return;
			}

			const key = entry.columnEnglishName.toLowerCase().trim();
			if (termMap.has(key)) {
				matched += 1;
			} else {
				unmatched += 1;
				unmatchedColumns.push({
					id: entry.id,
					columnEnglishName: entry.columnEnglishName,
					tableEnglishName: entry.tableEnglishName || ''
				});
			}
		});

		return json(
			{
				success: true,
				data: {
					columnFilename: colFile,
					termFilename: termFile,
					matched,
					unmatched,
					total: columnData.entries.length,
					termCount: termData.entries.length,
					unmatchedColumns: unmatchedColumns.slice(0, 100)
				},
				message: '매핑 상태 조회 완료'
			} as DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('매핑 상태 조회 오류:', error);
		return json(
			{
				success: false,
				error: '매핑 상태 조회 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}

