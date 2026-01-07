import { json, type RequestEvent } from '@sveltejs/kit';
import type { DbDesignApiResponse, EntityData, EntityEntry } from '$lib/types/database-design';
import { loadEntityData, mergeEntityData } from '$lib/utils/database-design-handler.js';
import { validateXlsxFile } from '$lib/utils/validation.js';
import { parseEntityXlsxToJson } from '$lib/utils/database-design-xlsx-parser.js';
import { getRequiredFile, getOptionalString, getOptionalBoolean, FormDataValidationError } from '$lib/utils/type-guards.js';

export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'entity.json';
		const currentStore = await loadEntityData(filename);
		return json({
			success: true,
			data: {
				supportedFormats: ['.xlsx', '.xls'],
				maxFileSize: '10MB',
				requiredColumns: ['수퍼타입엔터티명'],
				optionalColumns: ['논리DB명', '스키마명', '엔터티명', '엔터티설명', '주식별자', '테이블한글명'],
				currentDataCount: currentStore.totalCount,
				lastUpdated: currentStore.lastUpdated
			}
		});
	} catch (error) {
		return json({ success: false, error: '업로드 정보 조회에 실패했습니다.' } as DbDesignApiResponse, { status: 500 });
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const contentType = request.headers.get('content-type');
		if (!contentType?.includes('multipart/form-data')) {
			return json({ success: false, error: '파일 업로드는 multipart/form-data 형식이어야 합니다.' } as DbDesignApiResponse, { status: 400 });
		}

		const formData = await request.formData();
		const file = getRequiredFile(formData, 'file');

		try { validateXlsxFile(file); }
		catch (e) { return json({ success: false, error: e instanceof Error ? e.message : '파일 검증 실패' } as DbDesignApiResponse, { status: 400 }); }

		const buffer = Buffer.from(await file.arrayBuffer());
		const replaceExisting = getOptionalBoolean(formData, 'replace');
		const filename = getOptionalString(formData, 'filename', 'entity.json');

		let parsedEntries: EntityEntry[];
		try { parsedEntries = parseEntityXlsxToJson(buffer, !replaceExisting); }
		catch (e) { return json({ success: false, error: e instanceof Error ? e.message : 'Excel 파일 파싱 실패' } as DbDesignApiResponse, { status: 422 }); }

		if (parsedEntries.length === 0) {
			return json({ success: false, error: '파일에서 유효한 데이터를 찾을 수 없습니다.' } as DbDesignApiResponse, { status: 422 });
		}

		const finalData = await mergeEntityData(parsedEntries, replaceExisting, filename);

		return json({
			success: true,
			data: { uploadedCount: parsedEntries.length, totalCount: finalData.totalCount, lastUpdated: finalData.lastUpdated, replaceMode: replaceExisting }
		} as DbDesignApiResponse, { status: 200 });
	} catch (error) {
		if (error instanceof FormDataValidationError) return json({ success: false, error: error.message } as DbDesignApiResponse, { status: 400 });
		return json({ success: false, error: '서버에서 파일 업로드 처리 중 오류가 발생했습니다.' } as DbDesignApiResponse, { status: 500 });
	}
}

