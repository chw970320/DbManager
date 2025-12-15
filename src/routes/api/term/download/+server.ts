import { error, type RequestEvent } from '@sveltejs/kit';
import { loadTermData } from '$lib/utils/file-handler.js';
import { exportTermToXlsxBuffer } from '$lib/utils/xlsx-parser.js';

/**
 * 용어 데이터 다운로드 API
 * GET /api/term/download
 */
export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'term.json';

		// 용어 데이터 로드
		const termData = await loadTermData(filename);

		if (termData.entries.length === 0) {
			return error(404, '다운로드할 용어 데이터가 없습니다.');
		}

		// XLSX 버퍼 생성
		const buffer = exportTermToXlsxBuffer(termData.entries);

		// 파일명 생성 (YYYY-MM-DD 형식, 다른 API와 일관)
		const currentDate = new Date().toISOString().split('T')[0];
		const safeFilename = filename.replace(/\.json$/, '');
		const downloadFilename = `${safeFilename}_${currentDate}.xlsx`;

		// 응답 헤더 설정
		return new Response(buffer, {
			headers: {
				'Content-Type':
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${downloadFilename}"`,
				'Content-Length': buffer.length.toString()
			}
		});
	} catch (err) {
		console.error('용어 다운로드 중 오류:', err);
		return error(500, '용어 데이터 다운로드 중 오류가 발생했습니다.');
	}
}

