import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse, VocabularyData, VocabularyEntry } from '$lib/types/vocabulary.js';
import {
	loadVocabularyData,
	saveVocabularyData,
	loadForbiddenWordsData,
	checkVocabularyReferences
} from '$lib/utils/file-handler.js';
import { getDuplicateDetails } from '$lib/utils/duplicate-handler.js';
import { safeMerge } from '$lib/utils/type-guards.js';
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
		const sortBy = url.searchParams.get('sortBy') || 'standardName';
		const sortOrder = url.searchParams.get('sortOrder') || 'asc';
		const filter = url.searchParams.get('filter'); // 중복 필터링 파라미터 추가
		const unmappedDomain = url.searchParams.get('unmappedDomain') === 'true';
		const filename = url.searchParams.get('filename') || undefined; // 파일명 파라미터 추가

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
		const validSortFields = ['standardName', 'abbreviation', 'englishName', 'createdAt'];
		if (!validSortFields.includes(sortBy)) {
			return json(
				{
					success: false,
					error: `지원하지 않는 정렬 필드입니다. 사용 가능: ${validSortFields.join(', ')}`,
					message: 'Invalid sort field'
				} as ApiResponse,
				{ status: 400 }
			);
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

		// 도메인 미매핑 필터
		if (unmappedDomain) {
			filteredEntries = filteredEntries.filter(
				(entry) => !entry.domainGroup || entry.isDomainCategoryMapped === false
			);
		}

		// 정렬 적용
		const sortedEntries = [...filteredEntries].sort((a, b) => {
			let valueA = a[sortBy as keyof typeof a];
			let valueB = b[sortBy as keyof typeof b];

			// 문자열로 변환하여 비교
			valueA = String(valueA).toLowerCase();
			valueB = String(valueB).toLowerCase();

			if (sortOrder === 'desc') {
				return valueB.localeCompare(valueA, 'ko-KR');
			} else {
				return valueA.localeCompare(valueB, 'ko-KR');
			}
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
				sortBy,
				sortOrder
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

		// 필수 필드가 검증되었으므로 안전하게 사용
		const standardNameLower = newEntry.standardName.toLowerCase();
		const abbreviationLower = newEntry.abbreviation.toLowerCase();

		// 금지어 검사
		try {
			const forbiddenWordsData = await loadForbiddenWordsData();

			// 표준단어명이 금지어에 해당하는지 확인
			const standardNameForbidden = forbiddenWordsData.entries.find(
				(entry) =>
					entry.keyword.toLowerCase() === standardNameLower && entry.type === 'standardName'
			);

			if (standardNameForbidden) {
				const errorMessage = standardNameForbidden.reason
					? `금지된 단어입니다. 사유: ${standardNameForbidden.reason}`
					: '금지된 단어입니다.';

				return json(
					{
						success: false,
						error: errorMessage,
						message: 'Forbidden word detected'
					} as ApiResponse,
					{ status: 400 }
				);
			}

			// 영문약어가 금지어에 해당하는지 확인
			const abbreviationForbidden = forbiddenWordsData.entries.find(
				(entry) =>
					entry.keyword.toLowerCase() === abbreviationLower && entry.type === 'abbreviation'
			);

			if (abbreviationForbidden) {
				const errorMessage = abbreviationForbidden.reason
					? `금지된 단어입니다. 사유: ${abbreviationForbidden.reason}`
					: '금지된 단어입니다.';

				return json(
					{
						success: false,
						error: errorMessage,
						message: 'Forbidden word detected'
					} as ApiResponse,
					{ status: 400 }
				);
			}
		} catch (forbiddenError) {
			console.warn('금지어 확인 중 오류 (계속 진행):', forbiddenError);
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
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		vocabularyData.entries.push(entryToSave);
		await saveVocabularyData(vocabularyData, filename);

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

		// 참조 무결성 검증 (강제 삭제가 아닌 경우)
		if (!force) {
			const refCheck = await checkVocabularyReferences(entryToDelete);
			if (!refCheck.canDelete) {
				return json(
					{
						success: false,
						error: refCheck.message || '다른 항목에서 참조 중이므로 삭제할 수 없습니다.',
						message: 'Referential integrity violation',
						data: {
							references: refCheck.references
						}
					} as ApiResponse,
					{ status: 409 }
				);
			}
		}

		vocabularyData.entries = vocabularyData.entries.filter((e) => e.id !== id);
		await saveVocabularyData(vocabularyData, filename);

		return json({ success: true, message: '단어가 성공적으로 삭제되었습니다.' } as ApiResponse, {
			status: 200
		});
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
