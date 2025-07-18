import { json, type RequestEvent } from '@sveltejs/kit';
import type { ApiResponse, TerminologyData, TerminologyEntry } from '../../../lib/types/terminology.js';
import { loadTerminologyData, saveTerminologyData } from '../../../lib/utils/file-handler.js';
import { v4 as uuidv4 } from 'uuid';

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
 * 신규 용어 추가 API
 * POST /api/terminology
 */
export async function POST({ request }: RequestEvent) {
    try {
        const newEntry: Partial<TerminologyEntry> = await request.json();

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

        const terminologyData = await loadTerminologyData();

        // 중복 검사 (표준단어명, 영문약어)
        const isDuplicate = terminologyData.entries.some(
            (e) => e.standardName === newEntry.standardName || e.abbreviation === newEntry.abbreviation
        );
        if (isDuplicate) {
            return json(
                {
                    success: false,
                    error: '이미 존재하는 표준단어명 또는 영문약어입니다.',
                    message: 'Duplicate entry'
                } as ApiResponse,
                { status: 409 } // Conflict
            );
        }

        const entryToSave: TerminologyEntry = {
            id: uuidv4(),
            standardName: newEntry.standardName,
            abbreviation: newEntry.abbreviation,
            englishName: newEntry.englishName,
            description: newEntry.description || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        terminologyData.entries.push(entryToSave);
        await saveTerminologyData(terminologyData);

        return json(
            {
                success: true,
                data: entryToSave,
                message: '새로운 용어가 성공적으로 추가되었습니다.'
            } as ApiResponse,
            { status: 201 } // Created
        );
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

/**
 * 용어 수정 API
 * PUT /api/terminology/:id
 */
export async function PUT({ request }: RequestEvent) {
    try {
        const updatedEntry: TerminologyEntry = await request.json();

        if (!updatedEntry.id) {
            return json(
                { success: false, error: '용어 ID가 필요합니다.', message: 'Missing terminology ID' } as ApiResponse,
                { status: 400 }
            );
        }

        const terminologyData = await loadTerminologyData();
        const entryIndex = terminologyData.entries.findIndex((e) => e.id === updatedEntry.id);

        if (entryIndex === -1) {
            return json(
                { success: false, error: '수정할 용어를 찾을 수 없습니다.', message: 'Entry not found' } as ApiResponse,
                { status: 404 }
            );
        }

        // 기존 데이터를 유지하면서 업데이트
        terminologyData.entries[entryIndex] = {
            ...terminologyData.entries[entryIndex],
            ...updatedEntry,
            updatedAt: new Date().toISOString()
        };

        await saveTerminologyData(terminologyData);

        return json(
            {
                success: true,
                data: terminologyData.entries[entryIndex],
                message: '용어가 성공적으로 수정되었습니다.'
            } as ApiResponse,
            { status: 200 }
        );
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

/**
 * 용어 삭제 API
 * DELETE /api/terminology/:id
 */
export async function DELETE({ url }: RequestEvent) {
    try {
        const id = url.searchParams.get('id');
        if (!id) {
            return json(
                { success: false, error: '삭제할 용어의 ID가 필요합니다.', message: 'Missing terminology ID' } as ApiResponse,
                { status: 400 }
            );
        }

        const terminologyData = await loadTerminologyData();
        const initialLength = terminologyData.entries.length;
        terminologyData.entries = terminologyData.entries.filter((e) => e.id !== id);

        if (terminologyData.entries.length === initialLength) {
            return json(
                { success: false, error: '삭제할 용어를 찾을 수 없습니다.', message: 'Entry not found' } as ApiResponse,
                { status: 404 }
            );
        }

        await saveTerminologyData(terminologyData);

        return json(
            { success: true, message: '용어가 성공적으로 삭제되었습니다.' } as ApiResponse,
            { status: 200 }
        );
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