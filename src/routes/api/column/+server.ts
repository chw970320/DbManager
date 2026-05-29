import { json, type RequestEvent } from '@sveltejs/kit';
import { loadColumnData, saveColumnData } from '$lib/registry/data-registry';
import {
	collectDeleteWarnings,
	getMissingRequiredFields,
	handleDbDesignList,
	type DbDesignListDescriptor
} from '$lib/server/db-design-crud';
import type { ColumnData, ColumnEntry } from '$lib/types/database-design';
import { safeMerge } from '$lib/utils/type-guards.js';
import { v4 as uuidv4 } from 'uuid';

const columnListDescriptor: DbDesignListDescriptor<ColumnEntry, ColumnData> = {
	defaultFilename: 'column.json',
	loadData: loadColumnData,
	searchMatches: (entry, searchField, matchValue) => {
		switch (searchField) {
			case 'schemaName':
				return matchValue(entry.schemaName);
			case 'tableEnglishName':
				return matchValue(entry.tableEnglishName);
			case 'columnEnglishName':
				return matchValue(entry.columnEnglishName);
			case 'columnKoreanName':
				return matchValue(entry.columnKoreanName);
			case 'domainName':
				return matchValue(entry.domainName);
			case 'dataType':
				return matchValue(entry.dataType);
			case 'all':
			default:
				return (
					matchValue(entry.schemaName) ||
					matchValue(entry.tableEnglishName) ||
					matchValue(entry.columnEnglishName) ||
					matchValue(entry.columnKoreanName) ||
					matchValue(entry.domainName) ||
					matchValue(entry.dataType)
				);
		}
	},
	invalidPaginationBody: {
		success: false,
		error: '잘못된 페이지네이션 파라미터입니다.'
	},
	loadFailureBody: (error) => ({
		success: false,
		error: error instanceof Error ? error.message : '데이터 로드 실패'
	}),
	serverErrorBody: {
		success: false,
		error: '서버에서 데이터 조회 중 오류가 발생했습니다.'
	},
	defaultSortDateFields: ['updatedAt']
};

export async function GET({ url }: RequestEvent) {
	return handleDbDesignList(url, columnListDescriptor);
}

export async function POST({ request, url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'column.json';
		const body = await request.json();

		const requiredFields = [
			'scopeFlag',
			'subjectArea',
			'schemaName',
			'tableEnglishName',
			'columnEnglishName',
			'columnKoreanName',
			'relatedEntityName',
			'domainName',
			'dataType',
			'notNullFlag',
			'personalInfoFlag',
			'encryptionFlag',
			'publicFlag'
		];
		const missingFields = getMissingRequiredFields(body, requiredFields);

		if (missingFields.length > 0) {
			return json(
				{
					success: false,
					error: `필수 필드가 누락되었습니다: ${missingFields.join(', ')}`,
					message: 'Missing required fields'
				} as DbDesignApiResponse,
				{ status: 400 }
			);
		}

		let columnData: ColumnData;
		try {
			columnData = await loadColumnData(filename);
		} catch {
			columnData = { entries: [], lastUpdated: new Date().toISOString(), totalCount: 0 };
		}

		const now = new Date().toISOString();
		const newEntry: ColumnEntry = {
			id: uuidv4(),
			scopeFlag: body.scopeFlag,
			subjectArea: body.subjectArea,
			schemaName: body.schemaName,
			tableEnglishName: body.tableEnglishName,
			columnEnglishName: body.columnEnglishName,
			columnKoreanName: body.columnKoreanName,
			relatedEntityName: body.relatedEntityName,
			domainName: body.domainName,
			dataType: body.dataType,
			notNullFlag: body.notNullFlag,
			personalInfoFlag: body.personalInfoFlag,
			encryptionFlag: body.encryptionFlag,
			publicFlag: body.publicFlag,
			columnDescription: body.columnDescription || undefined,
			dataLength: body.dataLength || undefined,
			dataDecimalLength: body.dataDecimalLength || undefined,
			dataFormat: body.dataFormat || undefined,
			pkInfo: body.pkInfo || undefined,
			fkInfo: body.fkInfo || undefined,
			indexName: body.indexName || undefined,
			indexOrder: body.indexOrder || undefined,
			akInfo: body.akInfo || undefined,
			constraint: body.constraint || undefined,
			createdAt: now,
			updatedAt: now
		};

		columnData.entries.push(newEntry);
		columnData.lastUpdated = now;
		columnData.totalCount = columnData.entries.length;
		await saveColumnData(columnData, filename);

		return json(
			{
				success: true,
				data: newEntry,
				message: '컬럼 정의서가 성공적으로 추가되었습니다.'
			} as DbDesignApiResponse,
			{ status: 201 }
		);
	} catch (error) {
		return json(
			{
				success: false,
				error: '서버에서 데이터 추가 중 오류가 발생했습니다.'
			} as DbDesignApiResponse,
			{ status: 500 }
		);
	}
}

export async function PUT({ request, url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'column.json';
		const body = await request.json();
		const { id, ...updateFields } = body;
		if (!id) return json({ success: false, error: 'ID가 필요합니다.' }, { status: 400 });

		const requiredFields = [
			'scopeFlag',
			'subjectArea',
			'schemaName',
			'tableEnglishName',
			'columnEnglishName',
			'columnKoreanName',
			'relatedEntityName',
			'domainName',
			'dataType',
			'notNullFlag',
			'personalInfoFlag',
			'encryptionFlag',
			'publicFlag'
		];
		const missingFields = getMissingRequiredFields(updateFields, requiredFields);

		if (missingFields.length > 0) {
			return json(
				{
					success: false,
					error: `필수 필드가 누락되었습니다: ${missingFields.join(', ')}`,
					message: 'Missing required fields'
				} as DbDesignApiResponse,
				{ status: 400 }
			);
		}

		const columnData = await loadColumnData(filename);
		const idx = columnData.entries.findIndex((e) => e.id === id);
		if (idx === -1)
			return json({ success: false, error: '수정할 데이터를 찾을 수 없습니다.' }, { status: 404 });

		columnData.entries[idx] = {
			...safeMerge(columnData.entries[idx], updateFields),
			updatedAt: new Date().toISOString()
		};
		await saveColumnData(columnData, filename);

		return json(
			{ success: true, data: columnData.entries[idx], message: '수정 완료' },
			{ status: 200 }
		);
	} catch (error) {
		return json({ success: false, error: '서버 오류' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		const filename = url.searchParams.get('filename') || 'column.json';
		const force = url.searchParams.get('force') === 'true';
		if (!id) return json({ success: false, error: '삭제할 ID가 필요합니다.' }, { status: 400 });

		const columnData = await loadColumnData(filename);
		const entryToDelete = columnData.entries.find((e) => e.id === id);
		if (!entryToDelete)
			return json({ success: false, error: '삭제할 데이터를 찾을 수 없습니다.' }, { status: 404 });

		const warnings = await collectDeleteWarnings('column', entryToDelete, filename, force);

		columnData.entries = columnData.entries.filter((e) => e.id !== id);
		await saveColumnData(columnData, filename);

		return json({ success: true, message: '삭제 완료', warnings }, { status: 200 });
	} catch (error) {
		return json({ success: false, error: '서버 오류' }, { status: 500 });
	}
}
