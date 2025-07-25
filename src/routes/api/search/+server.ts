import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse, SearchResult, SearchQuery, VocabularyEntry } from '../../../lib/types/vocabulary.js';
import { loadVocabularyData } from '../../../lib/utils/file-handler.js';
import { getDuplicateIds, getDuplicateDetails } from '../../../lib/utils/duplicate-handler.js';
import { sanitizeSearchQuery } from '../../../lib/utils/validation.js';

/**
 * 단어집 검색 API
 * GET /api/search?q=검색어&field=필드&page=1&limit=50&filter=duplicates
 */
export async function GET({ url }: RequestEvent) {
    try {
        // 쿼리 파라미터 추출
        const query = url.searchParams.get('q') || '';
        const field = url.searchParams.get('field') || 'all';
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const exact = url.searchParams.get('exact') === 'true';
        const filter = url.searchParams.get('filter'); // 중복 필터링 파라미터 추가

        // 검색어 유효성 검증 및 정제
        const sanitizedQuery = sanitizeSearchQuery(query);
        if (!sanitizedQuery) {
            return json({
                success: false,
                error: '유효한 검색어를 입력해주세요. (1-100자)',
                message: 'Invalid search query'
            } as ApiResponse, { status: 400 });
        }

        // 검색 필드 유효성 검증
        const validFields = ['all', 'standardName', 'abbreviation', 'englishName'];
        if (!validFields.includes(field)) {
            return json({
                success: false,
                error: `지원하지 않는 검색 필드입니다. 사용 가능: ${validFields.join(', ')}`,
                message: 'Invalid search field'
            } as ApiResponse, { status: 400 });
        }

        // 페이지네이션 유효성 검증
        if (page < 1 || limit < 1 || limit > 500) {
            return json({
                success: false,
                error: '잘못된 페이지네이션 파라미터입니다. (page >= 1, 1 <= limit <= 500)',
                message: 'Invalid pagination parameters'
            } as ApiResponse, { status: 400 });
        }

        // 데이터 로드
        let vocabularyData;
        try {
            vocabularyData = await loadVocabularyData();
        } catch (loadError) {
            return json({
                success: false,
                error: loadError instanceof Error ? loadError.message : '데이터 로드 실패',
                message: 'Data loading failed'
            } as ApiResponse, { status: 500 });
        }

        // 중복 정보 가져오기
        const duplicateDetails = getDuplicateDetails(vocabularyData.entries);

        // 모든 항목에 duplicateInfo 추가
        const entriesWithDuplicateInfo = vocabularyData.entries.map(entry => ({
            ...entry,
            duplicateInfo: duplicateDetails.get(entry.id) || {
                standardName: false,
                abbreviation: false,
                englishName: false
            }
        }));

        // 검색 로직
        const searchResults = entriesWithDuplicateInfo.filter((entry: VocabularyEntry) => {
            // 세분화된 중복 필터링 적용
            if (filter && filter.startsWith('duplicates:')) {
                const filterFields = filter.substring('duplicates:'.length).split(',').map(f => f.trim());
                const validFields = ['standardName', 'abbreviation', 'englishName'];
                const requestedFields = filterFields.filter(field => validFields.includes(field));

                if (requestedFields.length > 0) {
                    const matchesFilter = requestedFields.some(field =>
                        entry.duplicateInfo && entry.duplicateInfo[field as keyof typeof entry.duplicateInfo]
                    );
                    if (!matchesFilter) return false;
                }
            } else if (filter === 'duplicates') {
                // 기존 호환성: 모든 중복 항목
                const hasDuplicate = entry.duplicateInfo && (
                    entry.duplicateInfo.standardName ||
                    entry.duplicateInfo.abbreviation ||
                    entry.duplicateInfo.englishName
                );
                if (!hasDuplicate) return false;
            }

            const searchTargets: string[] = [];

            // 검색 대상 필드 설정
            if (field === 'all') {
                searchTargets.push(
                    entry.standardName,
                    entry.abbreviation,
                    entry.englishName
                );
            } else {
                searchTargets.push(entry[field as keyof VocabularyEntry] as string);
            }

            // 검색 수행
            return searchTargets.some(target => {
                if (!target) return false;

                const targetText = target.toLowerCase();
                const queryText = sanitizedQuery.toLowerCase();

                if (exact) {
                    // 정확히 일치하는 검색
                    return targetText === queryText;
                } else {
                    // 부분 일치 검색
                    return targetText.includes(queryText);
                }
            });
        });

        // 검색 결과 정렬 (관련도 순)
        const sortedResults = searchResults.sort((a, b) => {
            // 정확히 일치하는 항목을 우선순위로
            const aExactMatch = [a.standardName, a.abbreviation, a.englishName].some(
                field => field.toLowerCase() === sanitizedQuery.toLowerCase()
            );
            const bExactMatch = [b.standardName, b.abbreviation, b.englishName].some(
                field => field.toLowerCase() === sanitizedQuery.toLowerCase()
            );

            if (aExactMatch && !bExactMatch) return -1;
            if (!aExactMatch && bExactMatch) return 1;

            // 약어 일치를 두 번째 우선순위로
            const aAbbrevMatch = a.abbreviation.toLowerCase().includes(sanitizedQuery.toLowerCase());
            const bAbbrevMatch = b.abbreviation.toLowerCase().includes(sanitizedQuery.toLowerCase());

            if (aAbbrevMatch && !bAbbrevMatch) return -1;
            if (!aAbbrevMatch && bAbbrevMatch) return 1;

            // 표준단어명 가나다순 정렬
            return a.standardName.localeCompare(b.standardName, 'ko-KR');
        });

        // 페이지네이션 적용
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedResults = sortedResults.slice(startIndex, endIndex);

        // 검색 결과 메타 정보
        const totalResults = sortedResults.length;
        const totalPages = Math.ceil(totalResults / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        // 검색 쿼리 정보
        const searchQuery: SearchQuery = {
            query: sanitizedQuery,
            field: field as SearchQuery['field']
        };

        // 검색 결과 구성
        const searchResult: SearchResult = {
            entries: paginatedResults,
            totalCount: totalResults,
            query: searchQuery
        };

        // 응답 데이터
        const responseData = {
            ...searchResult,
            pagination: {
                currentPage: page,
                totalPages,
                totalResults,
                limit,
                hasNextPage,
                hasPrevPage
            },
            searchInfo: {
                originalQuery: query,
                sanitizedQuery,
                field,
                exact,
                executionTime: Date.now() // 실제로는 검색 시작 시간과의 차이를 계산해야 함
            },
            filtering: {
                filter: filter || 'none',
                isFiltered: filter === 'duplicates'
            }
        };

        

        return json({
            success: true,
            data: responseData,
            message: 'Search completed successfully'
        } as ApiResponse, { status: 200 });

    } catch (error) {
        console.error('검색 처리 중 오류:', error);

        return json({
            success: false,
            error: '서버에서 검색 처리 중 오류가 발생했습니다.',
            message: 'Internal server error'
        } as ApiResponse, { status: 500 });
    }
}

/**
 * 검색 제안 API (자동완성용)
 * POST /api/search
 */
export async function POST({ request }: RequestEvent) {
    try {
        const body = await request.json();
        const { query, limit = 10 } = body;

        if (!query || typeof query !== 'string' || query.length < 1) {
            return json({
                success: false,
                error: '검색어는 최소 1자 이상이어야 합니다.',
                message: 'Invalid query for suggestions'
            } as ApiResponse, { status: 400 });
        }

        const sanitizedQuery = sanitizeSearchQuery(query);
        if (!sanitizedQuery) {
            return json({
                success: false,
                error: '유효하지 않은 검색어입니다.',
                message: 'Invalid search query'
            } as ApiResponse, { status: 400 });
        }

        // 데이터 로드
        const vocabularyData = await loadVocabularyData();

        // 제안 검색 (시작 문자열 매칭)
        const suggestions = new Set<string>();
        const queryLower = sanitizedQuery.toLowerCase();

        vocabularyData.entries.forEach(entry => {
            // 표준단어명 제안
            if (entry.standardName.toLowerCase().startsWith(queryLower)) {
                suggestions.add(entry.standardName);
            }

            // 영문약어 제안
            if (entry.abbreviation.toLowerCase().startsWith(queryLower)) {
                suggestions.add(entry.abbreviation);
            }

            // 영문명 제안 (단어 단위)
            const englishWords = entry.englishName.toLowerCase().split(/\s+/);
            englishWords.forEach(word => {
                if (word.startsWith(queryLower)) {
                    suggestions.add(word);
                }
            });
        });

        // 제한된 수만큼 반환 (가나다순 정렬)
        const limitedSuggestions = Array.from(suggestions)
            .sort((a, b) => a.localeCompare(b, 'ko-KR'))
            .slice(0, Math.min(limit, 50));

        return json({
            success: true,
            data: {
                suggestions: limitedSuggestions,
                query: sanitizedQuery,
                count: limitedSuggestions.length
            },
            message: 'Search suggestions retrieved successfully'
        } as ApiResponse, { status: 200 });

    } catch (error) {
        console.error('검색 제안 처리 중 오류:', error);

        return json({
            success: false,
            error: '서버에서 검색 제안 처리 중 오류가 발생했습니다.',
            message: 'Internal server error'
        } as ApiResponse, { status: 500 });
    }
} 