import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '$lib/types/vocabulary.js';
import type { TermData, TermEntry } from '$lib/types/term.js';
import { saveTermData, loadTermData } from '$lib/utils/file-handler.js';
import { safeMerge } from '$lib/utils/type-guards.js';
import { getCachedVocabularyData, getCachedDomainData, invalidateCache } from '$lib/utils/cache.js';

/**
 * 용어 매핑 로직 (업로드 API와 동일)
 */
function checkTermMapping(
	termName: string,
	columnName: string,
	domainName: string,
	vocabularyMap: Map<string, { standardName: string; abbreviation: string }>,
	domainMap: Map<string, string>
): { isMappedTerm: boolean; isMappedColumn: boolean; isMappedDomain: boolean } {
	// 용어명 매핑: 언더스코어로 분리해서 각 단어가 단어집의 standardName에 있는지 확인
	const termParts = termName
		.split('_')
		.map((p) => p.trim().toLowerCase())
		.filter((p) => p.length > 0);
	const isMappedTerm =
		termParts.length > 0 &&
		termParts.every((part) => {
			// 정확히 일치하거나 부분 일치하는지 확인
			for (const [key, value] of vocabularyMap.entries()) {
				if (key === part || value.standardName.toLowerCase() === part) {
					return true;
				}
			}
			return false;
		});

	// 칼럼명 매핑: 언더스코어로 분리해서 각 단어가 단어집의 abbreviation에 있는지 확인
	const columnParts = columnName
		.split('_')
		.map((p) => p.trim().toLowerCase())
		.filter((p) => p.length > 0);
	const isMappedColumn =
		columnParts.length > 0 &&
		columnParts.every((part) => {
			// 정확히 일치하거나 부분 일치하는지 확인
			for (const [key, value] of vocabularyMap.entries()) {
				if (key === part || value.abbreviation.toLowerCase() === part) {
					return true;
				}
			}
			return false;
		});

	// 도메인명 매핑: 도메인의 standardDomainName과 정확히 일치하는지 확인
	const isMappedDomain = domainMap.has(domainName.trim().toLowerCase());

	return { isMappedTerm, isMappedColumn, isMappedDomain };
}

/**
 * 저장된 용어 데이터 조회 API
 * GET /api/term
 */
