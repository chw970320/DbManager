import { json, type RequestEvent } from '@sveltejs/kit';
import type { DbDesignApiResponse, TableEntry } from '$lib/types/database-design.js';
import { loadTableData } from '$lib/utils/database-design-handler.js';

/**
 * 필터 옵션 조회 API
 * GET /api/table/filter-options
 * 각 필터 가능한 컬럼의 고유값만 반환
 */
export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'table.json';

		// 데이터 로드
		let tableData;
		try {
			tableData = await loadTableData(filename);
		} catch (loadError) {
			return json(
				{
					success: false,
					error: loadError instanceof Error ? loadError.message : '데이터 로드 실패',
					message: 'Data loading failed'
				} as DbDesignApiResponse,
				{ status: 500 }
			);
		}

		const options: Record<string, string[]> = {};

		// 각 필터 가능한 컬럼에 대해 고유값 추출
		const filterableColumns = [
			'physicalDbName',
			'tableOwner',
			'subjectArea',
			'schemaName',
			'tableEnglishName',
			'tableKoreanName',
			'tableType',
			'relatedEntityName',
			'businessClassification',
			'retentionPeriod',
			'publicFlag'
		];

		// Nullable 필드 목록 (빈값도 옵션에 포함)
		const nullableColumns = new Set([
			'physicalDbName',
			'tableOwner',
			'subjectArea',
			'schemaName',
			'tableEnglishName',
			'tableKoreanName',
			'tableType',
			'relatedEntityName',
			'retentionPeriod',
			'publicFlag'
		]);

		filterableColumns.forEach((columnKey) => {
			const values = new Set<string>();
			let hasEmptyValue = false;
			
			tableData.entries.forEach((entry) => {
				const value = entry[columnKey as keyof TableEntry];
				if (value !== null && value !== undefined && value !== '') {
					values.add(String(value));
				} else if (nullableColumns.has(columnKey)) {
					hasEmptyValue = true;
				}
			});
			
			const sortedValues = Array.from(values).sort();
			// Nullable 필드이고 빈값이 있으면 "(빈값)" 옵션 추가
			if (nullableColumns.has(columnKey) && hasEmptyValue) {
				sortedValues.unshift('(빈값)');
			}
			options[columnKey] = sortedValues;
		});

		return json(
			{
				success: true,
				data: options,
				message: 'Filter options retrieved successfully'
			} as DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		console.error('필터 옵션 조회 중 오류:', error);

		return json(
			{
				success: false,
				error: '서버에서 필터 옵션 조회 중 오류가 발생했습니다.',
				message: 'Internal server error'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}
