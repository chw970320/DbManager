import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse } from '../../../lib/types/terminology.js';
import type { DomainData, DomainEntry } from '../../../lib/types/domain.js';
import { getDomainDataStore } from '../../../lib/stores/domain-store.js';

/**
 * 저장된 도메인 데이터 조회 API
 * GET /api/domain
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

        // 페이지네이션 유효성 검증
        if (page < 1 || limit < 1 || limit > 100) {
            return json({
                success: false,
                error: '잘못된 페이지네이션 파라미터입니다. (page >= 1, 1 <= limit <= 100)',
                message: 'Invalid pagination parameters'
            } as ApiResponse, { status: 400 });
        }

        // 정렬 필드 유효성 검증
        const validSortFields = ['domainGroup', 'domainCategory', 'standardDomainName', 'logicalDataType', 'physicalDataType', 'createdAt'];
        if (!validSortFields.includes(sortBy)) {
            return json({
                success: false,
                error: `지원하지 않는 정렬 필드입니다. 사용 가능: ${validSortFields.join(', ')}`,
                message: 'Invalid sort field'
            } as ApiResponse, { status: 400 });
        }

        // 검색 필드 유효성 검증
        const validSearchFields = ['all', 'domainGroup', 'domainCategory', 'standardDomainName', 'logicalDataType', 'physicalDataType'];
        if (!validSearchFields.includes(searchField)) {
            return json({
                success: false,
                error: `지원하지 않는 검색 필드입니다. 사용 가능: ${validSearchFields.join(', ')}`,
                message: 'Invalid search field'
            } as ApiResponse, { status: 400 });
        }

        // 데이터 로드
        let domainData: DomainData;
        try {
            domainData = await getDomainDataStore();  // await 추가
        } catch (loadError) {
            return json({
                success: false,
                error: loadError instanceof Error ? loadError.message : '데이터 로드 실패',
                message: 'Data loading failed'
            } as ApiResponse, { status: 500 });
        }

        let filteredEntries = domainData.entries;

        // 검색 필터링
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filteredEntries = domainData.entries.filter(entry => {
                switch (searchField) {
                    case 'domainGroup':
                        return entry.domainGroup.toLowerCase().includes(query);
                    case 'domainCategory':
                        return entry.domainCategory.toLowerCase().includes(query);
                    case 'standardDomainName':
                        return entry.standardDomainName.toLowerCase().includes(query);
                    case 'logicalDataType':
                        return entry.logicalDataType.toLowerCase().includes(query);
                    case 'physicalDataType':
                        return entry.physicalDataType.toLowerCase().includes(query);
                    case 'all':
                    default:
                        return (
                            entry.domainGroup.toLowerCase().includes(query) ||
                            entry.domainCategory.toLowerCase().includes(query) ||
                            entry.standardDomainName.toLowerCase().includes(query) ||
                            entry.logicalDataType.toLowerCase().includes(query) ||
                            entry.physicalDataType.toLowerCase().includes(query) ||
                            (entry.dataValue && entry.dataValue.toLowerCase().includes(query)) ||
                            (entry.measurementUnit && entry.measurementUnit.toLowerCase().includes(query)) ||
                            (entry.remarks && entry.remarks.toLowerCase().includes(query))
                        );
                }
            });
        }

        // 정렬
        filteredEntries.sort((a, b) => {
            const aValue = a[sortBy as keyof DomainEntry];
            const bValue = b[sortBy as keyof DomainEntry];

            let comparison = 0;
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                comparison = aValue.localeCompare(bValue, 'ko');
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                comparison = aValue - bValue;
            } else {
                // 기본 문자열 비교
                comparison = String(aValue).localeCompare(String(bValue), 'ko');
            }

            return sortOrder === 'desc' ? -comparison : comparison;
        });

        // 페이지네이션
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedEntries = filteredEntries.slice(startIndex, endIndex);

        // 페이지네이션 메타 정보
        const totalPages = Math.ceil(filteredEntries.length / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        const responseData = {
            entries: paginatedEntries,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount: filteredEntries.length,
                limit,
                hasNextPage,
                hasPrevPage
            },
            sorting: {
                sortBy,
                sortOrder
            },
            search: {
                query: searchQuery,
                field: searchField,
                isFiltered: searchQuery.trim().length > 0
            },
            lastUpdated: domainData.lastUpdated
        };

        console.log(`도메인 데이터 조회 성공: ${paginatedEntries.length}개 항목 (페이지 ${page}/${totalPages})`);

        return json({
            success: true,
            data: responseData,
            message: 'Domain data retrieved successfully'
        } as ApiResponse, { status: 200 });

    } catch (error) {
        console.error('도메인 데이터 조회 중 오류:', error);

        return json({
            success: false,
            error: '서버에서 도메인 데이터 조회 중 오류가 발생했습니다.',
            message: 'Internal server error'
        } as ApiResponse, { status: 500 });
    }
}

/**
 * 도메인 통계 정보 조회 API
 * OPTIONS /api/domain
 */
