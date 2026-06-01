export const XLSX_DOWNLOAD_CONTENT_TYPE =
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const NO_STORE_DOWNLOAD_CACHE_CONTROL = 'no-cache, no-store, must-revalidate';

type XlsxDownloadResponseOptions = {
	filename: string;
	status?: number;
	cacheControl?: string | null;
	contentLength?: number | string | null;
	includeLegacyNoCacheHeaders?: boolean;
};

export function createXlsxDownloadResponse(
	body: BodyInit,
	options: XlsxDownloadResponseOptions
): Response {
	const headers = new Headers({
		'Content-Type': XLSX_DOWNLOAD_CONTENT_TYPE,
		'Content-Disposition': `attachment; filename="${options.filename}"`
	});

	if (options.contentLength !== null && options.contentLength !== undefined) {
		headers.set('Content-Length', String(options.contentLength));
	}

	if (options.cacheControl) {
		headers.set('Cache-Control', options.cacheControl);
	}

	if (options.includeLegacyNoCacheHeaders) {
		headers.set('Pragma', 'no-cache');
		headers.set('Expires', '0');
	}

	return new Response(body, {
		status: options.status,
		headers
	});
}
