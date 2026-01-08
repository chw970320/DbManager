import { json, type RequestEvent } from '@sveltejs/kit';
import type { DbDesignApiResponse, TableEntry } from '$lib/types/database-design';
import { loadTableData, mergeTableData } from '$lib/utils/database-design-handler.js';
import { validateXlsxFile } from '$lib/utils/validation.js';
import { parseTableXlsxToJson } from '$lib/utils/database-design-xlsx-parser.js';
import {
	getRequiredFile,
	getOptionalString,
	getOptionalBoolean,
	FormDataValidationError
} from '$lib/utils/type-guards.js';

export async function GET({ url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'table.json';
		const currentStore = await loadTableData(filename);
		return json({
			success: true,
			data: {
				supportedFormats: ['.xlsx', '.xls'],
				maxFileSize: '10MB',
				requiredColumns: ['업무분류체계', '테이블볼륨', '비공개사유', '개방데이터목록'],
				optionalColumns: [
					'물리DB명',
					'테이블소유자',
					'주제영역',
					'스키마명',
					'테이블영문명',
					'테이블한글명',
					'테이블유형',
					'관련엔터티명',
					'테이블설명',
					'보존기간',
					'발생주기',
					'공개/비공개여부'
				],
				currentDataCount: currentStore.totalCount,
				lastUpdated: currentStore.lastUpdated
			}
		});
	} catch (error) {
		return json(
			{ success: false, error: '업로드 정보 조회에 실패했습니다.' } as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}

export async function POST({ request }: RequestEvent) {
	try {
		const contentType = request.headers.get('content-type');
		if (!contentType?.includes('multipart/form-data')) {
			return json(
				{
					success: false,
					error: '파일 업로드는 multipart/form-data 형식이어야 합니다.'
				} as DbDesignApiResponse,
				{ status: 400 }
			);
		}

		const formData = await request.formData();
		const file = getRequiredFile(formData, 'file');

		try {
			validateXlsxFile(file);
		} catch (e) {
			return json(
				{
					success: false,
					error: e instanceof Error ? e.message : '파일 검증 실패'
				} as DbDesignApiResponse,
				{ status: 400 }
			);
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const replaceExisting = getOptionalBoolean(formData, 'replace');
		const filename = getOptionalString(formData, 'filename', 'table.json');

		let parsedEntries: TableEntry[];
		try {
			parsedEntries = parseTableXlsxToJson(buffer, !replaceExisting);
		} catch (e) {
			return json(
				{
					success: false,
					error: e instanceof Error ? e.message : 'Excel 파일 파싱 실패'
				} as DbDesignApiResponse,
				{ status: 422 }
			);
		}

		if (parsedEntries.length === 0) {
			return json(
				{
					success: false,
					error: '파일에서 유효한 데이터를 찾을 수 없습니다.'
				} as DbDesignApiResponse,
				{ status: 422 }
			);
		}

		const finalData = await mergeTableData(parsedEntries, replaceExisting, filename);

		return json(
			{
				success: true,
				data: {
					uploadedCount: parsedEntries.length,
					totalCount: finalData.totalCount,
					lastUpdated: finalData.lastUpdated,
					replaceMode: replaceExisting,
					message: `테이블 정의서 업로드 완료: ${parsedEntries.length}개 항목`
				}
			} as DbDesignApiResponse,
			{ status: 200 }
		);
	} catch (error) {
		if (error instanceof FormDataValidationError)
			return json({ success: false, error: error.message } as DbDesignApiResponse, { status: 400 });
		return json(
			{
				success: false,
				error: '서버에서 파일 업로드 처리 중 오류가 발생했습니다.'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}
