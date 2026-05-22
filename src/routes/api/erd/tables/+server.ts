import { json, type RequestEvent } from '@sveltejs/kit';
import { listTableFiles, loadColumnData, loadTableData } from '$lib/registry/data-registry';
import type { ColumnEntry, DbDesignApiResponse } from '$lib/types/database-design';
import {
	getErdFileContextInputFromUrl,
	resolveErdFileContext
} from '$lib/utils/erd-file-context.js';

/**
 * ERD 테이블 목록 API
 * GET /api/erd/tables
 */

/**
 * ERD용 테이블 정보 인터페이스
 */
interface ERDTableInfo {
	id: string;
	tableEnglishName: string;
	tableKoreanName?: string;
	schemaName?: string;
	physicalDbName?: string;
	subjectArea?: string;
	scopeFlag?: string;
	inBusinessScope: boolean;
}

function normalizeText(value: string | undefined | null): string {
	return (value ?? '').trim();
}

function normalizeKey(value: string | undefined | null): string {
	const text = normalizeText(value);
	return text === '-' ? '' : text.toLowerCase();
}

function createTableKey(
	schemaName: string | undefined,
	tableEnglishName: string | undefined
): string {
	return `${normalizeKey(schemaName)}|${normalizeKey(tableEnglishName)}`;
}

function isPositiveFlag(value: string | undefined): boolean {
	const normalized = normalizeKey(value);
	return ['y', 'yes', 'true', '1', 'o', '예', '대상', '포함'].includes(normalized);
}

function hasMeaningfulValue(value: string | undefined): boolean {
	return normalizeKey(value).length > 0;
}

/**
 * 테이블 목록 조회 API
 * GET /api/erd/tables
 */
export async function GET({ url }: RequestEvent) {
	try {
		const searchQuery = url.searchParams.get('q') || '';
		const fileContext = await resolveErdFileContext(
			getErdFileContextInputFromUrl(url, { legacyFilenameAsTableFile: true })
		);

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

		const requestedTableFile = fileContext.files.tableFile;
		if (requestedTableFile && !tableFiles.includes(requestedTableFile)) {
			return json(
				{
					success: false,
					error: `테이블 정의서 파일을 찾을 수 없습니다: ${requestedTableFile}`,
					message: 'Table definition file not found'
				} as DbDesignApiResponse,
				{ status: 404 }
			);
		}

		// 지정된 파일 또는 첫 번째 파일 사용
		const targetFile = requestedTableFile || tableFiles[0];
		const tableData = await loadTableData(targetFile);
		const columnsByTableKey = new Map<string, ColumnEntry[]>();

		if (fileContext.files.columnFile) {
			const columnData = await loadColumnData(fileContext.files.columnFile);
			for (const column of columnData.entries) {
				const key = createTableKey(column.schemaName, column.tableEnglishName);
				if (key === '|') continue;
				const columns = columnsByTableKey.get(key) ?? [];
				columns.push(column);
				columnsByTableKey.set(key, columns);
			}
		}

		// 테이블 정보 추출
		let tables: ERDTableInfo[] = tableData.entries.map((table) => {
			const columns =
				columnsByTableKey.get(createTableKey(table.schemaName, table.tableEnglishName)) ?? [];
			const subjectArea =
				table.subjectArea ||
				columns.find((column) => hasMeaningfulValue(column.subjectArea))?.subjectArea;
			const scopeFlag = columns.find((column) => hasMeaningfulValue(column.scopeFlag))?.scopeFlag;

			return {
				id: table.id,
				tableEnglishName: table.tableEnglishName || '',
				tableKoreanName: table.tableKoreanName,
				schemaName: table.schemaName,
				physicalDbName: table.physicalDbName,
				subjectArea: subjectArea ?? '',
				scopeFlag: scopeFlag ?? '',
				inBusinessScope: columns.some((column) => isPositiveFlag(column.scopeFlag))
			};
		});

		// 검색 필터링
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			tables = tables.filter(
				(table) =>
					table.tableEnglishName?.toLowerCase().includes(query) ||
					table.tableKoreanName?.toLowerCase().includes(query) ||
					table.schemaName?.toLowerCase().includes(query) ||
					table.subjectArea?.toLowerCase().includes(query)
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
