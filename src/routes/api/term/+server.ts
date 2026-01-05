import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '$lib/types/vocabulary.js';
import type { TermData, TermEntry } from '$lib/types/term.js';
import { saveTermData, loadTermData, listTermFiles } from '$lib/utils/file-handler.js';
import { safeMerge } from '$lib/utils/type-guards.js';
import { getCachedVocabularyData, getCachedDomainData, invalidateCache } from '$lib/utils/cache.js';
import { validateTermNameSuffix, validateTermNameUniqueness } from '$lib/utils/validation.js';

/**
 * 용어 매핑 로직 (업로드 API와 동일)
 */
function checkTermMapping(
	termName: string,
	columnName: string,
	domainName: string,
	vocabularyMap: Map<string, { standardName: string; abbreviation: string }>,
	domainMap: Map<string, string>
): {
	isMappedTerm: boolean;
	isMappedColumn: boolean;
	isMappedDomain: boolean;
	unmappedTermParts: string[];
	unmappedColumnParts: string[];
} {
	// 용어명 매핑: 언더스코어로 분리해서 각 단어가 단어집의 standardName에 있는지 확인
	const termParts = termName
		.split('_')
		.map((p) => p.trim())
		.filter((p) => p.length > 0);
	const unmappedTermParts: string[] = [];
	let isMappedTerm = termParts.length > 0;

	// 모든 부분을 확인하여 unmapped 목록을 완성
	for (const part of termParts) {
		const partLower = part.toLowerCase();
		let partMapped = false;

		// 단어집에서 해당 부분 찾기
		for (const [key, value] of vocabularyMap.entries()) {
			if (key === partLower || value.standardName.toLowerCase() === partLower) {
				partMapped = true;
				break;
			}
		}

		if (!partMapped) {
			unmappedTermParts.push(part);
			isMappedTerm = false; // 하나라도 매핑되지 않으면 전체 false
		}
	}

	// 컬럼명 매핑: 언더스코어로 분리해서 각 단어가 단어집의 abbreviation에 있는지 확인
	const columnParts = columnName
		.split('_')
		.map((p) => p.trim())
		.filter((p) => p.length > 0);
	const unmappedColumnParts: string[] = [];
	let isMappedColumn = columnParts.length > 0;

	// 모든 부분을 확인하여 unmapped 목록을 완성
	for (const part of columnParts) {
		const partLower = part.toLowerCase();
		let partMapped = false;

		// 단어집에서 해당 부분 찾기
		for (const [key, value] of vocabularyMap.entries()) {
			if (key === partLower || value.abbreviation.toLowerCase() === partLower) {
				partMapped = true;
				break;
			}
		}

		if (!partMapped) {
			unmappedColumnParts.push(part);
			isMappedColumn = false; // 하나라도 매핑되지 않으면 전체 false
		}
	}

	// 도메인명 매핑: 도메인의 standardDomainName과 정확히 일치하는지 확인
	const isMappedDomain = domainMap.has(domainName.trim().toLowerCase());

	return {
		isMappedTerm,
		isMappedColumn,
		isMappedDomain,
		unmappedTermParts,
		unmappedColumnParts
	};
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
		const searchQuery = url.searchParams.get('query') || '';
		const searchField = url.searchParams.get('field') || 'all';
		const filename = url.searchParams.get('filename') || 'term.json';

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
		const validSortFields = ['termName', 'columnName', 'domainName', 'createdAt', 'updatedAt'];
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

		// 매핑 정보 실시간 재계산 (단어집 변경 반영)
		const mapping = termData.mapping || {
			vocabulary: 'vocabulary.json',
			domain: 'domain.json'
		};

		// 단어집 및 도메인 데이터 로드
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

		// 각 항목의 매핑 정보 실시간 업데이트
		filteredEntries = filteredEntries.map((entry) => {
			const mappingResult = checkTermMapping(
				entry.termName,
				entry.columnName,
				entry.domainName,
				vocabularyMap,
				domainMap
			);
			return {
				...entry,
				isMappedTerm: mappingResult.isMappedTerm,
				isMappedColumn: mappingResult.isMappedColumn,
				isMappedDomain: mappingResult.isMappedDomain,
				unmappedTermParts:
					mappingResult.unmappedTermParts.length > 0 ? mappingResult.unmappedTermParts : undefined,
				unmappedColumnParts:
					mappingResult.unmappedColumnParts.length > 0
						? mappingResult.unmappedColumnParts
						: undefined
			};
		});

		// 검색 필터링
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filteredEntries = filteredEntries.filter((entry) => {
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

		// 컬럼 필터 적용
		if (Object.keys(columnFilters).length > 0) {
			filteredEntries = filteredEntries.filter((entry) => {
				return Object.entries(columnFilters).every(([columnKey, filterValue]) => {
					const entryValue = entry[columnKey as keyof TermEntry];
					if (entryValue === null || entryValue === undefined) {
						return false;
					}

					// 문자열 필드의 경우 부분 일치 검색
					const entryStr = String(entryValue).toLowerCase();
					const filterStr = filterValue.toLowerCase();
					return entryStr.includes(filterStr);
				});
			});
		}

		// 정렬
		filteredEntries = [...filteredEntries].sort((a, b) => {
			// 다중 정렬: 각 정렬 조건을 순차적으로 적용
			for (const config of sortConfigs) {
				const aValue = a[config.column as keyof TermEntry];
				const bValue = b[config.column as keyof TermEntry];

				// null/undefined 처리
				if (aValue === null || aValue === undefined) {
					if (bValue === null || bValue === undefined) continue;
					return 1; // null은 뒤로
				}
				if (bValue === null || bValue === undefined) {
					return -1; // null은 뒤로
				}

				// 문자열 비교
				if (typeof aValue === 'string' && typeof bValue === 'string') {
					const comparison = aValue.localeCompare(bValue, 'ko', { numeric: true });
					if (comparison !== 0) {
						return config.direction === 'asc' ? comparison : -comparison;
					}
					continue;
				}

				// 숫자 비교
				if (typeof aValue === 'number' && typeof bValue === 'number') {
					const comparison = aValue - bValue;
					if (comparison !== 0) {
						return config.direction === 'asc' ? comparison : -comparison;
					}
					continue;
				}

				// 기본 문자열 비교
				const comparison = String(aValue).localeCompare(String(bValue), 'ko', { numeric: true });
				if (comparison !== 0) {
					return config.direction === 'asc' ? comparison : -comparison;
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
 * 용어 데이터 저장/삭제 API
 * POST /api/term - 새 용어 추가
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
					error: '용어명, 컬럼명, 도메인명은 필수입니다.',
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

		// 용어명 접미사 validation
		const suffixValidationError = validateTermNameSuffix(
			entry.termName.trim(),
			vocabularyData.entries
		);
		if (suffixValidationError) {
			return json(
				{
					success: false,
					error: suffixValidationError,
					message: 'Term name suffix validation failed'
				} as ApiResponse,
				{ status: 400 }
			);
		}

		// 용어명 유일성 validation
		// entry.id가 있으면 수정 모드이므로 중복 검사 건너뛰기
		const entryId =
			entry.id && typeof entry.id === 'string' && entry.id.trim() !== ''
				? entry.id.trim()
				: undefined;

		// 수정 모드가 아닌 경우에만 중복 검사 수행
		if (!entryId) {
			try {
				const allTermFiles = await listTermFiles();
				const allTermEntries: TermEntry[] = [];
				for (const file of allTermFiles) {
					try {
						const fileData = await loadTermData(file);
						allTermEntries.push(...fileData.entries);
					} catch (error) {
						console.warn(`용어 파일 ${file} 로드 실패:`, error);
					}
				}

				const uniquenessError = validateTermNameUniqueness(entry.termName.trim(), allTermEntries);
				if (uniquenessError) {
					return json(
						{
							success: false,
							error: uniquenessError,
							message: 'Duplicate term name'
						} as ApiResponse,
						{ status: 409 }
					);
				}
			} catch (validationError) {
				console.warn('용어명 유일성 확인 중 오류 (계속 진행):', validationError);
			}
		}

		// 매핑 검증
		const mappingResult = checkTermMapping(
			entry.termName.trim(),
			entry.columnName.trim(),
			entry.domainName.trim(),
			vocabularyMap,
			domainMap
		);

		// entry.id가 있으면 수정 모드, 없으면 추가 모드
		if (entryId) {
			// 수정 모드: 기존 항목 찾아서 업데이트
			const entryIndex = termData.entries.findIndex((e) => e.id === entryId);
			if (entryIndex === -1) {
				return json(
					{
						success: false,
						error: '수정할 용어를 찾을 수 없습니다.',
						message: 'Entry not found'
					} as ApiResponse,
					{ status: 404 }
				);
			}

			// 기존 항목 업데이트
			termData.entries[entryIndex] = {
				...termData.entries[entryIndex],
				termName: entry.termName.trim(),
				columnName: entry.columnName.trim(),
				domainName: entry.domainName.trim(),
				isMappedTerm: mappingResult.isMappedTerm,
				isMappedColumn: mappingResult.isMappedColumn,
				isMappedDomain: mappingResult.isMappedDomain,
				unmappedTermParts:
					mappingResult.unmappedTermParts.length > 0 ? mappingResult.unmappedTermParts : undefined,
				unmappedColumnParts:
					mappingResult.unmappedColumnParts.length > 0
						? mappingResult.unmappedColumnParts
						: undefined,
				updatedAt: new Date().toISOString()
			};

			termData.lastUpdated = new Date().toISOString();
			await saveTermData(termData, filename);
			invalidateCache('term', filename); // 캐시 무효화

			return json({
				success: true,
				data: termData.entries[entryIndex],
				message: 'Term updated successfully'
			} as ApiResponse);
		} else {
			// 추가 모드: 새 항목 생성
			const newEntry: TermEntry = {
				id: crypto.randomUUID(),
				termName: entry.termName.trim(),
				columnName: entry.columnName.trim(),
				domainName: entry.domainName.trim(),
				isMappedTerm: mappingResult.isMappedTerm,
				isMappedColumn: mappingResult.isMappedColumn,
				isMappedDomain: mappingResult.isMappedDomain,
				unmappedTermParts:
					mappingResult.unmappedTermParts.length > 0 ? mappingResult.unmappedTermParts : undefined,
				unmappedColumnParts:
					mappingResult.unmappedColumnParts.length > 0
						? mappingResult.unmappedColumnParts
						: undefined,
				createdAt: new Date().toISOString(),
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
		}
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
