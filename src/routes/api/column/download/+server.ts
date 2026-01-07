import { json, type RequestEvent } from '@sveltejs/kit';
import type { ColumnEntry } from '$lib/types/database-design';
import { loadColumnData } from '$lib/utils/database-design-handler.js';
import { exportColumnToXlsxBuffer } from '$lib/utils/database-design-xlsx-parser.js';

export async function GET({ url }: RequestEvent) {
	try {
		const sortBy = url.searchParams.get('sortBy') || 'columnEnglishName';
		const sortOrder = url.searchParams.get('sortOrder') || 'asc';
		const searchQuery = url.searchParams.get('q') || '';
		const targetFilename = url.searchParams.get('filename') || 'column.json';

		const data = await loadColumnData(targetFilename);
		let entries: ColumnEntry[] = data.entries || [];

		if (searchQuery) {
			entries = entries.filter((entry) =>
				entry.columnEnglishName?.includes(searchQuery) ||
				entry.columnKoreanName?.includes(searchQuery) ||
				entry.tableEnglishName?.includes(searchQuery) ||
				entry.columnDescription?.includes(searchQuery)
			);
		}

		entries = [...entries].sort((a, b) => {
			const aValue = a[sortBy as keyof ColumnEntry] ?? '';
			const bValue = b[sortBy as keyof ColumnEntry] ?? '';
			if (typeof aValue === 'string' && typeof bValue === 'string') {
				return sortOrder === 'desc' ? bValue.localeCompare(aValue, 'ko-KR') : aValue.localeCompare(bValue, 'ko-KR');
			}
			return 0;
		});

		const buffer = exportColumnToXlsxBuffer(entries);
		const today = new Date();
		const filename = `column_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.xlsx`;

		return new Response(buffer as unknown as BodyInit, {
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Cache-Control': 'no-cache, no-store, must-revalidate'
			}
		});
	} catch (error) {
		console.error('XLSX 다운로드 중 오류:', error);
		return json({ success: false, error: '서버에서 파일 생성 중 오류가 발생했습니다.' }, { status: 500 });
	}
}

