import { describe, expect, it } from 'vitest';

import {
	createXlsxDownloadResponse,
	NO_STORE_DOWNLOAD_CACHE_CONTROL,
	XLSX_DOWNLOAD_CONTENT_TYPE
} from './xlsx-download-response';

describe('xlsx-download-response helpers', () => {
	it('creates an XLSX attachment response with explicit no-store cache control', async () => {
		const response = createXlsxDownloadResponse(new Uint8Array([1, 2, 3]), {
			filename: 'database.xlsx',
			cacheControl: NO_STORE_DOWNLOAD_CACHE_CONTROL
		});

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe(XLSX_DOWNLOAD_CONTENT_TYPE);
		expect(response.headers.get('Content-Disposition')).toBe(
			'attachment; filename="database.xlsx"'
		);
		expect(response.headers.get('Cache-Control')).toBe(NO_STORE_DOWNLOAD_CACHE_CONTROL);
		expect(response.headers.get('Content-Length')).toBeNull();
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
	});

	it('keeps cache headers optional for routes with existing asymmetric behavior', () => {
		const response = createXlsxDownloadResponse(new Uint8Array([1]), {
			filename: 'term.xlsx',
			contentLength: 1
		});

		expect(response.headers.get('Cache-Control')).toBeNull();
		expect(response.headers.get('Pragma')).toBeNull();
		expect(response.headers.get('Expires')).toBeNull();
		expect(response.headers.get('Content-Length')).toBe('1');
	});

	it('adds legacy no-cache headers only when requested', () => {
		const response = createXlsxDownloadResponse(new Uint8Array([1, 2]), {
			filename: 'vocabulary.xlsx',
			status: 200,
			contentLength: 2,
			cacheControl: NO_STORE_DOWNLOAD_CACHE_CONTROL,
			includeLegacyNoCacheHeaders: true
		});

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Length')).toBe('2');
		expect(response.headers.get('Cache-Control')).toBe(NO_STORE_DOWNLOAD_CACHE_CONTROL);
		expect(response.headers.get('Pragma')).toBe('no-cache');
		expect(response.headers.get('Expires')).toBe('0');
	});
});