export async function GET({ url }: RequestEvent) {
	try {
		// 쿼리 파라미터 추출
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const sortBy = url.searchParams.get('sortBy') || 'createdAt';
		const sortOrder = url.searchParams.get('sortOrder') || 'desc';
		const searchQuery = url.searchParams.get('query') || '';
		const searchField = url.searchParams.get('field') || 'all';
		const filename = url.searchParams.get('filename') || 'term.json';

		// 페이지네이션 유효성 검증
		if (page < 1 || limit < 1 || limit > 100) {
			return json(
				{
					success: false,
					error: '잘못된 페이지네이션 파라미터입니다. (page >= 1, 1 <= limit <= 100)',
					message: 'Invalid pagination parameters'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 정렬 필드 유효성 검증
		const validSortFields = ['termName', 'columnName', 'domainName', 'createdAt'];
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

		// 검색 필드 유효성 검증
		const validSearchFields = ['all', 'termName', 'columnName', 'domainName'];
		if (!validSearchFields.includes(searchField)) {
			return json(
				{
					success: false,
					error: `지원하지 않는 검색 필드입니다. 사용 가능: ${validSearchFields.join(', ')}`,
					message: 'Invalid search field'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 데이터 로드
		let termData: TermData;
		try {
			termData = await loadTermData(filename);
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

		let filteredEntries = termData.entries;

		// 검색 필터링
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filteredEntries = termData.entries.filter((entry) => {
				switch (searchField) {
					case 'termName':
						return entry.termName.toLowerCase().includes(query);
					case 'columnName':
						return entry.columnName.toLowerCase().includes(query);
					case 'domainName':
						return entry.domainName.toLowerCase().includes(query);
					case 'all':
					default:
						return (
							entry.termName.toLowerCase().includes(query) ||
							entry.columnName.toLowerCase().includes(query) ||
							entry.domainName.toLowerCase().includes(query)
						);
				}
			});
		}

		// 정렬
		filteredEntries = [...filteredEntries].sort((a, b) => {
			const aValue: string | number = a[sortBy as keyof TermEntry] as string | number;
			const bValue: string | number = b[sortBy as keyof TermEntry] as string | number;

			// 문자열 비교
			if (typeof aValue === 'string' && typeof bValue === 'string') {
				return sortOrder === 'asc'
					? aValue.localeCompare(bValue, 'ko', { numeric: true })
					: bValue.localeCompare(aValue, 'ko', { numeric: true });
			}

			// 숫자 비교
			if (typeof aValue === 'number' && typeof bValue === 'number') {
				return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
			}

			return 0;
		});

		// 페이지네이션
		const totalCount = filteredEntries.length;
		const totalPages = Math.ceil(totalCount / limit);
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedEntries = filteredEntries.slice(startIndex, endIndex);

		return json({
			success: true,
			data: {
				entries: paginatedEntries,
				pagination: {
					totalCount,
					totalPages,
					currentPage: page,
					pageSize: limit
				},
				lastUpdated: termData.lastUpdated
			},
			message: 'Term data retrieved successfully'
		} as ApiResponse);
	} catch (error) {
		console.error('용어 데이터 조회 중 오류:', error);
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
 * 용어 데이터 저장/수정/삭제 API
 * POST /api/term - 새 용어 추가
 * PUT /api/term - 용어 수정
 * DELETE /api/term - 용어 삭제
 */
export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const { entry, filename = 'term.json' } = body;

		if (!entry || !entry.termName || !entry.columnName || !entry.domainName) {
			return json(
				{
					success: false,
					error: '용어명, 칼럼명, 도메인명은 필수입니다.',
					message: 'Required fields missing'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		const termData = await loadTermData(filename);

		// 매핑 정보 로드
		const mapping = termData.mapping || {
			vocabulary: 'vocabulary.json',
			domain: 'domain.json'
		};

		// 단어집 및 도메인 데이터 로드 (매핑 확인용)
		// 캐시를 사용한 데이터 로드 (N+1 문제 방지)
		const vocabularyData = await getCachedVocabularyData(mapping.vocabulary);
		const domainData = await getCachedDomainData(mapping.domain);

		// 단어집 맵 생성
		const vocabularyMap = new Map<string, { standardName: string; abbreviation: string }>();
		vocabularyData.entries.forEach((vocabEntry) => {
			const standardNameKey = vocabEntry.standardName.trim().toLowerCase();
			const abbreviationKey = vocabEntry.abbreviation.trim().toLowerCase();
			vocabularyMap.set(standardNameKey, {
				standardName: vocabEntry.standardName,
				abbreviation: vocabEntry.abbreviation
			});
			vocabularyMap.set(abbreviationKey, {
				standardName: vocabEntry.standardName,
				abbreviation: vocabEntry.abbreviation
			});
		});

		// 도메인 맵 생성
		const domainMap = new Map<string, string>();
		domainData.entries.forEach((domainEntry) => {
			const key = domainEntry.standardDomainName.trim().toLowerCase();
			domainMap.set(key, domainEntry.standardDomainName);
		});

		// 매핑 검증
		const mappingResult = checkTermMapping(
			entry.termName.trim(),
			entry.columnName.trim(),
			entry.domainName.trim(),
			vocabularyMap,
			domainMap
		);

		const newEntry: TermEntry = {
			id: entry.id || crypto.randomUUID(),
			termName: entry.termName.trim(),
			columnName: entry.columnName.trim(),
			domainName: entry.domainName.trim(),
			isMappedTerm: mappingResult.isMappedTerm,
			isMappedColumn: mappingResult.isMappedColumn,
			isMappedDomain: mappingResult.isMappedDomain,
			createdAt: entry.createdAt || new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};

		termData.entries.push(newEntry);
		termData.totalCount = termData.entries.length;
		termData.lastUpdated = new Date().toISOString();

		await saveTermData(termData, filename);
		invalidateCache('term', filename); // 캐시 무효화

		return json({
			success: true,
			data: newEntry,
			message: 'Term added successfully'
		} as ApiResponse);
	} catch (error) {
		console.error('용어 추가 중 오류:', error);
		return json(
			{
				success: false,
				error: '서버에서 용어 추가 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

export async function PUT({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const { entry, filename = 'term.json' } = body;

		if (!entry || !entry.id) {
			return json(
				{
					success: false,
					error: '용어 ID는 필수입니다.',
					message: 'Term ID is required'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		const termData = await loadTermData(filename);
		const index = termData.entries.findIndex((e) => e.id === entry.id);

		if (index === -1) {
			return json(
				{
					success: false,
					error: '용어를 찾을 수 없습니다.',
					message: 'Term not found'
				} as ApiResponse,
				{ status: 404 }
			);
		}

		// 매핑 정보 로드
		const mapping = termData.mapping || {
			vocabulary: 'vocabulary.json',
			domain: 'domain.json'
		};

		// 단어집 및 도메인 데이터 로드 (매핑 확인용)
		// 캐시를 사용한 데이터 로드 (N+1 문제 방지)
		const vocabularyData = await getCachedVocabularyData(mapping.vocabulary);
		const domainData = await getCachedDomainData(mapping.domain);

		// 단어집 맵 생성
		const vocabularyMap = new Map<string, { standardName: string; abbreviation: string }>();
		vocabularyData.entries.forEach((vocabEntry) => {
			const standardNameKey = vocabEntry.standardName.trim().toLowerCase();
			const abbreviationKey = vocabEntry.abbreviation.trim().toLowerCase();
			vocabularyMap.set(standardNameKey, {
				standardName: vocabEntry.standardName,
				abbreviation: vocabEntry.abbreviation
			});
			vocabularyMap.set(abbreviationKey, {
				standardName: vocabEntry.standardName,
				abbreviation: vocabEntry.abbreviation
			});
		});

		// 도메인 맵 생성
		const domainMap = new Map<string, string>();
		domainData.entries.forEach((domainEntry) => {
			const key = domainEntry.standardDomainName.trim().toLowerCase();
			domainMap.set(key, domainEntry.standardDomainName);
		});

		// 업데이트할 값 결정
		const termName = entry.termName?.trim() || termData.entries[index].termName;
		const columnName = entry.columnName?.trim() || termData.entries[index].columnName;
		const domainName = entry.domainName?.trim() || termData.entries[index].domainName;

		// 매핑 검증
		const mappingResult = checkTermMapping(
			termName,
			columnName,
			domainName,
			vocabularyMap,
			domainMap
		);

		// 기존 데이터와 안전하게 병합 (undefined 값은 무시)
		const updates: Partial<TermEntry> = {
			termName,
			columnName,
			domainName,
			isMappedTerm: mappingResult.isMappedTerm,
			isMappedColumn: mappingResult.isMappedColumn,
			isMappedDomain: mappingResult.isMappedDomain,
			id: entry.id,
			updatedAt: new Date().toISOString()
		};
		termData.entries[index] = safeMerge(termData.entries[index], updates);
		termData.lastUpdated = new Date().toISOString();

		await saveTermData(termData, filename);
		invalidateCache('term', filename); // 캐시 무효화

		return json({
			success: true,
			data: termData.entries[index],
			message: 'Term updated successfully'
		} as ApiResponse);
	} catch (error) {
		console.error('용어 수정 중 오류:', error);
		return json(
			{
				success: false,
				error: '서버에서 용어 수정 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}

export async function DELETE({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const { id, filename = 'term.json' } = body;

		if (!id) {
			return json(
				{
					success: false,
					error: '용어 ID는 필수입니다.',
					message: 'Term ID is required'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		const termData = await loadTermData(filename);
		const index = termData.entries.findIndex((e) => e.id === id);

		if (index === -1) {
			return json(
				{
					success: false,
					error: '용어를 찾을 수 없습니다.',
					message: 'Term not found'
				} as ApiResponse,
				{ status: 404 }
			);
		}

		termData.entries.splice(index, 1);
		termData.totalCount = termData.entries.length;
		termData.lastUpdated = new Date().toISOString();

		await saveTermData(termData, filename);
		invalidateCache('term', filename); // 캐시 무효화

		return json({
			success: true,
			message: 'Term deleted successfully'
		} as ApiResponse);
	} catch (error) {
		console.error('용어 삭제 중 오류:', error);
		return json(
			{
				success: false,
				error: '서버에서 용어 삭제 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as ApiResponse,
			{ status: 500 }
		);
	}
}
