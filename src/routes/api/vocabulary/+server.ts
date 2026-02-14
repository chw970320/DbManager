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

import { checkEntryReferences } from '$lib/registry/mapping-registry';
import { getDuplicateDetails } from '$lib/utils/duplicate-handler.js';
import { safeMerge } from '$lib/utils/type-guards.js';
import { validateForbiddenWordsAndSynonyms } from '$lib/utils/validation.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * 저장된 단어집 데이터 조회 API
 * GET /api/vocabulary
 */
export async function GET({ url }: RequestEvent) {
	try {
		// 쿼리 파라미터 추출
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '100');
		const filter = url.searchParams.get('filter'); // 중복 필터링 파라미터 추가
		const unmappedDomain = url.searchParams.get('unmappedDomain') === 'true';
		const filename = url.searchParams.get('filename') || undefined; // 파일명 파라미터 추가

		// 다중 정렬 파라미터 처리 (sortBy[]와 sortOrder[] 배열)
		const sortByArray = url.searchParams.getAll('sortBy[]');
		const sortOrderArray = url.searchParams.getAll('sortOrder[]');

		// 하위 호환성: 단일 정렬 파라미터도 지원
		const singleSortBy = url.searchParams.get('sortBy');
		const singleSortOrder = url.searchParams.get('sortOrder');

		// 정렬 설정 구성
		type SortConfig = { column: string; direction: 'asc' | 'desc' };
		const sortConfigs: SortConfig[] = [];

		if (sortByArray.length > 0 && sortOrderArray.length > 0) {
			// 다중 정렬
			for (let i = 0; i < Math.min(sortByArray.length, sortOrderArray.length); i++) {
				const direction = sortOrderArray[i];
				if (direction === 'asc' || direction === 'desc') {
					sortConfigs.push({ column: sortByArray[i], direction });
				}
			}
		} else if (singleSortBy && singleSortOrder) {
			// 단일 정렬 (하위 호환성)
			if (singleSortOrder === 'asc' || singleSortOrder === 'desc') {
				sortConfigs.push({ column: singleSortBy, direction: singleSortOrder });
			}
		}

		// 컬럼 필터 파라미터 추출 (filters[columnKey]=value 형식)
		const columnFilters: Record<string, string> = {};
		url.searchParams.forEach((value, key) => {
			const match = key.match(/^filters\[(.+)\]$/);
			if (match && value) {
				columnFilters[match[1]] = value;
			}
		});

		// 페이지네이션 유효성 검증
		if (page < 1 || limit < 1 || limit > 1000) {
			return json(
				{
					success: false,
					error: '잘못된 페이지네이션 파라미터입니다. (page >= 1, 1 <= limit <= 1000)',
					message: 'Invalid pagination parameters'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 정렬 필드 유효성 검증
		const validSortFields = [
			'standardName',
			'abbreviation',
			'englishName',
			'createdAt',
			'updatedAt'
		];
		for (const config of sortConfigs) {
			if (!validSortFields.includes(config.column)) {
				return json(
					{
						success: false,
						error: `지원하지 않는 정렬 필드입니다. 사용 가능: ${validSortFields.join(', ')}`,
						message: 'Invalid sort field'
					} as ApiResponse,
					{ status: 400 }
				);
			}
		}

		// 데이터 로드
		let vocabularyData: VocabularyData;
		try {
			vocabularyData = await loadVocabularyData(filename);
		} catch (loadError) {
			return json(
				{
					success: false,
					error: loadError instanceof Error ? loadError.message : '데이터 로드 실패',
					message: 'Data loading failed'
				} as ApiResponse,
				{ status: 500 }
			);
		}

		// 중복 정보 가져오기
		const duplicateDetails = getDuplicateDetails(vocabularyData.entries);

		// 모든 항목에 duplicateInfo 추가
		const entriesWithDuplicateInfo = vocabularyData.entries.map((entry) => ({
			...entry,
			duplicateInfo: duplicateDetails.get(entry.id) || {
				standardName: false,
				abbreviation: false,
				englishName: false
			}
		}));

		// 세분화된 중복/미매핑 필터링 적용
		let filteredEntries = entriesWithDuplicateInfo;
		if (filter && filter.startsWith('duplicates:')) {
			// filter=duplicates:standardName,abbreviation 형태 파싱
			const filterFields = filter
				.substring('duplicates:'.length)
				.split(',')
				.map((f) => f.trim());
			const validFields = ['standardName', 'abbreviation', 'englishName'];
			const requestedFields = filterFields.filter((field) => validFields.includes(field));

			if (requestedFields.length > 0) {
				filteredEntries = entriesWithDuplicateInfo.filter((entry) => {
					return requestedFields.some(
						(field) =>
							entry.duplicateInfo && entry.duplicateInfo[field as keyof typeof entry.duplicateInfo]
					);
				});
			}
		} else if (filter === 'duplicates') {
			// 기존 호환성: 모든 중복 항목
			filteredEntries = entriesWithDuplicateInfo.filter(
				(entry) =>
					entry.duplicateInfo &&
					(entry.duplicateInfo.standardName ||
						entry.duplicateInfo.abbreviation ||
						entry.duplicateInfo.englishName)
			);
		}

		// 도메인 미매핑 필터 (형식단어여부가 Y인 경우만 적용)
		if (unmappedDomain) {
			filteredEntries = filteredEntries.filter((entry) => {
				// 형식단어여부가 N인 경우는 제외
				if (entry.isFormalWord !== true) {
					return false;
				}
				return !entry.domainGroup || entry.isDomainCategoryMapped === false;
			});
		}

		// 컬럼 필터 적용
		if (Object.keys(columnFilters).length > 0) {
			filteredEntries = filteredEntries.filter((entry) => {
				return Object.entries(columnFilters).every(([columnKey, filterValue]) => {
					const entryValue = entry[columnKey as keyof VocabularyEntry];

					// "(빈값)" 필터 처리
					if (filterValue === '(빈값)') {
						return entryValue === null || entryValue === undefined || entryValue === '';
					}

					if (entryValue === null || entryValue === undefined) {
						return false;
					}

					// 형식단어여부 필드의 경우 boolean을 Y/N으로 변환하여 비교
					if (columnKey === 'isFormalWord') {
						const entryStr = entryValue ? 'Y' : 'N';
						return entryStr === filterValue;
					}

					// 문자열 필드의 경우 부분 일치 검색
					const entryStr = String(entryValue).toLowerCase();
					const filterStr = filterValue.toLowerCase();
					return entryStr.includes(filterStr);
				});
			});
		}

		// 정렬 적용
		const sortedEntries = [...filteredEntries].sort((a, b) => {
			// 다중 정렬: 각 정렬 조건을 순차적으로 적용
			for (const config of sortConfigs) {
				const valueA = a[config.column as keyof typeof a];
				const valueB = b[config.column as keyof typeof b];

				// null/undefined 처리
				if (valueA === null || valueA === undefined) {
					if (valueB === null || valueB === undefined) continue;
					return 1; // null은 뒤로
				}
				if (valueB === null || valueB === undefined) {
					return -1; // null은 뒤로
				}

				// 문자열로 변환하여 비교
				const strA = String(valueA).toLowerCase();
				const strB = String(valueB).toLowerCase();

				const comparison = strA.localeCompare(strB, 'ko-KR');
				if (comparison !== 0) {
					return config.direction === 'desc' ? -comparison : comparison;
				}
			}

			// 모든 정렬 조건이 같으면 기본 정렬 적용 (updatedAt desc, 없으면 createdAt desc)
			const aDate = a.updatedAt || a.createdAt || '';
			const bDate = b.updatedAt || b.createdAt || '';
			if (aDate && bDate) {
				return bDate.localeCompare(aDate); // 내림차순
			}
			return 0;
		});

		// 페이지네이션 적용
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedEntries = sortedEntries.slice(startIndex, endIndex);

		// 페이지네이션 메타 정보 (필터링된 결과 기준으로 계산)
		const filteredCount = filteredEntries.length;
		const totalPages = Math.ceil(filteredCount / limit);
		const hasNextPage = page < totalPages;
		const hasPrevPage = page > 1;

		// 성공 응답
		const responseData = {
			entries: paginatedEntries,
			pagination: {
				currentPage: page,
				totalPages,
				totalCount: filteredCount, // 필터링된 결과의 총 개수
				limit,
				hasNextPage,
				hasPrevPage
			},
			sorting: {
				sortConfigs:
					sortConfigs.length > 0
						? sortConfigs
						: [{ column: 'updatedAt', direction: 'desc' as const }]
			},
			filtering: {
				filter: filter || 'none',
				isFiltered: filter === 'duplicates'
			},
			lastUpdated: vocabularyData.lastUpdated
		};

		return json(
			{
				success: true,
				data: responseData,
				message: 'Vocabulary data retrieved successfully'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('단어집 관리 중 오류:', error);

		return json(
			{
				success: false,
				error: '서버에서 데이터 조회 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 신규 단어 추가 API
 * POST /api/vocabulary
 */
export async function POST({ request, url }: RequestEvent) {
	try {
		const newEntry: Partial<VocabularyEntry> = await request.json();
		const filename = url.searchParams.get('filename') || undefined;

		// 필수 필드 검증
		if (!newEntry.standardName || !newEntry.abbreviation || !newEntry.englishName) {
			return json(
				{
					success: false,
					error: '표준단어명, 영문약어, 영문명은 필수 항목입니다.',
					message: 'Missing required fields'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		const vocabularyData = await loadVocabularyData(filename);

		// 모든 단어집 파일 로드하여 금칙어 및 이음동의어 검사
		try {
			const allVocabularyFiles = await listVocabularyFiles();
			const allVocabularyEntries: VocabularyEntry[] = [];
			for (const file of allVocabularyFiles) {
				try {
					const fileData = await loadVocabularyData(file);
					allVocabularyEntries.push(...fileData.entries);
				} catch (error) {
					console.warn(`단어집 파일 ${file} 로드 실패:`, error);
				}
			}

			// 금칙어 및 이음동의어 validation
			const validationError = validateForbiddenWordsAndSynonyms(
				newEntry.standardName,
				allVocabularyEntries
			);
			if (validationError) {
				return json(
					{
						success: false,
						error: validationError,
						message: 'Forbidden word or synonym detected'
					} as ApiResponse,
					{ status: 400 }
				);
			}
		} catch (validationError) {
			console.warn('금칙어 및 이음동의어 확인 중 오류 (계속 진행):', validationError);
		}

		// 영문약어 중복 검사 (표준단어명 중복은 허용)
		const isAbbreviationDuplicate = vocabularyData.entries.some(
			(e) => e.abbreviation === newEntry.abbreviation
		);
		if (isAbbreviationDuplicate) {
			return json(
				{
					success: false,
					error: '이미 존재하는 영문약어입니다.',
					message: 'Duplicate abbreviation'
				} as ApiResponse,
				{ status: 409 }
			);
		}

		const entryToSave: VocabularyEntry = {
			id: uuidv4(),
			standardName: newEntry.standardName,
			abbreviation: newEntry.abbreviation,
			englishName: newEntry.englishName,
			description: newEntry.description || '',
			domainCategory: newEntry.domainCategory || undefined,
			domainGroup: newEntry.domainGroup || undefined,
			isDomainCategoryMapped: newEntry.isDomainCategoryMapped ?? false,
			isFormalWord: newEntry.isFormalWord ?? undefined,
			synonyms: newEntry.synonyms || undefined,
			forbiddenWords: newEntry.forbiddenWords || undefined,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		vocabularyData.entries.push(entryToSave);
		await saveVocabularyData(vocabularyData, filename);
		invalidateCache('vocabulary', filename); // 캐시 무효화

		return json(
			{
				success: true,
				data: entryToSave,
				message: '새로운 단어가 성공적으로 추가되었습니다.'
			} as ApiResponse,
			{ status: 201 } // Created
		);
	} catch (error) {
		console.error('단어 추가 중 오류:', error);
		return json(
			{
				success: false,
				error: '서버에서 단어 추가 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 단어 수정 API
 * PUT /api/vocabulary/:id
 */
export async function PUT({ request, url }: RequestEvent) {
	try {
		const updatedEntry: VocabularyEntry = await request.json();
		const filename = url.searchParams.get('filename') || undefined;

		if (!updatedEntry.id) {
			return json(
				{
					success: false,
					error: '단어 ID가 필요합니다.',
					message: 'Missing vocabulary ID'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		const vocabularyData = await loadVocabularyData(filename);
		const entryIndex = vocabularyData.entries.findIndex((e) => e.id === updatedEntry.id);

		if (entryIndex === -1) {
			return json(
				{
					success: false,
					error: '수정할 단어를 찾을 수 없습니다.',
					message: 'Entry not found'
				} as ApiResponse,
				{ status: 404 }
			);
		}

		// 표준단어명이 변경되는 경우 금칙어 및 이음동의어 validation
		const existingEntry = vocabularyData.entries[entryIndex];
		if (updatedEntry.standardName && updatedEntry.standardName !== existingEntry.standardName) {
			try {
				const allVocabularyFiles = await listVocabularyFiles();
				const allVocabularyEntries: VocabularyEntry[] = [];
				for (const file of allVocabularyFiles) {
					try {
						const fileData = await loadVocabularyData(file);
						// 현재 수정 중인 엔트리는 제외하고 검사
						const filteredEntries = fileData.entries.filter((e) => e.id !== updatedEntry.id);
						allVocabularyEntries.push(...filteredEntries);
					} catch (error) {
						console.warn(`단어집 파일 ${file} 로드 실패:`, error);
					}
				}

				// 금칙어 및 이음동의어 validation
				const validationError = validateForbiddenWordsAndSynonyms(
					updatedEntry.standardName,
					allVocabularyEntries
				);
				if (validationError) {
					return json(
						{
							success: false,
							error: validationError,
							message: 'Forbidden word or synonym detected'
						} as ApiResponse,
						{ status: 400 }
					);
				}
			} catch (validationError) {
				console.warn('금칙어 및 이음동의어 확인 중 오류 (계속 진행):', validationError);
			}
		}

		// 기존 데이터를 유지하면서 업데이트 (undefined 값은 무시)
		vocabularyData.entries[entryIndex] = {
			...safeMerge(vocabularyData.entries[entryIndex], updatedEntry),
			isDomainCategoryMapped:
				updatedEntry.isDomainCategoryMapped ??
				vocabularyData.entries[entryIndex].isDomainCategoryMapped ??
				false,
			updatedAt: new Date().toISOString()
		};

		await saveVocabularyData(vocabularyData, filename);
		invalidateCache('vocabulary', filename); // 캐시 무효화

		return json(
			{
				success: true,
				data: vocabularyData.entries[entryIndex],
				message: '단어가 성공적으로 수정되었습니다.'
			} as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('단어 수정 중 오류:', error);
		return json(
			{
				success: false,
				error: '서버에서 단어 수정 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

/**
 * 단어 삭제 API
 * DELETE /api/vocabulary/:id
 */
export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		const filename = url.searchParams.get('filename') || undefined;
		const force = url.searchParams.get('force') === 'true'; // 강제 삭제 옵션
		console.log(`[DELETE] Request received for id: ${id}, filename: ${filename}, force: ${force}`);

		if (!id) {
			return json(
				{
					success: false,
					error: '삭제할 단어의 ID가 필요합니다.',
					message: 'Missing vocabulary ID'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		const vocabularyData = await loadVocabularyData(filename);
		const entryToDelete = vocabularyData.entries.find((e) => e.id === id);

		if (!entryToDelete) {
			return json(
				{
					success: false,
					error: '삭제할 단어를 찾을 수 없습니다.',
					message: 'Entry not found'
				} as ApiResponse,
				{ status: 404 }
			);
		}

		// 참조 검증: 차단하지 않고 경고 정보만 수집
		let warnings: unknown[] = [];
		if (!force) {
			try {
				const refCheck = await checkEntryReferences('vocabulary', entryToDelete, filename || undefined);
				if (!refCheck.canDelete && refCheck.references?.length) {
					warnings = refCheck.references;
				}
			} catch (refError) {
				console.warn('참조 검증 경고 수집 중 오류:', refError);
			}
		}

		vocabularyData.entries = vocabularyData.entries.filter((e) => e.id !== id);
		await saveVocabularyData(vocabularyData, filename);
		invalidateCache('vocabulary', filename); // 캐시 무효화

		return json(
			{ success: true, message: '단어가 성공적으로 삭제되었습니다.', warnings } as ApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('단어 삭제 중 오류:', error);
		return json(
			{
				success: false,
				error: '서버에서 단어 삭제 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

