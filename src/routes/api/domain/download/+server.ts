import { json, type RequestEvent } from '@sveltejs/kit';
import type { DomainEntry } from '$lib/types/domain';
import { loadDomainData } from '$lib/utils/file-handler.js';
import { exportDomainToXlsxBuffer } from '$lib/utils/xlsx-parser.js';

export async function GET({ url }: RequestEvent) {
	try {
		// 쿼리 파라미터 파싱 (정렬, 검색)
		const sortBy = url.searchParams.get('sortBy') || 'standardDomainName';
		const sortOrder = url.searchParams.get('sortOrder') || 'asc';
		const searchQuery = url.searchParams.get('q') || '';
		const searchField = url.searchParams.get('field') || 'all';
		const targetFilename = url.searchParams.get('filename') || 'domain.json';

		// 데이터 로드
		const domainData = await loadDomainData(targetFilename);
		let entries: DomainEntry[] = domainData.entries || [];

		// 검색 적용
		if (searchQuery) {
			entries = entries.filter((entry) => {
				if (searchField === 'all') {
					return (
						(entry.domainGroup && entry.domainGroup.includes(searchQuery)) ||
						(entry.domainCategory && entry.domainCategory.includes(searchQuery)) ||
						(entry.standardDomainName && entry.standardDomainName.includes(searchQuery)) ||
						(entry.physicalDataType && entry.physicalDataType.includes(searchQuery))
					);
				} else {
					const value = entry[searchField as keyof DomainEntry];
					return typeof value === 'string' && value.includes(searchQuery);
				}
			});
		}

		// 정렬 적용
		entries = [...entries].sort((a, b) => {
			const aValue = a[sortBy as keyof DomainEntry] ?? '';
			const bValue = b[sortBy as keyof DomainEntry] ?? '';
			if (typeof aValue === 'string' && typeof bValue === 'string') {
				return sortOrder === 'desc'
					? bValue.localeCompare(aValue, 'ko-KR')
					: aValue.localeCompare(bValue, 'ko-KR');
			}
			return 0;
		});

		// XLSX 변환
		const buffer = exportDomainToXlsxBuffer(entries);

		// 파일명 생성
		const today = new Date();
		const yyyy = today.getFullYear();
		const mm = String(today.getMonth() + 1).padStart(2, '0');
		const dd = String(today.getDate()).padStart(2, '0');
		const filename = `domain_${yyyy}-${mm}-${dd}.xlsx`;

		return new Response(buffer as unknown as BodyInit, {
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Cache-Control': 'no-cache, no-store, must-revalidate'
			}
		});
	} catch (error) {
		console.error('도메인 XLSX 다운로드 중 오류:', error);
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
