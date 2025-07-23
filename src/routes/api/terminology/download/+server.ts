import { type RequestEvent } from '@sveltejs/kit';
import type { TerminologyData } from '../../../../lib/types/terminology.js';
import { loadTerminologyData } from '../../../../lib/utils/file-handler.js';
import { getDuplicateDetails } from '../../../../lib/utils/duplicate-handler.js';
import { exportJsonToXlsxBuffer } from '../../../../lib/utils/xlsx-parser.js';

/**
 * 단어집 데이터를 XLSX 파일로 다운로드하는 API
 * GET /api/terminology/download
 */
export async function GET({ url }: RequestEvent) {
    try {
        // 쿼리 파라미터 추출 (페이지네이션 제외)
        const sortBy = url.searchParams.get('sortBy') || 'standardName';
        const sortOrder = url.searchParams.get('sortOrder') || 'asc';
        const filter = url.searchParams.get('filter'); // 중복 필터링 파라미터

        // 정렬 필드 유효성 검증
        const validSortFields = ['standardName', 'abbreviation', 'englishName', 'createdAt'];
        if (!validSortFields.includes(sortBy)) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `지원하지 않는 정렬 필드입니다. 사용 가능: ${validSortFields.join(', ')}`
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // 데이터 로드
        let terminologyData: TerminologyData;
        try {
            terminologyData = await loadTerminologyData();
        } catch (loadError) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: loadError instanceof Error ? loadError.message : '데이터 로드 실패'
                }),
                {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // 중복 정보 가져오기
        const duplicateDetails = getDuplicateDetails(terminologyData.entries);

        // 모든 항목에 duplicateInfo 추가
        const entriesWithDuplicateInfo = terminologyData.entries.map(entry => ({
            ...entry,
            duplicateInfo: duplicateDetails.get(entry.id) || {
                standardName: false,
                abbreviation: false,
                englishName: false
            }
        }));

        // 세분화된 중복 필터링 적용
        let filteredEntries = entriesWithDuplicateInfo;
        if (filter && filter.startsWith('duplicates:')) {
            // filter=duplicates:standardName,abbreviation 형태 파싱
            const filterFields = filter.substring('duplicates:'.length).split(',').map(f => f.trim());
            const validFields = ['standardName', 'abbreviation', 'englishName'];
            const requestedFields = filterFields.filter(field => validFields.includes(field));

            if (requestedFields.length > 0) {
                filteredEntries = entriesWithDuplicateInfo.filter(entry => {
                    return requestedFields.some(field =>
                        entry.duplicateInfo && entry.duplicateInfo[field as keyof typeof entry.duplicateInfo]
                    );
                });
            }
        } else if (filter === 'duplicates') {
            // 기존 호환성: 모든 중복 항목
            filteredEntries = entriesWithDuplicateInfo.filter(entry =>
                entry.duplicateInfo && (
                    entry.duplicateInfo.standardName ||
                    entry.duplicateInfo.abbreviation ||
                    entry.duplicateInfo.englishName
                )
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

        // XLSX 버퍼 생성
        const xlsxBuffer = exportJsonToXlsxBuffer(sortedEntries);

        // 현재 날짜를 포함한 파일명 생성
        const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
        const filename = `terminology_${currentDate}.xlsx`;

        console.log(`단어집 XLSX 다운로드 생성: ${sortedEntries.length}개 항목${filter ? ` (필터: ${filter})` : ''}`);

        // XLSX 파일로 응답
        return new Response(xlsxBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': xlsxBuffer.length.toString(),
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

    } catch (error) {
        console.error('단어집 XLSX 다운로드 중 오류:', error);

        return new Response(
            JSON.stringify({
                success: false,
                error: '서버에서 파일 생성 중 오류가 발생했습니다.',
                message: 'Internal server error'
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
} 