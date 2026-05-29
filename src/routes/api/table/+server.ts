import { json, type RequestEvent } from '@sveltejs/kit';
import { loadTableData, saveTableData } from '$lib/registry/data-registry';
import {
	collectDeleteWarnings,
	getMissingRequiredFields,
	handleDbDesignList,
	type DbDesignListDescriptor
} from '$lib/server/db-design-crud';
import type { TableData, TableEntry } from '$lib/types/database-design';
import { safeMerge } from '$lib/utils/type-guards.js';
import { v4 as uuidv4 } from 'uuid';

const tableListDescriptor: DbDesignListDescriptor<TableEntry, TableData> = {
	defaultFilename: 'table.json',
	loadData: loadTableData,
	searchMatches: (entry, searchField, matchValue) => {
		switch (searchField) {
			case 'physicalDbName':
				return matchValue(entry.physicalDbName);
			case 'schemaName':
				return matchValue(entry.schemaName);
			case 'tableEnglishName':
				return matchValue(entry.tableEnglishName);
			case 'tableKoreanName':
				return matchValue(entry.tableKoreanName);
			case 'tableType':
				return matchValue(entry.tableType);
			case 'subjectArea':
				return matchValue(entry.subjectArea);
			case 'all':
			default:
				return (
					matchValue(entry.physicalDbName) ||
					matchValue(entry.schemaName) ||
					matchValue(entry.tableEnglishName) ||
					matchValue(entry.tableKoreanName) ||
					matchValue(entry.tableType) ||
					matchValue(entry.subjectArea)
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
	return handleDbDesignList(url, tableListDescriptor);
}

export async function POST({ request, url }: RequestEvent) {
	try {
		const filename = url.searchParams.get('filename') || 'table.json';
		const body = await request.json();

		const requiredFields = [
			'physicalDbName',
			'tableOwner',
			'subjectArea',
			'schemaName',
			'tableEnglishName',
			'tableKoreanName',
			'tableType',
			'relatedEntityName',
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

		let tableData: TableData;
		try {
			tableData = await loadTableData(filename);
		} catch {
			tableData = { entries: [], lastUpdated: new Date().toISOString(), totalCount: 0 };
		}

		const now = new Date().toISOString();
		const newEntry: TableEntry = {
			id: uuidv4(),
			physicalDbName: body.physicalDbName,
			tableOwner: body.tableOwner,
			subjectArea: body.subjectArea,
			schemaName: body.schemaName,
			tableEnglishName: body.tableEnglishName,
			tableKoreanName: body.tableKoreanName,
			tableType: body.tableType,
			relatedEntityName: body.relatedEntityName,
			publicFlag: body.publicFlag,
			tableDescription: body.tableDescription || undefined,
			businessClassification: body.businessClassification || undefined,
			retentionPeriod: body.retentionPeriod || undefined,
			tableVolume: body.tableVolume || undefined,
			occurrenceCycle: body.occurrenceCycle || undefined,
			nonPublicReason: body.nonPublicReason || undefined,
			openDataList: body.openDataList || undefined,
			createdAt: now,
			updatedAt: now
		};

		tableData.entries.push(newEntry);
		tableData.lastUpdated = now;
		tableData.totalCount = tableData.entries.length;
		await saveTableData(tableData, filename);

		return json(
			{
				success: true,
				data: newEntry,
				message: '테이블 정의서가 성공적으로 추가되었습니다.'
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
		const filename = url.searchParams.get('filename') || 'table.json';
		const body = await request.json();
		const { id, ...updateFields } = body;
		if (!id) return json({ success: false, error: 'ID가 필요합니다.' }, { status: 400 });

		const requiredFields = [
			'physicalDbName',
			'tableOwner',
			'subjectArea',
			'schemaName',
			'tableEnglishName',
			'tableKoreanName',
			'tableType',
			'relatedEntityName',
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

		const tableData = await loadTableData(filename);
		const idx = tableData.entries.findIndex((e) => e.id === id);
		if (idx === -1)
			return json({ success: false, error: '수정할 데이터를 찾을 수 없습니다.' }, { status: 404 });

		tableData.entries[idx] = {
			...safeMerge(tableData.entries[idx], updateFields),
			updatedAt: new Date().toISOString()
		};
		await saveTableData(tableData, filename);

		return json(
			{ success: true, data: tableData.entries[idx], message: '수정 완료' },
			{ status: 200 }
		);
	} catch (error) {
		return json({ success: false, error: '서버 오류' }, { status: 500 });
	}
}

export async function DELETE({ url }: RequestEvent) {
	try {
		const id = url.searchParams.get('id');
		const filename = url.searchParams.get('filename') || 'table.json';
		const force = url.searchParams.get('force') === 'true';
		if (!id) return json({ success: false, error: '삭제할 ID가 필요합니다.' }, { status: 400 });

		const tableData = await loadTableData(filename);
		const entryToDelete = tableData.entries.find((e) => e.id === id);
		if (!entryToDelete)
			return json({ success: false, error: '삭제할 데이터를 찾을 수 없습니다.' }, { status: 404 });

		const warnings = await collectDeleteWarnings('table', entryToDelete, filename, force);

		tableData.entries = tableData.entries.filter((e) => e.id !== id);
		await saveTableData(tableData, filename);

		return json({ success: true, message: '삭제 완료', warnings }, { status: 200 });
	} catch (error) {
		return json({ success: false, error: '서버 오류' }, { status: 500 });
	}
}
