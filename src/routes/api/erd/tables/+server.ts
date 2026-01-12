/**
 * ERD 테이블 목록 API
 * GET /api/erd/tables
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import type { DbDesignApiResponse } from '$lib/types/database-design.js';
import { loadTableData, listTableFiles } from '$lib/utils/database-design-handler.js';

/**
 * ERD용 테이블 정보 인터페이스
 */
interface ERDTableInfo {
	id: string;
	tableEnglishName: string;
	tableKoreanName?: string;
	schemaName?: string;
	physicalDbName?: string;
}

/**
 * 테이블 목록 조회 API
 * GET /api/erd/tables
 */
export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || undefined;
		const searchQuery = url.searchParams.get('q') || '';

		// 파일 목록 가져오기
		const tableFiles = await listTableFiles();

		if (tableFiles.length === 0) {
			return json(
				{
					success: true,
					data: [],
					message: '테이블 데이터가 없습니다.'
				} as DbDesignApiResponse<ERDTableInfo[]>,
				{ status: 200 }
			);
		}

		// 지정된 파일 또는 첫 번째 파일 사용
		const targetFile = filename && tableFiles.includes(filename) ? filename : tableFiles[0];
		const tableData = await loadTableData(targetFile);

		// 테이블 정보 추출
		let tables: ERDTableInfo[] = tableData.entries.map((table) => ({
			id: table.id,
			tableEnglishName: table.tableEnglishName || '',
			tableKoreanName: table.tableKoreanName,
			schemaName: table.schemaName,
			physicalDbName: table.physicalDbName
		}));

		// 검색 필터링
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			tables = tables.filter(
				(table) =>
					table.tableEnglishName?.toLowerCase().includes(query) ||
					table.tableKoreanName?.toLowerCase().includes(query) ||
					table.schemaName?.toLowerCase().includes(query)
			);
		}

		// 정렬 (테이블 영문명 기준)
		tables.sort((a, b) => {
			const nameA = a.tableEnglishName || '';
			const nameB = b.tableEnglishName || '';
			return nameA.localeCompare(nameB, 'ko', { sensitivity: 'base' });
		});

		return json(
			{
				success: true,
				data: tables,
				message: '테이블 목록 조회 완료'
			} as DbDesignApiResponse<ERDTableInfo[]>,
			{ status: 200 }
		);
	} catch (error) {
		console.error('테이블 목록 조회 오류:', error);
		return json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : '테이블 목록을 불러오는 중 오류가 발생했습니다.'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}
