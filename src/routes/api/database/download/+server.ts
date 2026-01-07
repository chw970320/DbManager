import { json, type RequestEvent } from '@sveltejs/kit';
import type { DatabaseEntry } from '$lib/types/database-design';
import { loadDatabaseData } from '$lib/utils/database-design-handler.js';
import { exportDatabaseToXlsxBuffer } from '$lib/utils/database-design-xlsx-parser.js';

/**
 * 데이터베이스 정의서 다운로드 API
 * GET /api/database-def/download
 */
export async function GET({ url }: RequestEvent) {
	try {
		const sortBy = url.searchParams.get('sortBy') || 'organizationName';
		const sortOrder = url.searchParams.get('sortOrder') || 'asc';
		const searchQuery = url.searchParams.get('q') || '';
		const searchField = url.searchParams.get('field') || 'all';
		const targetFilename = url.searchParams.get('filename') || 'database.json';

		const data = await loadDatabaseData(targetFilename);
		let entries: DatabaseEntry[] = data.entries || [];

		// 검색 적용
		if (searchQuery) {
			entries = entries.filter((entry) => {
				if (searchField === 'all') {
					return (
						(entry.organizationName && entry.organizationName.includes(searchQuery)) ||
						(entry.logicalDbName && entry.logicalDbName.includes(searchQuery)) ||
						(entry.physicalDbName && entry.physicalDbName.includes(searchQuery)) ||
						(entry.dbDescription && entry.dbDescription.includes(searchQuery))
					);
				} else {
					const value = entry[searchField as keyof DatabaseEntry];
					return typeof value === 'string' && value.includes(searchQuery);
				}
			});
		}

		// 정렬 적용
		entries = [...entries].sort((a, b) => {
			const aValue = a[sortBy as keyof DatabaseEntry] ?? '';
			const bValue = b[sortBy as keyof DatabaseEntry] ?? '';
			if (typeof aValue === 'string' && typeof bValue === 'string') {
				return sortOrder === 'desc'
					? bValue.localeCompare(aValue, 'ko-KR')
					: aValue.localeCompare(bValue, 'ko-KR');
			}
			return 0;
		});

		// XLSX 변환
		const buffer = exportDatabaseToXlsxBuffer(entries);

		// 파일명 생성
		const today = new Date();
		const yyyy = today.getFullYear();
		const mm = String(today.getMonth() + 1).padStart(2, '0');
		const dd = String(today.getDate()).padStart(2, '0');
		const filename = `database_${yyyy}-${mm}-${dd}.xlsx`;

		return new Response(buffer as unknown as BodyInit, {
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Cache-Control': 'no-cache, no-store, must-revalidate'
			}
		});
	} catch (error) {
		console.error('XLSX 다운로드 중 오류:', error);
		return json(
			{
				success: false,
				error: '서버에서 파일 생성 중 오류가 발생했습니다.',
				message: 'Internal server error'
			},
			{ status: 500 }
		);
	}
}