export async function OPTIONS() {
    try {
        // 데이터 로드 (비동기 함수이므로 await 사용)
        let domainData: DomainData;
        try {
            domainData = await getDomainDataStore();
        } catch (loadError) {
            return json({
                success: false,
                error: loadError instanceof Error ? loadError.message : '데이터 로드 실패',
                message: 'Data loading failed'
            } as ApiResponse, { status: 500 });
        }

        // 빈 데이터 처리
        if (!domainData.entries || domainData.entries.length === 0) {
            return json({
                success: true,
                data: {
                    totalEntries: 0,
                    lastUpdated: domainData.lastUpdated,
                    domainGroups: {},
                    logicalDataTypes: {},
                    physicalDataTypes: {},
                    summary: {
                        uniqueGroups: 0,
                        uniqueLogicalDataTypes: 0,
                        uniquePhysicalDataTypes: 0
                    }
                },
                message: 'Domain statistics retrieved successfully (no data)'
            } as ApiResponse, { status: 200 });
        }

        // 도메인 그룹별 통계
        const groupStats = new Map<string, number>();
        const logicalDataTypeStats = new Map<string, number>();
        const physicalDataTypeStats = new Map<string, number>();

        domainData.entries.forEach(entry => {
            // 도메인 그룹별 카운트
            groupStats.set(entry.domainGroup, (groupStats.get(entry.domainGroup) || 0) + 1);

            // 논리 데이터 타입별 카운트
            logicalDataTypeStats.set(entry.logicalDataType, (logicalDataTypeStats.get(entry.logicalDataType) || 0) + 1);

            // 물리 데이터 타입별 카운트
            physicalDataTypeStats.set(entry.physicalDataType, (physicalDataTypeStats.get(entry.physicalDataType) || 0) + 1);
        });

        const statsData = {
            totalEntries: domainData.totalCount,
            lastUpdated: domainData.lastUpdated,
            domainGroups: Object.fromEntries(groupStats),
            logicalDataTypes: Object.fromEntries(logicalDataTypeStats),
            physicalDataTypes: Object.fromEntries(physicalDataTypeStats),
            summary: {
                uniqueGroups: groupStats.size,
                uniqueLogicalDataTypes: logicalDataTypeStats.size,
                uniquePhysicalDataTypes: physicalDataTypeStats.size
            }
        };

        console.log(`도메인 통계 조회 성공: 총 ${domainData.totalCount}개 항목`);

        return json({
            success: true,
            data: statsData,
            message: 'Domain statistics retrieved successfully'
        } as ApiResponse, { status: 200 });

    } catch (error) {
        console.error('도메인 통계 조회 중 오류:', error);

        return json({
            success: false,
            error: '서버에서 통계 조회 중 오류가 발생했습니다.',
            message: 'Internal server error'
        } as ApiResponse, { status: 500 });
    }
} 