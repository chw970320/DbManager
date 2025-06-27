import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse, TerminologyData } from '../../../lib/types/terminology.js';
import { loadTerminologyData } from '../../../lib/utils/file-handler.js';

/**
 * 저장된 용어집 데이터 조회 API
 * GET /api/terminology
 */
export async function GET({ url }: RequestEvent) {
    try {
        // 쿼리 파라미터 추출
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const sortBy = url.searchParams.get('sortBy') || 'standardName';
        const sortOrder = url.searchParams.get('sortOrder') || 'asc';

        // 페이지네이션 유효성 검증
        if (page < 1 || limit < 1 || limit > 1000) {
            return json({
                success: false,
                error: '잘못된 페이지네이션 파라미터입니다. (page >= 1, 1 <= limit <= 1000)',
                message: 'Invalid pagination parameters'
            } as ApiResponse, { status: 400 });
        }

        // 정렬 필드 유효성 검증
        const validSortFields = ['standardName', 'abbreviation', 'englishName', 'createdAt'];
        if (!validSortFields.includes(sortBy)) {
            return json({
                success: false,
                error: `지원하지 않는 정렬 필드입니다. 사용 가능: ${validSortFields.join(', ')}`,
                message: 'Invalid sort field'
            } as ApiResponse, { status: 400 });
        }

        // 데이터 로드
        let terminologyData: TerminologyData;
        try {
            terminologyData = await loadTerminologyData();
        } catch (loadError) {
            return json({
                success: false,
                error: loadError instanceof Error ? loadError.message : '데이터 로드 실패',
                message: 'Data loading failed'
            } as ApiResponse, { status: 500 });
        }

        // 정렬 적용
        const sortedEntries = [...terminologyData.entries].sort((a, b) => {
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

        // 페이지네이션 메타 정보
        const totalPages = Math.ceil(terminologyData.totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        // 성공 응답
        const responseData = {
            entries: paginatedEntries,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount: terminologyData.totalCount,
                limit,
                hasNextPage,
                hasPrevPage
            },
            sorting: {
                sortBy,
                sortOrder
            },
            lastUpdated: terminologyData.lastUpdated
        };

        console.log(`용어집 조회 성공: ${paginatedEntries.length}개 항목 (페이지 ${page}/${totalPages})`);

        return json({
            success: true,
            data: responseData,
            message: 'Terminology data retrieved successfully'
        } as ApiResponse, { status: 200 });

    } catch (error) {
        console.error('용어집 조회 중 오류:', error);

        return json({
            success: false,
            error: '서버에서 데이터 조회 중 오류가 발생했습니다.',
            message: 'Internal server error'
        } as ApiResponse, { status: 500 });
    }
}

/**
 * 용어집 데이터 통계 정보 제공
 * POST /api/terminology (통계 조회용)
 */
export async function POST() {
    try {
        const terminologyData = await loadTerminologyData();

        // 기본 통계 계산
        const stats = {
            totalEntries: terminologyData.totalCount,
            lastUpdated: terminologyData.lastUpdated,

            // 영문약어 길이 분포
            abbreviationLengths: terminologyData.entries.reduce((acc, entry) => {
                const length = entry.abbreviation.length;
                acc[length] = (acc[length] || 0) + 1;
                return acc;
            }, {} as Record<number, number>),

            // 최신 업데이트된 항목들 (최근 10개)
            recentEntries: terminologyData.entries
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 10)
                .map(entry => ({
                    id: entry.id,
                    standardName: entry.standardName,
                    abbreviation: entry.abbreviation,
                    createdAt: entry.createdAt
                }))
        };

        return json({
            success: true,
            data: stats,
            message: 'Terminology statistics retrieved successfully'
        } as ApiResponse, { status: 200 });

    } catch (error) {
        console.error('통계 조회 중 오류:', error);

        return json({
            success: false,
            error: '서버에서 통계 조회 중 오류가 발생했습니다.',
            message: 'Internal server error'
        } as ApiResponse, { status: 500 });
    }
} 